import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionExport, SaveRequestInput } from '#/shared/types';
import { SqliteDatabase } from '#/main/db/SqliteDatabase';

const TEST_APP_DATA = join(tmpdir(), 'harborclient-test-appdata');

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'appData') return TEST_APP_DATA;
      return tmpdir();
    })
  }
}));

/**
 * better-sqlite3 is rebuilt for Electron during postinstall; vitest uses system Node.
 */
function sqliteAvailable(): boolean {
  try {
    const db = new Database(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

const describeSqlite = sqliteAvailable() ? describe : describe.skip;

const cleanups: Array<() => void> = [];

function createTestDb(): { db: SqliteDatabase; tmpDir: string } {
  const tmpDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
  const db = new SqliteDatabase();
  db.init(tmpDir);
  cleanups.push(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });
  return { db, tmpDir };
}

function baseRequestInput(
  collectionId: number,
  overrides: Partial<SaveRequestInput> = {}
): SaveRequestInput {
  return {
    collection_id: collectionId,
    name: 'Test Request',
    method: 'GET',
    url: 'https://example.com',
    headers: [{ key: 'X-Test', value: '1', enabled: true }],
    params: [{ key: 'q', value: 'search', enabled: true }],
    body: '',
    body_type: 'none',
    ...overrides
  };
}

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
  if (existsSync(TEST_APP_DATA)) {
    rmSync(TEST_APP_DATA, { recursive: true, force: true });
  }
});

describe('SqliteDatabase lifecycle', () => {
  it('throws when accessed before init', () => {
    const db = new SqliteDatabase();
    expect(() => db.listCollections()).toThrow('Database not initialized');
  });
});

describeSqlite('SqliteDatabase lifecycle with sqlite', () => {
  it('init is idempotent', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
    const db = new SqliteDatabase();
    cleanups.push(() => {
      db.close();
      rmSync(tmpDir, { recursive: true, force: true });
    });

    db.init(tmpDir);
    expect(() => db.init(tmpDir)).not.toThrow();
    expect(db.listCollections()).toEqual([]);
  });

  it('close allows subsequent init on a new directory', () => {
    const firstDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
    const secondDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
    const db = new SqliteDatabase();

    db.init(firstDir);
    db.createCollection('First');
    db.close();

    db.init(secondDir);
    cleanups.push(() => {
      db.close();
      rmSync(firstDir, { recursive: true, force: true });
      rmSync(secondDir, { recursive: true, force: true });
    });

    expect(db.listCollections()).toEqual([]);
    expect(db.createCollection('Second').name).toBe('Second');
  });
});

describeSqlite('SqliteDatabase collections', () => {
  it('listCollections returns empty after init', () => {
    const { db } = createTestDb();
    expect(db.listCollections()).toEqual([]);
  });

  it('createCollection returns trimmed defaults', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('  My API  ');

    expect(collection.id).toEqual(expect.any(Number));
    expect(collection.name).toBe('My API');
    expect(collection.variables).toEqual([]);
    expect(collection.headers).toEqual([]);
    expect(collection.pre_request_script).toBe('');
    expect(collection.post_request_script).toBe('');
    expect(collection.created_at).toEqual(expect.any(String));
  });

  it('listCollections sorts by name ascending', () => {
    const { db } = createTestDb();
    db.createCollection('Zebra');
    db.createCollection('Alpha');
    db.createCollection('Middle');

    expect(db.listCollections().map((c) => c.name)).toEqual(['Alpha', 'Middle', 'Zebra']);
  });

  it('updateCollection persists fields and returns updated row', () => {
    const { db } = createTestDb();
    const created = db.createCollection('Original');

    const updated = db.updateCollection(
      created.id,
      '  Updated  ',
      [{ key: 'host', value: 'api.example.com', defaultValue: '', share: true }],
      [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      'console.log("pre");',
      'console.log("post");'
    );

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated',
      variables: [{ key: 'host', value: 'api.example.com', defaultValue: '', share: true }],
      headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      pre_request_script: 'console.log("pre");',
      post_request_script: 'console.log("post");'
    });
    expect(db.listCollections()[0]).toEqual(updated);
  });

  it('updateCollection throws when collection is missing', () => {
    const { db } = createTestDb();
    expect(() => db.updateCollection(999, 'Missing', [], [], '', '')).toThrow(
      'Collection not found'
    );
  });

  it('deleteCollection removes the collection', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('To Delete');
    db.deleteCollection(collection.id);
    expect(db.listCollections()).toEqual([]);
  });
});

