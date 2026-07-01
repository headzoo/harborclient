import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faDownload, faGear, faPuzzlePiece, faStore } from '#/renderer/src/fontawesome';
import type { PluginsSidebarSection } from './sidebarTypes';

/**
 * Sidebar navigation entries for the Plugins screen (order, labels, and icons).
 */
export const PLUGIN_SECTIONS: Array<{
  value: PluginsSidebarSection;
  label: string;
  icon: IconDefinition;
}> = [
  { value: 'installed', label: 'Installed', icon: faPuzzlePiece },
  { value: 'marketplace', label: 'Marketplace', icon: faStore },
  { value: 'install', label: 'Install', icon: faDownload },
  { value: 'settings', label: 'Settings', icon: faGear }
];
