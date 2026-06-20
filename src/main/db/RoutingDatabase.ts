import { LocalRegistry, type CollectionRegistryEntry } from '#/main/db/LocalRegistry';
import { createDatabaseInstance } from '#/main/db/createDatabaseInstance';
import { decodeGlobalId, encodeGlobalId } from '#/main/db/idNamespace';
import type { IDatabase } from '#/main/db/IDatabase';
import type {
  Collection,
  CollectionExport,
  DatabaseConnection,
  DatabaseProvider,
  Environment,
  KeyValue,
  SaveRequestInput,
  SavedRequest,
  Variable
} from '#/shared/types';

const MIGRATION_FLAG_KEY = '__migrated__';
const THEME_SETTING_KEY = 'theme';

interface MountedBackend {
  slot: number;
  connectionId: string;
  connectionName: string;
  connectionType: DatabaseProvider;
  db: IDatabase;
}

/**
 * Routes collection and request operations across multiple database backends.
 *
 * A hidden LocalRegistry holds the authoritative collection list,
 * environments, and app settings. Collection data and requests live in the
 * mapped provider. Request ids are namespaced per backend; collection ids
 * come from the registry.
 */
export class RoutingDatabase implements IDatabase {
  private readonly registry: LocalRegistry;
  private defaultDataConnectionId: string;
  private readonly byConnectionId = new Map<string, MountedBackend>();
  private readonly bySlot = new Map<number, MountedBackend>();

  /**
   * @param registry - Hidden local store for collection metadata, environments, and settings.
   * @param defaultDataConnectionId - Preferred provider for new collection data.
   */
  constructor(registry: LocalRegistry, defaultDataConnectionId: string) {
    this.registry = registry;
    this.defaultDataConnectionId = defaultDataConnectionId;
  }

  /**
   * Registers an initialized backend at the given slot.
   */
  mount(slot: number, connection: DatabaseConnection, db: IDatabase): void {
    const backend: MountedBackend = {
      slot,
      connectionId: connection.id,
      connectionName: connection.name,
      connectionType: connection.type,
      db
    };
    this.byConnectionId.set(connection.id, backend);
    this.bySlot.set(slot, backend);
  }

  /**
   * Returns true when at least one data provider backend is mounted.
   */
  hasAnyBackend(): boolean {
    return this.byConnectionId.size > 0;
  }

  /**
   * Returns true when the default data provider is mounted.
   */
  hasDefaultProvider(): boolean {
    return this.byConnectionId.has(this.defaultDataConnectionId);
  }

  /**
   * Sets the default data connection id when the preferred provider is unavailable.
   */
  setDefaultDataConnectionId(connectionId: string): void {
    this.defaultDataConnectionId = connectionId;
  }

  /**
   * Initializes all mounted backends (no-op; backends are initialized before mount).
   */
  async init(): Promise<void> {
    // Backends are initialized before being mounted.
  }

  /**
   * Closes every mounted provider and the registry.
   */
  async close(): Promise<void> {
    await Promise.all([...this.byConnectionId.values()].map((backend) => backend.db.close()));
    await this.registry.close();
  }

  /**
   * Lists all collections from the registry, hydrating data from each provider.
   */
  async listCollections(): Promise<Collection[]> {
    const entries = this.registry.listRegistry();

    const recordsByConnection = new Map<string, Map<number, Collection>>();
    const neededConnectionIds = new Set(entries.map((entry) => entry.connectionId));

    for (const connectionId of neededConnectionIds) {
      const backend = this.byConnectionId.get(connectionId);
      if (!backend) continue;
      try {
        const records = await backend.db.listCollections();
        recordsByConnection.set(
          connectionId,
          new Map(records.map((record) => [record.id, record]))
        );
      } catch (err) {
        console.warn(`Failed to read collections from "${backend.connectionName}":`, err);
      }
    }

    return entries.map((entry) => {
      const record = recordsByConnection.get(entry.connectionId)?.get(entry.providerCollectionId);
      return this.buildCollection(entry, record);
    });
  }

  /**
   * Creates a collection in the default data provider and registers it.
   */
  async createCollection(name: string): Promise<Collection> {
    const backend = this.requireDefaultDataBackend();
    const created = await backend.db.createCollection(name);
    const entry = this.registry.addRegistryEntry({
      name: created.name,
      connectionId: backend.connectionId,
      providerCollectionId: created.id
    });
    return this.buildCollection(entry, created);
  }