describeSqlite('SqliteDatabase requests', () => {
  it('saveRequest inserts with auto-incremented sort_order', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Requests');

    const first = db.saveRequest(baseRequestInput(collection.id, { name: 'First' }));
    const second = db.saveRequest(baseRequestInput(collection.id, { name: 'Second' }));

    expect(first.sort_order).toBe(0);
    expect(second.sort_order).toBe(1);
    expect(first.id).not.toBe(second.id);
  });

  it('saveRequest updates existing request fields', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Requests');
    const created = db.saveRequest(baseRequestInput(collection.id));

    const updated = db.saveRequest({
      ...baseRequestInput(collection.id),
      id: created.id,
      name: 'Updated Request',
      method: 'POST',
      url: 'https://api.example.com',
      body: '{"ok":true}',
      body_type: 'json',
      pre_request_script: 'pre',
      post_request_script: 'post'
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Request');
    expect(updated.method).toBe('POST');
    expect(updated.url).toBe('https://api.example.com');
    expect(updated.body).toBe('{"ok":true}');
    expect(updated.body_type).toBe('json');
    expect(updated.pre_request_script).toBe('pre');
    expect(updated.post_request_script).toBe('post');
    expect(db.listRequests(collection.id)[0]).toEqual(updated);
  });

  it('listRequests orders by sort_order then name', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Requests');

    db.saveRequest(baseRequestInput(collection.id, { name: 'Bravo' }));
    db.saveRequest(baseRequestInput(collection.id, { name: 'Alpha' }));

    expect(db.listRequests(collection.id).map((r) => r.name)).toEqual(['Bravo', 'Alpha']);
  });

  it('deleteRequest removes the request', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Requests');
    const request = db.saveRequest(baseRequestInput(collection.id));

    db.deleteRequest(request.id);
    expect(db.listRequests(collection.id)).toEqual([]);
  });

  it('deleteCollection cascades to requests', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Requests');
    db.saveRequest(baseRequestInput(collection.id));

    db.deleteCollection(collection.id);
    expect(db.listRequests(collection.id)).toEqual([]);
  });
});

describeSqlite('SqliteDatabase settings', () => {
  it('getSetting returns undefined when unset', () => {
    const { db } = createTestDb();
    expect(db.getSetting('theme')).toBeUndefined();
  });

  it('setSetting and getSetting round-trip and overwrite', () => {
    const { db } = createTestDb();

    db.setSetting('theme', 'dark');
    expect(db.getSetting('theme')).toBe('dark');

    db.setSetting('theme', 'light');
    expect(db.getSetting('theme')).toBe('light');
  });
});

describeSqlite('SqliteDatabase import and export', () => {
  it('exportCollectionData throws for missing collection', () => {
    const { db } = createTestDb();
    expect(() => db.exportCollectionData(999)).toThrow('Collection not found');
  });

  it('exportCollectionData returns portable payload without database ids', () => {
    const { db } = createTestDb();
    const collection = db.createCollection('Export Me');
    db.updateCollection(
      collection.id,
      'Export Me',
      [
        { key: 'shared', value: 'visible', defaultValue: '', share: true },
        { key: 'private', value: 'secret', defaultValue: '', share: false }
      ],
      [{ key: 'X-Header', value: '1', enabled: true }],
      'pre script',
      'post script'
    );
    db.saveRequest(
      baseRequestInput(collection.id, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        pre_request_script: 'req pre',
        post_request_script: 'req post'
      })
    );

    const exported = db.exportCollectionData(collection.id);

    expect(exported).toEqual({
      formatVersion: 1,
      name: 'Export Me',
      variables: [
        { key: 'shared', value: 'visible', defaultValue: '', share: true },
        { key: 'private', value: '', defaultValue: '', share: false }
      ],
      headers: [{ key: 'X-Header', value: '1', enabled: true }],
      pre_request_script: 'pre script',
      post_request_script: 'post script',
      requests: [
        {
          name: 'Get Users',
          method: 'GET',
          url: 'https://api.example.com/users',
          headers: [{ key: 'X-Test', value: '1', enabled: true }],
          params: [{ key: 'q', value: 'search', enabled: true }],
          body: '',
          body_type: 'none',
          pre_request_script: 'req pre',
          post_request_script: 'req post',
          sort_order: 0
        }
      ]
    });
    expect(exported.requests[0]).not.toHaveProperty('id');
    expect(exported.requests[0]).not.toHaveProperty('collection_id');
  });

  it('importCollectionData creates collection and requests', () => {
    const { db } = createTestDb();
    const payload: CollectionExport = {
      formatVersion: 1,
      name: 'Imported',
      variables: [{ key: 'baseUrl', value: 'https://example.com', defaultValue: '', share: true }],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      pre_request_script: 'collection pre',
      post_request_script: 'collection post',
      requests: [
        {
          name: 'Health',
          method: 'GET',
          url: 'https://example.com/health',
          headers: [],
          params: [],
          body: '',
          body_type: 'none',
          pre_request_script: '',
          post_request_script: '',
          sort_order: 0
        }
      ]
    };

    const imported = db.importCollectionData(payload);

    expect(imported.name).toBe('Imported');
    expect(imported.variables).toEqual(payload.variables);
    expect(db.listCollections()).toHaveLength(1);
    expect(db.listRequests(imported.id)).toHaveLength(1);
    expect(db.listRequests(imported.id)[0]?.name).toBe('Health');
  });

  it('importCollectionData rejects invalid payloads', () => {
    const { db } = createTestDb();

    expect(() => db.importCollectionData(null)).toThrow(
      'Invalid collection file: expected a JSON object'
    );
    expect(() => db.importCollectionData({ formatVersion: 2, name: 'Bad', requests: [] })).toThrow(
      'Invalid collection file: unsupported format version'
    );
    expect(() => db.importCollectionData({ formatVersion: 1, name: '   ', requests: [] })).toThrow(
      'Invalid collection file: collection name is required'
    );
    expect(() =>
      db.importCollectionData({
        formatVersion: 1,
        name: 'Bad Request',
        requests: [{ name: 'X', method: 'INVALID', body_type: 'none' }]
      })
    ).toThrow('Invalid collection file: request 1 has an invalid method');
    expect(() =>
      db.importCollectionData({
        formatVersion: 1,
        name: 'Bad Body',
        requests: [{ name: 'X', method: 'GET', body_type: 'xml' }]
      })
    ).toThrow('Invalid collection file: request 1 has an invalid body type');
  });
});

