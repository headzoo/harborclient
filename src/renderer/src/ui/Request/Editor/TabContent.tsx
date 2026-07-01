import {
  KeyValueEditor,
  SegmentedTabPanel,
  Textarea,
  CodeEditor
} from '@harborclient/sdk/components';
import type { JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';
import type { RegisteredRequestTab, RequestTabContext } from '#/shared/plugin/types';
import { PluginSurface } from '#/renderer/src/plugins/PluginSurface';
import { createHcCompletionSource } from '#/renderer/src/scripting/hcCompletions';

import type { RequestDraft } from '#/renderer/src/store/drafts';

import { AuthEditor } from './AuthEditor';
import { BodyEditor } from './BodyEditor';
import { CookiesEditor } from './CookiesEditor';
import {
  headerKeySource,
  headerValueSource,
  paramKeySource,
  paramValueSource
} from '#/renderer/src/autocomplete/sources';

interface Props {
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

  /**
   * Registered plugin request editor tabs.
   */
  pluginTabs: RegisteredRequestTab[];

  /**
   * Read-only context passed to plugin tab components.
   */
  requestTabContext: RequestTabContext;
}

/**
 * Tab panel content for params, headers, body, and scripts.
 */
export function TabContent({
  draft,
  showBody,
  update,
  onParamsChange,
  variables,
  onEditVariables,
  pluginTabs,
  requestTabContext
}: Props): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4">
      <SegmentedTabPanel value="params">
        <KeyValueEditor
          rows={draft.params}
          onChange={onParamsChange}
          placeholderKey="param"
          placeholderValue="value"
          variables={variables}
          onEditVariable={onEditVariables}
          keySource={paramKeySource}
          valueSource={paramValueSource}
        />
      </SegmentedTabPanel>
      <SegmentedTabPanel value="headers">
        <KeyValueEditor
          rows={draft.headers}
          onChange={(headers) => update({ headers })}
          placeholderKey="header"
          placeholderValue="value"
          variables={variables}
          onEditVariable={onEditVariables}
          keySource={headerKeySource}
          valueSource={headerValueSource}
        />
      </SegmentedTabPanel>
      <SegmentedTabPanel value="auth">
        <AuthEditor
          auth={draft.auth}
          onChange={(auth) => update({ auth })}
          variables={variables}
          onEditVariables={onEditVariables}
          oauthCacheKey={draft.id != null ? `request:${draft.id}` : undefined}
        />
      </SegmentedTabPanel>
      <SegmentedTabPanel value="cookies">
        <CookiesEditor url={draft.url} variables={variables} />
      </SegmentedTabPanel>
      {showBody && (
        <SegmentedTabPanel value="body">
          <BodyEditor
            bodyType={draft.body_type}
            body={draft.body}
            update={update}
            variables={variables}
            onEditVariables={onEditVariables}
          />
        </SegmentedTabPanel>
      )}
      <SegmentedTabPanel value="pre">
        <CodeEditor
          value={draft.pre_request_script}
          onChange={(pre_request_script) => update({ pre_request_script })}
          language="javascript"
          completionSource={createHcCompletionSource('pre', variables)}
          placeholder="// hc.request.url = 'https://example.com';\n// hc.variables.set('token', 'abc');"
          variables={variables}
          onEditVariable={onEditVariables}
          minHeight="200px"
        />
      </SegmentedTabPanel>
      <SegmentedTabPanel value="post">
        <CodeEditor
          value={draft.post_request_script}
          onChange={(post_request_script) => update({ post_request_script })}
          language="javascript"
          completionSource={createHcCompletionSource('post', variables)}
          placeholder={
            '// hc.test("status is 200", () => {\n//   hc.expect(hc.response.code).to.equal(200);\n// });'
          }
          variables={variables}
          onEditVariable={onEditVariables}
          minHeight="200px"
        />
      </SegmentedTabPanel>
      <SegmentedTabPanel value="comment">
        <Textarea
          className="w-full min-h-[200px] resize-y"
          value={draft.comment}
          onChange={(event) => update({ comment: event.target.value })}
          placeholder="Notes for this request"
        />
      </SegmentedTabPanel>
      {pluginTabs.map((entry) => (
        <SegmentedTabPanel key={entry.id} value={entry.id} className="flex min-h-0 flex-1 flex-col">
          <PluginSurface
            pluginId={entry.pluginId}
            contributionId={entry.contributionId}
            kind="requestTabs"
            context={requestTabContext}
            resizeMode="fill"
            className="h-full"
          />
        </SegmentedTabPanel>
      ))}
    </div>
  );
}
