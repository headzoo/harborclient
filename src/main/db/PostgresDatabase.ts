import { Pool, type QueryResultRow } from 'pg';
import {
  maskVariablesForExport,
  normalizeVariable,
  validateCollectionExport
} from '#/main/db/collectionData';
import type { IDatabase } from '#/main/db/IDatabase';
import type {
  BodyType,
  Collection,
  CollectionExport,
  Environment,
  HttpMethod,
  KeyValue,
  PostgresSettings,
  SaveRequestInput,
  SavedRequest,
  Variable
} from '#/shared/types';

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
 * Maps a raw Postgres row to a Collection object.
 *
 * @param row - Database row from the collections table.
 * @returns Normalized collection.
 */
function rowToCollection(row: QueryResultRow): Collection {
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
 * Maps a raw Postgres row to an Environment object.
 *
 * @param row - Database row from the environments table.
 * @returns Normalized environment.
 */
function rowToEnvironment(row: QueryResultRow): Environment {
  return {
    id: row.id as number,
    name: row.name as string,
    variables: parseJson<Partial<Variable>[]>(row.variables as string, []).map(normalizeVariable),
    created_at: row.created_at as string
  };
}

/**
 * Maps a raw Postgres row to a SavedRequest object.
 *
 * @param row - Database row from the requests table.
 * @returns Normalized saved request.
 */
function rowToRequest(row: QueryResultRow): SavedRequest {
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
    comment: (row.comment as string) ?? '',
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  };
}

export class PostgresDatabase implements IDatabase {
  #pool: Pool | null = null;
  readonly #settings: PostgresSettings;

  /**
   * @param settings - PostgreSQL connection settings.
   */
  constructor(settings: PostgresSettings) {
    this.#settings = settings;
  }

