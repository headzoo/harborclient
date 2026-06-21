import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAuth } from '#/shared/auth';
import type { SaveRequestInput, SavedRequest } from '#/shared/types';

// react-hot-toast pulls in the DOM at import time; stub it for the Node test env.
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }
}));

/**
 * Minimal in-memory localStorage mock so the store's persistence subscriber can run
 * in the Node test environment without a real DOM.
 */
function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
}

const saveRequestMock = vi.fn<(input: SaveRequestInput) => Promise<SavedRequest>>();
const listRequestsMock = vi.fn<(collectionId: number) => Promise<SavedRequest[]>>();

/**
 * Builds a saved request matching a save input so the thunk can update tab state.
 */
function savedFrom(input: SaveRequestInput): SavedRequest {
  return {
    id: input.id ?? 999,
    collection_id: input.collection_id,
    folder_id: input.folder_id ?? null,
    name: input.name,
    method: input.method,
    url: input.url,
    headers: input.headers,
    params: input.params,
    auth: input.auth,
    body: input.body,
    body_type: input.body_type,
    pre_request_script: input.pre_request_script ?? '',
    post_request_script: input.post_request_script ?? '',
    comment: input.comment ?? '',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock());
  vi.stubGlobal('window', {
    api: { saveRequest: saveRequestMock, listRequests: listRequestsMock }
  });
  saveRequestMock.mockReset();
  saveRequestMock.mockImplementation((input) => Promise.resolve(savedFrom(input)));
  listRequestsMock.mockReset();
  listRequestsMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveRequest folder handling', () => {
  it('keeps folder_id when updating a request in its own collection', async () => {
    const { store } = await import('#/renderer/src/store/redux');
    const { openTabWithDraft } = await import('#/renderer/src/store/slices/tabsSlice');
    const { saveRequest } = await import('#/renderer/src/store/thunks/requests');

    store.dispatch(
      openTabWithDraft({
        id: 5,
        collection_id: 1,
        folder_id: 10,
        name: 'In Folder',
        method: 'GET',
        url: 'https://example.com',
        headers: [],
        params: [],
        body: '',
        body_type: 'none',
        pre_request_script: '',
        post_request_script: '',
        comment: '',
        auth: defaultAuth()
      })
    );

    await store.dispatch(saveRequest(1));

    expect(saveRequestMock).toHaveBeenCalledTimes(1);
    const input = saveRequestMock.mock.calls[0][0];
    expect(input.id).toBe(5);
    expect(input.collection_id).toBe(1);
    expect(input.folder_id).toBe(10);
  });

  it('drops folder_id when saving a copy into a different collection', async () => {
    const { store } = await import('#/renderer/src/store/redux');
    const { openTabWithDraft } = await import('#/renderer/src/store/slices/tabsSlice');
    const { saveRequest } = await import('#/renderer/src/store/thunks/requests');

    store.dispatch(
      openTabWithDraft({
        id: 5,
        collection_id: 1,
        folder_id: 10,
        name: 'In Folder',
        method: 'GET',
        url: 'https://example.com',
        headers: [],
        params: [],
        body: '',
        body_type: 'none',
        pre_request_script: '',
        post_request_script: '',
        comment: '',
        auth: defaultAuth()
      })
    );

    await store.dispatch(saveRequest(2));

    expect(saveRequestMock).toHaveBeenCalledTimes(1);
    const input = saveRequestMock.mock.calls[0][0];
    expect(input.id).toBeUndefined();
    expect(input.collection_id).toBe(2);
    expect(input.folder_id).toBeNull();
  });
});
