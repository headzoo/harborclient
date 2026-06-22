import { BrowserWindow, Menu } from 'electron';
import { buildMenu } from '#/main/menu';

let mainWindow: BrowserWindow | null = null;
let sidebarVisible = true;
let aiSidebarVisible = false;

/**
 * Returns the sidebar visibility state reflected in the View menu checkbox.
 */
export function getMenuSidebarVisible(): boolean {
  return sidebarVisible;
}

/**
 * Returns the AI sidebar visibility state reflected in the View menu checkbox.
 */
export function getMenuAiSidebarVisible(): boolean {
  return aiSidebarVisible;
}

/**
 * Updates the View menu Sidebar checkbox and rebuilds the menu when the value changes.
 *
 * @param visible - Whether the sidebar is currently visible in the renderer.
 */
export function setMenuSidebarVisible(visible: boolean): void {
  if (sidebarVisible === visible) {
    return;
  }
  sidebarVisible = visible;
  rebuildAppMenu();
}

/**
 * Updates the View menu AI checkbox and rebuilds the menu when the value changes.
 *
 * @param visible - Whether the AI sidebar is currently visible in the renderer.
 */
export function setMenuAiSidebarVisible(visible: boolean): void {
  if (aiSidebarVisible === visible) {
    return;
  }
  aiSidebarVisible = visible;
  rebuildAppMenu();
}

/**
 * Registers the browser window used when rebuilding the application menu.
 *
 * @param window - Active main window, or null when closed.
 */
export function setMenuWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

/**
 * Rebuilds the application menu so updated shortcut accelerators take effect.
 */
export function rebuildAppMenu(): void {
  if (mainWindow == null || mainWindow.isDestroyed()) {
    return;
  }
  Menu.setApplicationMenu(buildMenu(mainWindow, sidebarVisible, aiSidebarVisible));
}
