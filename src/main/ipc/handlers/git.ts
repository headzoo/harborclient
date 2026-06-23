import { shell } from 'electron';
import { GitDatabase } from '#/main/db/GitDatabase';
import type { IDatabase } from '#/main/db/IDatabase';
import { RoutingDatabase } from '#/main/db/RoutingDatabase';
import { handle } from '#/main/ipc/handle';
import { ipcArgSchemas } from '#/main/ipc/ipcSchemas';
import { beginGitHubOAuth, finishGitHubOAuth, saveGitPat } from '#/main/git/gitAuth';
import { listDatabaseConnections, saveDatabaseConnection } from '#/main/settings/databaseSettings';

/**
 * Returns a RoutingDatabase instance or throws when git IPC is unavailable.
 *
 * @param db - Top-level database handle from IPC registration.
 */
function requireRoutingDatabase(db: IDatabase): RoutingDatabase {
  if (!(db instanceof RoutingDatabase)) {
    throw new Error('Git operations require RoutingDatabase.');
  }
  return db;
}

/**
 * Returns a mounted GitDatabase for a connection id.
 *
 * @param db - Top-level database handle.
 * @param connectionId - Git connection id.
 */
function requireGitDatabase(db: IDatabase, connectionId: string): GitDatabase {
  return requireRoutingDatabase(db).requireGitDatabase(connectionId);
}

/**
 * Updates persisted git connection auth metadata after credential changes.
 *
 * @param connectionId - Git connection id.
 * @param auth - New auth method metadata.
 */
function persistGitAuthMetadata(
  connectionId: string,
  auth: { kind: 'pat'; username: string } | { kind: 'oauth'; provider: 'github' }
): void {
  const connections = listDatabaseConnections();
  const index = connections.findIndex((conn) => conn.id === connectionId);
  if (index < 0 || connections[index].type !== 'git') {
    throw new Error(`Git connection not found: ${connectionId}`);
  }
  const conn = connections[index];
  if (conn.type !== 'git') {
    return;
  }
  conn.settings.auth = auth;
  saveDatabaseConnection(conn);
}

/**
 * Registers IPC handlers for git source-control operations.
 *
 * @param db - Top-level database handle shared by collection handlers.
 */
export function registerGitHandlers(db: IDatabase): void {
  handle('git:statuses', ipcArgSchemas.none, async () => {
    const router = requireRoutingDatabase(db);
    return router.listGitStatuses();
  });

  handle('git:commit', ipcArgSchemas.gitCommit, async (_event, connectionId, message) => {
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.commit(message);
  });

  handle('git:fetch', ipcArgSchemas.connectionId, async (_event, connectionId) => {
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.fetch();
  });

  handle('git:pull', ipcArgSchemas.connectionId, async (_event, connectionId) => {
    const router = requireRoutingDatabase(db);
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.pull();
    await gitDb.reloadFromDisk();
    await router.reconcileGitRegistry(connectionId);
  });

  handle('git:push', ipcArgSchemas.connectionId, async (_event, connectionId) => {
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.push();
  });

  handle('git:log', ipcArgSchemas.gitLog, async (_event, connectionId, depth) => {
    const gitDb = requireGitDatabase(db, connectionId);
    return gitDb.syncManager.log(depth ?? 20);
  });

  handle('git:setPat', ipcArgSchemas.gitSetPat, async (_event, connectionId, username, token) => {
    saveGitPat(connectionId, username, token);
    persistGitAuthMetadata(connectionId, {
      kind: 'pat',
      username: username.trim() || 'token'
    });
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.testCredentials();
  });

  handle('git:startOAuth', ipcArgSchemas.connectionId, async (_event, connectionId) => {
    const result = await beginGitHubOAuth(connectionId);
    await shell.openExternal(result.verificationUri);
    return result;
  });

  handle('git:completeOAuth', ipcArgSchemas.connectionId, async (_event, connectionId) => {
    await finishGitHubOAuth(connectionId);
    persistGitAuthMetadata(connectionId, { kind: 'oauth', provider: 'github' });
    const gitDb = requireGitDatabase(db, connectionId);
    await gitDb.syncManager.testCredentials();
  });
}
