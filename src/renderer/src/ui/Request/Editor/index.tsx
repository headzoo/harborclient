import type { JSX } from 'react';
import type { Variable } from '#/shared/types';
import { SegmentedTabs } from '#/renderer/src/components/SegmentedTabs';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import { Name } from './Name';
import { TabContent } from './TabContent';
import { UrlBar } from './UrlBar';
import { usePersistedEditorTab } from './usePersistedEditorTab';

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
   * Opens collection settings to edit variables.
   */
  onEditVariables?: () => void;
}

/**
 * Request builder: method, URL, params, headers, body, and send action.
 */
export function Editor({
  draft,
  tabId,
  onChange,
  onSend,
  sending,
  variables,
  collectionName,
  onEditVariables
}: Props): JSX.Element {
  const showBody = draft.method !== 'GET' && draft.method !== 'HEAD';
  const { tab, setTab } = usePersistedEditorTab({ draft, tabId, showBody });

  /**
   * Merges a partial update into the current draft.
   *
   * @param patch - Fields to update on the draft.
   */
  const update = (patch: Partial<RequestDraft>): void => {
    onChange({ ...draft, ...patch });
  };

  return (
    <div className="p-3">
      <Name
        name={draft.name}
        collectionName={collectionName}
        onNameChange={(name) => update({ name })}
      />

      <UrlBar
        method={draft.method}
        url={draft.url}
        variables={variables}
        sending={sending}
        onMethodChange={(method) => update({ method })}
        onUrlChange={(url) => update({ url })}
        onSend={onSend}
        onEditVariables={onEditVariables}
      />

      <div className="mt-2">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'params', label: 'Params' },
            { value: 'headers', label: 'Headers' },
            { value: 'cookies', label: 'Cookies' },
            { value: 'body', label: 'Body', hidden: !showBody },
            { value: 'pre', label: 'PreRequest' },
            { value: 'post', label: 'PostRequest' },
            { value: 'comment', label: 'Comment' }
          ]}
        />
      </div>

      <TabContent
        tab={tab}
        draft={draft}
        showBody={showBody}
        update={update}
        variables={variables}
        onEditVariables={onEditVariables}
      />
    </div>
  );
}
