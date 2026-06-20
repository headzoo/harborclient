import { createPrivateKey, sign } from 'crypto';
import type { DatabaseConnection, DatabaseProvider } from '#/shared/types';

const INVITE_TOKEN_VERSION = 1;

/**
 * Collection metadata embedded in an invite so the recipient can register it
 * in their local collection registry (the authoritative collection list).
 */
export interface InviteCollectionMeta {
  /**
   * Display name for the shared collection.
   */
  name: string;

  /**
   * Id of the collection within the provider's own store.
   */
  providerCollectionId: number;
}

interface InviteTokenPayload {
  v: number;
  iat: number;
  conn: DatabaseConnection;
  collection: InviteCollectionMeta;
}

/**
 * Decoded invite contents: the shared connection plus the collection mapping.
 */
export interface DecodedInvite {
  connection: DatabaseConnection;
  collection: InviteCollectionMeta;
}

/**
 * Encodes a string as base64url without padding.
 *
 * @param value - UTF-8 string to encode.
 */
function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a base64url string to UTF-8.
 *
 * @param value - Base64url-encoded string.
 */
function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const normalized = padded + '='.repeat(padLength);
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

/**
 * Returns true when value is a supported database provider.
 *
 * @param value - Raw provider from decoded payload.
 */
function isDatabaseProvider(value: unknown): value is DatabaseProvider {
  return value === 'sqlite' || value === 'firestore' || value === 'mysql' || value === 'postgres';
}

/**
 * Validates and normalizes a decoded invite token payload.
 *
 * @param raw - Parsed JSON payload.
 */
function parseInvitePayload(raw: unknown): InviteTokenPayload {
  if (typeof raw !== 'object' || raw == null) {
    throw new Error('Invalid invite token: malformed payload.');
  }

  const payload = raw as Partial<InviteTokenPayload>;
  if (payload.v !== INVITE_TOKEN_VERSION) {
    throw new Error('Invalid invite token: unsupported version.');
  }

  const conn = payload.conn;
  if (typeof conn !== 'object' || conn == null) {
    throw new Error('Invalid invite token: missing connection.');
  }

  const connection = conn as Partial<DatabaseConnection>;
  if (typeof connection.name !== 'string' || !isDatabaseProvider(connection.type)) {
    throw new Error('Invalid invite token: invalid connection.');
  }

  if (typeof connection.settings !== 'object' || connection.settings == null) {
    throw new Error('Invalid invite token: invalid connection settings.');
  }

  const collection = payload.collection;
  if (typeof collection !== 'object' || collection == null) {
    throw new Error('Invalid invite token: missing collection.');
  }

  const collectionMeta = collection as Partial<InviteCollectionMeta>;
  if (
    typeof collectionMeta.name !== 'string' ||
    typeof collectionMeta.providerCollectionId !== 'number'
  ) {
    throw new Error('Invalid invite token: invalid collection metadata.');
  }

  return {
    v: INVITE_TOKEN_VERSION,
    iat: typeof payload.iat === 'number' ? payload.iat : Date.now(),
    conn: {
      id: typeof connection.id === 'string' ? connection.id : '',
      name: connection.name,
      type: connection.type,
      settings: connection.settings
    } as DatabaseConnection,
    collection: {
      name: collectionMeta.name,
      providerCollectionId: collectionMeta.providerCollectionId
    }
  };
}

/**
 * Creates a signed JWT encoding a database connection and collection mapping for sharing.
 *
 * @param connection - Connection to embed in the token.
 * @param collection - Collection metadata (name and provider id) to embed.
 * @param privateKeyPem - PEM-encoded RSA private key.
 */
export function createInviteToken(
  connection: DatabaseConnection,
  collection: InviteCollectionMeta,
  privateKeyPem: string
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      v: INVITE_TOKEN_VERSION,
      iat: Date.now(),
      conn: connection,
      collection
    } satisfies InviteTokenPayload)
  );

  const signingInput = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', new TextEncoder().encode(signingInput), {
    key: createPrivateKey(privateKeyPem)
  })
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signature}`;
}

/**
 * Decodes an invite JWT payload into a connection and collection mapping.
 *
 * Signature verification is intentionally omitted; recipients trust the pasted token.
 *
 * @param token - JWT string from an invite.
 */
export function decodeInviteToken(token: string): DecodedInvite {
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid invite token: expected three JWT segments.');
  }

  const payloadJson = base64UrlDecode(parts[1]);
  const parsed = JSON.parse(payloadJson) as unknown;
  const payload = parseInvitePayload(parsed);
  return { connection: payload.conn, collection: payload.collection };
}
