import Store from 'electron-store';

const ENABLEMENT_KEY = 'plugins.enablement';
const UNPACKED_KEY = 'plugins.unpacked';

interface PluginStoreShape {
  [ENABLEMENT_KEY]: Record<string, boolean>;
  [UNPACKED_KEY]: Record<string, string>;
}

let store: Store<PluginStoreShape> | null = null;

/**
 * Returns the lazy electron-store instance for plugin enablement and dev paths.
 */
function getStore(): Store<PluginStoreShape> {
  if (!store) {
    store = new Store<PluginStoreShape>({
      name: 'settings',
      defaults: {
        [ENABLEMENT_KEY]: {},
        [UNPACKED_KEY]: {}
      }
    });
  }
  return store;
}

/**
 * Returns persisted plugin enablement keyed by plugin id.
 */
export function getPluginEnablement(): Record<string, boolean> {
  return { ...getStore().get(ENABLEMENT_KEY, {}) };
}

/**
 * Persists whether a plugin is enabled.
 *
 * @param pluginId - Plugin manifest id.
 * @param enabled - Whether the plugin should activate.
 */
export function setPluginEnabled(pluginId: string, enabled: boolean): void {
  const current = getPluginEnablement();
  current[pluginId] = enabled;
  getStore().set(ENABLEMENT_KEY, current);
}

/**
 * Removes enablement state for a plugin id.
 *
 * @param pluginId - Plugin manifest id.
 */
export function clearPluginEnabled(pluginId: string): void {
  const current = getPluginEnablement();
  delete current[pluginId];
  getStore().set(ENABLEMENT_KEY, current);
}

/**
 * Returns persisted unpacked plugin source directories keyed by plugin id.
 */
export function getUnpackedPluginPaths(): Record<string, string> {
  return { ...getStore().get(UNPACKED_KEY, {}) };
}

/**
 * Persists an unpacked plugin source directory.
 *
 * @param pluginId - Plugin manifest id.
 * @param directory - Absolute path to the plugin project folder.
 */
export function setUnpackedPluginPath(pluginId: string, directory: string): void {
  const current = getUnpackedPluginPaths();
  current[pluginId] = directory;
  getStore().set(UNPACKED_KEY, current);
}

/**
 * Removes an unpacked plugin registration.
 *
 * @param pluginId - Plugin manifest id.
 */
export function removeUnpackedPluginPath(pluginId: string): void {
  const current = getUnpackedPluginPaths();
  delete current[pluginId];
  getStore().set(UNPACKED_KEY, current);
}

/**
 * Clears every unpacked plugin registration.
 */
export function clearAllUnpackedPluginPaths(): void {
  getStore().set(UNPACKED_KEY, {});
}

/**
 * Resets plugin enablement and unpacked dev paths (for unit tests).
 */
export function clearDevRegistryForTesting(): void {
  getStore().set(ENABLEMENT_KEY, {});
  getStore().set(UNPACKED_KEY, {});
}
