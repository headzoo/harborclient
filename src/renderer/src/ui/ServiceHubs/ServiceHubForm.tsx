import type { JSX } from 'react';
import type { ServiceHub } from '#/shared/types';

interface Props {
  /**
   * Service hub draft being edited.
   */
  hub: ServiceHub;

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
  onChange: (hub: ServiceHub) => void;
}

/**
 * Form fields for creating or editing a service hub connection.
 */
export function ServiceHubForm({
  hub,
  disabled = false,
  fieldErrors = {},
  onChange
}: Props): JSX.Element {
  const nameErrorId = 'service-hub-name-error';
  const baseUrlErrorId = 'service-hub-base-url-error';
  const tokenErrorId = 'service-hub-token-error';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="service-hub-name" className="mb-1 block text-[14px] font-medium text-text">
          Name
        </label>
        <input
          id="service-hub-name"
          type="text"
          className="w-full rounded-md border border-separator bg-surface px-3 py-2 text-[14px] text-text"
          value={hub.name}
          disabled={disabled}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? nameErrorId : undefined}
          onChange={(event) => onChange({ ...hub, name: event.target.value })}
        />
        {fieldErrors.name && (
          <p id={nameErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="service-hub-base-url"
          className="mb-1 block text-[14px] font-medium text-text"
        >
          Service hub URL
        </label>
        <input
          id="service-hub-base-url"
          type="url"
          className="w-full rounded-md border border-separator bg-surface px-3 py-2 text-[14px] text-text"
          value={hub.baseUrl}
          disabled={disabled}
          aria-invalid={fieldErrors.baseUrl ? true : undefined}
          aria-describedby={fieldErrors.baseUrl ? baseUrlErrorId : undefined}
          onChange={(event) => onChange({ ...hub, baseUrl: event.target.value })}
        />
        {fieldErrors.baseUrl && (
          <p id={baseUrlErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.baseUrl}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-hub-token" className="mb-1 block text-[14px] font-medium text-text">
          API token
        </label>
        <input
          id="service-hub-token"
          type="password"
          autoComplete="off"
          className="w-full rounded-md border border-separator bg-surface px-3 py-2 text-[14px] text-text"
          value={hub.token}
          disabled={disabled}
          aria-invalid={fieldErrors.token ? true : undefined}
          aria-describedby={fieldErrors.token ? tokenErrorId : undefined}
          onChange={(event) => onChange({ ...hub, token: event.target.value })}
        />
        {fieldErrors.token && (
          <p id={tokenErrorId} className="mt-1 text-[14px] text-danger">
            {fieldErrors.token}
          </p>
        )}
      </div>
    </div>
  );
}
