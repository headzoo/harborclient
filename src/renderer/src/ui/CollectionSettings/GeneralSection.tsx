import type { JSX } from 'react';
import type { DatabaseConnection } from '#/shared/types';
import { field, secondaryButton } from '#/renderer/src/ui/shared/classes';
import { providerLabel } from '#/renderer/src/ui/Settings/constants';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  connectionId: string;
  connections: DatabaseConnection[];
  onConnectionIdChange: (connectionId: string) => void;
  /**
   * True while database connections are loading from IPC.
   */
  connectionsLoading: boolean;
  /**
   * Bootstrap error message when connection list IPC fails; null otherwise.
   */
  connectionsError: string | null;
  /**
   * Retries loading database connections after a bootstrap failure.
   */
  onConnectionsRetry: () => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Collection name and database selector for the General tab.
 */
export function GeneralSection({
  name,
  onNameChange,
  connectionId,
  connections,
  onConnectionIdChange,
  connectionsLoading,
  connectionsError,
  onConnectionsRetry,
  onSave,
  onClose
}: Props): JSX.Element {
  const databaseSelectDisabled = connectionsLoading || connectionsError != null;

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-[13px] text-muted">Name</label>
        <input
          className={`${field} w-full`}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onClose();
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] text-muted">Database</label>
        <select
          className={`${field} w-full`}
          value={connectionId}
          disabled={databaseSelectDisabled}
          onChange={(e) => onConnectionIdChange(e.target.value)}
        >
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name || 'Untitled'} ({providerLabel(connection.type)})
            </option>
          ))}
        </select>
        {connectionsLoading && <p className="mb-0 mt-1 text-[12px] text-muted">Loading…</p>}
        {connectionsError && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="mb-0 text-[12px] text-danger">{connectionsError}</p>
            <button type="button" className={secondaryButton} onClick={onConnectionsRetry}>
              Retry
            </button>
          </div>
        )}
        {!connectionsLoading && !connectionsError && (
          <p className="mb-0 mt-1 text-[12px] text-muted">
            Changing the database moves this collection and all of its requests.
          </p>
        )}
      </div>
    </div>
  );
}
