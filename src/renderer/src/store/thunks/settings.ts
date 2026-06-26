import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Variable } from '#/shared/types';
import { setGeneralSettingsState } from '#/renderer/src/store/slices/settingsSlice';
import type { ThunkApiConfig } from '#/renderer/src/store/redux';

/**
 * Persists app-wide global variables to general settings and updates the renderer store.
 */
export const saveGlobalVariables = createAsyncThunk<void, Variable[], ThunkApiConfig>(
  'settings/saveGlobalVariables',
  async (variables, { dispatch, getState }) => {
    const general = getState().settings.general;
    const updated = { ...general, globalVariables: variables };
    await window.api.setGeneralSettings(updated);
    dispatch(setGeneralSettingsState(updated));
  }
);
