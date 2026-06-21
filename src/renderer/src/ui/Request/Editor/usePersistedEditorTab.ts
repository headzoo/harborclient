import { useCallback, useEffect, useRef, useState } from 'react';
import { requestEditorTabKey, resolveEditorTab } from '#/shared/requestEditorTab';
import type { EditorTab } from '#/shared/types';
import type { RequestDraft } from '#/renderer/src/store/drafts';

interface Options {
  /**
   * Current request draft being edited.
   */
  draft: RequestDraft;

  /**
   * Open tab id for unsaved draft keying.
   */
  tabId: string;

  /**
   * Whether the Body tab is available for the current method.
   */
  showBody: boolean;
}

interface Result {
  /**
   * Resolved editor tab for display (Body falls back when hidden).
   */
  tab: EditorTab;

  /**
   * Persists and updates the selected editor tab.
   */
  setTab: (tab: EditorTab) => void;
}

/**
 * Loads and persists the request editor tab per request via electron-store.
 */
export function usePersistedEditorTab({ draft, tabId, showBody }: Options): Result {
  const [tab, setTabState] = useState<EditorTab>('params');
  const tabRef = useRef(tab);

  /**
   * Keeps a ref in sync with tab state for persistence after first save.
   */
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const storageKey = requestEditorTabKey(draft, tabId);
  const previousDraftIdRef = useRef(draft.id);

  /**
   * Loads the persisted editor tab when the open tab changes.
   */
  useEffect(() => {
    let cancelled = false;
    const key = requestEditorTabKey(draft, tabId);

    void window.api.getRequestEditorTab(key).then((stored) => {
      if (cancelled) return;
      setTabState(resolveEditorTab(stored, showBody));
    });

    return () => {
      cancelled = true;
    };
    // Reload only when switching open tabs; draft.id changes after save must not reset the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft/showBody are correct on mount via editor key remount
  }, [tabId]);

  /**
   * Migrates tab persistence from unsaved tab key to saved request id on first save.
   */
  useEffect(() => {
    const previousId = previousDraftIdRef.current;
    previousDraftIdRef.current = draft.id;

    if (draft.id == null || previousId != null) return;

    void window.api.setRequestEditorTab(String(draft.id), tabRef.current);
    void window.api.deleteRequestEditorTab(requestEditorTabKey({}, tabId));
  }, [draft.id, tabId]);

  /**
   * Updates the selected tab in memory and electron-store.
   */
  const setTab = useCallback(
    (next: EditorTab) => {
      setTabState(next);
      void window.api.setRequestEditorTab(storageKey, next);
    },
    [storageKey]
  );

  const effectiveTab = tab === 'body' && !showBody ? 'params' : tab;

  return { tab: effectiveTab, setTab };
}
