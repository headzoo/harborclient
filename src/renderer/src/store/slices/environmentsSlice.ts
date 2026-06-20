import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Environment } from '#/shared/types';
import { loadActiveEnvironmentId } from '#/renderer/src/store/persistence';

export interface EnvironmentsState {
  environments: Environment[];
  activeEnvironmentId: number | null;
}

const initialState: EnvironmentsState = {
  environments: [],
  activeEnvironmentId: loadActiveEnvironmentId()
};

const environmentsSlice = createSlice({
  name: 'environments',
  initialState,
  reducers: {
    setEnvironments(state, action: PayloadAction<Environment[]>) {
      state.environments = action.payload;
    },
    setActiveEnvironmentId(state, action: PayloadAction<number | null>) {
      state.activeEnvironmentId = action.payload;
    }
  }
});

export const { setEnvironments, setActiveEnvironmentId } = environmentsSlice.actions;
export default environmentsSlice.reducer;
