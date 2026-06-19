import Database from 'better-sqlite3';
import { app } from 'electron';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { IDatabase } from '#/main/db/IDatabase';
import type {
  BodyType,
  Collection,
  CollectionExport,
  ExportedRequest,
  HttpMethod,
  KeyValue,
  SaveRequestInput,
  SavedRequest,
  Variable
} from '#/shared/types';

const DB_FILENAME = 'harborclient.db';
const LEGACY_DB_FILENAME = 'harbor-client.db';
const LEGACY_USER_DATA_DIR = 'harbor-client';

const HTTP_METHODS = new Set<HttpMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS'
]);

const BODY_TYPES = new Set<BodyType>(['none', 'json', 'text']);

/**
 * Resolves the SQLite database path, copying from legacy locations when needed.
 *
 * @param userDataPath - Electron app userData path where harborclient.db is stored.
 * @returns Path to the database file to open.
 */
function resolveDbPath(userDataPath: string): string {
  const dbPath = join(userDataPath, DB_FILENAME);
  if (existsSync(dbPath)) return dbPath;

  const legacyCandidates = [
    join(app.getPath('appData'), LEGACY_USER_DATA_DIR, LEGACY_DB_FILENAME),
    join(userDataPath, LEGACY_DB_FILENAME)
  ];

  for (const legacyPath of legacyCandidates) {
    if (existsSync(legacyPath)) {
      mkdirSync(userDataPath, { recursive: true });
      copyFileSync(legacyPath, dbPath);
      return dbPath;
    }
  }

  return dbPath;
}

/**
 * Parses a JSON string, returning a fallback value on failure.
 *
 * @param value - JSON string to parse.
 * @param fallback - Value returned when parsing fails.
 * @returns Parsed value or fallback.
 */
function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Coerces a partial or legacy variable record to the full Variable shape.
 *
 * @param v - Raw variable fields from storage or import.
 * @returns Normalized variable with defaults for missing fields.
 */
function normalizeVariable(v: Partial<Variable>): Variable {
  return {
    key: typeof v.key === 'string' ? v.key : '',
    value: typeof v.value === 'string' ? v.value : '',
    defaultValue: typeof v.defaultValue === 'string' ? v.defaultValue : '',
    share: v.share === true
  };
}

/**
 * Maps a raw SQLite row to a Collection object.
 *
 * @param row - Database row from the collections table.
 * @returns Normalized collection.
 */
function rowToCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as number,
    name: row.name as string,
    variables: parseJson<Partial<Variable>[]>(row.variables as string, []).map(normalizeVariable),
    headers: parseJson<KeyValue[]>(row.headers as string, []),
    pre_request_script: (row.pre_request_script as string) ?? '',
    post_request_script: (row.post_request_script as string) ?? '',
    created_at: row.created_at as string
  };
}

/**
 * Maps a raw SQLite row to a SavedRequest object.
 *
 * @param row - Database row from the requests table.
 * @returns Normalized saved request.
 */
function rowToRequest(row: Record<string, unknown>): SavedRequest {
  return {
    id: row.id as number,
    collection_id: row.collection_id as number,
    name: row.name as string,
    method: row.method as HttpMethod,
    url: row.url as string,
    headers: parseJson<KeyValue[]>(row.headers as string, []),
    params: parseJson<KeyValue[]>(row.params as string, []),
    body: (row.body as string) ?? '',
    body_type: row.body_type as BodyType,
    pre_request_script: (row.pre_request_script as string) ?? '',
    post_request_script: (row.post_request_script as string) ?? '',
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  };
}

/**
 * Validates and normalizes imported collection export data.
 *
 * @param data - Parsed JSON payload from an export file.
 * @returns Normalized collection export.
 * @throws When the payload is invalid.
 */
