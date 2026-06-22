import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import {
  collectionExportContainsScripts,
  requestExportContainsScripts,
  validateCollectionExport,
  validateEnvironmentExport,
  validateRequestExport
} from '#/main/db/collectionData';
import { convertPostmanCollection, isPostmanCollection } from '#/main/import/postman';
import { defaultAuth } from '#/shared/auth';
import type { IDatabase } from '#/main/db/IDatabase';
import { RoutingDatabase } from '#/main/db/RoutingDatabase';
import { handle } from '#/main/ipc/handle';
import {
  confirmCollectionScripts,
  confirmPostmanImport,
  confirmRequestScripts,
  openImportFile
} from '#/main/ipc/handlers/importDialogs';
import { importEnvironmentData } from '#/main/ipc/handlers/environments';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';
import type { CollectionExport, ImportEntityResult, RequestExport } from '#/shared/types';

/**
 * Reads the HarborClient export discriminator from parsed JSON.
 *
 * @param parsed - Parsed JSON payload from an import file.
 * @returns Export kind string, or null when absent or not a string.
 */
function readHarborclientExport(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const value = (parsed as { harborclientExport?: unknown }).harborclientExport;
  return typeof value === 'string' ? value : null;
}

/**
 * Imports a validated collection export after optional Postman/script warnings.
 *
 * @param db - Database instance backing collection persistence.
 * @param win - Focused browser window for modal dialogs, if any.
 * @param parsed - Parsed JSON payload from an import file.
 * @returns Imported collection, or null when the user canceled a warning.
 */
async function importCollectionFromParsed(
  db: IDatabase,
  win: BrowserWindow | null,
  parsed: unknown
): Promise<Awaited<ReturnType<IDatabase['importCollectionData']>> | null> {
  let exportData: CollectionExport;

  if (isPostmanCollection(parsed)) {
    if (!(await confirmPostmanImport(win))) {
      return null;
    }
    exportData = validateCollectionExport(convertPostmanCollection(parsed));
  } else {
    exportData = validateCollectionExport(parsed);

    if (collectionExportContainsScripts(exportData) && !(await confirmCollectionScripts(win))) {
      return null;
    }
  }

  return db.importCollectionData(exportData);
}

/**
 * Saves a validated request export after optional script warnings.
 *
 * @param db - Database instance backing request persistence.
 * @param win - Focused browser window for modal dialogs, if any.
 * @param exportData - Validated request export payload.
 * @param collectionId - Collection to add the imported request to.
 * @param folderId - Target folder id, or null for collection root.
 * @returns Imported request, or null when the user canceled a warning.
 */
async function saveImportedRequest(
  db: IDatabase,
  win: BrowserWindow | null,
  exportData: RequestExport,
  collectionId: number,
  folderId: number | null
): Promise<Awaited<ReturnType<IDatabase['saveRequest']>> | null> {
  if (requestExportContainsScripts(exportData) && !(await confirmRequestScripts(win))) {
    return null;
  }

  return db.saveRequest({
    collection_id: collectionId,
    folder_id: folderId,
    name: exportData.name,
    method: exportData.method,
    url: exportData.url,
    headers: exportData.headers,
    params: exportData.params,
    body: exportData.body,
    body_type: exportData.body_type,
    pre_request_script: exportData.pre_request_script,
    post_request_script: exportData.post_request_script,
    comment: exportData.comment,
    auth: exportData.auth ?? defaultAuth()
  });
}

/**
 * Registers IPC handlers for collection CRUD, import/export, move, and file dialogs.
 *
 * @param db - Database instance backing collection persistence.
 */
