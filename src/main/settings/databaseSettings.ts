import Store from 'electron-store';
import type {
  DatabaseProvider,
  FirestoreSettings,
  MySqlSettings,
  PostgresSettings
} from '#/shared/types';

const DEFAULT_FIRESTORE_SETTINGS: FirestoreSettings = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
  email: '',
  password: ''
};

const DEFAULT_MYSQL_SETTINGS: MySqlSettings = {
  host: '127.0.0.1',
  port: 3306,
  user: '',
  password: '',
  database: ''
};

const DEFAULT_POSTGRES_SETTINGS: PostgresSettings = {
  host: '127.0.0.1',
  port: 5432,
  user: '',
  password: '',
  database: ''
};

type SettingsStore = {
  provider: DatabaseProvider;
  firestore: FirestoreSettings;
  mysql: MySqlSettings;
  postgres: PostgresSettings;
};

let store: Store<SettingsStore> | null = null;

/**
 * Returns the lazy electron-store instance for database provider settings.
 */
function getStore(): Store<SettingsStore> {
  if (!store) {
    store = new Store<SettingsStore>({
      name: 'settings',
      defaults: {
        provider: 'sqlite',
        firestore: DEFAULT_FIRESTORE_SETTINGS,
        mysql: DEFAULT_MYSQL_SETTINGS,
        postgres: DEFAULT_POSTGRES_SETTINGS
      }
    });
  }
  return store;
}

/**
 * Normalizes Firestore settings with trimmed fields.
 *
 * @param input - Raw settings from storage or user input.
 * @returns Normalized settings.
 */
function normalizeFirestoreSettings(input: Partial<FirestoreSettings>): FirestoreSettings {
  return {
    apiKey: input.apiKey?.trim() ?? '',
    authDomain: input.authDomain?.trim() ?? '',
    projectId: input.projectId?.trim() ?? '',
    appId: input.appId?.trim() ?? '',
    email: input.email?.trim() ?? '',
    password: input.password ?? ''
  };
}

/**
 * Normalizes MySQL settings with trimmed fields and a valid port.
 *
 * @param input - Raw settings from storage or user input.
 * @returns Normalized settings.
 */
function normalizeMySqlSettings(input: Partial<MySqlSettings>): MySqlSettings {
  const port = Number(input.port);
  return {
    host: input.host?.trim() ?? DEFAULT_MYSQL_SETTINGS.host,
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_MYSQL_SETTINGS.port,
    user: input.user?.trim() ?? '',
    password: input.password ?? '',
    database: input.database?.trim() ?? ''
  };
}

/**
 * Normalizes PostgreSQL settings with trimmed fields and a valid port.
 *
 * @param input - Raw settings from storage or user input.
 * @returns Normalized settings.
 */
function normalizePostgresSettings(input: Partial<PostgresSettings>): PostgresSettings {
  const port = Number(input.port);
  return {
    host: input.host?.trim() ?? DEFAULT_POSTGRES_SETTINGS.host,
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_POSTGRES_SETTINGS.port,
    user: input.user?.trim() ?? '',
    password: input.password ?? '',
    database: input.database?.trim() ?? ''
  };
}

/**
 * Reads the persisted database provider.
 *
 * @returns Active database provider, defaulting to sqlite.
 */
export function getDatabaseProvider(): DatabaseProvider {
  const provider = getStore().get('provider', 'sqlite');
  if (provider === 'firestore') return 'firestore';
  if (provider === 'mysql') return 'mysql';
  if (provider === 'postgres') return 'postgres';
  return 'sqlite';
}

/**
 * Persists the database provider selection.
 *
 * @param provider - Provider to use on next launch.
 */
export function setDatabaseProvider(provider: DatabaseProvider): void {
  if (provider === 'firestore' || provider === 'mysql' || provider === 'postgres') {
    getStore().set('provider', provider);
    return;
  }
  getStore().set('provider', 'sqlite');
}

/**
 * Reads persisted Firestore connection settings.
 *
 * @returns Current Firestore settings.
 */
export function getFirestoreSettings(): FirestoreSettings {
  const stored = getStore().get('firestore', DEFAULT_FIRESTORE_SETTINGS);
  return normalizeFirestoreSettings(stored);
}

/**
 * Persists Firestore connection settings.
 *
 * @param input - Settings to store.
 */
export function setFirestoreSettings(input: FirestoreSettings): void {
  getStore().set('firestore', normalizeFirestoreSettings(input));
}

/**
 * Reads persisted MySQL connection settings.
 *
 * @returns Current MySQL settings.
 */
export function getMySqlSettings(): MySqlSettings {
  const stored = getStore().get('mysql', DEFAULT_MYSQL_SETTINGS);
  return normalizeMySqlSettings(stored);
}

/**
 * Persists MySQL connection settings.
 *
 * @param input - Settings to store.
 */
export function setMySqlSettings(input: MySqlSettings): void {
  getStore().set('mysql', normalizeMySqlSettings(input));
}

/**
 * Reads persisted PostgreSQL connection settings.
 *
 * @returns Current PostgreSQL settings.
 */
export function getPostgresSettings(): PostgresSettings {
  const stored = getStore().get('postgres', DEFAULT_POSTGRES_SETTINGS);
  return normalizePostgresSettings(stored);
}

/**
 * Persists PostgreSQL connection settings.
 *
 * @param input - Settings to store.
 */
export function setPostgresSettings(input: PostgresSettings): void {
  getStore().set('postgres', normalizePostgresSettings(input));
}
