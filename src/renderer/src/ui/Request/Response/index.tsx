import { useMemo, useState, type JSX } from 'react';
import type { ScriptTestResult, SendResult } from '#/shared/types';
import { CodeEditor } from '#/renderer/src/components/CodeEditor';
import { SegmentedTabs } from '#/renderer/src/components/SegmentedTabs';
import { secondaryButton, statusDotClass } from '#/renderer/src/ui/shared/classes';
import {
  bodyLanguage,
  formatBody,
  formatBytes
} from '#/renderer/src/ui/shared/responseFormatUtils';
import { Headers } from './Headers';
import { Tests } from './Tests';
import type { ViewerTab } from './types';

interface Props {
  /**
   * Last send result to display, or null before the first send.
   */
  response: SendResult | null;

  /**
   * Whether a request is in flight; shows a loading state when true.
   */
  sending: boolean;

  /**
   * hc.test results from pre/post scripts for the last send.
   */
  testResults: ScriptTestResult[];

  /**
   * Cancels the in-flight request.
   */
  onCancel: () => void;
}

/**
 * Displays HTTP response status, timing, body, headers, and script test results.
 */
export function Response({ response, sending, testResults, onCancel }: Props): JSX.Element {
  const [tab, setTab] = useState<ViewerTab>('body');

  const formattedBody = useMemo(() => (response ? formatBody(response.body) : ''), [response]);

  const responseBodyLanguage = useMemo(
    () => (response ? bodyLanguage(response.body, response.headers) : 'text'),
    [response]
  );

  const hasTests = testResults.length > 0;
  const passedCount = testResults.filter((test) => test.passed).length;
  const failedCount = testResults.length - passedCount;
  const effectiveTab = tab === 'tests' && !hasTests ? 'body' : tab;

  const emptyState = (message: string): JSX.Element => (
    <div className="flex flex-1 flex-col p-3">
      <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
        {message}
      </div>
    </div>
  );

  if (sending) {
    return (
      <div className="flex flex-1 flex-col p-3">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[13px] text-muted">
          <span>Sending request…</span>
          <button className={secondaryButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!response) {
    return emptyState('Send a request to see the response');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex items-center gap-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-text">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotClass(response.status)}`}
          />
          {response.error ? 'Error' : `${response.status} ${response.statusText}`}
        </span>
        <span className="text-muted">{response.timeMs} ms</span>
        <span className="text-muted">{formatBytes(response.sizeBytes)}</span>
      </div>

      {response.error && (
        <div className="mb-2 rounded-md bg-danger/10 px-2.5 py-2 text-[13px] text-danger">
          {response.error}
        </div>
      )}

      <div className="mb-2">
        <SegmentedTabs
          value={effectiveTab}
          onChange={setTab}
          tabs={[
            { value: 'body', label: 'Body' },
            { value: 'headers', label: 'Headers' },
            {
              value: 'tests',
              hidden: !hasTests,
              label: (
                <>
                  Tests
                  <span
                    className={`ml-1.5 text-[12px] ${failedCount > 0 ? 'text-danger' : 'text-muted'}`}
                  >
                    {passedCount}/{testResults.length}
                  </span>
                </>
              )
            }
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {effectiveTab === 'body' && (
          <CodeEditor
            readOnly
            value={formattedBody || '(empty body)'}
            language={responseBodyLanguage}
          />
        )}
        {effectiveTab === 'headers' && <Headers headers={response.headers} />}
        {effectiveTab === 'tests' && hasTests && <Tests testResults={testResults} />}
      </div>
    </div>
  );
}
