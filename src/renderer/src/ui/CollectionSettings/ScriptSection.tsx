import { CodeEditor } from '@harborclient/sdk/components';
import type { JSX } from 'react';
import type { Variable } from '#/shared/types';
import { createHcCompletionSource } from '#/renderer/src/scripting/hcCompletions';

interface Props {
  phase: 'pre' | 'post';
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  variables: Variable[];
}

/**
 * Collection pre/post script editor for the PreRequest and PostRequest tabs.
 */
export function ScriptSection({
  phase,
  description,
  placeholder,
  value,
  onChange,
  variables
}: Props): JSX.Element {
  return (
    <div className="mb-6">
      <p className="mb-3 text-[14px] text-muted">{description}</p>
      <CodeEditor
        value={value}
        onChange={onChange}
        language="javascript"
        completionSource={createHcCompletionSource(phase, variables)}
        placeholder={placeholder}
        variables={variables}
        minHeight="240px"
      />
    </div>
  );
}
