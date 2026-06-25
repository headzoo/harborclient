import type { KeyValue, SaveRequestInput, SavedRequest } from '#/shared/types';
import type {
  CreateCollectionPayload,
  CreateCollectionRequest,
  CreateCollectionResult,
  OpenRequestDraftParam,
  OpenRequestDraftPayload
} from '@harborclient/sdk';
export type { OpenRequestDraftPayload } from '@harborclient/sdk';
import { parseHttpMethod } from '#/shared/httpMethod';
import { defaultAuth } from '#/shared/auth';
import { store } from '#/renderer/src/store/redux';
import type { RootState } from '#/renderer/src/store/redux';
import {
  defaultDraft,
  emptyKeyValue,
  normalizeDraft,
  type RequestDraft
} from '#/renderer/src/store/drafts';
import { closeOverlay } from '#/renderer/src/store/slices/navigationSlice';
import { setSelectedCollectionId } from '#/renderer/src/store/slices/collectionsSlice';
import { openTabWithDraft, setActiveTab } from '#/renderer/src/store/slices/tabsSlice';
import { requestLoadRequest, sendRequest } from '#/renderer/src/store/thunks/requests';
import {
  createCollection,
  createFolder,
  refreshCollectionContents
} from '#/renderer/src/store/thunks/collections';
import { registerCommand } from '#/renderer/src/plugins/createPluginContext';

const HOST_PLUGIN_ID = 'harborclient';

/**
 * Finds a saved collection request in the Redux cache.
 *
 * @param state - Current renderer store state.
 * @param requestId - Saved request database id.
 * @returns Matching saved request, if loaded in memory.
 */
export function findSavedRequest(state: RootState, requestId: number): SavedRequest | undefined {
  for (const requests of Object.values(state.collections.requestsByCollection)) {
    const match = requests.find((request) => request.id === requestId);
    if (match) {
      return match;
    }
  }
  return undefined;
}

/**
 * Converts a flat header map into editable key-value rows.
 *
 * @param headers - Header map from plugin HTTP hooks.
 * @returns Key-value rows suitable for a request draft.
 */
function headersToKeyValues(headers: Record<string, string> | undefined): KeyValue[] {
  if (!headers) {
    return [emptyKeyValue()];
  }
  const rows = Object.entries(headers).map(([key, value]) => ({
    key,
    value,
    enabled: true
  }));
  return rows.length > 0 ? rows : [emptyKeyValue()];
}

/**
 * Converts captured query params into editable key-value rows.
 *
 * @param params - Enabled query params from a sent request.
 * @returns Key-value rows suitable for a request draft.
 */
function paramsToKeyValues(params: OpenRequestDraftParam[] | undefined): KeyValue[] {
  if (!params?.length) {
    return [emptyKeyValue()];
  }
  const rows = params.map((param) => ({
    key: param.key,
    value: param.value,
    enabled: true
  }));
  return rows.length > 0 ? rows : [emptyKeyValue()];
}

/**
 * Builds a request draft from a plugin-provided open payload.
 *
 * @param payload - Partial draft fields captured at send time.
 * @returns Normalized draft for a new editor tab.
 */
export function draftFromOpenPayload(payload: OpenRequestDraftPayload): RequestDraft {
  const parsedMethod = payload.method ? parseHttpMethod(payload.method) : null;
  const method = parsedMethod ?? defaultDraft().method;
  const bodyType = payload.bodyType ?? (payload.body?.trim() ? 'text' : 'none');

  return normalizeDraft({
    ...defaultDraft(),
    name: payload.name?.trim() || 'Recent Request',
    method,
    url: payload.url ?? '',
    headers: headersToKeyValues(payload.headers),
    params: paramsToKeyValues(payload.params),
    body: payload.body ?? '',
    body_type: bodyType,
    auth: defaultAuth()
  });
}

/**
 * Opens a saved collection request or focuses an existing tab for it.
 *
 * @param requestId - Saved request database id.
 */
export function loadSavedRequest(requestId: number): void {
  const state = store.getState();
  const openTab = state.tabs.tabs.find((tab) => tab.draft.id === requestId);
  if (openTab) {
    store.dispatch(closeOverlay());
    store.dispatch(setActiveTab(openTab.tabId));
    return;
  }

  const saved = findSavedRequest(state, requestId);
  if (!saved) {
    throw new Error(`Request ${requestId} is not available. Open its collection first.`);
  }

  void store.dispatch(requestLoadRequest({ req: saved }));
}

/**
 * Opens a new request tab seeded with captured send metadata.
 *
 * @param payload - Partial draft fields from a recent request entry.
 */
export function openRequestDraft(payload: OpenRequestDraftPayload): void {
  store.dispatch(closeOverlay());
  store.dispatch(openTabWithDraft(draftFromOpenPayload(payload)));
}