  /**
   * Updates a collection's data in its provider and its name in the registry.
   */
  async updateCollection(
    id: number,
    name: string,
    variables: Variable[],
    headers: KeyValue[],
    preRequestScript: string,
    postRequestScript: string
  ): Promise<Collection> {
    const entry = this.requireEntry(id);
    const backend = this.requireBackendByConnectionId(entry.connectionId);
    const record = await backend.db.updateCollection(
      entry.providerCollectionId,
      name,
      variables,
      headers,
      preRequestScript,
      postRequestScript
    );
    const updatedEntry = this.registry.updateRegistryEntry(id, { name });
    return this.buildCollection(updatedEntry, record);
  }

  /**
   * Deletes a collection from its provider and the registry.
   */
  async deleteCollection(id: number): Promise<void> {
    const entry = this.requireEntry(id);
    const backend = this.byConnectionId.get(entry.connectionId);
    if (backend) {
      await backend.db.deleteCollection(entry.providerCollectionId);
    }
    this.registry.deleteRegistryEntry(id);
  }

  /**
   * Lists environments from the hidden registry.
   */
  async listEnvironments(): Promise<Environment[]> {
    return this.registry.listEnvironments();
  }

  /**
   * Creates an environment in the hidden registry.
   */
  async createEnvironment(name: string): Promise<Environment> {
    return this.registry.createEnvironment(name);
  }

  /**
   * Updates an environment in the hidden registry.
   */
  async updateEnvironment(id: number, name: string, variables: Variable[]): Promise<Environment> {
    return this.registry.updateEnvironment(id, name, variables);
  }

  /**
   * Deletes an environment from the hidden registry.
   */
  async deleteEnvironment(id: number): Promise<void> {
    this.registry.deleteEnvironment(id);
  }

  /**
   * Lists requests for a collection, rewriting ids to the global namespace.
   */
  async listRequests(collectionId: number): Promise<SavedRequest[]> {
    const entry = this.requireEntry(collectionId);
    const backend = this.requireBackendByConnectionId(entry.connectionId);
    const requests = await backend.db.listRequests(entry.providerCollectionId);
    return requests.map((request) => this.toGlobalRequest(request, backend, collectionId));
  }

  /**
   * Saves a request in the backend that owns the target collection.
   */
  async saveRequest(input: SaveRequestInput): Promise<SavedRequest> {
    const entry = this.requireEntry(input.collection_id);
    const backend = this.requireBackendByConnectionId(entry.connectionId);
    const localRequestId = input.id != null ? decodeGlobalId(input.id).localId : undefined;

    const saved = await backend.db.saveRequest({
      ...input,
      id: localRequestId,
      collection_id: entry.providerCollectionId
    });
    return this.toGlobalRequest(saved, backend, input.collection_id);
  }

  /**
   * Deletes a request from the backend identified by its namespaced id.
   */
  async deleteRequest(id: number): Promise<void> {
    const { slot, localId } = decodeGlobalId(id);
    const backend = this.bySlot.get(slot);
    if (!backend) {
      throw new Error(`Database backend for slot ${slot} is unavailable.`);
    }
    await backend.db.deleteRequest(localId);
  }

  /**
   * Exports collection data from its owning provider.
   */
  async exportCollectionData(id: number): Promise<CollectionExport> {
    const entry = this.requireEntry(id);
    const backend = this.requireBackendByConnectionId(entry.connectionId);
    return backend.db.exportCollectionData(entry.providerCollectionId);
  }

  /**
   * Imports a collection into the default data provider and registers it.
   */
  async importCollectionData(data: unknown): Promise<Collection> {
    const backend = this.requireDefaultDataBackend();
    const imported = await backend.db.importCollectionData(data);
    const entry = this.registry.addRegistryEntry({
      name: imported.name,
      connectionId: backend.connectionId,
      providerCollectionId: imported.id
    });
    return this.buildCollection(entry, imported);
  }

  /**
   * Reads a setting from the hidden registry.
   */
  async getSetting(key: string): Promise<string | undefined> {
    return this.registry.getSetting(key);
  }

  /**
   * Persists a setting in the hidden registry.
   */
  async setSetting(key: string, value: string): Promise<void> {
    this.registry.setSetting(key, value);
  }

