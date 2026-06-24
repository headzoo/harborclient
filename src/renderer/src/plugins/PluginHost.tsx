import { useEffect } from 'react';
import {
  reloadAllPlugins,
  reloadPlugin,
  unloadAllPlugins
} from '#/renderer/src/plugins/pluginLoader';

/**
 * Mounts the plugin host lifecycle and hot-reload listeners.
 */
export function PluginHost(): null {
  /**
   * Loads enabled plugins on mount and when the plugin list changes.
   */
  useEffect(() => {
    let active = true;
    void reloadAllPlugins().catch((error) => {
      console.error('Failed to load plugins:', error);
    });
    const unsubscribe = window.api.onPluginsChanged((pluginId) => {
      if (!active) {
        return;
      }
      void reloadPlugin(pluginId).catch((error) => {
        console.error(`Failed to reload plugin ${pluginId}:`, error);
      });
    });
    return () => {
      active = false;
      unsubscribe();
      void unloadAllPlugins();
    };
  }, []);

  return null;
}
