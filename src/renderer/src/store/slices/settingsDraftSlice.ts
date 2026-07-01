import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  AiSettings,
  CodeEditorSetup,
  GeneralSettings,
  ProxySettings,
  ThemeSource
} from '#/shared/types';
import type { RootState } from '#/renderer/src/store/redux';
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_GENERAL_SETTINGS
} from '#/renderer/src/ui/Settings/constants';

/**
 * Snapshot of persisted settings values used for dirty detection.
 */
export interface SettingsDraftBaseline {
  general: GeneralSettings;
  ai: AiSettings;
  theme: ThemeSource;
}

export interface SettingsDraftState {
  general: GeneralSettings;
  ai: AiSettings;
  theme: ThemeSource;
  baseline: SettingsDraftBaseline | null;
  loading: boolean;
  saving: boolean;
  loadError: string | null;
}

const initialState: SettingsDraftState = {
  general: DEFAULT_GENERAL_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
  theme: 'system',
  baseline: null,
  loading: false,
  saving: false,
  loadError: null
};

/**
 * Deep-clones a settings draft snapshot for baseline comparison.
 *
 * @param state - Draft values to clone.
 */
function cloneDraftSnapshot(
  state: Pick<SettingsDraftState, 'general' | 'ai' | 'theme'>
): SettingsDraftBaseline {
  return {
    general: structuredClone(state.general),
    ai: structuredClone(state.ai),
    theme: state.theme
  };
}

/**
 * Returns true when two draft snapshots are equivalent.
 *
 * @param left - First snapshot.
 * @param right - Second snapshot.
 */
function draftSnapshotsEqual(left: SettingsDraftBaseline, right: SettingsDraftBaseline): boolean {
  return (
    left.theme === right.theme &&
    JSON.stringify(left.general) === JSON.stringify(right.general) &&
    JSON.stringify(left.ai) === JSON.stringify(right.ai)
  );
}

const settingsDraftSlice = createSlice({
  name: 'settingsDraft',
  initialState,
  reducers: {
    /**
     * Marks the draft as loading from persistence.
     */
    setSettingsDraftLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    /**
     * Marks the draft as saving to persistence.
     */
    setSettingsDraftSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    /**
     * Stores a load failure message for form sections.
     */
    setSettingsDraftLoadError(state, action: PayloadAction<string | null>) {
      state.loadError = action.payload;
    },
    /**
     * Replaces draft values and baseline after a successful load or save.
     */
    initSettingsDraft(
      state,
      action: PayloadAction<{ general: GeneralSettings; ai: AiSettings; theme: ThemeSource }>
    ) {
      state.general = structuredClone(action.payload.general);
      state.ai = structuredClone(action.payload.ai);
      state.theme = action.payload.theme;
      state.baseline = cloneDraftSnapshot(action.payload);
      state.loadError = null;
    },
    /**
     * Updates the appearance theme in the draft.
     */
    setDraftTheme(state, action: PayloadAction<ThemeSource>) {
      state.theme = action.payload;
    },
    /**
     * Updates a top-level general settings field in the draft.
     */
    setDraftGeneralField<K extends keyof GeneralSettings>(
      state: SettingsDraftState,
      action: PayloadAction<{ key: K; value: GeneralSettings[K] }>
    ) {
      state.general[action.payload.key] = action.payload.value;
    },
    /**
     * Updates a proxy settings field nested under general settings.
     */
    setDraftProxyField<K extends keyof ProxySettings>(
      state: SettingsDraftState,
      action: PayloadAction<{ key: K; value: ProxySettings[K] }>
    ) {
      state.general.proxy[action.payload.key] = action.payload.value;
    },
    /**
     * Updates the CodeMirror theme in the draft.
     */
    setDraftCodeEditorTheme(state, action: PayloadAction<GeneralSettings['codeEditorTheme']>) {
      state.general.codeEditorTheme = action.payload;
    },
    /**
     * Updates one CodeMirror setup flag in the draft.
     */
    setDraftCodeEditorSetupField(
      state,
      action: PayloadAction<{ key: keyof CodeEditorSetup; value: boolean }>
    ) {
      state.general.codeEditorSetup[action.payload.key] = action.payload.value;
    },
    /**
     * Updates an AI settings field in the draft.
     */
    setDraftAiField<K extends keyof AiSettings>(
      state: SettingsDraftState,
      action: PayloadAction<{ key: K; value: AiSettings[K] }>
    ) {
      state.ai[action.payload.key] = action.payload.value;
    },
    /**
     * Resets draft values to the last loaded baseline.
     */
    resetSettingsDraftToBaseline(state) {
      if (state.baseline == null) {
        return;
      }
      state.general = structuredClone(state.baseline.general);
      state.ai = structuredClone(state.baseline.ai);
      state.theme = state.baseline.theme;
    }
  }
});

export const {
  setSettingsDraftLoading,
  setSettingsDraftSaving,
  setSettingsDraftLoadError,
  initSettingsDraft,
  setDraftTheme,
  setDraftGeneralField,
  setDraftProxyField,
  setDraftCodeEditorTheme,
  setDraftCodeEditorSetupField,
  setDraftAiField,
  resetSettingsDraftToBaseline
} = settingsDraftSlice.actions;

/**
 * Returns true while draft values are being loaded from persistence.
 */
export const selectSettingsDraftLoading = (state: RootState): boolean =>
  state.settingsDraft.loading;

/**
 * Returns true while draft values are being saved.
 */
export const selectSettingsDraftSaving = (state: RootState): boolean => state.settingsDraft.saving;

/**
 * Returns the draft load error message, if any.
 */
export const selectSettingsDraftLoadError = (state: RootState): string | null =>
  state.settingsDraft.loadError;

/**
 * Returns true when draft values differ from the loaded baseline.
 */
export const selectSettingsDraftDirty = (state: RootState): boolean => {
  const { baseline, general, ai, theme } = state.settingsDraft;
  if (baseline == null) {
    return false;
  }
  return !draftSnapshotsEqual(baseline, { general, ai, theme });
};

/**
 * Returns true when draft controls should be disabled.
 */
export const selectSettingsDraftDisabled = (state: RootState): boolean =>
  state.settingsDraft.loading || state.settingsDraft.saving;

/**
 * Returns the draft appearance theme.
 */
export const selectDraftTheme = (state: RootState): ThemeSource => state.settingsDraft.theme;

/**
 * Returns the draft general settings object.
 */
export const selectDraftGeneral = (state: RootState): GeneralSettings =>
  state.settingsDraft.general;

/**
 * Returns the draft AI settings object.
 */
export const selectDraftAi = (state: RootState): AiSettings => state.settingsDraft.ai;

/**
 * Returns proxy settings from the draft general settings object.
 */
export const selectDraftProxy = (state: RootState): ProxySettings =>
  state.settingsDraft.general.proxy;

export default settingsDraftSlice.reducer;
