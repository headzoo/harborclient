import type { RootState } from '#/renderer/src/store/redux';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import type { Collection, Environment, ScriptTestResult, SendResult } from '#/shared/types';
import { defaultDraft } from '#/renderer/src/store/drafts';

/**
 * Returns all collections in sidebar order.
 */
export const selectCollections = (state: RootState): Collection[] => state.collections.collections;
/**
 * Returns cached requests keyed by collection id.
 */
export const selectRequestsByCollection = (
  state: RootState
): RootState['collections']['requestsByCollection'] => state.collections.requestsByCollection;
/**
 * Returns cached folders keyed by collection id.
 */
export const selectFoldersByCollection = (
  state: RootState
): RootState['collections']['foldersByCollection'] => state.collections.foldersByCollection;
/**
 * Returns the sidebar selected collection id.
 */
export const selectSelectedCollectionId = (
  state: RootState
): RootState['collections']['selectedCollectionId'] => state.collections.selectedCollectionId;
/**
 * Returns the sidebar selected folder id.
 */
export const selectSelectedFolderId = (
  state: RootState
): RootState['collections']['selectedFolderId'] => state.collections.selectedFolderId;

/**
 * Returns all environments.
 */
export const selectEnvironments = (state: RootState): Environment[] =>
  state.environments.environments;
/**
 * Returns the active environment id.
 */
export const selectActiveEnvironmentId = (
  state: RootState
): RootState['environments']['activeEnvironmentId'] => state.environments.activeEnvironmentId;

/**
 * Returns all open request tabs.
 */
export const selectTabs = (state: RootState): RootState['tabs']['tabs'] => state.tabs.tabs;
/**
 * Returns the active tab id.
 */
export const selectActiveTabId = (state: RootState): RootState['tabs']['activeTabId'] =>
  state.tabs.activeTabId;

/**
 * Returns the active tab object, falling back to the first tab.
 */
export const selectActiveTab = (
  state: RootState
): RootState['tabs']['tabs'][number] | undefined => {
  const tabs = state.tabs.tabs;
  const activeTabId = state.tabs.activeTabId;
  return tabs.find((t) => t.tabId === activeTabId) ?? tabs[0];
};

/**
 * Returns the draft for the active tab.
 */
export const selectDraft = (state: RootState): RequestDraft =>
  selectActiveTab(state)?.draft ?? defaultDraft();
/**
 * Returns the last send response for the active tab.
 */
export const selectResponse = (state: RootState): SendResult | null =>
  selectActiveTab(state)?.response ?? null;
/**
 * Returns whether the active tab request is in flight.
 */
export const selectSending = (state: RootState): boolean =>
  selectActiveTab(state)?.sending ?? false;
/**
 * Returns script test results for the active tab.
 */
export const selectTestResults = (state: RootState): ScriptTestResult[] =>
  selectActiveTab(state)?.testResults ?? [];

/**
 * Returns session console log entries.
 */
export const selectConsoleEntries = (state: RootState): RootState['console']['consoleEntries'] =>
  state.console.consoleEntries;