  /**
   * Moves a collection's data to another provider, keeping its global id stable.
   */
  async moveCollection(
    globalCollectionId: number,
    targetConnectionId: string
  ): Promise<Collection> {
    const entry = this.requireEntry(globalCollectionId);

    if (entry.connectionId === targetConnectionId) {
      const sourceBackend = this.byConnectionId.get(entry.connectionId);
      const record = sourceBackend
        ? (await sourceBackend.db.listCollections()).find(
            (item) => item.id === entry.providerCollectionId
          )
        : undefined;
      return this.buildCollection(entry, record);
    }

    const sourceBackend = this.requireBackendByConnectionId(entry.connectionId);
    const targetBackend = this.requireBackendByConnectionId(targetConnectionId);

    const sourceCollections = await sourceBackend.db.listCollections();
    const record = sourceCollections.find((item) => item.id === entry.providerCollectionId);
    if (!record) {
      throw new Error(`Collection not found: ${globalCollectionId}`);
    }

    const requests = await sourceBackend.db.listRequests(entry.providerCollectionId);

    const created = await targetBackend.db.createCollection(record.name);
    const updated = await targetBackend.db.updateCollection(
      created.id,
      record.name,
      record.variables,
      record.headers,
      record.pre_request_script,
      record.post_request_script
    );

    const sortedRequests = [...requests].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    );

    for (const request of sortedRequests) {
      await targetBackend.db.saveRequest({
        collection_id: updated.id,
        name: request.name,
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        body: request.body,
        body_type: request.body_type,
        pre_request_script: request.pre_request_script,
        post_request_script: request.post_request_script,
        comment: request.comment
      });
    }

    await sourceBackend.db.deleteCollection(entry.providerCollectionId);

