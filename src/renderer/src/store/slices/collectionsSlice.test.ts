import { describe, expect, it } from 'vitest';
import collectionsReducer, {
  focusSidebarItem,
  setSelectedCollectionId
} from '#/renderer/src/store/slices/collectionsSlice';

describe('collectionsSlice', () => {
  it('starts with no collection or folder selected', () => {
    const state = collectionsReducer(undefined, { type: 'unknown' });
    expect(state.selectedCollectionId).toBeNull();
    expect(state.selectedFolderId).toBeNull();
  });

  it('focusSidebarItem sets collection and folder ids together', () => {
    const state = collectionsReducer(undefined, focusSidebarItem({ collectionId: 3, folderId: 7 }));
    expect(state.selectedCollectionId).toBe(3);
    expect(state.selectedFolderId).toBe(7);
  });

  it('focusSidebarItem clears folder id when folderId is omitted', () => {
    let state = collectionsReducer(undefined, focusSidebarItem({ collectionId: 3, folderId: 7 }));
    state = collectionsReducer(state, focusSidebarItem({ collectionId: 5 }));
    expect(state.selectedCollectionId).toBe(5);
    expect(state.selectedFolderId).toBeNull();
  });

  it('setSelectedCollectionId clears folder selection', () => {
    let state = collectionsReducer(undefined, focusSidebarItem({ collectionId: 3, folderId: 7 }));
    state = collectionsReducer(state, setSelectedCollectionId(3));
    expect(state.selectedCollectionId).toBe(3);
    expect(state.selectedFolderId).toBeNull();
  });
});
