import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { maskVariablesForExport, validateEnvironmentExport } from '#/main/db/collectionData';
import type { IDatabase } from '#/main/db/IDatabase';
import { handle } from '#/main/ipc/handle';
import { openImportFile } from '#/main/ipc/handlers/importDialogs';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';
import type { Environment, EnvironmentExport } from '#/shared/types';

/**
 * Persists an imported environment export as a new environment record.
 *
 * @param db - Database instance backing environment persistence.
 * @param data - Validated environment export payload.
 * @returns The created environment with imported variables.
 */
export async function importEnvironmentData(
  db: IDatabase,
  data: EnvironmentExport
): Promise<Environment> {
  const created = await db.createEnvironment(data.name);
  return db.updateEnvironment(created.id, data.name, data.variables);
}

/**
 * Registers IPC handlers for named variable environment CRUD and import/export.
 *
 * @param db - Database instance backing environment persistence.
 */
export function registerEnvironmentHandlers(db: IDatabase): void {
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

  // Exports an environment to a JSON file via a native save dialog.
  handle('environments:export', ipcArgSchemas.dbId, async (_event, id) => {
    const environments = await db.listEnvironments();
    const environment = environments.find((item) => item.id === id);
    if (!environment) {
      throw new Error(`Environment not found: ${id}`);
    }

    const data: EnvironmentExport = {
      harborclientVersion: 1,
      harborclientExport: 'environment',
      name: environment.name,
      variables: maskVariablesForExport(environment.variables)
    };

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

  // Imports an environment from a JSON file selected via a native open dialog.
  handle('environments:import', ipcArgSchemas.none, async () => {
    const win = BrowserWindow.getFocusedWindow();
    const file = await openImportFile(win);
    if (!file) {
      return null;
    }

    const exportData = validateEnvironmentExport(file.parsed);
    return importEnvironmentData(db, exportData);
  });
}
