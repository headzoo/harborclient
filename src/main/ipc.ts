import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import type { IDatabase } from '#/main/db/IDatabase';
import { executeRequest } from '#/main/http';
import { runScript } from '#/main/scripts';
import type {
  SaveRequestInput,
  ScriptRunInput,
  SendRequestInput,
  ThemeSource,
  Variable,
  KeyValue
} from '#/shared/types';

const THEME_SETTING_KEY = 'theme';

/**
 * Validates and returns a theme source value.
 *
 * @param value - Raw stored theme value.
 * @returns A valid theme source, defaulting to system.
 */
function parseThemeSource(value: string | undefined): ThemeSource {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

/**
 * Registers IPC handlers that bridge renderer calls to db and HTTP modules.
 */
export function registerIpcHandlers(db: IDatabase): void {
  // Returns all collections, ordered by name.
  ipcMain.handle('collections:list', () => db.listCollections());

  // Creates a new collection with the given display name.
  ipcMain.handle('collections:create', (_event, name: string) => db.createCollection(name));

  // Updates a collection's name, variables, and headers.
  ipcMain.handle(
    'collections:update',
    (
      _event,
      id: number,
      name: string,
      variables: Variable[],
      headers: KeyValue[],
      preRequestScript: string,
      postRequestScript: string
    ) => db.updateCollection(id, name, variables, headers, preRequestScript, postRequestScript)
  );

  // Deletes a collection and all of its saved requests.
  ipcMain.handle('collections:delete', (_event, id: number) => db.deleteCollection(id));

  // Exports a collection to a JSON file via a native save dialog.
  ipcMain.handle('collections:export', async (_event, id: number) => {
    const data = db.exportCollectionData(id);
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      defaultPath: `${data.name}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    };
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { canceled: false, path: filePath };
  });

  // Imports a collection from a JSON file via a native open dialog.
  ipcMain.handle('collections:import', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      properties: ['openFile'] as Array<'openFile'>,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    };
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const raw = await readFile(filePaths[0], 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return db.importCollectionData(parsed);
  });

  // Returns all saved requests in a collection, ordered by sort order then name.
  ipcMain.handle('requests:list', (_event, collectionId: number) => db.listRequests(collectionId));

  // Inserts a new saved request or updates an existing one.
  ipcMain.handle('requests:save', (_event, req: SaveRequestInput) => db.saveRequest(req));

  // Deletes a saved request by ID.
  ipcMain.handle('requests:delete', (_event, id: number) => db.deleteRequest(id));

  // Sends an HTTP request and returns the response (status, headers, body, timing).
  ipcMain.handle('http:send', (_event, req: SendRequestInput) => executeRequest(req));

  // Runs a pre/post script in an isolated-vm sandbox.
  ipcMain.handle('scripts:run', (_event, input: ScriptRunInput) => runScript(input));

  // Returns the application version from package.json.
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Returns the persisted theme preference.
  ipcMain.handle('theme:get', () => parseThemeSource(db.getSetting(THEME_SETTING_KEY)));

  // Persists and applies a theme preference.
  ipcMain.handle('theme:set', (_event, theme: ThemeSource) => {
    nativeTheme.themeSource = theme;
    db.setSetting(THEME_SETTING_KEY, theme);
  });
}
