import { createAsyncThunk } from '@reduxjs/toolkit';

import { applyThemePreference } from '#/renderer/src/plugins/themeRuntime';
import { setGeneralSettingsState } from '#/renderer/src/store/slices/settingsSlice';
import {
  initSettingsDraft,
  setSettingsDraftLoadError,
  setSettingsDraftLoading,
  setSettingsDraftSaving
} from '#/renderer/src/store/slices/settingsDraftSlice';
import type { ThunkApiConfig } from '#/renderer/src/store/redux';

/**
 * Loads general, AI, and theme settings into the shared settings draft.
 */
export const loadSettingsDraft = createAsyncThunk<void, void, ThunkApiConfig>(
  'settingsDraft/load',
  async (_arg, { dispatch }) => {
    dispatch(setSettingsDraftLoading(true));
    dispatch(setSettingsDraftLoadError(null));
    try {
      const [general, ai, theme] = await Promise.all([
        window.api.getGeneralSettings(),
        window.api.getAiSettings(),
        window.api.getTheme()
      ]);
      dispatch(initSettingsDraft({ general, ai, theme }));
    } catch (err) {
      dispatch(
        setSettingsDraftLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
      );
    } finally {
      dispatch(setSettingsDraftLoading(false));
    }
  }
);

/**
 * Persists the shared settings draft and refreshes renderer state that depends on it.
 */
export const saveSettingsDraft = createAsyncThunk<void, void, ThunkApiConfig>(
  'settingsDraft/save',
  async (_arg, { dispatch, getState }) => {
    const { general, ai, theme } = getState().settingsDraft;
    dispatch(setSettingsDraftSaving(true));
    dispatch(setSettingsDraftLoadError(null));
    try {
      await applyThemePreference(theme);
      await Promise.all([
        window.api.setTheme(theme),
        window.api.setGeneralSettings(general),
        window.api.setAiSettings(ai)
      ]);
      dispatch(initSettingsDraft({ general, ai, theme }));
      dispatch(setGeneralSettingsState(general));
    } catch (err) {
      dispatch(
        setSettingsDraftLoadError(err instanceof Error ? err.message : 'Failed to save settings.')
      );
      throw err;
    } finally {
      dispatch(setSettingsDraftSaving(false));
    }
  }
);
