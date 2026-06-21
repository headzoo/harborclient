import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Collection, Folder, SavedRequest } from '#/shared/types';

export interface CollectionsState {
  collections: Collection[];
  foldersByCollection: Record<number, Folder[]>;
  requestsByCollection: Record<number, SavedRequest[]>;
  selectedCollectionId: number | null;
}

const initialState: CollectionsState = {
  collections: [],
  foldersByCollection: {},
  requestsByCollection: {},
  selectedCollectionId: null
};

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    /**
     * Updates the sidebar selected collection id.
     */
    setSelectedCollectionId(state, action: PayloadAction<number | null>) {
      state.selectedCollectionId = action.payload;
    },
    /**
     * Replaces the full collections list from a refresh.
     */
    setCollections(state, action: PayloadAction<Collection[]>) {
      state.collections = action.payload;
    },
    /**
     * Caches saved requests for one collection id.
     */
    setRequestsForCollection(
      state,
      action: PayloadAction<{ collectionId: number; requests: SavedRequest[] }>
    ) {
      state.requestsByCollection[action.payload.collectionId] = action.payload.requests;
    },
    /**
     * Caches folder metadata for one collection id.
     */
    setFoldersForCollection(
      state,
      action: PayloadAction<{ collectionId: number; folders: Folder[] }>
    ) {
      state.foldersByCollection[action.payload.collectionId] = action.payload.folders;
    }
  }
});

export const {
  setSelectedCollectionId,
  setCollections,
  setRequestsForCollection,
  setFoldersForCollection
} = collectionsSlice.actions;
export default collectionsSlice.reducer;
