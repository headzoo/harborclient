import {
  cloneDraft,
  createTab,
  normalizeDraft,
  type RequestDraft,
  type RequestTab
} from '#/renderer/src/store/drafts';

export const OPEN_TABS_KEY = 'harborclient.openTabs';
export const LEGACY_OPEN_TABS_KEY = 'harbor-client.openTabs';
export const ACTIVE_ENVIRONMENT_KEY = 'harborclient.activeEnvironmentId';

/** Persisted tab shape (draft only, no response/sending). */
export interface PersistedTab {
  tabId: string;
  draft: RequestDraft;
  savedDraft?: RequestDraft;
}

export interface PersistedOpenTabs {
  tabs: PersistedTab[];
  activeTabId: string;
}

/**
 * Returns default tab state when nothing is persisted or restore fails.
 */
export function defaultTabState(): { tabs: RequestTab[]; activeTabId: string } {
  const tab = createTab();
  return { tabs: [tab], activeTabId: tab.tabId };
}

/**
 * Loads the persisted active environment ID from localStorage.
 */
export function loadActiveEnvironmentId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ENVIRONMENT_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Loads open tabs from localStorage, or returns a default single tab.
 */
export function loadTabsFromStorage(): { tabs: RequestTab[]; activeTabId: string } {
  try {
    let raw = localStorage.getItem(OPEN_TABS_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_OPEN_TABS_KEY);
      if (raw) {
        localStorage.setItem(OPEN_TABS_KEY, raw);
      }
    }
    if (!raw) return defaultTabState();

    const parsed = JSON.parse(raw) as PersistedOpenTabs;
    if (!parsed.tabs?.length || !parsed.activeTabId) return defaultTabState();

    const tabs: RequestTab[] = parsed.tabs.map((t) => {
      const draft = normalizeDraft(t.draft);
      const savedDraft = normalizeDraft(t.savedDraft ?? t.draft);
      return {
        tabId: t.tabId,
        draft,
        savedDraft: cloneDraft(savedDraft),
        response: null,
        sending: false,
        testResults: []
      };
    });

    const activeExists = tabs.some((t) => t.tabId === parsed.activeTabId);
    return {
      tabs,
      activeTabId: activeExists ? parsed.activeTabId : tabs[0].tabId
    };
  } catch {
    return defaultTabState();
  }
}

let initialTabState: { tabs: RequestTab[]; activeTabId: string } | undefined;

/**
 * Returns cached initial tab state, loading from storage on first call.
 */
export function getInitialTabState(): { tabs: RequestTab[]; activeTabId: string } {
  if (initialTabState === undefined) {
    initialTabState = loadTabsFromStorage();
  }
  return initialTabState;
}

/**
 * Persists open tabs to localStorage.
 */
export function persistTabs(tabs: RequestTab[], activeTabId: string): void {
  const payload: PersistedOpenTabs = {
    tabs: tabs.map((t) => ({ tabId: t.tabId, draft: t.draft, savedDraft: t.savedDraft })),
    activeTabId
  };
  localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(payload));
}

/**
 * Persists the active environment ID to localStorage.
 */
export function persistActiveEnvironmentId(id: number | null): void {
  if (id == null) {
    localStorage.removeItem(ACTIVE_ENVIRONMENT_KEY);
  } else {
    localStorage.setItem(ACTIVE_ENVIRONMENT_KEY, String(id));
  }
}
