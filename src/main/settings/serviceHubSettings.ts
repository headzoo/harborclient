import { randomUUID } from 'crypto';
import { getLocalRegistry } from '#/main/db/localRegistryInstance';
import { parseJson } from '#/shared/parseJson';
import type { ServiceHub } from '#/shared/types';

const SERVICE_HUBS_KEY = 'serviceHubs';

/**
 * Persists the service hub list to the local registry.
 *
 * @param hubs - Service hubs to store.
 */
function persistServiceHubs(hubs: ServiceHub[]): void {
  getLocalRegistry().setSetting(SERVICE_HUBS_KEY, JSON.stringify(hubs));
}

/**
 * Trims fields and removes trailing slashes from the base URL.
 *
 * @param input - Raw service hub from storage or user input.
 * @returns Normalized service hub record.
 */
function normalizeServiceHub(input: ServiceHub): ServiceHub {
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    baseUrl: input.baseUrl.trim().replace(/\/+$/, ''),
    token: input.token.trim()
  };
}

/**
 * Lists all configured service hubs.
 *
 * @returns Normalized service hub records from local storage.
 */
export function listServiceHubs(): ServiceHub[] {
  const stored = parseJson<ServiceHub[]>(getLocalRegistry().getSetting(SERVICE_HUBS_KEY), []);
  return stored.map(normalizeServiceHub);
}

/**
 * Creates or updates a service hub.
 *
 * @param input - Service hub to persist; blank id inserts a new record.
 * @returns Updated list of all service hubs.
 */
export function saveServiceHub(input: ServiceHub): ServiceHub[] {
  const normalized = normalizeServiceHub({
    ...input,
    id: input.id.trim() || randomUUID()
  });
  const hubs = listServiceHubs();
  const index = hubs.findIndex((hub) => hub.id === normalized.id);

  if (index >= 0) {
    hubs[index] = normalized;
  } else {
    hubs.push(normalized);
  }

  persistServiceHubs(hubs);
  return hubs;
}

/**
 * Deletes a service hub by id.
 *
 * @param id - Service hub id to remove.
 * @returns Updated list of all service hubs.
 * @throws When no service hub matches the given id.
 */
export function deleteServiceHub(id: string): ServiceHub[] {
  const hubs = listServiceHubs();
  const nextHubs = hubs.filter((hub) => hub.id !== id);

  if (nextHubs.length === hubs.length) {
    throw new Error(`Unknown service hub: ${id}`);
  }

  persistServiceHubs(nextHubs);
  return nextHubs;
}
