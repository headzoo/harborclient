import { useEffect, useState } from 'react';
import type { TeamHub } from '#/shared/types';

/**
 * Admin scan state for configured team hubs.
 */
export interface TeamHubAdminScanState {
  /**
   * Hub ids whose tokens report management API capabilities.
   */
  adminHubIds: Set<string>;

  /**
   * True while a session scan is in flight.
   */
  scanning: boolean;
}

/**
 * Scans configured team hubs for admin capabilities when the list is ready.
 *
 * @param teamHubs - Loaded team hub connections.
 * @param reloadToken - Counter that changes when the hub list is reloaded.
 * @param enabled - When false, skips scanning until the hub list has finished loading.
 * @returns Admin hub ids and scan-in-progress flag.
 */
export function useTeamHubAdminScan(
  teamHubs: TeamHub[],
  reloadToken: number,
  enabled: boolean
): TeamHubAdminScanState {
  const [adminHubIds, setAdminHubIds] = useState<Set<string>>(() => new Set());
  const [scanning, setScanning] = useState(false);
  const shouldScan = enabled && teamHubs.length > 0;

  useEffect(() => {
    if (!shouldScan) {
      return;
    }

    let cancelled = false;

    void Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setScanning(true);
        setAdminHubIds(new Set());
        return window.api.scanTeamHubSessions();
      })
      .then((results) => {
        if (cancelled || results === undefined) return;

        const nextAdminHubIds = new Set<string>();
        for (const result of results) {
          if (result.managementApi) {
            nextAdminHubIds.add(result.hubId);
          }
        }

        setAdminHubIds(nextAdminHubIds);
        setScanning(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAdminHubIds(new Set());
        setScanning(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldScan, reloadToken, teamHubs]);

  if (!shouldScan) {
    return { adminHubIds: new Set(), scanning: false };
  }

  return { adminHubIds, scanning };
}
