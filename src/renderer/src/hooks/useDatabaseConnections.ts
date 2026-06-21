import { useCallback, useEffect, useState } from 'react';
import type { DatabaseConnection } from '#/shared/types';

/**
 * Loaded database connection list and bootstrap state from IPC.
 */
export interface DatabaseConnectionsState {
  /**
   * Configured database connections from settings.
   */
  connections: DatabaseConnection[];

  /**
   * Active connection id used for new collections and imports.
   */
  primaryConnectionId: string;

  /**
   * True while the initial or retried IPC load is in flight.
   */
  loading: boolean;

  /**
   * User-facing message when the IPC bootstrap fails; null on success or before first attempt.
   */
  error: string | null;

  /**
   * Re-runs the IPC bootstrap (clears error and sets loading).
   */
  reload: () => void;
}

/**
 * Loads database connections and the active connection id via IPC. Handles
 * cancellation on unmount, rejection with a stable error message, and manual
 * retry through {@link DatabaseConnectionsState.reload}.
 *
 * @param deps - Optional effect dependencies; when they change the hook refetches
 *   (e.g. pass `[collection.connectionId]` to reload when the saved id changes).
 * @returns Connection list, primary id, loading/error flags, and a reload callback.
 */
export function useDatabaseConnections(deps: readonly unknown[] = []): DatabaseConnectionsState {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [primaryConnectionId, setPrimaryConnectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /**
   * Triggers a fresh IPC bootstrap without changing external dependencies.
   */
  const reload = useCallback((): void => {
    setReloadToken((token) => token + 1);
  }, []);

  /**
   * Fetches connections and the active id; ignores results after cleanup or a newer run.
   */
  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setLoading(true);
        setError(null);
        return Promise.all([
          window.api.listDatabaseConnections(),
          window.api.getActiveDatabaseId()
        ]);
      })
      .then((result) => {
        if (cancelled || result === undefined) return;
        const [nextConnections, nextPrimaryConnectionId] = result;
        setConnections(nextConnections);
        setPrimaryConnectionId(nextPrimaryConnectionId);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies intentional refetch keys
  }, [reloadToken, ...deps]);

  return { connections, primaryConnectionId, loading, error, reload };
}