function validateCollectionExport(data: unknown): CollectionExport {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid collection file: expected a JSON object');
  }

  const record = data as Record<string, unknown>;
  const formatVersion = record.formatVersion;
  if (formatVersion !== 1) {
    throw new Error('Invalid collection file: unsupported format version');
  }

  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    throw new Error('Invalid collection file: collection name is required');
  }

  if (!Array.isArray(record.requests)) {
    throw new Error('Invalid collection file: requests must be an array');
  }

  const variables = Array.isArray(record.variables)
    ? (record.variables as Partial<Variable>[])
        .map(normalizeVariable)
        .filter((v) => v.key.trim() || v.value.trim() || v.defaultValue.trim())
    : [];

  const headers = Array.isArray(record.headers) ? (record.headers as KeyValue[]) : [];

  const preRequestScript =
    typeof record.pre_request_script === 'string' ? record.pre_request_script : '';
  const postRequestScript =
    typeof record.post_request_script === 'string' ? record.post_request_script : '';

  const requests = record.requests.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid collection file: request ${index + 1} is malformed`);
    }

    const req = item as Record<string, unknown>;
    const method = req.method;
    if (typeof method !== 'string' || !HTTP_METHODS.has(method as HttpMethod)) {
      throw new Error(`Invalid collection file: request ${index + 1} has an invalid method`);
    }

    const bodyType = req.body_type;
    if (typeof bodyType !== 'string' || !BODY_TYPES.has(bodyType as BodyType)) {
      throw new Error(`Invalid collection file: request ${index + 1} has an invalid body type`);
    }

    const requestName = typeof req.name === 'string' ? req.name.trim() : '';
    if (!requestName) {
      throw new Error(`Invalid collection file: request ${index + 1} is missing a name`);
    }

    return {
      name: requestName,
      method: method as HttpMethod,
      url: typeof req.url === 'string' ? req.url : '',
      headers: Array.isArray(req.headers) ? (req.headers as KeyValue[]) : [],
      params: Array.isArray(req.params) ? (req.params as KeyValue[]) : [],
      body: typeof req.body === 'string' ? req.body : '',
      body_type: bodyType as BodyType,
      pre_request_script: typeof req.pre_request_script === 'string' ? req.pre_request_script : '',
      post_request_script:
        typeof req.post_request_script === 'string' ? req.post_request_script : '',
      sort_order: typeof req.sort_order === 'number' ? req.sort_order : index
    } satisfies ExportedRequest;
  });

  return {
    formatVersion: 1,
    name,
    variables,
    headers,
    pre_request_script: preRequestScript,
    post_request_script: postRequestScript,
    requests
  };
}

export class SqliteDatabase implements IDatabase {
  #db: Database.Database | null = null;

  /**
   * Returns the active database handle.
   *
   * @returns The initialized database handle.
   * @throws When init has not been called yet.
   */
  private getDb(): Database.Database {
    if (!this.#db) throw new Error('Database not initialized');
    return this.#db;
  }

  /**
   * Opens (or returns) the SQLite database for the given user-data directory.
   *
   * @param userDataPath - Electron app userData path where harborclient.db is stored.
   */
  init(userDataPath: string): void {
    if (this.#db) return;

    const dbPath = resolveDbPath(userDataPath);
    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('foreign_keys = ON');

    this.#db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      variables TEXT NOT NULL DEFAULT '[]',
      headers TEXT NOT NULL DEFAULT '[]',
      pre_request_script TEXT NOT NULL DEFAULT '',
      post_request_script TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

    const columns = this.#db.prepare('PRAGMA table_info(collections)').all() as Array<{
      name: string;
    }>;
    const hasVariables = columns.some((col) => col.name === 'variables');
    if (!hasVariables) {
      this.#db.exec("ALTER TABLE collections ADD COLUMN variables TEXT NOT NULL DEFAULT '[]'");
    }
    const hasHeaders = columns.some((col) => col.name === 'headers');
    if (!hasHeaders) {
      this.#db.exec("ALTER TABLE collections ADD COLUMN headers TEXT NOT NULL DEFAULT '[]'");
    }
    const hasCollectionPreScript = columns.some((col) => col.name === 'pre_request_script');
    if (!hasCollectionPreScript) {
      this.#db.exec(
        "ALTER TABLE collections ADD COLUMN pre_request_script TEXT NOT NULL DEFAULT ''"
      );
    }
    const hasCollectionPostScript = columns.some((col) => col.name === 'post_request_script');
    if (!hasCollectionPostScript) {
      this.#db.exec(
        "ALTER TABLE collections ADD COLUMN post_request_script TEXT NOT NULL DEFAULT ''"
      );
    }

    const requestColumns = this.#db.prepare('PRAGMA table_info(requests)').all() as Array<{
      name: string;
    }>;
    const hasRequestPreScript = requestColumns.some((col) => col.name === 'pre_request_script');
    if (!hasRequestPreScript) {
      this.#db.exec("ALTER TABLE requests ADD COLUMN pre_request_script TEXT NOT NULL DEFAULT ''");
    }
    const hasRequestPostScript = requestColumns.some((col) => col.name === 'post_request_script');
    if (!hasRequestPostScript) {
      this.#db.exec("ALTER TABLE requests ADD COLUMN post_request_script TEXT NOT NULL DEFAULT ''");
    }
  }

  /**
   * Lists all collections ordered by name.
   *
   * @returns All collections in the database.
   */
  listCollections(): Collection[] {
    const rows = this.getDb()
      .prepare(
        'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections ORDER BY name ASC'
      )
      .all() as Record<string, unknown>[];

    return rows.map(rowToCollection);
  }

  /**
   * Creates a new collection with the given name.
   *
   * @param name - Display name for the collection.
   * @returns The newly created collection.
   */
  createCollection(name: string): Collection {
    const result = this.getDb()
      .prepare('INSERT INTO collections (name) VALUES (?)')
      .run(name.trim());

    const row = this.getDb()
      .prepare(
        'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?'
      )
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return rowToCollection(row);
  }

  /**
   * Updates a collection's name, variables, and headers.
   *
   * @param id - Collection ID to update.
   * @param name - New display name.
   * @param variables - Collection-scoped variables.
   * @param headers - Headers sent with every request in the collection.
   * @returns The updated collection.
   * @throws When the collection does not exist.
   */
  updateCollection(
    id: number,
    name: string,
    variables: Variable[],
    headers: KeyValue[],
    preRequestScript: string,
    postRequestScript: string
  ): Collection {
    this.getDb()
      .prepare(
        'UPDATE collections SET name = ?, variables = ?, headers = ?, pre_request_script = ?, post_request_script = ? WHERE id = ?'
      )
      .run(
        name.trim(),
        JSON.stringify(variables),
        JSON.stringify(headers),
        preRequestScript,
        postRequestScript,
        id
      );

    const row = this.getDb()
      .prepare(
        'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?'
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) throw new Error('Collection not found');
    return rowToCollection(row);
  }

  /**
   * Deletes a collection and all of its requests (via CASCADE).
   *
   * @param id - Collection ID to delete.
   */
  deleteCollection(id: number): void {
    this.getDb().prepare('DELETE FROM collections WHERE id = ?').run(id);
  }

  /**
   * Lists all saved requests in a collection.
   *
   * @param collectionId - Collection to query.
   * @returns Requests ordered by sort_order then name.
   */
  listRequests(collectionId: number): SavedRequest[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY sort_order ASC, name ASC')
      .all(collectionId) as Record<string, unknown>[];

    return rows.map(rowToRequest);
  }

  /**
   * Inserts a new request or updates an existing one.
   *
   * @param input - Request fields to persist.
   * @returns The saved request with ID and timestamps.
   * @throws When the request is not found after insert or update.
   */
  saveRequest(input: SaveRequestInput): SavedRequest {
    const headers = JSON.stringify(input.headers);
    const params = JSON.stringify(input.params);
    const preRequestScript = input.pre_request_script ?? '';
    const postRequestScript = input.post_request_script ?? '';
    const now = new Date().toISOString();

    if (input.id) {
      this.getDb()
        .prepare(
          `UPDATE requests SET
          collection_id = ?, name = ?, method = ?, url = ?,
          headers = ?, params = ?, body = ?, body_type = ?,
          pre_request_script = ?, post_request_script = ?,
          updated_at = ?
        WHERE id = ?`
        )
        .run(
          input.collection_id,
          input.name.trim(),
          input.method,
          input.url,
          headers,
          params,
          input.body,
          input.body_type,
          preRequestScript,
          postRequestScript,
          now,
          input.id
        );

      const row = this.getDb().prepare('SELECT * FROM requests WHERE id = ?').get(input.id);
      if (!row) throw new Error('Request not found after update');
      return rowToRequest(row as Record<string, unknown>);
    }

    const maxOrder = this.getDb()
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM requests WHERE collection_id = ?'
      )
      .get(input.collection_id) as { max_order: number };

    const result = this.getDb()
      .prepare(
        `INSERT INTO requests (
        collection_id, name, method, url, headers, params, body, body_type,
        pre_request_script, post_request_script, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.collection_id,
        input.name.trim(),
        input.method,
        input.url,
        headers,
        params,
        input.body,
        input.body_type,
        preRequestScript,
        postRequestScript,
        maxOrder.max_order + 1,
        now
      );

    const row = this.getDb()
      .prepare('SELECT * FROM requests WHERE id = ?')
      .get(result.lastInsertRowid);

    if (!row) throw new Error('Request not found after insert');
    return rowToRequest(row as Record<string, unknown>);
  }

  /**
   * Deletes a saved request by ID.
   *
   * @param id - Request ID to delete.
   */
  deleteRequest(id: number): void {
    this.getDb().prepare('DELETE FROM requests WHERE id = ?').run(id);
  }

  /**
   * Builds a portable export payload for a collection and its requests.
   *
   * @param id - Collection ID to export.
   * @returns Collection export data without database IDs.
   * @throws When the collection does not exist.
   */
  exportCollectionData(id: number): CollectionExport {
    const row = this.getDb()
      .prepare(
        'SELECT name, variables, headers, pre_request_script, post_request_script FROM collections WHERE id = ?'
      )
      .get(id) as
      | {
          name: string;
          variables: string;
          headers: string;
          pre_request_script: string;
          post_request_script: string;
        }
      | undefined;

    if (!row) throw new Error('Collection not found');

    const requests = this.listRequests(id).map(
      ({
        name,
        method,
        url,
        headers,
        params,
        body,
        body_type,
        pre_request_script,
        post_request_script,
        sort_order
      }) => ({
        name,
        method,
        url,
        headers,
        params,
        body,
        body_type,
        pre_request_script,
        post_request_script,
        sort_order
      })
    );

    const variables = parseJson<Partial<Variable>[]>(row.variables, []).map(normalizeVariable);
    const headers = parseJson<KeyValue[]>(row.headers, []);

    return {
      formatVersion: 1,
      name: row.name,
      variables: variables.map((v) => ({
        key: v.key,
        value: v.share ? v.value : '',
        defaultValue: v.defaultValue,
        share: v.share
      })),
      headers,
      pre_request_script: row.pre_request_script ?? '',
      post_request_script: row.post_request_script ?? '',
      requests
    };
  }

  /**
   * Imports a collection and its requests from export data.
   *
   * @param data - Parsed collection export payload.
   * @returns The newly created collection.
   * @throws When the payload is invalid.
   */
  importCollectionData(data: unknown): Collection {
    const exportData = validateCollectionExport(data);
    const database = this.getDb();
    const now = new Date().toISOString();

    const importCollection = database.transaction((payload: CollectionExport) => {
      const collectionResult = database
        .prepare(
          'INSERT INTO collections (name, variables, headers, pre_request_script, post_request_script) VALUES (?, ?, ?, ?, ?)'
        )
        .run(
          payload.name,
          JSON.stringify(payload.variables),
          JSON.stringify(payload.headers),
          payload.pre_request_script,
          payload.post_request_script
        );

      const collectionId = Number(collectionResult.lastInsertRowid);
      const insertRequest = database.prepare(
        `INSERT INTO requests (
        collection_id, name, method, url, headers, params, body, body_type,
        pre_request_script, post_request_script, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const request of payload.requests) {
        insertRequest.run(
          collectionId,
          request.name,
          request.method,
          request.url,
          JSON.stringify(request.headers),
          JSON.stringify(request.params),
          request.body,
          request.body_type,
          request.pre_request_script,
          request.post_request_script,
          request.sort_order,
          now
        );
      }

      const row = database
        .prepare(
          'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?'
        )
        .get(collectionId) as Record<string, unknown>;

      return rowToCollection(row);
    });

    return importCollection(exportData);
  }

  /**
   * Reads a persisted setting by key.
   *
   * @param key - Setting key to look up.
   * @returns The stored value, or undefined when not set.
   */
  getSetting(key: string): string | undefined {
    const row = this.getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  /**
   * Persists a setting value, replacing any existing entry for the key.
   *
   * @param key - Setting key to store.
   * @param value - Value to persist.
   */
  setSetting(key: string, value: string): void {
    this.getDb()
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      )
      .run(key, value, value);
  }

  /**
   * Closes the database connection and clears the instance handle.
   */
  close(): void {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }
}
