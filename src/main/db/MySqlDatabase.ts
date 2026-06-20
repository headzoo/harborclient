import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
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
  MySqlSettings,
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
 * Maps a raw MySQL row to a Collection object.
 *
 * @param row - Database row from the collections table.
 * @returns Normalized collection.
 */
function rowToCollection(row: RowDataPacket): Collection {
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
 * Maps a raw MySQL row to an Environment object.
 *
 * @param row - Database row from the environments table.
 * @returns Normalized environment.
 */
function rowToEnvironment(row: RowDataPacket): Environment {
  return {
    id: row.id as number,
    name: row.name as string,
    variables: parseJson<Partial<Variable>[]>(row.variables as string, []).map(normalizeVariable),
    created_at: row.created_at as string
  };
}

/**
 * Maps a raw MySQL row to a SavedRequest object.
 *
 * @param row - Database row from the requests table.
 * @returns Normalized saved request.
 */
function rowToRequest(row: RowDataPacket): SavedRequest {
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

export class MySqlDatabase implements IDatabase {
  #pool: Pool | null = null;
  readonly #settings: MySqlSettings;

  /**
   * @param settings - MySQL connection settings.
   */
  constructor(settings: MySqlSettings) {
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
   * Opens the MySQL connection pool and ensures schema exists.
   */
  async init(): Promise<void> {
    if (this.#pool) return;

    const { host, port, user, password, database } = this.#settings;
    if (!host || !user || !database) {
      throw new Error('MySQL settings are incomplete');
    }

    this.#pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10
    });

    await this.#pool.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        variables LONGTEXT NOT NULL,
        headers LONGTEXT NOT NULL,
        pre_request_script LONGTEXT NOT NULL,
        post_request_script LONGTEXT NOT NULL,
        created_at VARCHAR(64) NOT NULL
      )
    `);

    await this.#pool.execute(`
      CREATE TABLE IF NOT EXISTS requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        collection_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        method VARCHAR(16) NOT NULL DEFAULT 'GET',
        url LONGTEXT NOT NULL,
        headers LONGTEXT NOT NULL,
        params LONGTEXT NOT NULL,
        body LONGTEXT NOT NULL,
        body_type VARCHAR(32) NOT NULL DEFAULT 'none',
        pre_request_script LONGTEXT NOT NULL,
        post_request_script LONGTEXT NOT NULL,
        comment LONGTEXT NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);

    await this.#pool.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(191) PRIMARY KEY,
        value LONGTEXT NOT NULL
      )
    `);

    await this.#pool.execute(`
      CREATE TABLE IF NOT EXISTS environments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        variables LONGTEXT NOT NULL,
        created_at VARCHAR(64) NOT NULL
      )
    `);

    await this.#pool.execute(`
      ALTER TABLE requests ADD COLUMN IF NOT EXISTS comment LONGTEXT NOT NULL DEFAULT ''
    `);
  }

  async listCollections(): Promise<Collection[]> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections ORDER BY name ASC'
    );
    return rows.map(rowToCollection);
  }

  async createCollection(name: string): Promise<Collection> {
    const createdAt = new Date().toISOString();
    const [result] = await this.getPool().execute<ResultSetHeader>(
      `INSERT INTO collections (name, variables, headers, pre_request_script, post_request_script, created_at)
       VALUES (?, '[]', '[]', '', '', ?)`,
      [name.trim(), createdAt]
    );

    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?',
      [result.insertId]
    );

    const row = rows[0];
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
    const [result] = await this.getPool().execute<ResultSetHeader>(
      'UPDATE collections SET name = ?, variables = ?, headers = ?, pre_request_script = ?, post_request_script = ? WHERE id = ?',
      [
        name.trim(),
        JSON.stringify(variables),
        JSON.stringify(headers),
        preRequestScript,
        postRequestScript,
        id
      ]
    );

    if (result.affectedRows === 0) throw new Error('Collection not found');

    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?',
      [id]
    );

    const row = rows[0];
    if (!row) throw new Error('Collection not found');
    return rowToCollection(row);
  }

  async deleteCollection(id: number): Promise<void> {
    await this.getPool().execute('DELETE FROM collections WHERE id = ?', [id]);
  }

  async listEnvironments(): Promise<Environment[]> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, created_at FROM environments ORDER BY name ASC'
    );
    return rows.map(rowToEnvironment);
  }

  async createEnvironment(name: string): Promise<Environment> {
    const createdAt = new Date().toISOString();
    const [result] = await this.getPool().execute<ResultSetHeader>(
      `INSERT INTO environments (name, variables, created_at) VALUES (?, '[]', ?)`,
      [name.trim(), createdAt]
    );

    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, created_at FROM environments WHERE id = ?',
      [result.insertId]
    );

    const row = rows[0];
    if (!row) throw new Error('Environment not found after insert');
    return rowToEnvironment(row);
  }

  async updateEnvironment(id: number, name: string, variables: Variable[]): Promise<Environment> {
    const [result] = await this.getPool().execute<ResultSetHeader>(
      'UPDATE environments SET name = ?, variables = ? WHERE id = ?',
      [name.trim(), JSON.stringify(variables), id]
    );

    if (result.affectedRows === 0) throw new Error('Environment not found');

    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT id, name, variables, created_at FROM environments WHERE id = ?',
      [id]
    );

    const row = rows[0];
    if (!row) throw new Error('Environment not found');
    return rowToEnvironment(row);
  }

  async deleteEnvironment(id: number): Promise<void> {
    await this.getPool().execute('DELETE FROM environments WHERE id = ?', [id]);
  }

  async listRequests(collectionId: number): Promise<SavedRequest[]> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT * FROM requests WHERE collection_id = ? ORDER BY sort_order ASC, name ASC',
      [collectionId]
    );
    return rows.map(rowToRequest);
  }

  async saveRequest(input: SaveRequestInput): Promise<SavedRequest> {
    const headers = JSON.stringify(input.headers);
    const params = JSON.stringify(input.params);
    const preRequestScript = input.pre_request_script ?? '';
    const postRequestScript = input.post_request_script ?? '';
    const comment = input.comment ?? '';
    const now = new Date().toISOString();

    if (input.id) {
      const [result] = await this.getPool().execute<ResultSetHeader>(
        `UPDATE requests SET
          collection_id = ?, name = ?, method = ?, url = ?,
          headers = ?, params = ?, body = ?, body_type = ?,
          pre_request_script = ?, post_request_script = ?, comment = ?,
          updated_at = ?
        WHERE id = ?`,
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

      if (result.affectedRows > 0) {
        const [rows] = await this.getPool().execute<RowDataPacket[]>(
          'SELECT * FROM requests WHERE id = ?',
          [input.id]
        );
        const row = rows[0];
        if (row) return rowToRequest(row);
      }
    }

    const [maxRows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM requests WHERE collection_id = ?',
      [input.collection_id]
    );
    const maxOrder = (maxRows[0]?.max_order as number) ?? -1;

    const [result] = await this.getPool().execute<ResultSetHeader>(
      `INSERT INTO requests (
        collection_id, name, method, url, headers, params, body, body_type,
        pre_request_script, post_request_script, comment, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT * FROM requests WHERE id = ?',
      [result.insertId]
    );

    const row = rows[0];
    if (!row) throw new Error('Request not found after insert');
    return rowToRequest(row);
  }

  async deleteRequest(id: number): Promise<void> {
    await this.getPool().execute('DELETE FROM requests WHERE id = ?', [id]);
  }

  async exportCollectionData(id: number): Promise<CollectionExport> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT name, variables, headers, pre_request_script, post_request_script FROM collections WHERE id = ?',
      [id]
    );

    const row = rows[0];
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
    const connection = await this.getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [collectionResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO collections (name, variables, headers, pre_request_script, post_request_script, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          exportData.name,
          JSON.stringify(exportData.variables),
          JSON.stringify(exportData.headers),
          exportData.pre_request_script,
          exportData.post_request_script,
          now
        ]
      );

      const collectionId = collectionResult.insertId;

      for (const request of exportData.requests) {
        await connection.execute(
          `INSERT INTO requests (
            collection_id, name, method, url, headers, params, body, body_type,
            pre_request_script, post_request_script, comment, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT id, name, variables, headers, pre_request_script, post_request_script, created_at FROM collections WHERE id = ?',
        [collectionId]
      );

      await connection.commit();

      const row = rows[0];
      if (!row) throw new Error('Collection not found after import');
      return rowToCollection(row);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      'SELECT value FROM settings WHERE `key` = ?',
      [key]
    );
    const row = rows[0];
    return row ? (row.value as string) : undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.getPool().execute(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
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
