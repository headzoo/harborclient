import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '#/renderer/src/store/redux';

export interface UiState {
  pendingCount: number;
}

const initialState: UiState = {
  pendingCount: 0
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    operationStarted(state) {
      state.pendingCount += 1;
    },
    operationFinished(state) {
      state.pendingCount = Math.max(0, state.pendingCount - 1);
    }
  }
});

export const { operationStarted, operationFinished } = uiSlice.actions;

export const selectIsBusy = (state: RootState): boolean => state.ui.pendingCount > 0;

export default uiSlice.reducer;
