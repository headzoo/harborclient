import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { handle } from '#/main/ipc/handle';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';

/**
 * Registers IPC handlers for generic file save dialogs.
 */
export function registerFileHandlers(): void {
  // Writes arbitrary text to a file chosen via a native save dialog.
  handle('files:saveText', ipcArgSchemas.saveTextFile, async (_event, content, defaultPath) => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      defaultPath,
      filters: [
        { name: 'Text', extensions: ['txt', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    };
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await writeFile(filePath, content, 'utf-8');
    return { canceled: false, path: filePath };
  });
}