/**
 * Sends the active request editor tab using the same pipeline as the Send button.
 */
export function triggerSendRequest(): void {
  void store.dispatch(sendRequest());
}

/**
 * Validates and normalizes a plugin bulk-collection payload.
 *
 * @param payload - Raw payload from a plugin host command.
 * @returns Normalized collection name and request rows.
 */
export function validateCreateCollectionPayload(payload: unknown): CreateCollectionPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('harborclient.createCollection requires a payload object.');
  }

  const { name, requests } = payload as CreateCollectionPayload;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw new Error('Collection name is required.');
  }
  if (!Array.isArray(requests)) {
    throw new Error('Collection requests must be an array.');
  }

  return { name: trimmedName, requests };
}

/**
 * Returns sorted unique folder names referenced by plugin request rows.
 *
 * @param requests - Request rows that may include folder names.
 * @returns Distinct non-empty folder names in locale order.
 */
export function uniqueFolderNames(requests: CreateCollectionRequest[]): string[] {
  const folders = new Set<string>();
  for (const request of requests) {
    const folder = typeof request.folder === 'string' ? request.folder.trim() : '';
    if (folder) {
      folders.add(folder);
    }
  }
  return [...folders].sort((left, right) => left.localeCompare(right));
}

/**
 * Maps a plugin request row into a save payload for the active database.
 *
 * @param request - Request row from a plugin bulk-collection import.
 * @param collectionId - Target collection database id.
 * @param folderId - Folder id when grouped, or null for collection root.
 * @returns Input accepted by {@link window.api.saveRequest}.
 */
export function pluginRequestToSaveInput(
  request: CreateCollectionRequest,
  collectionId: number,
  folderId: number | null
): SaveRequestInput {
  const trimmedName = typeof request.name === 'string' ? request.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Each request must have a non-empty name.');
  }

  const method = parseHttpMethod(request.method) ?? 'GET';
  const body = typeof request.body === 'string' ? request.body : '';
  const bodyType = request.bodyType ?? (body.trim() ? 'text' : 'none');

  return {
    collection_id: collectionId,
    folder_id: folderId,
    name: trimmedName,
    method,
    url: typeof request.url === 'string' ? request.url : '',
    headers: headersToKeyValues(request.headers),
    params: paramsToKeyValues(request.params),
    body,
    body_type: bodyType,
    auth: defaultAuth(),
    pre_request_script: '',
    post_request_script: '',
    comment: typeof request.comment === 'string' ? request.comment : ''
  };
}

/**
 * Bulk-creates a collection with folders and saved requests supplied by a plugin.
 *
 * @param payload - Collection name and request rows to persist.
 * @returns Database id of the created collection.
 */
export async function createCollectionFromPlugin(
  payload: CreateCollectionPayload
): Promise<CreateCollectionResult> {
  const validated = validateCreateCollectionPayload(payload);
  const collection = await store.dispatch(createCollection({ name: validated.name })).unwrap();

  const folderIds = new Map<string, number>();
  for (const folderName of uniqueFolderNames(validated.requests)) {
    const folder = await store
      .dispatch(createFolder({ collectionId: collection.id, name: folderName }))
      .unwrap();
    folderIds.set(folderName, folder.id);
  }

  for (const request of validated.requests) {
    const folderName = typeof request.folder === 'string' ? request.folder.trim() : '';
    const folderId = folderName ? (folderIds.get(folderName) ?? null) : null;
    const saveInput = pluginRequestToSaveInput(request, collection.id, folderId);
    await window.api.saveRequest(saveInput);
  }

  store.dispatch(setSelectedCollectionId(collection.id));
  await store.dispatch(refreshCollectionContents(collection.id));

  return { collectionId: collection.id };
}

/**
 * Registers host commands that let plugins open request editor tabs.
 *
 * @returns Disposer that unregisters the host request commands.
 */
export function registerHostRequestCommands(): () => void {
  const disposables = [
    registerCommand(HOST_PLUGIN_ID, 'loadRequest', (requestId) => {
      if (typeof requestId !== 'number') {
        throw new Error('harborclient.loadRequest requires a numeric request id.');
      }
      loadSavedRequest(requestId);
    }),
    registerCommand(HOST_PLUGIN_ID, 'openRequestDraft', (payload) => {
      if (!payload || typeof payload !== 'object') {
        throw new Error('harborclient.openRequestDraft requires a draft payload object.');
      }
      openRequestDraft(payload as OpenRequestDraftPayload);
    }),
    registerCommand(HOST_PLUGIN_ID, 'sendRequest', () => {
      triggerSendRequest();
    }),
    registerCommand(HOST_PLUGIN_ID, 'createCollection', async (payload) => {
      await createCollectionFromPlugin(payload as CreateCollectionPayload);
    })
  ];

  return () => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  };
}
