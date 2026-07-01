import type { JSX } from 'react';
import type { PluginCatalogEntry } from '#/shared/plugin/catalog';
import type { PluginInfo, PluginGitPreview } from '#/shared/plugin/types';
import { findInstalledCatalogPlugin } from './helpers';
import { EnableModal } from './EnableModal';
import { PluginDetailModal } from './PluginDetailModal';
import { resolveCatalogPluginScreenshotSrcs } from './resolvePluginScreenshot';

interface Props {
  /**
   * Installed plugin rows from the main process.
   */
  plugins: PluginInfo[];

  /**
   * Catalog listing shown in the marketplace detail modal, if any.
   */
  catalogDetailEntry: PluginCatalogEntry | null;

  /**
   * Remote manifest preview for the open catalog listing.
   */
  catalogPreview: PluginGitPreview | null;

  /**
   * Load state for the catalog manifest preview.
   */
  catalogPreviewLoadState: 'idle' | 'loading' | 'loaded' | 'error';

  /**
   * Preview fetch error message, if any.
   */
  catalogPreviewError: string | null;

  /**
   * Catalog listing id with an in-flight install/update action, if any.
   */
  catalogActionBusyId: string | null;

  /**
   * Closes the marketplace detail modal.
   */
  onCloseCatalogDetail: () => void;

  /**
   * Installs the open catalog listing.
   */
  onCatalogInstall: (entry: PluginCatalogEntry) => void;

  /**
   * Updates the installed catalog listing from git.
   */
  onCatalogUpdate: (pluginId: string) => void;

  /**
   * Plugin shown in the installed detail modal, if any.
   */
  detailPlugin: PluginInfo | null;

  /**
   * Loaded description markdown for the installed detail modal.
   */
  descriptionMarkdown: string;

  /**
   * Load state for the installed detail description markdown.
   */
  descriptionLoadState: 'idle' | 'loading' | 'loaded' | 'error';

  /**
   * Screenshot URLs for the installed detail modal.
   */
  detailScreenshotSrcs: string[];

  /**
   * Closes the installed detail modal.
   */
  onCloseDetail: () => void;

  /**
   * Plugin awaiting enable confirmation after install, if any.
   */
  pendingInstall: PluginInfo | null;

  /**
   * Rejects a pending install and removes the plugin.
   */
  onCancelPendingInstall: () => void;

  /**
   * Confirms a pending install and enables the plugin.
   */
  onConfirmPendingInstall: () => void;
}

/**
 * Renders plugin detail and enable-permission modals for the Plugins view.
 */
export function PluginModals({
  plugins,
  catalogDetailEntry,
  catalogPreview,
  catalogPreviewLoadState,
  catalogPreviewError,
  catalogActionBusyId,
  onCloseCatalogDetail,
  onCatalogInstall,
  onCatalogUpdate,
  detailPlugin,
  descriptionMarkdown,
  descriptionLoadState,
  detailScreenshotSrcs,
  onCloseDetail,
  pendingInstall,
  onCancelPendingInstall,
  onConfirmPendingInstall
}: Props): JSX.Element {
  return (
    <>
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
          onClose={onCloseCatalogDetail}
          onInstall={() => onCatalogInstall(catalogDetailEntry)}
          onUpdate={() => {
            const installed = findInstalledCatalogPlugin(plugins, catalogDetailEntry.id);
            if (installed) {
              onCatalogUpdate(installed.id);
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
          onClose={onCloseDetail}
        />
      ) : null}

      {pendingInstall ? (
        <EnableModal
          plugin={pendingInstall}
          onCancel={onCancelPendingInstall}
          onConfirm={onConfirmPendingInstall}
        />
      ) : null}
    </>
  );
}
