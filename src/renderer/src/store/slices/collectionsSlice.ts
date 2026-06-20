import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Collection, SavedRequest } from '#/shared/types';

export interface CollectionsState {
  collections: Collection[];
  requestsByCollection: Record<number, SavedRequest[]>;
  selectedCollectionId: number | null;
}

const initialState: CollectionsState = {
  collections: [],
  requestsByCollection: {},
  selectedCollectionId: null
};

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setSelectedCollectionId(state, action: PayloadAction<number | null>) {
      state.selectedCollectionId = action.payload;
    },
    setCollections(state, action: PayloadAction<Collection[]>) {
      state.collections = action.payload;
    },
    setRequestsForCollection(
      state,
      action: PayloadAction<{ collectionId: number; requests: SavedRequest[] }>
    ) {
      state.requestsByCollection[action.payload.collectionId] = action.payload.requests;
    }
  }
});

export const { setSelectedCollectionId, setCollections, setRequestsForCollection } =
  collectionsSlice.actions;
export default collectionsSlice.reducer;
