import { afterAll, expect, it } from 'vitest';
import { MySqlDatabase } from '#/main/db/MySqlDatabase';
import {
  closeSharedSqlBackends,
  createMySqlTestDbFactory,
  describeMySql
} from '#/test/databaseBackends';
import { runIdatabaseContractSuite } from '#/test/idatabaseContract';

describeMySql('MySqlDatabase lifecycle', () => {
  it('throws when accessed before init', async () => {
    const db = new MySqlDatabase({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'harborclient',
      database: 'harborclient_test'
    });
    await expect(db.listCollections()).rejects.toThrow('Database not initialized');
  });
});

describeMySql('MySqlDatabase contract', () => {
  runIdatabaseContractSuite('MySqlDatabase', createMySqlTestDbFactory());
});

afterAll(async () => {
  await closeSharedSqlBackends();
});
