import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { ensureInviteKeys, getInviteIdentity, importInviteKeyPair } from '#/main/invite/inviteKeys';
import { createInviteToken, verifyInviteToken } from '#/main/invite/inviteToken';
import { addTrustedKey, listTrustedKeys, removeTrustedKey } from '#/main/invite/trustedKeys';
import { readFile, writeFile } from 'fs/promises';
import type { IDatabase } from '#/main/db/IDatabase';
import { RoutingDatabase } from '#/main/db/RoutingDatabase';
import {
  buildCookieHeader,
  captureSetCookies,
  getCookiesForDomain,
  setCookiesForDomain
} from '#/main/cookieJar';
import { buildUrl, executeRequest } from '#/main/http';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';
import { runScript } from '#/main/scripts';
import {
  deleteDatabaseConnection,
  findMatchingConnection,
  getActiveDatabaseId,
  listDatabaseConnections,
  saveDatabaseConnection,
  setActiveDatabaseId
} from '#/main/settings/databaseSettings';
import { getSlotForConnection } from '#/main/settings/databaseSlots';
import { getGeneralSettings, setGeneralSettings } from '#/main/settings/generalSettings';
import {
  deleteRequestEditorTab,
  getRequestEditorTab,
  setRequestEditorTab
} from '#/main/settings/requestEditorSettings';
import type { DatabaseConnection, ThemeSource } from '#/shared/types';

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
 * Registers an IPC handler that validates positional arguments before invoking the callback.
 *
 * @param channel - IPC channel name.
 * @param args - Zod tuple schema for handler arguments.
 * @param fn - Handler invoked with validated arguments.
 */
