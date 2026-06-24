import type {
  RegisteredPluginTheme,
  RegisteredSettingsSection,
  ThemeContribution,
  Disposable
} from '#/shared/plugin/types';

type Listener = () => void;

interface PluginRegistryState {
  settingsSections: RegisteredSettingsSection[];
  themes: RegisteredPluginTheme[];
}

const state: PluginRegistryState = {
  settingsSections: [],
  themes: []
};

const listeners = new Set<Listener>();

/** Stable snapshots returned from getSnapshot for useSyncExternalStore. */
let cachedSettingsSections: RegisteredSettingsSection[] = [];
let cachedThemes: RegisteredPluginTheme[] = [];

/**
 * Rebuilds cached snapshots after registry mutations so getSnapshot returns
 * stable references until the next emitChange.
 */
function rebuildCachedSnapshots(): void {
  cachedSettingsSections = [...state.settingsSections].sort((left, right) =>
    left.title.localeCompare(right.title)
  );
  cachedThemes = [...state.themes].sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * Notifies subscribers that registry contents changed.
 */
function emitChange(): void {
  rebuildCachedSnapshots();
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribes to registry changes for useSyncExternalStore.
 *
 * @param listener - Called when contributions change.
 */
export function subscribePluginRegistry(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns the current registry snapshot with stable array references.
 */
export function getPluginRegistrySnapshot(): PluginRegistryState {
  return {
    settingsSections: cachedSettingsSections,
    themes: cachedThemes
  };
}

/**
 * Registers a plugin settings section contribution.
 *
 * @param pluginId - Plugin manifest id.
 * @param section - Settings section contribution metadata.
 */
export function registerSettingsSectionContribution(
  pluginId: string,
  section: Omit<RegisteredSettingsSection, 'pluginId'>
): Disposable {
  const entry: RegisteredSettingsSection = { pluginId, ...section };
  state.settingsSections = state.settingsSections.filter(
    (item) => !(item.pluginId === pluginId && item.id === section.id)
  );
  state.settingsSections.push(entry);
  emitChange();
  return {
    dispose: () => {
      state.settingsSections = state.settingsSections.filter((item) => item !== entry);
      emitChange();
    }
  };
}

/**
 * Registers a plugin theme contribution.
 *
 * @param pluginId - Plugin manifest id.
 * @param theme - Theme contribution metadata.
 */
export function registerThemeContribution(pluginId: string, theme: ThemeContribution): Disposable {
  const entry: RegisteredPluginTheme = {
    pluginId,
    id: theme.id,
    title: theme.title,
    type: theme.type,
    colors: theme.colors,
    stylesheet: theme.stylesheet
  };
  state.themes = state.themes.filter(
    (item) => !(item.pluginId === pluginId && item.id === theme.id)
  );
  state.themes.push(entry);
  emitChange();
  return {
    dispose: () => {
      state.themes = state.themes.filter((item) => item !== entry);
      emitChange();
    }
  };
}

/**
 * Removes every contribution owned by one plugin.
 *
 * @param pluginId - Plugin manifest id.
 */
export function clearPluginContributions(pluginId: string): void {
  state.settingsSections = state.settingsSections.filter((item) => item.pluginId !== pluginId);
  state.themes = state.themes.filter((item) => item.pluginId !== pluginId);
  emitChange();
}

/**
 * Returns registered settings sections sorted by title.
 */
export function getRegisteredSettingsSections(): RegisteredSettingsSection[] {
  return cachedSettingsSections;
}

/**
 * Returns registered plugin themes sorted by title.
 */
export function getRegisteredPluginThemes(): RegisteredPluginTheme[] {
  return cachedThemes;
}
