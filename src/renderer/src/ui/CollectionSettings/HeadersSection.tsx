import { KeyValueEditor } from '@harborclient/sdk/components';
import type { JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';

interface Props {
  headers: KeyValue[];
  variables: Variable[];
  onChange: (headers: KeyValue[]) => void;
}

/**
 * Collection headers editor for the Headers tab.
 */
export function HeadersSection({ headers, variables, onChange }: Props): JSX.Element {
  return (
    <div className="mb-6">
      <p className="mb-3 text-[14px] text-muted">
        These headers are sent with every request in this collection. Header values support{' '}
        {'{{variable}}'} syntax. Request-level headers override collection headers with the same
        name.
      </p>
      <KeyValueEditor
        rows={headers}
        onChange={onChange}
        placeholderKey="header"
        placeholderValue="value"
        variables={variables}
      />
    </div>
  );
}