    const updatedEntry = this.registry.updateRegistryEntry(globalCollectionId, {
      name: record.name,
      connectionId: targetConnectionId,
      providerCollectionId: updated.id
    });
    return this.buildCollection(updatedEntry, updated);
  }

  /**
   * Returns the sharing metadata for a collection: its owning connection and provider id.
   *
   * @param globalCollectionId - Global (registry) collection id.
   */
  getShareInfo(globalCollectionId: number): {
    connectionId: string;
    name: string;
    providerCollectionId: number;
  } {
    const entry = this.requireEntry(globalCollectionId);
    return {
      connectionId: entry.connectionId,
      name: entry.name,
      providerCollectionId: entry.providerCollectionId
    };
  }

  /**
   * Mounts a shared connection at runtime and registers a single shared collection.
   *
   * @param connection - Connection configuration to mount.
   * @param slot - Backend slot for request id namespacing.
   * @param userDataPath - Electron userData path for SQLite file storage.
   * @param meta - Shared collection name and provider id from the invite.
   * @returns The registered collection.
   */
  async registerSharedCollection(
    connection: DatabaseConnection,
    slot: number,
    userDataPath: string,
    meta: { name: string; providerCollectionId: number }
  ): Promise<Collection> {
    const alreadyMounted = this.byConnectionId.has(connection.id);
    if (!alreadyMounted) {
      const db = await createDatabaseInstance(connection, userDataPath);
      this.mount(slot, connection, db);
    }

    const existing = this.registry
      .listRegistry()
      .find(
        (entry) =>
          entry.connectionId === connection.id &&
          entry.providerCollectionId === meta.providerCollectionId
      );

    const entry =
      existing ??
      this.registry.addRegistryEntry({
        name: meta.name,
        connectionId: connection.id,
        providerCollectionId: meta.providerCollectionId
      });

    let record: Collection | undefined;
    try {
      const records = await this.requireBackendByConnectionId(connection.id).db.listCollections();
      record = records.find((item) => item.id === meta.providerCollectionId);
    } catch {
      record = undefined;
    }

    return this.buildCollection(entry, record);
  }

  /**
   * Backfills the registry from existing provider data on first run.
   *
   * @param legacyProviderDbPath - Path to the user SQLite provider file for legacy registry migration.
   */
  async migrateRegistryIfNeeded(legacyProviderDbPath: string): Promise<void> {
    if (this.registry.getSetting(MIGRATION_FLAG_KEY) === '1') {
      return;
    }

    const defaultBackend = this.resolveDefaultDataBackend();

    if (this.registry.listRegistry().length === 0) {
      const legacyCount = this.registry.migrateFromLegacyProviderDb(legacyProviderDbPath);
      if (legacyCount === 0) {
        const defaultCollections = await defaultBackend.db.listCollections();
        for (const collection of defaultCollections) {
          this.registry.addRegistryEntry({
            id: collection.id,
            name: collection.name,
            connectionId: defaultBackend.connectionId,
            providerCollectionId: collection.id
          });
        }

        for (const backend of this.byConnectionId.values()) {
          if (backend.connectionId === defaultBackend.connectionId) continue;
          try {
            const collections = await backend.db.listCollections();
            for (const collection of collections) {
              this.registry.addRegistryEntry({
                name: collection.name,
                connectionId: backend.connectionId,
                providerCollectionId: collection.id
              });
            }
          } catch (err) {
            console.warn(`Failed to migrate collections from "${backend.connectionName}":`, err);
          }
        }
      }
    }

    if (this.registry.listEnvironments().length === 0) {
      try {
        const environments = await defaultBackend.db.listEnvironments();
        for (const environment of environments) {
          this.registry.seedEnvironment(environment);
        }
      } catch (err) {
        console.warn('Failed to migrate environments from default provider:', err);
      }
    }

    const theme = await defaultBackend.db.getSetting(THEME_SETTING_KEY);
    if (theme != null && this.registry.getSetting(THEME_SETTING_KEY) == null) {
      this.registry.setSetting(THEME_SETTING_KEY, theme);
    }

    this.registry.setSetting(MIGRATION_FLAG_KEY, '1');
  }

  /**
   * Creates and mounts every configured connection, skipping failures gracefully.
   */
  static async create(
    registry: LocalRegistry,
    preferredConnectionId: string,
    connections: DatabaseConnection[],
    slots: Record<string, number>,
    userDataPath: string
  ): Promise<RoutingDatabase> {
    const defaultDataConnectionId = RoutingDatabase.resolveDefaultConnectionId(
      preferredConnectionId,
      connections
    );
    const router = new RoutingDatabase(registry, defaultDataConnectionId);

    for (const connection of connections) {
      const slot = slots[connection.id];
      if (slot === undefined) continue;

      try {
        const db = await createDatabaseInstance(connection, userDataPath);
        router.mount(slot, connection, db);
      } catch (err) {
        console.warn(
          `Failed to initialize database "${connection.name}" (${connection.type}):`,
          err
        );
      }
    }

    if (!router.hasDefaultProvider()) {
      const fallback = [...router.byConnectionId.values()].find(
        (backend) => backend.connectionType === 'sqlite'
      );
      if (fallback) {
        router.setDefaultDataConnectionId(fallback.connectionId);
      } else {
        const first = router.byConnectionId.values().next().value;
        if (first) {
          router.setDefaultDataConnectionId(first.connectionId);
        }
      }
    }

    return router;
  }

  private static resolveDefaultConnectionId(
    preferredConnectionId: string,
    connections: DatabaseConnection[]
  ): string {
    const preferred = connections.find((conn) => conn.id === preferredConnectionId);
    if (preferred) {
      return preferredConnectionId;
    }

    const sqlite = connections.find((conn) => conn.type === 'sqlite');
    if (sqlite) {
      return sqlite.id;
    }

    return connections[0]?.id ?? preferredConnectionId;
  }

  private buildCollection(
    entry: CollectionRegistryEntry,
    record: Collection | undefined
  ): Collection {
    return {
      id: entry.id,
      name: entry.name,
      variables: record?.variables ?? [],
      headers: record?.headers ?? [],
      pre_request_script: record?.pre_request_script ?? '',
      post_request_script: record?.post_request_script ?? '',
      created_at: record?.created_at ?? entry.created_at,
      connectionId: entry.connectionId
    };
  }

  private toGlobalRequest(
    request: SavedRequest,
    backend: MountedBackend,
    globalCollectionId: number
  ): SavedRequest {
    return {
      ...request,
      id: encodeGlobalId(backend.slot, request.id),
      collection_id: globalCollectionId
    };
  }

  private resolveDefaultDataBackend(): MountedBackend {
    if (this.byConnectionId.has(this.defaultDataConnectionId)) {
      return this.requireBackendByConnectionId(this.defaultDataConnectionId);
    }

    const sqlite = [...this.byConnectionId.values()].find(
      (backend) => backend.connectionType === 'sqlite'
    );
    if (sqlite) return sqlite;

    const first = this.byConnectionId.values().next().value;
    if (!first) {
      throw new Error('No database provider is available.');
    }
    return first;
  }

  private requireDefaultDataBackend(): MountedBackend {
    const backend = this.byConnectionId.get(this.defaultDataConnectionId);
    if (!backend) {
      throw new Error('Default database provider is unavailable.');
    }
    return backend;
  }

  private requireBackendByConnectionId(connectionId: string): MountedBackend {
    const backend = this.byConnectionId.get(connectionId);
    if (!backend) {
      throw new Error(`Database connection "${connectionId}" is unavailable.`);
    }
    return backend;
  }

  private requireEntry(id: number): CollectionRegistryEntry {
    const entry = this.registry.getRegistryEntry(id);
    if (!entry) {
      throw new Error(`Collection not found: ${id}`);
    }
    return entry;
  }
}
