import { afterAll, afterEach, expect, it } from 'vitest';
import { FirestoreDatabase } from '#/main/db/FirestoreDatabase';
import {
  closeSharedSqlBackends,
  createFirestoreTestDbFactory,
  describeFirestore,
  TEST_FIRESTORE_SETTINGS
} from '#/test/databaseBackends';
import { runIdatabaseContractSuite, type TestDbHandle } from '#/test/idatabaseContract';

const cleanups: Array<() => void | Promise<void>> = [];

async function createTestDb(): Promise<TestDbHandle> {
  const handle = await createFirestoreTestDbFactory()();
  if (handle.cleanup) {
    cleanups.push(handle.cleanup);
  }
  return handle;
}

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

describeFirestore('FirestoreDatabase lifecycle', () => {
  it('throws when accessed before init', async () => {
    const db = new FirestoreDatabase(TEST_FIRESTORE_SETTINGS);
    await expect(db.listCollections()).rejects.toThrow('Database not initialized');
  });
});

describeFirestore('FirestoreDatabase contract', () => {
  runIdatabaseContractSuite('FirestoreDatabase', createTestDb);
});

afterAll(async () => {
  await closeSharedSqlBackends();
});
