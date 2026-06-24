import toast from 'react-hot-toast';
import * as React from 'react';
import type { PluginContext, PluginManifest, Disposable } from '#/shared/plugin/types';
import {
  registerSettingsSectionContribution,
  registerThemeContribution
} from '#/renderer/src/plugins/registry';
import { pluginSettingsSectionId } from '#/shared/plugin/types';

const commandHandlers = new Map<string, Set<(...args: unknown[]) => void | Promise<void>>>();

/**
 * Asserts that a contribution id is declared in the plugin manifest.
 *
 * @param manifest - Plugin manifest.
 * @param key - contributes.* key to inspect.
 * @param id - Contribution id from the registrar call.
 */
function assertManifestContribution(
  manifest: PluginManifest,
  key: 'settingsSections' | 'themes' | 'commands',
  id: string
): void {
  const entries = manifest.contributes?.[key];
  if (!Array.isArray(entries) || !entries.some((entry) => 'id' in entry && entry.id === id)) {
    throw new Error(`Contribution id "${id}" is not declared in manifest.contributes.${key}.`);
  }
}

/**
 * Registers a command handler scoped to one plugin activation.
 *
 * @param pluginId - Plugin manifest id.
 * @param commandId - Command id declared in the manifest.
 * @param handler - Handler invoked when the command executes.
 */
function registerCommand(
  pluginId: string,
  commandId: string,
  handler: (...args: unknown[]) => void | Promise<void>
): Disposable {
  const scopedId = `${pluginId}:${commandId}`;
  const handlers = commandHandlers.get(scopedId) ?? new Set();
  handlers.add(handler);
  commandHandlers.set(scopedId, handlers);
  return {
    dispose: () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        commandHandlers.delete(scopedId);
      }
    }
  };
}

/**
 * Executes a registered plugin command.
 *
 * @param pluginId - Plugin manifest id.
 * @param commandId - Command id declared in the manifest.
 * @param args - Arguments passed to the handler.
 */
export async function executePluginCommand(
  pluginId: string,
  commandId: string,
  ...args: unknown[]
): Promise<void> {
  const scopedId = `${pluginId}:${commandId}`;
  const handlers = commandHandlers.get(scopedId);
  if (!handlers) {
    throw new Error(`Unknown plugin command: ${scopedId}`);
  }
  for (const handler of handlers) {
    await handler(...args);
  }
}

/**
 * Builds the renderer plugin activation context for one plugin.
 *
 * @param pluginId - Plugin manifest id.
 * @param manifest - Parsed plugin manifest.
 */
export function createPluginContext(pluginId: string, manifest: PluginManifest): PluginContext {
  const subscriptions: Disposable[] = [];
  const hasUi = manifest.permissions.includes('ui');
  const hasStorage = manifest.permissions.includes('storage');

  const assertUi = (): void => {
    if (!hasUi) {
      throw new Error(`Plugin ${pluginId} lacks permission: ui`);
    }
  };

  const assertStorage = (): void => {
    if (!hasStorage) {
      throw new Error(`Plugin ${pluginId} lacks permission: storage`);
    }
  };

  return {
    react: React,
    subscriptions,
    storage: {
      get: async <T>(key: string) => {
        assertStorage();
        return (await window.api.getPluginStorage(pluginId, key)) as T | undefined;
      },
      set: async <T>(key: string, value: T) => {
        assertStorage();
        await window.api.setPluginStorage(pluginId, key, value);
      }
    },
    commands: {
      register: (id, handler) => {
        assertUi();
        assertManifestContribution(manifest, 'commands', id);
        return registerCommand(pluginId, id, handler);
      },
      execute: async (id, ...args) => {
        const [ownerId, commandId] = id.includes(':') ? id.split(':', 2) : [pluginId, id];
        await executePluginCommand(ownerId, commandId, ...args);
      }
    },
    themes: {
      register: (theme) => {
        assertUi();
        assertManifestContribution(manifest, 'themes', theme.id);
        return registerThemeContribution(pluginId, theme);
      },
      getActive: async () => {
        const theme = await window.api.getTheme();
        if (theme.startsWith('plugin:')) {
          const [, activePluginId, themeId] = theme.split(':');
          return { source: 'plugin', pluginId: activePluginId, themeId };
        }
        return { source: 'builtin', id: theme as 'light' | 'dark' | 'system' | 'high-contrast' };
      },
      onDidChange: (listener) => {
        let active = true;
        const poll = async (): Promise<void> => {
          if (!active) return;
          const theme = await window.api.getTheme();
          if (theme.startsWith('plugin:')) {
            const [, activePluginId, themeId] = theme.split(':');
            listener({ source: 'plugin', pluginId: activePluginId, themeId });
          } else {
            listener({
              source: 'builtin',
              id: theme as 'light' | 'dark' | 'system' | 'high-contrast'
            });
          }
        };
        void poll();
        const interval = window.setInterval(() => {
          void poll();
        }, 1000);
        return {
          dispose: () => {
            active = false;
            window.clearInterval(interval);
          }
        };
      }
    },
    ui: {
      registerSettingsSection: (section) => {
        assertUi();
        assertManifestContribution(manifest, 'settingsSections', section.id);
        return registerSettingsSectionContribution(pluginId, {
          id: pluginSettingsSectionId(pluginId, section.id),
          title: section.title,
          Component: section.Component
        });
      },
      registerSidebarPanel: () => {
        throw new Error('registerSidebarPanel is not available in this HarborClient version.');
      },
      registerSidebarSection: () => {
        throw new Error('registerSidebarSection is not available in this HarborClient version.');
      },
      registerMainView: () => {
        throw new Error('registerMainView is not available in this HarborClient version.');
      },
      registerRequestTab: () => {
        throw new Error('registerRequestTab is not available in this HarborClient version.');
      },
      registerResponseTab: () => {
        throw new Error('registerResponseTab is not available in this HarborClient version.');
      },
      registerCollectionSettingsTab: () => {
        throw new Error(
          'registerCollectionSettingsTab is not available in this HarborClient version.'
        );
      },
      registerFooterPanel: () => {
        throw new Error('registerFooterPanel is not available in this HarborClient version.');
      },
      registerMenuItem: () => {
        throw new Error('registerMenuItem is not available in this HarborClient version.');
      },
      registerRequestToolbarAction: () => {
        throw new Error(
          'registerRequestToolbarAction is not available in this HarborClient version.'
        );
      },
      registerContextMenuItem: () => {
        throw new Error('registerContextMenuItem is not available in this HarborClient version.');
      },
      registerStatusBarItem: () => {
        throw new Error('registerStatusBarItem is not available in this HarborClient version.');
      },
      showToast: (message, options) => {
        assertUi();
        toast(message, { duration: options?.duration ?? 2000 });
      }
    }
  };
}
