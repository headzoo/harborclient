import { BrowserWindow, Menu } from 'electron';
import { buildMenu } from '#/main/menu';

let mainWindow: BrowserWindow | null = null;

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
  Menu.setApplicationMenu(buildMenu(mainWindow));
}
