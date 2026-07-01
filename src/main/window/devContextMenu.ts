import { Menu, type BrowserWindow } from 'electron';

/**
 * Attaches a right-click "Inspect Element" context menu to the window.
 *
 * Callers should gate this with `isDeveloperToolsEnabled()` so packaged builds only
 * expose developer tooling when `--dev-mode` is passed.
 *
 * @param window - Main application window to augment.
 */
export function attachDevContextMenu(window: BrowserWindow): void {
  const { webContents } = window;
  webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Inspect Element',
        click: () => {
          webContents.inspectElement(params.x, params.y);
          if (!webContents.isDevToolsOpened()) {
            webContents.openDevTools();
          }
        }
      }
    ]);
    menu.popup({ window });
  });
}
