import { SegmentedTabs, SegmentedTabsGroup } from '@harborclient/sdk/components';
import { useCallback, useMemo, type JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';
import { applyParamsToUrl, mergeParamsFromUrl } from '#/shared/queryParams';
import { ensureDefaultScriptRef, hasScriptContent } from '#/shared/scriptRefs';

import type { RequestTabContext } from '#/shared/plugin/types';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import { usePluginRequestTabs } from '#/renderer/src/plugins/pluginHooks';
import { Name } from './Name';
import { TabContent } from './TabContent';
import { UrlBar } from './UrlBar';
import { useHasCookies } from './useHasCookies';
import { usePersistedEditorTab } from './usePersistedEditorTab';

/**
 * Returns whether any key-value row has a non-empty key or value.
 *
 * @param rows - Key-value rows from params, headers, or cookies.
 * @returns True when at least one row has content.
 */
function hasKeyValue(rows: KeyValue[]): boolean {
  return rows.some((row) => row.key.trim() || row.value.trim());
}

interface Props {
  /**
   * Current request being edited.
   */
  draft: RequestDraft;

  /**
   * Open tab id for per-request editor tab persistence.
   */
  tabId: string;

  /**
   * Read-only plugin tab context shared with contributed tabs.
   */
  requestTabContext: RequestTabContext;

  /**
   * Called when any draft field changes.
   *
   * @param draft - Updated request draft.
   */
  onChange: (draft: RequestDraft) => void;

  /**
   * Called when the user clicks Send.
   */
  onSend: () => void;

  /**
   * Disables Send while a request is in flight.
   */
  sending: boolean;

  /**
   * Collection-scoped variables for URL highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Name of the collection this request belongs to, for display as a breadcrumb prefix.
   */
  collectionName?: string;

  /**
   * Name of the folder this request belongs to, for display as a breadcrumb segment.
   */
  folderName?: string;

  /**
   * Opens collection settings to edit variables.
   */
  onEditVariables?: () => void;

  /**
   * Called when the collection breadcrumb segment is clicked.
   */
  onCollectionClick?: () => void;

  /**
   * Called when the folder breadcrumb segment is clicked.
   */
  onFolderClick?: () => void;
}

/**
 * Request builder: method, URL, params, headers, body, and send action.
 */
export function Editor({
  draft,
  tabId,
  requestTabContext,
  onChange,
  onSend,
  sending,
  variables,
  collectionName,
  folderName,
  onEditVariables,
  onCollectionClick,
  onFolderClick
}: Props): JSX.Element {
  const pluginTabs = usePluginRequestTabs();
  const showBody = draft.method !== 'GET' && draft.method !== 'HEAD';

  /**
   * Merges a partial update into the current draft.
   *
   * @param patch - Fields to update on the draft.
   */
  const update = useCallback(
    (patch: Partial<RequestDraft>): void => {
      onChange({ ...draft, ...patch });
    },
    [draft, onChange]
  );

  /**
   * Seeds a blank inline script when entering a script tab with no entries yet.
   *
   * @param nextTab - Editor tab the user selected or restored.
   */
  const seedScriptTab = useCallback(
    (nextTab: string): void => {
      if (nextTab === 'pre' && draft.pre_request_scripts.length === 0) {
        update({ pre_request_scripts: ensureDefaultScriptRef(draft.pre_request_scripts) });
      }
      if (nextTab === 'post' && draft.post_request_scripts.length === 0) {
        update({ post_request_scripts: ensureDefaultScriptRef(draft.post_request_scripts) });
      }
    },
    [draft.post_request_scripts, draft.pre_request_scripts, update]
  );

  const { tab, setTab } = usePersistedEditorTab({
    draft,
    tabId,
    showBody,
    onTabResolved: seedScriptTab
  });
  const hasCookies = useHasCookies(draft.url, variables);

  /**
   * Per-tab indicators for whether each editor section has values set.
   */
  const tabIndicators = useMemo(
    () => ({
      params: hasKeyValue(draft.params),
      headers: hasKeyValue(draft.headers),
      auth: draft.auth.type !== 'none',
      cookies: hasCookies,
      body: showBody && draft.body.trim().length > 0,
      pre: hasScriptContent(draft.pre_request_scripts),
      post: hasScriptContent(draft.post_request_scripts),
      comment: draft.comment.trim().length > 0
    }),
    [
      draft.params,
      draft.headers,
      draft.auth,
      draft.body,
      draft.pre_request_scripts,
      draft.post_request_scripts,
      draft.comment,
      hasCookies,
      showBody
    ]
  );

  /**
   * Built-in and plugin request editor tabs merged for SegmentedTabs.
   */
  const tabs = useMemo(
    () => [
      { value: 'params', label: 'Params', indicator: tabIndicators.params },
      { value: 'headers', label: 'Headers', indicator: tabIndicators.headers },
      { value: 'auth', label: 'Authorization', indicator: tabIndicators.auth },
      { value: 'cookies', label: 'Cookies', indicator: tabIndicators.cookies },
      { value: 'body', label: 'Body', hidden: !showBody, indicator: tabIndicators.body },
      { value: 'pre', label: 'PreRequest', indicator: tabIndicators.pre },
      { value: 'post', label: 'PostRequest', indicator: tabIndicators.post },
      { value: 'comment', label: 'Comment', indicator: tabIndicators.comment },
      ...pluginTabs.map((entry) => ({ value: entry.id, label: entry.title }))
    ],
    [pluginTabs, showBody, tabIndicators]
  );

  /**
   * Seeds a blank inline script when entering a script tab with no entries yet.
   *
   * @param nextTab - Editor tab the user selected.
   */
  const handleTabChange = (nextTab: string): void => {
    seedScriptTab(nextTab);
    setTab(nextTab);
  };

  /**
   * Updates the URL and mirrors its query string into the params table.
   *
   * @param url - URL typed in the URL bar.
   */
  const handleUrlChange = (url: string): void => {
    update({ url, params: mergeParamsFromUrl(url, draft.params) });
  };

  /**
   * Updates params and rewrites the URL query string from enabled rows.
   *
   * @param params - Updated params table rows.
   */
  const handleParamsChange = (params: KeyValue[]): void => {
    update({ params, url: applyParamsToUrl(draft.url, params) });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-separator p-3">
        <Name
          name={draft.name}
          collectionName={collectionName}
          folderName={folderName}
          onNameChange={(name) => update({ name })}
          onCollectionClick={onCollectionClick}
          onFolderClick={onFolderClick}
        />

        <UrlBar
          method={draft.method}
          url={draft.url}
          variables={variables}
          sending={sending}
          onMethodChange={(method) => update({ method })}
          onUrlChange={handleUrlChange}
          onSend={onSend}
          onEditVariables={onEditVariables}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SegmentedTabsGroup
          value={tab}
          onChange={handleTabChange}
          ariaLabel="Request editor sections"
        >
          <div className="shrink-0">
            <SegmentedTabs tabs={tabs} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6">
            <TabContent
              draft={draft}
              showBody={showBody}
              update={update}
              onParamsChange={handleParamsChange}
              variables={variables}
              onEditVariables={onEditVariables}
              pluginTabs={pluginTabs}
              requestTabContext={requestTabContext}
            />
          </div>
        </SegmentedTabsGroup>
      </div>
    </div>
  );
}
