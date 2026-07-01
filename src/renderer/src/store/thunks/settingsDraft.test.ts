import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDispatch } from '#/renderer/src/store/redux';
import settingsDraftReducer, {
  selectSettingsDraftDirty,
  setDraftTheme
} from '#/renderer/src/store/slices/settingsDraftSlice';
import settingsReducer from '#/renderer/src/store/slices/settingsSlice';
import { loadSettingsDraft, saveSettingsDraft } from '#/renderer/src/store/thunks/settingsDraft';
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_GENERAL_SETTINGS
} from '#/renderer/src/ui/Settings/constants';

vi.mock('#/renderer/src/plugins/themeRuntime', () => ({
  applyThemePreference: vi.fn().mockResolvedValue(undefined)
}));

const apiMock = vi.hoisted(() => ({
  getGeneralSettings: vi.fn(),
  getAiSettings: vi.fn(),
  getTheme: vi.fn(),
  setGeneralSettings: vi.fn(),
  setAiSettings: vi.fn(),
  setTheme: vi.fn()
}));

vi.stubGlobal('window', { api: apiMock });

describe('settingsDraft thunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads general, ai, and theme values into the draft', async () => {
    apiMock.getGeneralSettings.mockResolvedValue(DEFAULT_GENERAL_SETTINGS);
    apiMock.getAiSettings.mockResolvedValue(DEFAULT_AI_SETTINGS);
    apiMock.getTheme.mockResolvedValue('dark');

    const store = configureStore({
      reducer: {
        settingsDraft: settingsDraftReducer,
        settings: settingsReducer
      }
    });
    const dispatch = store.dispatch as AppDispatch;

    await dispatch(loadSettingsDraft());

    const draft = store.getState().settingsDraft;
    expect(draft.theme).toBe('dark');
    expect(draft.loading).toBe(false);
    expect(draft.loadError).toBeNull();
    expect(selectSettingsDraftDirty(store.getState() as never)).toBe(false);
  });

  it('persists draft values and clears dirty state on save', async () => {
    apiMock.getGeneralSettings.mockResolvedValue(DEFAULT_GENERAL_SETTINGS);
    apiMock.getAiSettings.mockResolvedValue(DEFAULT_AI_SETTINGS);
    apiMock.getTheme.mockResolvedValue('system');
    apiMock.setGeneralSettings.mockResolvedValue(undefined);
    apiMock.setAiSettings.mockResolvedValue(undefined);
    apiMock.setTheme.mockResolvedValue(undefined);

    const store = configureStore({
      reducer: {
        settingsDraft: settingsDraftReducer,
        settings: settingsReducer
      }
    });
    const dispatch = store.dispatch as AppDispatch;

    await dispatch(loadSettingsDraft());
    dispatch(setDraftTheme('high-contrast'));

    await dispatch(saveSettingsDraft());

    expect(apiMock.setTheme).toHaveBeenCalledWith('high-contrast');
    expect(apiMock.setGeneralSettings).toHaveBeenCalled();
    expect(apiMock.setAiSettings).toHaveBeenCalled();
    expect(selectSettingsDraftDirty(store.getState() as never)).toBe(false);
  });
});
