import { afterAll, expect, it } from 'vitest';
import { PostgresDatabase } from '#/main/db/PostgresDatabase';
import {
  closeSharedSqlBackends,
  createPostgresTestDbFactory,
  describePostgres
} from '#/test/databaseBackends';
import { runIdatabaseContractSuite } from '#/test/idatabaseContract';

describePostgres('PostgresDatabase lifecycle', () => {
  it('throws when accessed before init', async () => {
    const db = new PostgresDatabase({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'harborclient',
      database: 'harborclient_test'
    });
    await expect(db.listCollections()).rejects.toThrow('Database not initialized');
  });
});

describePostgres('PostgresDatabase contract', () => {
  runIdatabaseContractSuite('PostgresDatabase', createPostgresTestDbFactory());
});

afterAll(async () => {
  await closeSharedSqlBackends();
});
