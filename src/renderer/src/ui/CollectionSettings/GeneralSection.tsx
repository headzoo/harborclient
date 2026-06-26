import type { JSX } from 'react';
import { useId } from 'react';
import type { ProviderOption } from '#/renderer/src/hooks/useProviders';
import { providerOptionLabel } from '#/renderer/src/hooks/useProviders';
import { Button } from '#/renderer/src/components/Button';
import { FormGroup } from '#/renderer/src/components/FormGroup';
import { Input, Select } from '#/renderer/src/components/forms';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  connectionId: string;
  providers: ProviderOption[];
  onConnectionIdChange: (connectionId: string) => void;
  /**
   * True while providers are loading from IPC.
   */
  providersLoading: boolean;
  /**
   * Bootstrap error message when provider list IPC fails; null otherwise.
   */
  providersError: string | null;
  /**
   * Retries loading providers after a bootstrap failure.
   */
  onProvidersRetry: () => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Collection name and provider selector for the General tab.
 */
export function GeneralSection({
  name,
  onNameChange,
  connectionId,
  providers,
  onConnectionIdChange,
  providersLoading,
  providersError,
  onProvidersRetry,
  onSave,
  onClose
}: Props): JSX.Element {
  const nameId = useId();
  const providerId = useId();
  const providerSelectDisabled = providersLoading || providersError != null;

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <FormGroup label="Name" htmlFor={nameId} labelTone="muted">
          <Input
            id={nameId}
            className="w-full"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onClose();
            }}
          />
        </FormGroup>
      </div>

      <div>
        <FormGroup label="Provider" htmlFor={providerId} labelTone="muted">
          <Select
            id={providerId}
            className="w-full"
            value={connectionId}
            disabled={providerSelectDisabled}
            onChange={(e) => onConnectionIdChange(e.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name || 'Untitled'} ({providerOptionLabel(provider)})
              </option>
            ))}
          </Select>
          {providersLoading && <p className="mb-0 mt-1 text-[14px] text-muted">Loading…</p>}
          {providersError && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="mb-0 text-[14px] text-danger">{providersError}</p>
              <Button type="button" variant="secondary" onClick={onProvidersRetry}>
                Retry
              </Button>
            </div>
          )}
          {!providersLoading && !providersError && (
            <p className="mb-0 mt-1 text-[14px] text-muted">
              Changing the provider moves this collection and all of its requests.
            </p>
          )}
        </FormGroup>
      </div>
    </div>
  );
}
