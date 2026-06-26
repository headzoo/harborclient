import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCollectionExport } from '#/main/storage/collectionData';
import { LocalDatabase } from '#/main/storage/LocalDatabase';
import { RoutingStorage } from '#/main/storage/RoutingStorage';
import { SqliteStorage } from '#/main/storage/SqliteStorage';
import {
  buildDefaultEchoCollectionExport,
  DEFAULT_ECHO_COLLECTION_SEEDED_KEY,
  DEFAULT_ECHO_COLLECTION_UUID,
  isSeedFlagEnabled,
  seedDefaultContentIfNeeded,
  seedEchoCollectionIfMissing
} from '#/main/storage/seedDefaultContent';
import type { SqliteSettings, StorageConnection } from '#/shared/types';
import { describeSqlite } from '#/test/nativeModules';

const BASE_SQLITE_SETTINGS: SqliteSettings = {
  dbFilename: 'harborclient.db',
  legacyDbFilename: 'harbor-client.db',
  legacyUserDataDir: 'harbor-client'
};

const SQLITE_CONNECTION: StorageConnection = {
  id: 'conn-sqlite',
  name: 'SQLite',
  type: 'sqlite',
  settings: { ...BASE_SQLITE_SETTINGS, dbFilename: 'seed.db' }
};

const cleanups: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) {
      await cleanup();
    }
  }
});

/**
 * Builds a routing storage fixture with a single mounted SQLite backend for seed tests.
 *
 * @returns Router, local registry, sqlite backend, and temp root directory.
 */
async function createSeedFixture(): Promise<{
  router: RoutingStorage;
  database: LocalDatabase;
  backend: SqliteStorage;
  rootDir: string;
}> {
  const rootDir = mkdtempSync(join(tmpdir(), 'harborclient-seed-'));
  const database = new LocalDatabase(rootDir);
  await database.init();

  const backendDir = join(rootDir, 'backend');
  mkdirSync(backendDir, { recursive: true });

  const backend = new SqliteStorage(backendDir, SQLITE_CONNECTION.settings as SqliteSettings);
  await backend.init();

  const router = new RoutingStorage(database, SQLITE_CONNECTION.id, rootDir);
  router.mount(0, SQLITE_CONNECTION, backend);

  cleanups.push(async () => {
    await router.close();
    rmSync(rootDir, { recursive: true, force: true });
  });

  return { router, database, backend, rootDir };
}

describe('buildDefaultEchoCollectionExport', () => {
  it('produces a valid collection export', () => {
    const exportData = buildDefaultEchoCollectionExport();
    const validated = validateCollectionExport(exportData);

    expect(validated.name).toBe('HarborClient Echo');
    expect(validated.requests).toHaveLength(4);
    expect(validated.requests.map((request) => request.name)).toEqual([
      'Echo GET',
      'Echo POST',
      'Echo PUT',
      'Echo DELETE'
    ]);
  });
});

describeSqlite('seedDefaultContentIfNeeded', () => {
  it('imports the echo collection on a fresh install', async () => {
    const { router, database, backend } = await createSeedFixture();

    await seedDefaultContentIfNeeded(router, database);

    expect(database.getSetting(DEFAULT_ECHO_COLLECTION_SEEDED_KEY)).toBe('1');

    const collections = await router.listCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe('HarborClient Echo');

    const requests = await backend.listRequests(collections[0]!.id);
    expect(requests).toHaveLength(4);

    const getRequest = requests.find((request) => request.method === 'GET');
    const postRequest = requests.find((request) => request.method === 'POST');
    const putRequest = requests.find((request) => request.method === 'PUT');
    const deleteRequest = requests.find((request) => request.method === 'DELETE');

    expect(getRequest?.url).toBe('https://echo.harborclient.com/get');
    expect(getRequest?.params).toEqual([{ key: 'guid', value: '{{$guid}}', enabled: true }]);
    expect(getRequest?.body_type).toBe('json');
    expect(getRequest?.body).toContain('{{$randomFirstName}}');

    expect(postRequest?.url).toBe('https://echo.harborclient.com/post');
    expect(postRequest?.body_type).toBe('json');
    expect(postRequest?.body).toContain('{{$randomPhoneNumber}}');

    expect(putRequest?.url).toBe('https://echo.harborclient.com/put');
    expect(putRequest?.body_type).toBe('none');
    expect(putRequest?.body).toBe('');

    expect(deleteRequest?.url).toBe('https://echo.harborclient.com/delete');
    expect(deleteRequest?.body_type).toBe('none');
    expect(deleteRequest?.body).toBe('');
  });

  it('skips seeding when the flag is already set', async () => {
    const { router, database } = await createSeedFixture();
    database.setSetting(DEFAULT_ECHO_COLLECTION_SEEDED_KEY, '1');

    await seedDefaultContentIfNeeded(router, database);

    expect(await router.listCollections()).toEqual([]);
  });

  it('skips seeding when the registry already has entries and sets the flag', async () => {
    const { router, database } = await createSeedFixture();

    await router.createCollection('Existing');

    await seedDefaultContentIfNeeded(router, database);

    expect(database.getSetting(DEFAULT_ECHO_COLLECTION_SEEDED_KEY)).toBe('1');
    const collections = await router.listCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe('Existing');
  });
});

describe('isSeedFlagEnabled', () => {
  it('returns true when --seed is present', () => {
    expect(isSeedFlagEnabled(['electron', '--seed'])).toBe(true);
  });

  it('returns false when --seed is absent', () => {
    expect(isSeedFlagEnabled(['electron', '--verbose'])).toBe(false);
  });
});

describeSqlite('seedEchoCollectionIfMissing', () => {
  it('imports the echo collection on an empty database', async () => {
    const { router } = await createSeedFixture();

    const created = await seedEchoCollectionIfMissing(router);

    expect(created).toBe(true);
    const collections = await router.listCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe('HarborClient Echo');
    expect(collections[0]?.uuid).toBe(DEFAULT_ECHO_COLLECTION_UUID);
  });

  it('skips import when the echo collection already exists', async () => {
    const { router } = await createSeedFixture();

    expect(await seedEchoCollectionIfMissing(router)).toBe(true);
    expect(await seedEchoCollectionIfMissing(router)).toBe(false);

    const collections = await router.listCollections();
    expect(collections).toHaveLength(1);
  });

  it('imports echo alongside existing collections', async () => {
    const { router } = await createSeedFixture();

    await router.createCollection('Existing');

    const created = await seedEchoCollectionIfMissing(router);

    expect(created).toBe(true);
    const collections = await router.listCollections();
    expect(collections).toHaveLength(2);
    expect(collections.map((collection) => collection.name).sort()).toEqual([
      'Existing',
      'HarborClient Echo'
    ]);
  });
});