function handle<S extends z.ZodTuple>(
  channel: string,
  args: S,
  fn: (event: IpcMainInvokeEvent, ...handlerArgs: z.infer<S>) => unknown
): void {
  ipcMain.handle(channel, (event, ...raw) => {
    const result = args.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid IPC argument for "${channel}": ${result.error.message}`);
    }
    return fn(event, ...(result.data as z.infer<S>));
  });
}

/**
 * Registers IPC handlers that bridge renderer calls to db and HTTP modules.
 */
export function registerIpcHandlers(db: IDatabase): void {
  // Lists all saved request collections.
  handle('collections:list', ipcArgSchemas.none, () => db.listCollections());

  // Creates a new collection with the given display name.
  handle('collections:create', ipcArgSchemas.name, (_event, collectionName) =>
    db.createCollection(collectionName)
  );

  // Updates a collection's name, variables, headers, and scripts.
  handle(
    'collections:update',
    ipcArgSchemas.collectionUpdate,
    (_event, id, collectionName, variables, headers, preRequestScript, postRequestScript) =>
      db.updateCollection(
        id,
        collectionName,
        variables,
        headers,
        preRequestScript,
        postRequestScript
      )
  );

  // Deletes a collection and all of its folders and requests.
  handle('collections:delete', ipcArgSchemas.dbId, (_event, id) => db.deleteCollection(id));

  // Exports a collection to a JSON file via a native save dialog.
  handle('collections:export', ipcArgSchemas.dbId, async (_event, id) => {
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

  // Imports a collection from a JSON file selected via a native open dialog.
  handle('collections:import', ipcArgSchemas.none, async () => {
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

  // Moves a collection to a different database connection.
  handle('collections:move', ipcArgSchemas.collectionMove, (_event, id, targetConnectionId) => {
    if (!(db instanceof RoutingDatabase)) {
      throw new Error('Collection move is unavailable.');
    }
    return db.moveCollection(id, targetConnectionId);
  });

  // Opens a native file picker and returns selected absolute file paths.
  handle('dialog:openFiles', ipcArgSchemas.none, async () => {
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

  // Lists all named variable environments.
  handle('environments:list', ipcArgSchemas.none, () => db.listEnvironments());

  // Creates a new environment with the given display name.
  handle('environments:create', ipcArgSchemas.name, (_event, environmentName) =>
    db.createEnvironment(environmentName)
  );

  // Updates an environment's name and variables.
  handle(
    'environments:update',
    ipcArgSchemas.environmentUpdate,
    (_event, id, environmentName, variables) => db.updateEnvironment(id, environmentName, variables)
  );

  // Deletes an environment by id.
  handle('environments:delete', ipcArgSchemas.dbId, (_event, id) => db.deleteEnvironment(id));

  // Lists saved requests in a collection.
  handle('requests:list', ipcArgSchemas.collectionId, (_event, collectionId) =>
    db.listRequests(collectionId)
  );

  // Inserts or updates a saved request.
  handle('requests:save', ipcArgSchemas.saveRequest, (_event, req) => db.saveRequest(req));

  // Deletes a saved request by id.
  handle('requests:delete', ipcArgSchemas.dbId, (_event, id) => db.deleteRequest(id));

  // Lists folders in a collection.
  handle('folders:list', ipcArgSchemas.collectionId, (_event, collectionId) =>
    db.listFolders(collectionId)
  );

  // Creates a folder in a collection.
  handle('folders:create', ipcArgSchemas.folderCreate, (_event, collectionId, folderName) =>
    db.createFolder(collectionId, folderName)
  );

  // Renames a folder.
  handle('folders:rename', ipcArgSchemas.folderRename, (_event, id, folderName) =>
    db.renameFolder(id, folderName)
  );

  // Deletes a folder and its requests.
  handle('folders:delete', ipcArgSchemas.dbId, (_event, id) => db.deleteFolder(id));

  // Reorders folders within a collection.
  handle('folders:reorder', ipcArgSchemas.folderReorder, (_event, collectionId, orderedFolderIds) =>
    db.reorderFolders(collectionId, orderedFolderIds)
  );

  // Reorders requests within a collection folder (or at collection root).
  handle(
    'requests:reorder',
    ipcArgSchemas.requestReorder,
    (_event, collectionId, folderId, orderedRequestIds) =>
      db.reorderRequests(collectionId, folderId, orderedRequestIds)
  );

  // Moves a request to a folder and position within the collection.
  handle('requests:move', ipcArgSchemas.requestMove, (_event, requestId, folderId, index) =>
    db.moveRequest(requestId, folderId, index)
  );

  // Sends an HTTP request and captures response cookies in the jar.
  handle('http:send', ipcArgSchemas.sendRequest, async (_event, req, requestId) => {
    const controller = new AbortController();
    if (requestId) {
      activeRequests.set(requestId, controller);
    }

    try {
      const settings = getGeneralSettings();
      const url = buildUrl(req.url, req.params);
      const cookieHeader = buildCookieHeader(url) ?? undefined;
      const result = await executeRequest(req, settings, controller.signal, cookieHeader);
      if (result.request?.url) {
        captureSetCookies(result.request.url, result.setCookieHeaders);
      }
      return result;
    } finally {
      if (requestId) {
        activeRequests.delete(requestId);
      }
    }
  });

  // Aborts an in-flight HTTP request by its client-side request id.
  handle('http:cancel', ipcArgSchemas.cancelRequest, (_event, requestId) => {
    activeRequests.get(requestId)?.abort();
  });

  // Runs a pre- or post-request script in the main-process sandbox.
  handle('scripts:run', ipcArgSchemas.scriptRun, (_event, input) => runScript(input));

  // Returns the application semver from package metadata.
  handle('app:getVersion', ipcArgSchemas.none, () => app.getVersion());

  // Returns the persisted light/dark/system theme preference.
  handle('theme:get', ipcArgSchemas.none, async () =>
    parseThemeSource(await db.getSetting(THEME_SETTING_KEY))
  );

  // Persists and applies the light/dark/system theme preference.
  handle('theme:set', ipcArgSchemas.themeSet, async (_event, theme) => {
    nativeTheme.themeSource = theme;
    await db.setSetting(THEME_SETTING_KEY, theme);
  });

  // Returns general HTTP execution settings (timeout, size limit, SSL verify).
  handle('general:getSettings', ipcArgSchemas.none, () => getGeneralSettings());

  // Persists general HTTP execution settings.
  handle('general:setSettings', ipcArgSchemas.generalSettings, (_event, settings) => {
    setGeneralSettings(settings);
  });

  // Lists configured database connections.
  handle('databaseConnections:list', ipcArgSchemas.none, () => listDatabaseConnections());

  // Creates or updates a database connection.
  handle('databaseConnections:save', ipcArgSchemas.databaseConnection, (_event, conn) =>
    saveDatabaseConnection(conn)
  );

  // Deletes a database connection by id.
  handle('databaseConnections:delete', ipcArgSchemas.connectionId, (_event, id) =>
    deleteDatabaseConnection(id)
  );

  // Returns the id of the active database connection.
  handle('database:getActiveId', ipcArgSchemas.none, () => getActiveDatabaseId());

  // Sets the active database connection (applied on restart).
  handle('database:setActiveId', ipcArgSchemas.connectionId, (_event, id) => {
    setActiveDatabaseId(id);
  });

  // Returns the persisted request editor tab for a storage key.
  handle('requestEditor:getTab', ipcArgSchemas.storageKey, (_event, key) =>
    getRequestEditorTab(key)
  );

  // Persists the active request editor tab for a storage key.
  handle('requestEditor:setTab', ipcArgSchemas.setEditorTab, (_event, key, tab) => {
    setRequestEditorTab(key, tab);
  });

  // Clears the persisted request editor tab for a storage key.
  handle('requestEditor:deleteTab', ipcArgSchemas.storageKey, (_event, key) => {
    deleteRequestEditorTab(key);
  });

  // Returns cookies stored for a hostname.
  handle('cookies:getForDomain', ipcArgSchemas.domain, (_event, cookieDomain) =>
    getCookiesForDomain(cookieDomain)
  );

  // Replaces cookies stored for a hostname.
  handle('cookies:setForDomain', ipcArgSchemas.setCookies, (_event, cookieDomain, cookies) => {
    setCookiesForDomain(cookieDomain, cookies);
  });

  // Creates an encrypted invite token for sharing a collection.
  handle(
    'invite:create',
    ipcArgSchemas.inviteCreate,
    async (_event, collectionId, recipientKid) => {
      if (!(db instanceof RoutingDatabase)) {
        throw new Error('Invite is unavailable.');
      }

      if (!recipientKid) {
        throw new Error(
          'A recipient key is required. Add their public key under Certificates and select them when creating an invite.'
        );
      }

      const share = db.getShareInfo(collectionId);
      const connection = listDatabaseConnections().find((conn) => conn.id === share.connectionId);
      if (!connection) {
        throw new Error(`Unknown database connection: ${share.connectionId}`);
      }
      if (connection.type === 'sqlite') {
        throw new Error('SQLite connections cannot be shared via invite.');
      }

      const recipient = listTrustedKeys().find((key) => key.id === recipientKid);
      if (!recipient) {
        throw new Error(`Unknown recipient key: ${recipientKid}`);
      }

      const { privateKey, publicKey } = await ensureInviteKeys(app.getPath('userData'));
      return createInviteToken(
        connection,
        { name: share.name, providerCollectionId: share.providerCollectionId },
        privateKey,
        publicKey,
        recipient.publicKeyPem
      );
    }
  );

  // Verifies an invite token and registers the shared collection connection.
  handle('invite:accept', ipcArgSchemas.token, async (_event, inviteToken) => {
    const { privateKey, publicKey } = await ensureInviteKeys(app.getPath('userData'));
    let connection;
    let collection;
    try {
      ({ connection, collection } = verifyInviteToken(
        inviteToken,
        privateKey,
        publicKey,
        listTrustedKeys()
      ));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Invalid invite token.', {
        cause: err
      });
    }

    const existing = findMatchingConnection(connection);
    const targetConn: DatabaseConnection = existing ?? { ...connection, id: randomUUID() };
    if (!existing) {
      saveDatabaseConnection(targetConn);
    }

    const slot = getSlotForConnection(targetConn.id);
    if (slot == null) {
      throw new Error('Failed to assign a slot for the invited connection.');
    }

    if (db instanceof RoutingDatabase) {
      try {
        await db.registerSharedCollection(targetConn, slot, app.getPath('userData'), collection);
      } catch (err) {
        throw new Error(
          err instanceof Error ? err.message : 'Failed to connect to the invited database.'
        );
      }
    }

    return listDatabaseConnections();
  });

  // Returns the local invite RSA identity (public key and fingerprint).
  handle('certs:getIdentity', ipcArgSchemas.none, async () => {
    return getInviteIdentity(app.getPath('userData'));
  });

  // Writes the local invite private key to a PEM file via a save dialog.
  handle('certs:exportPrivateKey', ipcArgSchemas.none, async () => {
    const { privateKey } = await ensureInviteKeys(app.getPath('userData'));
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      defaultPath: 'invite-key.pem',
      filters: [{ name: 'PEM', extensions: ['pem'] }]
    };
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await writeFile(filePath, privateKey, 'utf-8');
    return { canceled: false, path: filePath };
  });

  // Writes the local invite public key to a PEM file via a save dialog.
  handle('certs:exportPublicKey', ipcArgSchemas.none, async () => {
    const { publicKey } = await ensureInviteKeys(app.getPath('userData'));
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      defaultPath: 'invite-pub.pem',
      filters: [{ name: 'PEM', extensions: ['pem'] }]
    };
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await writeFile(filePath, publicKey, 'utf-8');
    return { canceled: false, path: filePath };
  });

  // Imports a local invite key pair from a PEM file via an open dialog.
  handle('certs:importKeyPair', ipcArgSchemas.none, async () => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      properties: ['openFile'] as Array<'openFile'>,
      filters: [{ name: 'PEM', extensions: ['pem'] }]
    };
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (canceled || filePaths.length === 0) {
      throw new Error('Import canceled.');
    }

    const privateKeyPem = await readFile(filePaths[0], 'utf-8');
    return importInviteKeyPair(app.getPath('userData'), privateKeyPem);
  });

  // Lists trusted recipient public keys for invite encryption.
  handle('certs:listTrustedKeys', ipcArgSchemas.none, () => listTrustedKeys());

  // Adds a trusted recipient public key by label and PEM content.
  handle('certs:addTrustedKey', ipcArgSchemas.labelAndPublicKey, (_event, keyLabel, keyPem) =>
    addTrustedKey(keyLabel, keyPem)
  );

  // Imports a trusted recipient public key from a PEM file via an open dialog.
  handle('certs:importTrustedPublicKey', ipcArgSchemas.label, async (_event, keyLabel) => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions = {
      properties: ['openFile'] as Array<'openFile'>,
      filters: [{ name: 'PEM', extensions: ['pem'] }]
    };
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (canceled || filePaths.length === 0) {
      throw new Error('Import canceled.');
    }

    const importedPublicKeyPem = await readFile(filePaths[0], 'utf-8');
    return addTrustedKey(keyLabel, importedPublicKeyPem);
  });

  // Removes a trusted recipient public key by id.
  handle('certs:removeTrustedKey', ipcArgSchemas.connectionId, (_event, id) =>
    removeTrustedKey(id)
  );
}
