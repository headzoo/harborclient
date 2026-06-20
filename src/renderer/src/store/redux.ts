import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer from '#/renderer/src/store/slices/collectionsSlice';
import environmentsReducer from '#/renderer/src/store/slices/environmentsSlice';
import tabsReducer from '#/renderer/src/store/slices/tabsSlice';
import consoleReducer from '#/renderer/src/store/slices/consoleSlice';
import { persistActiveEnvironmentId, persistTabs } from '#/renderer/src/store/persistence';

export const store = configureStore({
  reducer: {
    collections: collectionsReducer,
    environments: environmentsReducer,
    tabs: tabsReducer,
    console: consoleReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** Typed thunk API for createAsyncThunk generics. */
export type ThunkApiConfig = {
  state: RootState;
};

store.subscribe(() => {
  const state = store.getState();
  persistTabs(state.tabs.tabs, state.tabs.activeTabId);
  persistActiveEnvironmentId(state.environments.activeEnvironmentId);
});
