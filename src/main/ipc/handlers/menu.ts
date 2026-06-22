import { setMenuAiSidebarVisible, setMenuSidebarVisible } from '#/main/appMenu';
import { handle } from '#/main/ipc/handle';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';

/**
 * Registers IPC handlers that keep the application menu in sync with renderer state.
 */
export function registerMenuHandlers(): void {
  handle('menu:setSidebarVisible', ipcArgSchemas.menuSidebarVisible, (_event, visible) => {
    setMenuSidebarVisible(visible);
  });

  handle('menu:setAiSidebarVisible', ipcArgSchemas.menuAiSidebarVisible, (_event, visible) => {
    setMenuAiSidebarVisible(visible);
  });
}
