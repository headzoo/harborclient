import type { JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';
import { CodeEditor } from '#/renderer/src/components/CodeEditor';
import { KeyValueEditor } from '#/renderer/src/components/KeyValueEditor';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import { field } from '#/renderer/src/ui/shared/classes';
import { BodyEditor } from './BodyEditor';
import { CookiesEditor } from './CookiesEditor';
import type { EditorTab } from './types';

interface Props {
  /**
   * Active editor tab.
   */
  tab: EditorTab;

  /**
   * Current request being edited.
   */
  draft: RequestDraft;

  /**
   * Whether the body tab is available for the current method.
   */
  showBody: boolean;

  /**
   * Merges a partial update into the current draft.
   */
  update: (patch: Partial<RequestDraft>) => void;

  /**
   * Updates params and mirrors them into the URL query string.
   *
   * @param params - Updated params table rows.
   */
  onParamsChange: (params: KeyValue[]) => void;

  /**
   * Collection-scoped variables for highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Opens collection settings to edit variables.
   */
  onEditVariables?: () => void;
}

/**
 * Tab panel content for params, headers, body, and scripts.
 */
export function TabContent({
  tab,
  draft,
  showBody,
  update,
  onParamsChange,
  variables,
  onEditVariables
}: Props): JSX.Element {
  return (
    <div className="min-h-[160px] pt-2">
      {tab === 'params' && (
        <KeyValueEditor
          rows={draft.params}
          onChange={onParamsChange}
          placeholderKey="param"
          placeholderValue="value"
          variables={variables}
          onEditVariable={onEditVariables}
        />
      )}
      {tab === 'headers' && (
        <KeyValueEditor
          rows={draft.headers}
          onChange={(headers) => update({ headers })}
          placeholderKey="header"
          placeholderValue="value"
          variables={variables}
          onEditVariable={onEditVariables}
        />
      )}
      {tab === 'cookies' && <CookiesEditor url={draft.url} variables={variables} />}

      {tab === 'body' && showBody && (
        <BodyEditor
          bodyType={draft.body_type}
          body={draft.body}
          update={update}
          variables={variables}
          onEditVariables={onEditVariables}
        />
      )}
      {tab === 'pre' && (
        <CodeEditor
          value={draft.pre_request_script}
          onChange={(pre_request_script) => update({ pre_request_script })}
          language="javascript"
          scriptPhase="pre"
          placeholder="// hc.request.url = 'https://example.com';\n// hc.variables.set('token', 'abc');"
          variables={variables}
          onEditVariable={onEditVariables}
          minHeight="200px"
        />
      )}
      {tab === 'post' && (
        <CodeEditor
          value={draft.post_request_script}
          onChange={(post_request_script) => update({ post_request_script })}
          language="javascript"
          scriptPhase="post"
          placeholder={
            '// hc.test("status is 200", () => {\n//   hc.expect(hc.response.code).to.equal(200);\n// });'
          }
          variables={variables}
          onEditVariable={onEditVariables}
          minHeight="200px"
        />
      )}
      {tab === 'comment' && (
        <textarea
          className={`${field} w-full min-h-[200px] resize-y`}
          value={draft.comment}
          onChange={(event) => update({ comment: event.target.value })}
          placeholder="Notes for this request"
        />
      )}
    </div>
  );
}
