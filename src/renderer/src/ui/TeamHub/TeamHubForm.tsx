import type { JSX } from 'react';
import type { TeamHub } from '#/shared/types';
import { FormGroup } from '#/renderer/src/components/FormGroup';
import { Input } from '#/renderer/src/components/forms';

interface Props {
  /**
   * Team hub draft being edited.
   */
  hub: TeamHub;

  /**
   * Whether the form is disabled during save.
   */
  disabled?: boolean;

  /**
   * Field-specific validation errors keyed by field name.
   */
  fieldErrors?: Record<string, string>;

  /**
   * Called when any field changes.
   */
  onChange: (hub: TeamHub) => void;
}

/**
 * Form fields for creating or editing a team hub connection.
 */
export function TeamHubForm({
  hub,
  disabled = false,
  fieldErrors = {},
  onChange
}: Props): JSX.Element {
  const nameErrorId = 'team-hub-name-error';
  const baseUrlErrorId = 'team-hub-base-url-error';
  const tokenErrorId = 'team-hub-token-error';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FormGroup label="Name" htmlFor="team-hub-name">
          <Input
            id="team-hub-name"
            type="text"
            variant="surface"
            value={hub.name}
            disabled={disabled}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? nameErrorId : undefined}
            onChange={(event) => onChange({ ...hub, name: event.target.value })}
          />
        </FormGroup>
        {fieldErrors.name && (
          <p id={nameErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <FormGroup label="Team hub URL" htmlFor="team-hub-base-url">
          <Input
            id="team-hub-base-url"
            type="url"
            variant="surface"
            value={hub.baseUrl}
            disabled={disabled}
            aria-invalid={fieldErrors.baseUrl ? true : undefined}
            aria-describedby={fieldErrors.baseUrl ? baseUrlErrorId : undefined}
            onChange={(event) => onChange({ ...hub, baseUrl: event.target.value })}
          />
        </FormGroup>
        {fieldErrors.baseUrl && (
          <p id={baseUrlErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.baseUrl}
          </p>
        )}
      </div>

      <div>
        <FormGroup label="API token" htmlFor="team-hub-token">
          <Input
            id="team-hub-token"
            type="password"
            autoComplete="off"
            variant="surface"
            value={hub.token}
            disabled={disabled}
            aria-invalid={fieldErrors.token ? true : undefined}
            aria-describedby={fieldErrors.token ? tokenErrorId : undefined}
            onChange={(event) => onChange({ ...hub, token: event.target.value })}
          />
        </FormGroup>
        {fieldErrors.token && (
          <p id={tokenErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.token}
          </p>
        )}
      </div>
    </div>
  );
}
