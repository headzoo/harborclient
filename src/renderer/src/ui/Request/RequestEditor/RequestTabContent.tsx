import type { JSX } from 'react';
import type { BodyType, Variable } from '#/shared/types';
import { CodeEditor } from '#/renderer/src/components/CodeEditor';
import { KeyValueEditor } from '#/renderer/src/components/KeyValueEditor';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import { field } from '#/renderer/src/ui/shared/classes';
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
export function RequestTabContent({
  tab,
  draft,
  showBody,
  update,
  variables,
  onEditVariables
}: Props): JSX.Element {
  return (
    <div className="min-h-[160px] pt-2">
      {tab === 'params' && (
        <KeyValueEditor
          rows={draft.params}
          onChange={(params) => update({ params })}
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

      {tab === 'body' && showBody && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-muted">Body type</label>
            <select
              className={field}
              value={draft.body_type}
              onChange={(e) => update({ body_type: e.target.value as BodyType })}
            >
              <option value="none">None</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
          </div>
          {draft.body_type !== 'none' && (
            <CodeEditor
              value={draft.body}
              onChange={(body) => update({ body })}
              language={draft.body_type === 'json' ? 'json' : 'text'}
              placeholder={draft.body_type === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
              variables={variables}
              onEditVariable={onEditVariables}
            />
          )}
        </div>
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
    </div>
  );
}