describeSqlite('SqliteDatabase legacy migration', () => {
  it('copies legacy harbor-client.db from appData when harborclient.db is missing', () => {
    const legacyDir = join(TEST_APP_DATA, 'harbor-client');
    mkdirSync(legacyDir, { recursive: true });
    const legacyPath = join(legacyDir, 'harbor-client.db');

    const legacyDb = new Database(legacyPath);
    legacyDb.exec(`
      CREATE TABLE collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        variables TEXT NOT NULL DEFAULT '[]',
        headers TEXT NOT NULL DEFAULT '[]',
        pre_request_script TEXT NOT NULL DEFAULT '',
        post_request_script TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        url TEXT NOT NULL DEFAULT '',
        headers TEXT NOT NULL DEFAULT '[]',
        params TEXT NOT NULL DEFAULT '[]',
        body TEXT NOT NULL DEFAULT '',
        body_type TEXT NOT NULL DEFAULT 'none',
        pre_request_script TEXT NOT NULL DEFAULT '',
        post_request_script TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    legacyDb.prepare('INSERT INTO collections (name) VALUES (?)').run('Legacy Collection');
    legacyDb.close();

    const userDataDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
    const db = new SqliteDatabase();
    cleanups.push(() => {
      db.close();
      rmSync(userDataDir, { recursive: true, force: true });
    });

    db.init(userDataDir);

    expect(existsSync(join(userDataDir, 'harborclient.db'))).toBe(true);
    expect(db.listCollections().map((c) => c.name)).toEqual(['Legacy Collection']);
  });

  it('copies legacy harbor-client.db from userDataPath when present', () => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'harborclient-db-'));
    const legacyPath = join(userDataDir, 'harbor-client.db');

    const legacyDb = new Database(legacyPath);
    legacyDb.exec(`
      CREATE TABLE collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        variables TEXT NOT NULL DEFAULT '[]',
        headers TEXT NOT NULL DEFAULT '[]',
        pre_request_script TEXT NOT NULL DEFAULT '',
        post_request_script TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        url TEXT NOT NULL DEFAULT '',
        headers TEXT NOT NULL DEFAULT '[]',
        params TEXT NOT NULL DEFAULT '[]',
        body TEXT NOT NULL DEFAULT '',
        body_type TEXT NOT NULL DEFAULT 'none',
        pre_request_script TEXT NOT NULL DEFAULT '',
        post_request_script TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    legacyDb.prepare('INSERT INTO collections (name) VALUES (?)').run('Local Legacy');
    legacyDb.close();

    const db = new SqliteDatabase();
    cleanups.push(() => {
      db.close();
      rmSync(userDataDir, { recursive: true, force: true });
    });

    db.init(userDataDir);

    expect(existsSync(join(userDataDir, 'harborclient.db'))).toBe(true);
    expect(db.listCollections().map((c) => c.name)).toEqual(['Local Legacy']);
  });
});
