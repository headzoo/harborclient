import type { RootState } from '#/renderer/src/store/redux';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import type { Collection, Environment, ScriptTestResult, SendResult } from '#/shared/types';
import { defaultDraft } from '#/renderer/src/store/drafts';

export const selectCollections = (state: RootState): Collection[] => state.collections.collections;
export const selectRequestsByCollection = (
  state: RootState
): RootState['collections']['requestsByCollection'] => state.collections.requestsByCollection;
export const selectFoldersByCollection = (
  state: RootState
): RootState['collections']['foldersByCollection'] => state.collections.foldersByCollection;
export const selectSelectedCollectionId = (
  state: RootState
): RootState['collections']['selectedCollectionId'] => state.collections.selectedCollectionId;

export const selectEnvironments = (state: RootState): Environment[] =>
  state.environments.environments;
export const selectActiveEnvironmentId = (
  state: RootState
): RootState['environments']['activeEnvironmentId'] => state.environments.activeEnvironmentId;

export const selectTabs = (state: RootState): RootState['tabs']['tabs'] => state.tabs.tabs;
export const selectActiveTabId = (state: RootState): RootState['tabs']['activeTabId'] =>
  state.tabs.activeTabId;

export const selectActiveTab = (
  state: RootState
): RootState['tabs']['tabs'][number] | undefined => {
  const tabs = state.tabs.tabs;
  const activeTabId = state.tabs.activeTabId;
  return tabs.find((t) => t.tabId === activeTabId) ?? tabs[0];
};

export const selectDraft = (state: RootState): RequestDraft =>
  selectActiveTab(state)?.draft ?? defaultDraft();
export const selectResponse = (state: RootState): SendResult | null =>
  selectActiveTab(state)?.response ?? null;
export const selectSending = (state: RootState): boolean =>
  selectActiveTab(state)?.sending ?? false;
export const selectTestResults = (state: RootState): ScriptTestResult[] =>
  selectActiveTab(state)?.testResults ?? [];

export const selectConsoleEntries = (state: RootState): RootState['console']['consoleEntries'] =>
  state.console.consoleEntries;
