import { useSyncExternalStore } from 'react';
import type { RegisteredPluginTheme, RegisteredSettingsSection } from '#/shared/plugin/types';
import {
  getRegisteredPluginThemes,
  getRegisteredSettingsSections,
  subscribePluginRegistry
} from '#/renderer/src/plugins/registry';

/**
 * Subscribes to plugin registry settings sections.
 */
export function usePluginSettingsSections(): RegisteredSettingsSection[] {
  return useSyncExternalStore(subscribePluginRegistry, getRegisteredSettingsSections, () => []);
}

/**
 * Subscribes to plugin registry themes.
 */
export function usePluginThemes(): RegisteredPluginTheme[] {
  return useSyncExternalStore(subscribePluginRegistry, getRegisteredPluginThemes, () => []);
}
