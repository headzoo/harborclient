import type { PluginInfo } from '#/shared/plugin/types';
import { createPluginContext } from '#/renderer/src/plugins/createPluginContext';
import { clearPluginContributions } from '#/renderer/src/plugins/registry';
import { applyPersistedPluginTheme } from '#/renderer/src/plugins/themeRuntime';

interface LoadedPlugin {
  pluginId: string;
  deactivate?: () => void;
  disposables: Array<{ dispose: () => void }>;
}

const loaded = new Map<string, LoadedPlugin>();

/**
 * Dynamically imports a plugin bundle from source text.
 *
 * @param source - Bundled ESM source returned by the main process.
 */
async function importPluginModule(
  source: string
): Promise<{ activate?: (hc: unknown) => void | Promise<void>; deactivate?: () => void }> {
  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return (await import(/* @vite-ignore */ url)) as {
      activate?: (hc: unknown) => void | Promise<void>;
      deactivate?: () => void;
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Deactivates and unloads one plugin from the renderer host.
 *
 * @param pluginId - Plugin manifest id.
 */
export async function unloadPlugin(pluginId: string): Promise<void> {
  const entry = loaded.get(pluginId);
  if (!entry) {
    return;
  }
  entry.deactivate?.();
  for (const disposable of entry.disposables) {
    disposable.dispose();
  }
  clearPluginContributions(pluginId);
  if (entry.pluginId) {
    try {
      await window.api.deactivatePluginMain(pluginId);
    } catch {
      // Main entry may not have been active.
    }
  }
  loaded.delete(pluginId);
  await applyPersistedPluginTheme();
}

/**
 * Activates one enabled plugin in the renderer host.
 *
 * @param plugin - Plugin metadata from the main process.
 */
async function loadPlugin(plugin: PluginInfo): Promise<void> {
  if (!plugin.enabled || plugin.error) {
    return;
  }

  await unloadPlugin(plugin.id);

  if (!plugin.manifest.renderer) {
    if (plugin.manifest.main) {
      const mainSource = await window.api.readPluginEntry(plugin.id, 'main');
      await window.api.activatePluginMain(plugin.id, mainSource, plugin.permissions);
    }
    return;
  }

  const source = await window.api.readPluginEntry(plugin.id, 'renderer');
  const module = await importPluginModule(source);
  if (typeof module.activate !== 'function') {
    throw new Error(`Plugin ${plugin.id} renderer entry must export activate(hc).`);
  }

  const hc = createPluginContext(plugin.id, plugin.manifest);
  await module.activate(hc);
  loaded.set(plugin.id, {
    pluginId: plugin.id,
    deactivate: module.deactivate,
    disposables: [...hc.subscriptions]
  });

  if (plugin.manifest.main) {
    const mainSource = await window.api.readPluginEntry(plugin.id, 'main');
    await window.api.activatePluginMain(plugin.id, mainSource, plugin.permissions);
  }

  await applyPersistedPluginTheme();
}

/**
 * Reloads all enabled plugins from disk.
 */
export async function reloadAllPlugins(): Promise<void> {
  const plugins = await window.api.listPlugins();
  for (const plugin of plugins) {
    if (plugin.enabled) {
      await loadPlugin(plugin);
    } else {
      await unloadPlugin(plugin.id);
    }
  }
}

/**
 * Reloads one plugin by id.
 *
 * @param pluginId - Plugin manifest id.
 */
export async function reloadPlugin(pluginId: string): Promise<void> {
  const plugins = await window.api.listPlugins();
  const plugin = plugins.find((entry) => entry.id === pluginId);
  if (!plugin || !plugin.enabled) {
    await unloadPlugin(pluginId);
    return;
  }
  await loadPlugin(plugin);
}

/**
 * Unloads every plugin currently held by the renderer host.
 */
export async function unloadAllPlugins(): Promise<void> {
  for (const pluginId of [...loaded.keys()]) {
    await unloadPlugin(pluginId);
  }
}
