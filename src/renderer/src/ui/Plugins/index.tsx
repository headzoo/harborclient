import { PageSidebar, SidebarLayout } from '@harborclient/sdk/components';
import { useCallback, useEffect, useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import type {
  PluginCatalog,
  PluginCatalogEntry,
  PluginSource,
  PluginSourcesSettings
} from '#/shared/plugin/catalog';
import { getDefaultPluginSources, pluginSourcesSchema } from '#/shared/plugin/catalog';
import {
  buildPluginCatalogSearchIndex,
  filterPluginCatalogByCategory,
  searchPluginCatalog
} from '#/shared/plugin/catalogSearch';
import type { PluginCatalogCategory } from '#/shared/plugin/catalogCategories';
import type { PluginInfo } from '#/shared/plugin/types';
import type { TeamHubPluginSource } from '#/shared/types';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import {
  consumePendingPluginInstall,
  selectPendingPluginInstallId
} from '#/renderer/src/store/slices/navigationSlice';
import {
  showAlert,
  showConfirm,
  formatIpcErrorMessage
} from '#/renderer/src/ui/modals/dialogHelpers';
import type { PluginGitPreview } from '#/shared/plugin/types';
import { markPluginForThemePrompt } from '#/renderer/src/plugins/pluginLoader';
import { EnableModal } from './EnableModal';
import {
  findInstalledCatalogPlugin,
  isManagedInstall,
  resolvePendingPluginInstallDeepLink
} from './helpers';
import { InstalledView } from './InstalledView';
import { InstallView } from './InstallView';
import { MarketplaceView } from './MarketplaceView';
import { PluginDetailModal } from './PluginDetailModal';
import { PluginSourcesView } from './PluginSourcesView';
import {
  loadInstalledPluginScreenshotSrcs,
  resolveCatalogPluginScreenshotSrcs
} from './resolvePluginScreenshot';
import { PLUGIN_SECTIONS } from './sidebarConstants';
import type { PluginsSidebarSection } from './sidebarTypes';
import type { SourceKind } from './types';

interface Props {
  /**
   * Closes the plugins view.
   */
  onClose: () => void;
}

/**
 * Queues a theme switch prompt when the plugin manifest declares contributed themes.
 *
 * @param plugin - Plugin the user is about to enable.
 */
function queueThemePromptIfNeeded(plugin: PluginInfo): void {
  if ((plugin.manifest.contributes?.themes?.length ?? 0) > 0) {
    markPluginForThemePrompt(plugin.id);
  }
}

/**
 * Full-area plugin management with sidebar navigation.
 */
export function Plugins({ onClose }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const pendingPluginInstallId = useAppSelector(selectPendingPluginInstallId);
  const [section, setSection] = useState<PluginsSidebarSection>('installed');
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [catalog, setCatalog] = useState<PluginCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogActionBusyId, setCatalogActionBusyId] = useState<string | null>(null);
  const [catalogDetailEntry, setCatalogDetailEntry] = useState<PluginCatalogEntry | null>(null);
  const [catalogPreview, setCatalogPreview] = useState<PluginGitPreview | null>(null);
  const [catalogPreviewLoadState, setCatalogPreviewLoadState] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const [catalogPreviewError, setCatalogPreviewError] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<PluginCatalogCategory | ''>(
    ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPlugin, setDetailPlugin] = useState<PluginInfo | null>(null);
  const [pendingInstall, setPendingInstall] = useState<PluginInfo | null>(null);
  const [descriptionMarkdown, setDescriptionMarkdown] = useState<string>('');
  const [descriptionLoadState, setDescriptionLoadState] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const [detailScreenshotSrcs, setDetailScreenshotSrcs] = useState<string[]>([]);
  const [gitInstallUrl, setGitInstallUrl] = useState('');
  const [gitInstallRef, setGitInstallRef] = useState('');
  const [gitInstallError, setGitInstallError] = useState<string | null>(null);
  const [gitInstallBusy, setGitInstallBusy] = useState(false);
  const [gitUpdateBusyId, setGitUpdateBusyId] = useState<string | null>(null);
  const [pluginSourcesDraft, setPluginSourcesDraft] =
    useState<PluginSourcesSettings>(getDefaultPluginSources());
  const [pluginSourcesBusy, setPluginSourcesBusy] = useState(false);
  const [pluginSourcesLoadError, setPluginSourcesLoadError] = useState<string | null>(null);
  const [pluginSourcesLoaded, setPluginSourcesLoaded] = useState(false);
  const [teamHubPluginSources, setTeamHubPluginSources] = useState<{
    catalogs: TeamHubPluginSource[];
    trusted: TeamHubPluginSource[];
  }>({ catalogs: [], trusted: [] });

  /**
   * Shows a blocking alert when a user-initiated plugin action fails.
   *
   * @param title - Dialog heading.
   * @param err - Caught error from the IPC call.
   * @param fallback - Message when the error cannot be parsed.
   */
  const showPluginActionError = (title: string, err: unknown, fallback: string): void => {
    showAlert(dispatch, formatIpcErrorMessage(err, fallback), title, { icon: 'warning' });
  };

  /**
   * Loads the plugin list from the main process and keeps the open detail row in sync.
   *
   * @returns Fresh plugin rows from the main process.
   */
  const refresh = useCallback(async (): Promise<PluginInfo[]> => {
    setLoading(true);
    setError(null);
    try {
      const next = await window.api.listPlugins();
      setPlugins(next);
      setDetailPlugin((current) =>
        current ? (next.find((plugin) => plugin.id === current.id) ?? null) : null
      );
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Loads the marketplace catalog from configured sources.
   */
  const loadCatalog = useCallback(async (): Promise<void> => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const next = await window.api.getPluginCatalog();
      setCatalog(next);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : String(err));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  /**
   * Loads persisted plugin source settings for the Settings page.
   */
  const loadPluginSources = useCallback(async (): Promise<void> => {
    setPluginSourcesLoadError(null);
    setPluginSourcesBusy(true);
    try {
      const [settings, hubSources] = await Promise.all([
        window.api.getPluginSources(),
        window.api.getTeamHubPluginSources()
      ]);
      setPluginSourcesDraft(settings);
      setTeamHubPluginSources(hubSources);
      setPluginSourcesLoaded(true);
    } catch (err) {
      setPluginSourcesLoadError(err instanceof Error ? err.message : String(err));
      setPluginSourcesDraft(getDefaultPluginSources());
      setTeamHubPluginSources({ catalogs: [], trusted: [] });
    } finally {
      setPluginSourcesBusy(false);
    }
  }, []);

  /**
   * Loads plugins on mount and when the main process reports changes.
   */
  useEffect(() => {
    let active = true;
    void window.api
      .listPlugins()
      .then((next) => {
        if (active) {
          setPlugins(next);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    const unsubscribe = window.api.onPluginsChanged(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  /**
   * Clears marketplace filters when leaving the Marketplace section and loads
   * section-specific data when entering Marketplace or Settings.
   *
   * @param next - Sidebar section to show.
   */
  const handleSectionChange = (next: PluginsSidebarSection): void => {
    if (section === 'marketplace' && next !== 'marketplace') {
      setCatalogDetailEntry(null);
      setCatalogPreview(null);
      setCatalogPreviewLoadState('idle');
      setCatalogPreviewError(null);
      setCatalogSearchQuery('');
      setCatalogCategoryFilter('');
    }
    setSection(next);
    if (next === 'marketplace' && catalog == null && !catalogLoading) {
      void loadCatalog();
    }
    if (next === 'settings' && !pluginSourcesLoaded && !pluginSourcesBusy) {
      void loadPluginSources();
    }
  };

  /**
   * Loads the detail plugin description markdown when the detail modal opens.
   */
  useEffect(() => {
    let active = true;
    const descriptionPath = detailPlugin?.manifest.description;
    if (!detailPlugin || !descriptionPath) {
      return () => {
        active = false;
      };
    }
    void window.api
      .readPluginAsset(detailPlugin.id, descriptionPath)
      .then((asset) => {
        if (active) {
          setDescriptionMarkdown(atob(asset.content));
          setDescriptionLoadState('loaded');
        }
      })
      .catch(() => {
        if (active) {
          setDescriptionMarkdown('');
          setDescriptionLoadState('error');
        }
      });
    return () => {
      active = false;
    };
  }, [detailPlugin]);

  /**
   * Maps loaded marketplace catalog entries by plugin id for screenshot lookup.
   */
  const catalogById = useMemo(() => {
    if (!catalog?.plugins.length) {
      return new Map<string, PluginCatalogEntry>();
    }
    return new Map(catalog.plugins.map((entry) => [entry.id, entry]));
  }, [catalog]);

  /**
   * Loads the installed plugin screenshot when the detail modal opens.
   */
  useEffect(() => {
    let active = true;
    if (!detailPlugin) {
      return () => {
        active = false;
      };
    }

    void loadInstalledPluginScreenshotSrcs(
      detailPlugin,
      catalogById.get(detailPlugin.id)?.screenshots,
      catalogById.get(detailPlugin.id)?.screenshot
    ).then((screenshotSrcs) => {
      if (active) {
        setDetailScreenshotSrcs(screenshotSrcs);
      }
    });

    return () => {
      active = false;
    };
  }, [detailPlugin, catalogById]);

  /**
   * Fetches remote manifest preview data when a marketplace detail modal opens.
   */
  useEffect(() => {
    let active = true;
    if (!catalogDetailEntry) {
      return () => {
        active = false;
      };
    }

    void window.api
      .previewPluginFromGit(catalogDetailEntry.repoUrl, catalogDetailEntry.ref)
      .then((preview) => {
        if (active) {
          setCatalogPreview(preview);
          setCatalogPreviewLoadState('loaded');
        }
      })
      .catch((err) => {
        if (active) {
          setCatalogPreview(null);
          setCatalogPreviewLoadState('error');
          setCatalogPreviewError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      active = false;
    };
  }, [catalogDetailEntry]);

  /**
   * Builds a searchable index over the loaded marketplace catalog.
   */
  const catalogSearchIndex = useMemo(() => {
    if (!catalog?.plugins.length) {
      return null;
    }
    return buildPluginCatalogSearchIndex(catalog.plugins);
  }, [catalog]);

  /**
   * Filters marketplace catalog rows by category and search query.
   */
  const filteredCatalogPlugins = useMemo(() => {
    if (!catalog?.plugins.length) {
      return [];
    }

    const byCategory = filterPluginCatalogByCategory(catalog.plugins, catalogCategoryFilter);
    if (!catalogSearchIndex) {
      return byCategory;
    }

    const searched = searchPluginCatalog(catalog.plugins, catalogSearchIndex, catalogSearchQuery);
    if (!catalogCategoryFilter) {
      return searched;
    }

    const categoryIds = new Set(byCategory.map((entry) => entry.id));
    return searched.filter((entry) => categoryIds.has(entry.id));
  }, [catalog, catalogSearchIndex, catalogSearchQuery, catalogCategoryFilter]);

  /**
   * Opens the read-only detail modal for one installed plugin.
   *
   * @param plugin - Plugin row to inspect.
   */
  const openDetail = (plugin: PluginInfo): void => {
    setDescriptionMarkdown('');
    setDescriptionLoadState(plugin.manifest.description ? 'loading' : 'idle');
    setDetailScreenshotSrcs([]);
    setDetailPlugin(plugin);
  };

  /**
   * Handles a harborclient:// plugin install deep link queued in navigation state.
   */
  useEffect(() => {
    if (!pendingPluginInstallId) {
      return;
    }

    const pluginId = pendingPluginInstallId;
    let cancelled = false;

    const run = async (): Promise<void> => {
      setSection('marketplace');
      setCatalogLoading(true);
      setCatalogError(null);

      const result = await resolvePendingPluginInstallDeepLink(pluginId, {
        getPluginCatalog: async () => {
          const loaded = await window.api.getPluginCatalog();
          if (!cancelled) {
            setCatalog(loaded);
          }
          return loaded;
        },
        listPlugins: () => window.api.listPlugins(),
        confirmInstall: (entry) =>
          showConfirm(dispatch, {
            title: `Install ${entry.name}?`,
            message: `Install ${entry.name} v${entry.version} by ${entry.author} from ${entry.repoUrl}?`,
            confirmLabel: 'Install'
          }),
        installFromGit: async (entry) => {
          setCatalogActionBusyId(entry.id);
          try {
            return await window.api.installPluginFromGit(entry.repoUrl, entry.ref);
          } finally {
            if (!cancelled) {
              setCatalogActionBusyId(null);
            }
          }
        },
        isCancelled: () => cancelled
      });

      if (cancelled) {
        return;
      }

      setCatalogLoading(false);
      dispatch(consumePendingPluginInstall());

      switch (result.kind) {
        case 'catalog-error':
          showAlert(
            dispatch,
            formatIpcErrorMessage(
              new Error(result.message),
              'Could not load the plugin marketplace.'
            ),
            'Marketplace unavailable'
          );
          break;
        case 'not-found':
          showAlert(
            dispatch,
            `Plugin "${pluginId}" was not found in the marketplace catalog.`,
            'Plugin not found'
          );
          break;
        case 'already-installed':
          openDetail(result.plugin);
          break;
        case 'installed':
          setPendingInstall(result.plugin);
          break;
        case 'install-error':
          showAlert(
            dispatch,
            formatIpcErrorMessage(new Error(result.message), 'The plugin could not be installed.'),
            'Install failed',
            { icon: 'warning' }
          );
          break;
        case 'declined':
        case 'cancelled':
          break;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pendingPluginInstallId, dispatch]);

  /**
   * Closes the read-only detail modal and clears loaded description text.
   */
  const closeDetail = (): void => {
    setDetailPlugin(null);
    setDescriptionMarkdown('');
    setDescriptionLoadState('idle');
    setDetailScreenshotSrcs([]);
  };

  /**
   * Closes the marketplace detail modal.
   */
  const closeCatalogDetail = (): void => {
    setCatalogDetailEntry(null);
    setCatalogPreview(null);
    setCatalogPreviewLoadState('idle');
    setCatalogPreviewError(null);
    setCatalogError(null);
  };

  /**
   * Opens the marketplace detail modal for one catalog listing.
   *
   * @param entry - Catalog row to inspect.
   */
  const openCatalogDetail = (entry: PluginCatalogEntry): void => {
    const installed = findInstalledCatalogPlugin(plugins, entry.id);
    if (installed) {
      openDetail(installed);
      return;
    }
    setCatalogError(null);
    setCatalogPreview(null);
    setCatalogPreviewLoadState('loading');
    setCatalogPreviewError(null);
    setCatalogDetailEntry(entry);
  };

  /**
   * Opens the detail modal when a table row is activated from the keyboard.
   *
   * @param event - Keyboard event on the row.
   * @param plugin - Plugin row to inspect.
   */
  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    plugin: PluginInfo
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetail(plugin);
    }
  };

  /**
   * Closes the permissions dialog and optionally removes a just-installed plugin.
   *
   * @param keep - When false, uninstall/remove the pending plugin.
   */
  const closePendingInstall = async (keep: boolean): Promise<void> => {
    if (!pendingInstall) {
      return;
    }
    const plugin = pendingInstall;
    setPendingInstall(null);
    if (!keep) {
      if (isManagedInstall(plugin)) {
        await window.api.uninstallPlugin(plugin.id);
      } else {
        await window.api.removeUnpackedPlugin(plugin.id);
      }
      await refresh();
      return;
    }
    queueThemePromptIfNeeded(plugin);
    await window.api.setPluginEnabled(plugin.id, true);
    const next = await refresh();
    const enabled = next.find((entry) => entry.id === plugin.id);
    if (enabled) {
      openDetail(enabled);
    }
  };

  /**
   * Opens the install-from-file dialog and shows the permissions modal.
   */
  const handleInstallFromFile = async (): Promise<void> => {
    try {
      const installed = await window.api.installPlugin();
      if (installed) {
        setPendingInstall(installed);
      }
    } catch (err) {
      showPluginActionError('Install failed', err, 'The plugin could not be installed.');
    }
  };

  /**
   * Clones a plugin from a public git repository URL.
   */
  const handleInstallFromGit = async (): Promise<void> => {
    const url = gitInstallUrl.trim();
    if (!url) {
      setGitInstallError('Repository URL is required.');
      return;
    }
    setGitInstallBusy(true);
    setGitInstallError(null);
    try {
      const ref = gitInstallRef.trim() || undefined;
      const installed = await window.api.installPluginFromGit(url, ref);
      setGitInstallUrl('');
      setGitInstallRef('');
      setPendingInstall(installed);
    } catch (err) {
      showPluginActionError('Install failed', err, 'The plugin could not be installed from git.');
    } finally {
      setGitInstallBusy(false);
    }
  };

  /**
   * Re-clones a git-installed plugin from its stored origin.
   *
   * @param pluginId - Plugin manifest id.
   */
  const handleUpdateFromGit = async (pluginId: string): Promise<void> => {
    setGitUpdateBusyId(pluginId);
    try {
      await window.api.updatePluginFromGit(pluginId);
      await refresh();
    } catch (err) {
      showPluginActionError('Update failed', err, 'The plugin could not be updated from git.');
    } finally {
      setGitUpdateBusyId(null);
    }
  };

  /**
   * Installs a marketplace plugin via the existing git clone flow.
   *
   * @param entry - Catalog listing to install.
   */
  const handleCatalogInstall = async (entry: PluginCatalogEntry): Promise<void> => {
    setCatalogActionBusyId(entry.id);
    try {
      const installed = await window.api.installPluginFromGit(entry.repoUrl, entry.ref);
      setCatalogDetailEntry(null);
      setPendingInstall(installed);
    } catch (err) {
      showPluginActionError('Install failed', err, 'The plugin could not be installed.');
    } finally {
      setCatalogActionBusyId(null);
    }
  };

  /**
   * Re-clones a git-installed marketplace plugin from its stored origin.
   *
   * @param pluginId - Plugin manifest id.
   */
  const handleCatalogUpdate = async (pluginId: string): Promise<void> => {
    setCatalogActionBusyId(pluginId);
    try {
      await window.api.updatePluginFromGit(pluginId);
      await refresh();
    } catch (err) {
      showPluginActionError('Update failed', err, 'The plugin could not be updated.');
    } finally {
      setCatalogActionBusyId(null);
    }
  };

  /**
   * Opens the load-unpacked dialog and shows the permissions modal.
   */
  const handleLoadUnpacked = async (): Promise<void> => {
    try {
      const loaded = await window.api.loadUnpackedPlugin();
      if (loaded) {
        setPendingInstall(loaded);
      }
    } catch (err) {
      showPluginActionError('Load failed', err, 'The unpacked plugin could not be loaded.');
    }
  };

  /**
   * Toggles enablement for one plugin row.
   *
   * @param plugin - Plugin to enable or disable.
   */
  const handleToggleEnabled = async (plugin: PluginInfo): Promise<void> => {
    if (!plugin.enabled) {
      queueThemePromptIfNeeded(plugin);
    }
    await window.api.setPluginEnabled(plugin.id, !plugin.enabled);
    await refresh();
  };

  /**
   * Reloads one unpacked plugin from disk.
   *
   * @param plugin - Plugin to reload from its unpacked source path.
   */
  const handleReload = async (plugin: PluginInfo): Promise<void> => {
    await window.api.reloadPlugin(plugin.id);
    await refresh();
    toast.success(`${plugin.name} reloaded.`);
  };

  /**
   * Removes an installed or unpacked plugin after confirmation.
   *
   * @param plugin - Plugin to remove.
   */
  const handleRemove = async (plugin: PluginInfo): Promise<void> => {
    const confirmed = await showConfirm(dispatch, {
      title: isManagedInstall(plugin) ? 'Uninstall plugin?' : 'Remove dev plugin?',
      message: isManagedInstall(plugin)
        ? `Remove ${plugin.name} and delete its files from HarborClient?`
        : `Stop loading ${plugin.name} from ${plugin.path}? Your source folder will not be deleted.`,
      confirmLabel: isManagedInstall(plugin) ? 'Uninstall' : 'Remove',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }
    if (isManagedInstall(plugin)) {
      await window.api.uninstallPlugin(plugin.id);
    } else {
      await window.api.removeUnpackedPlugin(plugin.id);
    }
    if (detailPlugin?.id === plugin.id) {
      closeDetail();
    }
    await refresh();
  };

  /**
   * Replaces the draft plugin source settings with HarborClient defaults.
   */
  const resetPluginSourcesDraft = (): void => {
    setPluginSourcesDraft(getDefaultPluginSources());
    setPluginSourcesLoadError(null);
  };

  /**
   * Updates one draft plugin source row.
   *
   * @param kind - Catalog or trusted endpoint list being edited.
   * @param index - Row index within the list.
   * @param source - Updated source row.
   */
  const updatePluginSourceDraft = (kind: SourceKind, index: number, source: PluginSource): void => {
    setPluginSourcesDraft((current) => ({
      ...current,
      [kind]: current[kind].map((entry, entryIndex) => (entryIndex === index ? source : entry))
    }));
  };

  /**
   * Removes one draft plugin source row.
   *
   * @param kind - Catalog or trusted endpoint list being edited.
   * @param index - Row index to remove.
   */
  const removePluginSourceDraft = (kind: SourceKind, index: number): void => {
    setPluginSourcesDraft((current) => ({
      ...current,
      [kind]: current[kind].filter((_entry, entryIndex) => entryIndex !== index)
    }));
  };

  /**
   * Adds one draft plugin source row.
   *
   * @param kind - Catalog or trusted endpoint list being edited.
   * @param url - Endpoint URL to append.
   * @returns Validation error message, or null when the row was added.
   */
  const addPluginSourceDraft = (kind: SourceKind, url: string): string | null => {
    const candidate: PluginSourcesSettings = {
      ...pluginSourcesDraft,
      [kind]: [...pluginSourcesDraft[kind], { url, enabled: true }]
    };
    const parsed = pluginSourcesSchema.safeParse(candidate);
    if (!parsed.success) {
      return 'Enter a valid http:// or https:// URL.';
    }
    setPluginSourcesDraft(parsed.data);
    return null;
  };

  /**
   * Persists draft plugin source settings and refreshes the marketplace catalog.
   */
  const savePluginSources = async (): Promise<void> => {
    setPluginSourcesBusy(true);
    setPluginSourcesLoadError(null);
    try {
      const saved = await window.api.setPluginSources(pluginSourcesDraft);
      setPluginSourcesDraft(saved);
      setCatalog(null);
      if (section === 'marketplace') {
        await loadCatalog();
      }
      toast.success('Plugin sources saved.');
    } catch (err) {
      setPluginSourcesLoadError(
        formatIpcErrorMessage(err, 'Plugin source settings could not be saved.')
      );
    } finally {
      setPluginSourcesBusy(false);
    }
  };

  return (
    <>
      <SidebarLayout
        sidebar={
          <PageSidebar
            ariaLabel="Plugin sections"
            selected={section}
            onSelect={handleSectionChange}
            items={PLUGIN_SECTIONS}
          />
        }
      >
        {section === 'installed' ? (
          <InstalledView
            onClose={onClose}
            plugins={plugins}
            loading={loading}
            error={error}
            catalogById={catalogById}
            gitUpdateBusyId={gitUpdateBusyId}
            onOpenDetail={openDetail}
            onRowKeyDown={handleRowKeyDown}
            onToggleEnabled={(plugin) => void handleToggleEnabled(plugin)}
            onReload={(plugin) => void handleReload(plugin)}
            onUpdateFromGit={(pluginId) => void handleUpdateFromGit(pluginId)}
            onRemove={(plugin) => void handleRemove(plugin)}
          />
        ) : null}
        {section === 'marketplace' ? (
          <MarketplaceView
            onClose={onClose}
            catalog={catalog}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            catalogSearchQuery={catalogSearchQuery}
            catalogCategoryFilter={catalogCategoryFilter}
            filteredCatalogPlugins={filteredCatalogPlugins}
            onSearchQueryChange={setCatalogSearchQuery}
            onCategoryFilterChange={setCatalogCategoryFilter}
            onOpenCatalogDetail={openCatalogDetail}
          />
        ) : null}
        {section === 'install' ? (
          <InstallView
            onClose={onClose}
            gitInstallUrl={gitInstallUrl}
            gitInstallRef={gitInstallRef}
            gitInstallError={gitInstallError}
            gitInstallBusy={gitInstallBusy}
            onGitInstallUrlChange={(url) => {
              setGitInstallUrl(url);
              setGitInstallError(null);
            }}
            onGitInstallRefChange={(ref) => {
              setGitInstallRef(ref);
              setGitInstallError(null);
            }}
            onInstallFromFile={() => void handleInstallFromFile()}
            onLoadUnpacked={() => void handleLoadUnpacked()}
            onInstallFromGit={() => void handleInstallFromGit()}
          />
        ) : null}
        {section === 'settings' ? (
          <PluginSourcesView
            onClose={onClose}
            settings={pluginSourcesDraft}
            hubSources={teamHubPluginSources}
            busy={pluginSourcesBusy}
            error={pluginSourcesLoadError}
            onSave={() => void savePluginSources()}
            onResetDefaults={resetPluginSourcesDraft}
            onUpdateSource={updatePluginSourceDraft}
            onRemoveSource={removePluginSourceDraft}
            onAddSource={addPluginSourceDraft}
          />
        ) : null}
      </SidebarLayout>

      {catalogDetailEntry ? (
        <PluginDetailModal
          mode="catalog"
          entry={catalogDetailEntry}
          preview={catalogPreview}
          previewLoadState={catalogPreviewLoadState}
          previewError={catalogPreviewError}
          screenshotSrcs={resolveCatalogPluginScreenshotSrcs(catalogDetailEntry, catalogPreview)}
          installed={findInstalledCatalogPlugin(plugins, catalogDetailEntry.id)}
          actionBusy={catalogActionBusyId === catalogDetailEntry.id}
          onClose={closeCatalogDetail}
          onInstall={() => void handleCatalogInstall(catalogDetailEntry)}
          onUpdate={() => {
            const installed = findInstalledCatalogPlugin(plugins, catalogDetailEntry.id);
            if (installed) {
              void handleCatalogUpdate(installed.id);
            }
          }}
        />
      ) : null}

      {detailPlugin ? (
        <PluginDetailModal
          mode="installed"
          plugin={detailPlugin}
          descriptionMarkdown={descriptionMarkdown}
          descriptionLoadState={descriptionLoadState}
          screenshotSrcs={detailScreenshotSrcs}
          onClose={closeDetail}
        />
      ) : null}

      {pendingInstall ? (
        <EnableModal
          plugin={pendingInstall}
          onCancel={() => void closePendingInstall(false)}
          onConfirm={() => void closePendingInstall(true)}
        />
      ) : null}
    </>
  );
}