export function registerCollectionHandlers(db: IDatabase): void {
  // Lists all saved request collections.
  handle('collections:list', ipcArgSchemas.none, async () => {
    const collections = await db.listCollections();
    const warnings = db instanceof RoutingDatabase ? db.consumeCollectionListWarnings() : [];
    return { collections, warnings };
  });

  // Creates a new collection with the given display name.
  handle('collections:create', ipcArgSchemas.name, (_event, collectionName) =>
    db.createCollection(collectionName)
  );

  // Updates a collection's name, variables, headers, and scripts.
  handle(
    'collections:update',
    ipcArgSchemas.collectionUpdate,
    (_event, id, collectionName, variables, headers, preRequestScript, postRequestScript, auth) =>
      db.updateCollection(
        id,
        collectionName,
        variables,
        headers,
        preRequestScript,
        postRequestScript,
        auth
      )
  );

  // Deletes a collection and all of its folders and requests.
  handle('collections:delete', ipcArgSchemas.dbId, (_event, id) => db.deleteCollection(id));

  // Deep-copies a collection into a new collection on the same backend.
  handle('collections:duplicate', ipcArgSchemas.dbId, (_event, id) => {
    if (!(db instanceof RoutingDatabase)) {
      throw new Error('Collection duplicate is unavailable.');
    }
    return db.duplicateCollection(id);
  });

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
    const file = await openImportFile(win);
    if (!file) {
      return null;
    }

    return importCollectionFromParsed(db, win, file.parsed);
  });

  // Exports a request to a JSON file via a native save dialog.
  handle('requests:export', ipcArgSchemas.requestExport, async (_event, data) => {
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

  // Imports a request from a JSON file selected via a native open dialog.
  handle('requests:import', ipcArgSchemas.requestImport, async (_event, collectionId, folderId) => {
    const win = BrowserWindow.getFocusedWindow();
    const file = await openImportFile(win);
    if (!file) {
      return null;
    }

    const exportData = validateRequestExport(file.parsed);
    return saveImportedRequest(db, win, exportData, collectionId, folderId ?? null);
  });

  // Auto-detects and imports a collection, request, or environment from File -> Import.
  handle('imports:auto', ipcArgSchemas.importAuto, async (_event, activeCollectionId) => {
    const win = BrowserWindow.getFocusedWindow();
    const file = await openImportFile(win);
    if (!file) {
      return null;
    }

    const { parsed } = file;

    if (isPostmanCollection(parsed)) {
      const collection = await importCollectionFromParsed(db, win, parsed);
      if (!collection) {
        return null;
      }
      return { kind: 'collection', collection } satisfies ImportEntityResult;
    }

    const exportKind = readHarborclientExport(parsed);

    if (exportKind === 'collection') {
      const collection = await importCollectionFromParsed(db, win, parsed);
      if (!collection) {
        return null;
      }
      return { kind: 'collection', collection } satisfies ImportEntityResult;
    }

    if (exportKind === 'environment') {
      const exportData = validateEnvironmentExport(parsed);
      const environment = await importEnvironmentData(db, exportData);
      return { kind: 'environment', environment } satisfies ImportEntityResult;
    }

    if (exportKind === 'request') {
      if (activeCollectionId == null) {
        throw new Error('Select a collection before importing a request.');
      }

      const exportData = validateRequestExport(parsed);
      const request = await saveImportedRequest(db, win, exportData, activeCollectionId, null);
      if (!request) {
        return null;
      }
      return { kind: 'request', request } satisfies ImportEntityResult;
    }

    throw new Error('Unrecognized HarborClient export file.');
  });

  // Moves a collection to a different database connection.
  handle('collections:move', ipcArgSchemas.collectionMove, (_event, id, targetConnectionId) => {
    if (!(db instanceof RoutingDatabase)) {
      throw new Error('Collection move is unavailable.');
    }
    return db.moveCollection(id, targetConnectionId);
  });

  // Reorders collections in the sidebar.
  handle('collections:reorder', ipcArgSchemas.collectionReorder, (_event, orderedCollectionIds) => {
    if (!(db instanceof RoutingDatabase)) {
      throw new Error('Collection reorder is unavailable.');
    }
    return db.reorderCollections(orderedCollectionIds);
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
}
