import { join } from 'path';
import { ServiceHubDatabase } from '#/main/db/ServiceHubDatabase';
import { ServiceHubIdMap } from '#/main/db/ServiceHubIdMap';
import { HarborServerClient } from '#/main/server/HarborServerClient';
import type { ServiceHub } from '#/shared/types';

/**
 * Returns the SQLite path for a service hub id map file.
 *
 * @param userDataPath - Electron userData directory.
 * @param hubId - Service hub connection id.
 */
export function serviceHubIdMapPath(userDataPath: string, hubId: string): string {
  return join(userDataPath, `service-hub-${hubId}.db`);
}

/**
 * Creates and initializes a {@link ServiceHubDatabase} for the given hub.
 *
 * @param hub - Service hub connection settings.
 * @param userDataPath - Electron userData directory for the id map file.
 */
export async function createServiceHubDatabase(
  hub: ServiceHub,
  userDataPath: string
): Promise<ServiceHubDatabase> {
  const idMap = new ServiceHubIdMap(serviceHubIdMapPath(userDataPath, hub.id));
  idMap.init();
  const client = new HarborServerClient({ baseUrl: hub.baseUrl, token: hub.token });
  const db = new ServiceHubDatabase(client, idMap);
  await db.init();
  return db;
}
