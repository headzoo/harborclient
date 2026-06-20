import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import type { IDatabase } from '#/main/db/IDatabase';
import { executeRequest } from '#/main/http';
import { runScript } from '#/main/scripts';
import {
  getDatabaseProvider,
  getFirestoreSettings,
  getMySqlSettings,
  getPostgresSettings,
  setDatabaseProvider,
  setFirestoreSettings,
  setMySqlSettings,
  setPostgresSettings
} from '#/main/settings/databaseSettings';
import { getGeneralSettings, setGeneralSettings } from '#/main/settings/generalSettings';
import { getSqliteSettings, setSqliteSettings } from '#/main/settings/sqliteSettings';
import type {
  DatabaseProvider,
  FirestoreSettings,
  GeneralSettings,
  MySqlSettings,
  PostgresSettings,
  SaveRequestInput,
  ScriptRunInput,
  SendRequestInput,
  SqliteSettings,
  ThemeSource,
  Variable,
  KeyValue
} from '#/shared/types';

const THEME_SETTING_KEY = 'theme';

const activeRequests = new Map<string, AbortController>();

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
  ipcMain.handle('collections:list', () => db.listCollections());

  ipcMain.handle('collections:create', (_event, name: string) => db.createCollection(name));

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

  ipcMain.handle('collections:delete', (_event, id: number) => db.deleteCollection(id));

  ipcMain.handle('collections:export', async (_event, id: number) => {
    const data = await db.exportCollectionData(id);
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

  ipcMain.handle('dialog:openFiles', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    };
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (canceled || filePaths.length === 0) {
      return [];
    }

    return filePaths;
  });

  ipcMain.handle('environments:list', () => db.listEnvironments());

  ipcMain.handle('environments:create', (_event, name: string) => db.createEnvironment(name));

  ipcMain.handle('environments:update', (_event, id: number, name: string, variables: Variable[]) =>
    db.updateEnvironment(id, name, variables)
  );

  ipcMain.handle('environments:delete', (_event, id: number) => db.deleteEnvironment(id));

  ipcMain.handle('requests:list', (_event, collectionId: number) => db.listRequests(collectionId));

  ipcMain.handle('requests:save', (_event, req: SaveRequestInput) => db.saveRequest(req));

  ipcMain.handle('requests:delete', (_event, id: number) => db.deleteRequest(id));

  ipcMain.handle('http:send', async (_event, req: SendRequestInput, requestId?: string) => {
    const controller = new AbortController();
    if (requestId) {
      activeRequests.set(requestId, controller);
    }

    try {
      const settings = getGeneralSettings();
      return await executeRequest(req, settings, controller.signal);
    } finally {
      if (requestId) {
        activeRequests.delete(requestId);
      }
    }
  });

  ipcMain.handle('http:cancel', (_event, requestId: string) => {
    activeRequests.get(requestId)?.abort();
  });

  ipcMain.handle('scripts:run', (_event, input: ScriptRunInput) => runScript(input));

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('theme:get', async () => parseThemeSource(await db.getSetting(THEME_SETTING_KEY)));

  ipcMain.handle('theme:set', async (_event, theme: ThemeSource) => {
    nativeTheme.themeSource = theme;
    await db.setSetting(THEME_SETTING_KEY, theme);
  });

  ipcMain.handle('general:getSettings', () => getGeneralSettings());

  ipcMain.handle('general:setSettings', (_event, settings: GeneralSettings) => {
    setGeneralSettings(settings);
  });

  ipcMain.handle('sqlite:getSettings', () => getSqliteSettings());

  ipcMain.handle('sqlite:setSettings', (_event, settings: SqliteSettings) => {
    setSqliteSettings(settings);
  });

  ipcMain.handle('database:getProvider', () => getDatabaseProvider());

  ipcMain.handle('database:setProvider', (_event, provider: DatabaseProvider) => {
    setDatabaseProvider(provider);
  });

  ipcMain.handle('firestore:getSettings', () => getFirestoreSettings());

  ipcMain.handle('firestore:setSettings', (_event, settings: FirestoreSettings) => {
    setFirestoreSettings(settings);
  });

  ipcMain.handle('mysql:getSettings', () => getMySqlSettings());

  ipcMain.handle('mysql:setSettings', (_event, settings: MySqlSettings) => {
    setMySqlSettings(settings);
  });

  ipcMain.handle('postgres:getSettings', () => getPostgresSettings());

  ipcMain.handle('postgres:setSettings', (_event, settings: PostgresSettings) => {
    setPostgresSettings(settings);
  });
}
