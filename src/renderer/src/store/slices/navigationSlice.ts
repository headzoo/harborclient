import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '#/renderer/src/store/redux';

/** Which main-area view is currently shown. Overlays are mutually exclusive. */
export type MainView =
  | { type: 'request' }
  | { type: 'settings' }
  | { type: 'certificates' }
  | { type: 'collection'; id: number }
  | { type: 'environment'; id: number };

export interface NavigationState {
  mainView: MainView;
  collectionSettingsDirty: boolean;
  environmentSettingsDirty: boolean;
  showSidebar: boolean;
  showConsole: boolean;
  showVariables: boolean;
}

const initialState: NavigationState = {
  mainView: { type: 'request' },
  collectionSettingsDirty: false,
  environmentSettingsDirty: false,
  showSidebar: true,
  showConsole: false,
  showVariables: false
};

/**
 * Resets dirty flags when switching overlays so a new settings form starts clean.
 */
function resetDirtyFlags(state: NavigationState): void {
  state.collectionSettingsDirty = false;
  state.environmentSettingsDirty = false;
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    openSettings(state) {
      resetDirtyFlags(state);
      state.mainView = { type: 'settings' };
    },
    openCertificates(state) {
      resetDirtyFlags(state);
      state.mainView = { type: 'certificates' };
    },
    openCollectionSettings(state, action: PayloadAction<number>) {
      resetDirtyFlags(state);
      state.mainView = { type: 'collection', id: action.payload };
    },
    openEnvironmentSettings(state, action: PayloadAction<number>) {
      resetDirtyFlags(state);
      state.mainView = { type: 'environment', id: action.payload };
    },
    closeOverlay(state) {
      resetDirtyFlags(state);
      state.mainView = { type: 'request' };
    },
    setCollectionSettingsDirty(state, action: PayloadAction<boolean>) {
      state.collectionSettingsDirty = action.payload;
    },
    setEnvironmentSettingsDirty(state, action: PayloadAction<boolean>) {
      state.environmentSettingsDirty = action.payload;
    },
    toggleSidebar(state) {
      state.showSidebar = !state.showSidebar;
    },
    toggleConsole(state) {
      state.showConsole = !state.showConsole;
      if (state.showConsole) {
        state.showVariables = false;
      }
    },
    toggleVariables(state) {
      state.showVariables = !state.showVariables;
      if (state.showVariables) {
        state.showConsole = false;
      }
    }
  }
});

export const {
  openSettings,
  openCertificates,
  openCollectionSettings,
  openEnvironmentSettings,
  closeOverlay,
  setCollectionSettingsDirty,
  setEnvironmentSettingsDirty,
  toggleSidebar,
  toggleConsole,
  toggleVariables
} = navigationSlice.actions;

export const selectMainView = (state: RootState): MainView => state.navigation.mainView;
export const selectCollectionSettingsDirty = (state: RootState): boolean =>
  state.navigation.collectionSettingsDirty;
export const selectEnvironmentSettingsDirty = (state: RootState): boolean =>
  state.navigation.environmentSettingsDirty;
export const selectShowSidebar = (state: RootState): boolean => state.navigation.showSidebar;
export const selectShowConsole = (state: RootState): boolean => state.navigation.showConsole;
export const selectShowVariables = (state: RootState): boolean => state.navigation.showVariables;

/**
 * Sidebar is hidden when app settings or certificates are open, even if the
 * user has not toggled it off manually.
 */
export const selectSidebarVisible = (state: RootState): boolean => {
  const { mainView, showSidebar } = state.navigation;
  return showSidebar && mainView.type !== 'settings' && mainView.type !== 'certificates';
};

export default navigationSlice.reducer;
