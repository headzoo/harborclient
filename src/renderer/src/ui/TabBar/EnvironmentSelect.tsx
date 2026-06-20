import type { JSX } from 'react';
import type { Environment } from '#/shared/types';
import { field } from '#/renderer/src/ui/shared/classes';

interface Props {
  environments: Environment[];
  activeEnvironmentId: number | null;
  onEnvironmentChange: (id: number | null) => void;
}

/**
 * Environment selector dropdown for the tab bar.
 */
export function EnvironmentSelect({
  environments,
  activeEnvironmentId,
  onEnvironmentChange
}: Props): JSX.Element {
  return (
    <div className="ms-auto flex shrink-0 self-stretch items-center px-2">
      <select
        className={`${field} max-w-[180px] cursor-pointer py-1 text-[13px] app-no-drag`}
        value={activeEnvironmentId ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onEnvironmentChange(value ? Number(value) : null);
        }}
        title="Active environment"
      >
        <option value="">No Environment</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name}
          </option>
        ))}
      </select>
    </div>
  );
}
