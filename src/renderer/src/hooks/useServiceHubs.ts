import { useCallback, useEffect, useState } from 'react';
import type { ServiceHub } from '#/shared/types';

/**
 * Loaded service hub list and bootstrap state from IPC.
 */
export interface ServiceHubsState {
  /**
   * Configured service hubs from settings.
   */
  serviceHubs: ServiceHub[];

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
 * Loads service hubs via IPC. Handles cancellation on unmount, rejection with a
 * stable error message, and manual retry through {@link ServiceHubsState.reload}.
 *
 * @returns Service hub list, loading/error flags, and a reload callback.
 */
export function useServiceHubs(): ServiceHubsState {
  const [serviceHubs, setServiceHubs] = useState<ServiceHub[]>([]);
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
   * Fetches service hubs; ignores results after cleanup or a newer run.
   */
  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setLoading(true);
        setError(null);
        return window.api.listServiceHubs();
      })
      .then((result) => {
        if (cancelled || result === undefined) return;
        setServiceHubs(result);
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
  }, [reloadToken]);

  return { serviceHubs, loading, error, reload };
}
