import { BrowserWindow, dialog } from 'electron';
import { readFile } from 'fs/promises';
import {
  getSuppressPostmanImportWarning,
  setSuppressPostmanImportWarning
} from '#/main/settings/importWarningSettings';

/**
 * Opens a native JSON file picker and parses the selected file.
 *
 * @param win - Focused browser window for modal dialogs, if any.
 * @returns Parsed JSON payload, or null when the dialog was canceled.
 */
export async function openImportFile(
  win: BrowserWindow | null
): Promise<{ raw: string; parsed: unknown } | null> {
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
  return { raw, parsed };
}

/**
 * Shows the Postman import warning and returns whether the user chose to continue.
 *
 * @param win - Focused browser window for modal dialogs, if any.
 * @returns True when the user confirmed import.
 */
export async function confirmPostmanImport(win: BrowserWindow | null): Promise<boolean> {
  if (getSuppressPostmanImportWarning()) {
    return true;
  }

  const postmanWarningOptions = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Import anyway'],
    defaultId: 0,
    cancelId: 0,
    title: 'Import Postman collection',
    message: 'HarborClient does not support all Postman features.',
    detail:
      'Some Postman settings may be ignored or converted. Scripts from imported files may not behave the same as in Postman. Only import collections from sources you trust.',
    checkboxLabel: "Don't show this again"
  };
  const { response, checkboxChecked } = win
    ? await dialog.showMessageBox(win, postmanWarningOptions)
    : await dialog.showMessageBox(postmanWarningOptions);

  if (response !== 1) {
    return false;
  }

  if (checkboxChecked) {
    setSuppressPostmanImportWarning(true);
  }

  return true;
}

/**
 * Shows the collection script warning and returns whether the user chose to continue.
 *
 * @param win - Focused browser window for modal dialogs, if any.
 * @returns True when the user confirmed import.
 */
export async function confirmCollectionScripts(win: BrowserWindow | null): Promise<boolean> {
  const messageBoxOptions = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Import anyway'],
    defaultId: 0,
    cancelId: 0,
    title: 'Collection contains scripts',
    message: 'This collection includes pre-request or post-request scripts.',
    detail:
      'Scripts from imported files may not be safe. They run in a limited sandbox, but that sandbox is not a security boundary. Only import collections from sources you trust.'
  };
  const { response } = win
    ? await dialog.showMessageBox(win, messageBoxOptions)
    : await dialog.showMessageBox(messageBoxOptions);

  return response === 1;
}

/**
 * Shows the request script warning and returns whether the user chose to continue.
 *
 * @param win - Focused browser window for modal dialogs, if any.
 * @returns True when the user confirmed import.
 */
export async function confirmRequestScripts(win: BrowserWindow | null): Promise<boolean> {
  const messageBoxOptions = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Import anyway'],
    defaultId: 0,
    cancelId: 0,
    title: 'Request contains scripts',
    message: 'This request includes pre-request or post-request scripts.',
    detail:
      'Scripts from imported files may not be safe. They run in a limited sandbox, but that sandbox is not a security boundary. Only import requests from sources you trust.'
  };
  const { response } = win
    ? await dialog.showMessageBox(win, messageBoxOptions)
    : await dialog.showMessageBox(messageBoxOptions);

  return response === 1;
}