  /**
   * Returns the active connection pool.
   *
   * @returns The initialized pool.
   * @throws When init has not been called yet.
   */
  private getPool(): Pool {
    if (!this.#pool) throw new Error('Database not initialized');
    return this.#pool;
  }

  /**
   * Opens the PostgreSQL connection pool and ensures schema exists.
   */
  async init(): Promise<void> {
    if (this.#pool) return;

    const { host, port, user, password, database } = this.#settings;
    if (!host || !user || !database) {
      throw new Error('PostgreSQL settings are incomplete');
    }

    this.#pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 10
    });

    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        variables TEXT NOT NULL,
        headers TEXT NOT NULL,
        pre_request_script TEXT NOT NULL,
        post_request_script TEXT NOT NULL,
        created_at VARCHAR(64) NOT NULL
      )
    `);

    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        collection_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        method VARCHAR(16) NOT NULL DEFAULT 'GET',
        url TEXT NOT NULL,
        headers TEXT NOT NULL,
        params TEXT NOT NULL,
        body TEXT NOT NULL,
        body_type VARCHAR(32) NOT NULL DEFAULT 'none',
        pre_request_script TEXT NOT NULL,
        post_request_script TEXT NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);

    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        "key" VARCHAR(191) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS environments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        variables TEXT NOT NULL,
        created_at VARCHAR(64) NOT NULL
      )
    `);

    await this.#pool.query(`
      ALTER TABLE requests ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT ''
    `);
  }

  async listCollections(): Promise<Collection[]> {
    const result = await this.getPool().query(
      'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections ORDER BY name ASC'
    );
    return result.rows.map(rowToCollection);
  }

  async createCollection(name: string): Promise<Collection> {
    const createdAt = new Date().toISOString();
    const result = await this.getPool().query(
      `INSERT INTO collections (name, variables, headers, pre_request_script, post_request_script, created_at)
       VALUES ($1, '[]', '[]', '', '', $2)
       RETURNING id, name, variables, headers, pre_request_script, post_request_script, created_at`,
      [name.trim(), createdAt]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Collection not found after insert');
    return rowToCollection(row);
  }

  async updateCollection(
    id: number,
    name: string,
    variables: Variable[],
    headers: KeyValue[],
    preRequestScript: string,
    postRequestScript: string
  ): Promise<Collection> {
    const result = await this.getPool().query(
      'UPDATE collections SET name = $1, variables = $2, headers = $3, pre_request_script = $4, post_request_script = $5 WHERE id = $6',
      [
        name.trim(),
        JSON.stringify(variables),
        JSON.stringify(headers),
        preRequestScript,
        postRequestScript,
        id
      ]
    );

    if (result.rowCount === 0) throw new Error('Collection not found');

    const selectResult = await this.getPool().query(
      'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = $1',
      [id]
    );

    const row = selectResult.rows[0];
    if (!row) throw new Error('Collection not found');
    return rowToCollection(row);
  }

  async deleteCollection(id: number): Promise<void> {
    await this.getPool().query('DELETE FROM collections WHERE id = $1', [id]);
  }

  async listEnvironments(): Promise<Environment[]> {
    const result = await this.getPool().query(
      'SELECT id, name, variables, created_at FROM environments ORDER BY name ASC'
    );
    return result.rows.map(rowToEnvironment);
  }

  async createEnvironment(name: string): Promise<Environment> {
    const createdAt = new Date().toISOString();
    const result = await this.getPool().query(
      `INSERT INTO environments (name, variables, created_at) VALUES ($1, '[]', $2)
       RETURNING id, name, variables, created_at`,
      [name.trim(), createdAt]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Environment not found after insert');
    return rowToEnvironment(row);
  }

  async updateEnvironment(id: number, name: string, variables: Variable[]): Promise<Environment> {
    const result = await this.getPool().query(
      'UPDATE environments SET name = $1, variables = $2 WHERE id = $3',
      [name.trim(), JSON.stringify(variables), id]
    );

    if (result.rowCount === 0) throw new Error('Environment not found');

    const selectResult = await this.getPool().query(
      'SELECT id, name, variables, created_at FROM environments WHERE id = $1',
      [id]
    );

    const row = selectResult.rows[0];
    if (!row) throw new Error('Environment not found');
    return rowToEnvironment(row);
  }

  async deleteEnvironment(id: number): Promise<void> {
    await this.getPool().query('DELETE FROM environments WHERE id = $1', [id]);
  }

  async listRequests(collectionId: number): Promise<SavedRequest[]> {
    const result = await this.getPool().query(
      'SELECT * FROM requests WHERE collection_id = $1 ORDER BY sort_order ASC, name ASC',
      [collectionId]
    );
    return result.rows.map(rowToRequest);
  }

  async saveRequest(input: SaveRequestInput): Promise<SavedRequest> {
    const headers = JSON.stringify(input.headers);
    const params = JSON.stringify(input.params);
    const preRequestScript = input.pre_request_script ?? '';
    const postRequestScript = input.post_request_script ?? '';
    const comment = input.comment ?? '';
    const now = new Date().toISOString();

    if (input.id) {
      const result = await this.getPool().query(
        `UPDATE requests SET
          collection_id = $1, name = $2, method = $3, url = $4,
          headers = $5, params = $6, body = $7, body_type = $8,
          pre_request_script = $9, post_request_script = $10, comment = $11,
          updated_at = $12
        WHERE id = $13`,
        [
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
          comment,
          now,
          input.id
        ]
      );

      if ((result.rowCount ?? 0) > 0) {
        const selectResult = await this.getPool().query('SELECT * FROM requests WHERE id = $1', [
          input.id
        ]);
        const row = selectResult.rows[0];
        if (row) return rowToRequest(row);
      }
    }

    const maxResult = await this.getPool().query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM requests WHERE collection_id = $1',
      [input.collection_id]
    );
    const maxOrder = (maxResult.rows[0]?.max_order as number) ?? -1;

    const result = await this.getPool().query(
      `INSERT INTO requests (
        collection_id, name, method, url, headers, params, body, body_type,
        pre_request_script, post_request_script, comment, sort_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
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
        comment,
        maxOrder + 1,
        now,
        now
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Request not found after insert');
    return rowToRequest(row);
  }

  async deleteRequest(id: number): Promise<void> {
    await this.getPool().query('DELETE FROM requests WHERE id = $1', [id]);
  }

  async exportCollectionData(id: number): Promise<CollectionExport> {
    const result = await this.getPool().query(
      'SELECT name, variables, headers, pre_request_script, post_request_script FROM collections WHERE id = $1',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Collection not found');

    const requests = (await this.listRequests(id)).map(
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
        comment,
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
        comment,
        sort_order
      })
    );

    const variables = parseJson<Partial<Variable>[]>(row.variables as string, []).map(
      normalizeVariable
    );
    const headers = parseJson<KeyValue[]>(row.headers as string, []);

    return {
      formatVersion: 1,
      name: row.name as string,
      variables: maskVariablesForExport(variables),
      headers,
      pre_request_script: (row.pre_request_script as string) ?? '',
      post_request_script: (row.post_request_script as string) ?? '',
      requests
    };
  }

  async importCollectionData(data: unknown): Promise<Collection> {
    const exportData = validateCollectionExport(data);
    const now = new Date().toISOString();
    const client = await this.getPool().connect();

    try {
      await client.query('BEGIN');

      const collectionResult = await client.query(
        `INSERT INTO collections (name, variables, headers, pre_request_script, post_request_script, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, variables, headers, pre_request_script, post_request_script, created_at`,
        [
          exportData.name,
          JSON.stringify(exportData.variables),
          JSON.stringify(exportData.headers),
          exportData.pre_request_script,
          exportData.post_request_script,
          now
        ]
      );

      const collectionId = collectionResult.rows[0]?.id as number;

      for (const request of exportData.requests) {
        await client.query(
          `INSERT INTO requests (
            collection_id, name, method, url, headers, params, body, body_type,
            pre_request_script, post_request_script, comment, sort_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
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
            request.comment,
            request.sort_order,
            now,
            now
          ]
        );
      }

      await client.query('COMMIT');

      const row = collectionResult.rows[0];
      if (!row) throw new Error('Collection not found after import');
      return rowToCollection(row);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getSetting(key: string): Promise<string | undefined> {
    const result = await this.getPool().query('SELECT value FROM settings WHERE "key" = $1', [key]);
    const row = result.rows[0];
    return row ? (row.value as string) : undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.getPool().query(
      'INSERT INTO settings ("key", value) VALUES ($1, $2) ON CONFLICT ("key") DO UPDATE SET value = EXCLUDED.value',
      [key, value]
    );
  }

  async close(): Promise<void> {
    if (this.#pool) {
      await this.#pool.end();
      this.#pool = null;
    }
  }
}
