import { hasUnsafeHeaderFieldChars } from '#/shared/httpHeaders';

/**
 * Authorization type for the Auth tab; none inherits collection auth at send time.
 */
export type AuthType = 'none' | 'basic' | 'bearer' | 'oauth2';

/**
 * How OAuth client credentials are sent to the token endpoint.
 */
export type OAuth2ClientAuth = 'body' | 'header';

/**
 * OAuth 2.0 Client Credentials configuration stored on requests and collections.
 */
export interface OAuth2Config {
  /**
   * Token endpoint URL.
   */
  tokenUrl: string;

  /**
   * OAuth client id.
   */
  clientId: string;

  /**
   * OAuth client secret.
   */
  clientSecret: string;

  /**
   * Space-delimited OAuth scopes.
   */
  scope: string;

  /**
   * Optional audience claim for token requests.
   */
  audience: string;

  /**
   * Whether client credentials are sent in the POST body or as HTTP Basic auth.
   */
  clientAuth: OAuth2ClientAuth;
}

/**
 * Basic and bearer credential fields stored together so switching type preserves values.
 */
export interface AuthConfig {
  /**
   * Selected auth mode; none means no request-level override.
   */
  type: AuthType;

  /**
   * Username and password for Basic Auth.
   */
  basic: {
    username: string;
    password: string;
  };

  /**
   * Token value for Bearer Token auth.
   */
  bearer: {
    token: string;
  };

  /**
   * OAuth 2.0 Client Credentials settings.
   */
  oauth2: OAuth2Config;
}

/**
 * Result of fetching or refreshing an OAuth 2.0 access token.
 */
export interface OAuthFetchTokenResult {
  /**
   * Access token returned by the authorization server.
   */
  accessToken: string;

  /**
   * ISO 8601 expiry timestamp when known.
   */
  expiresAt?: string;

  /**
   * Token type from the token response, typically Bearer.
   */
  tokenType: string;
}

/**
 * Returns a default auth config with type none and empty credentials.
 *
 * @returns Empty AuthConfig safe for new requests and collections.
 */
export function defaultAuth(): AuthConfig {
  return {
    type: 'none',
    basic: { username: '', password: '' },
    bearer: { token: '' },
    oauth2: defaultOAuth2Config()
  };
}

/**
 * Returns empty OAuth 2.0 Client Credentials fields.
 *
 * @returns Default OAuth2Config for new auth configs.
 */
export function defaultOAuth2Config(): OAuth2Config {
  return {
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    audience: '',
    clientAuth: 'body'
  };
}

/**
 * JSON string of {@link defaultAuth} for database column defaults.
 */
export const DEFAULT_AUTH_JSON = JSON.stringify(defaultAuth());

/**
 * Builds a stable cache key for OAuth token storage.
 *
 * @param scope - Whether the auth config belongs to a saved request or collection.
 * @param id - Saved entity id.
 * @returns Cache key used by the main-process token store.
 */
export function buildOAuthCacheKey(scope: 'request' | 'collection', id: number): string {
  return `${scope}:${id}`;
}

/**
 * Normalizes a partial or legacy auth value from storage into a full AuthConfig.
 *
 * @param value - Parsed JSON or unknown field from the database.
 * @returns Valid AuthConfig with defaults for missing fields.
 */
export function normalizeAuth(value: unknown): AuthConfig {
  const fallback = defaultAuth();
  if (value == null || typeof value !== 'object') {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const type =
    record.type === 'basic' ||
    record.type === 'bearer' ||
    record.type === 'oauth2' ||
    record.type === 'none'
      ? record.type
      : fallback.type;

  const basicRecord =
    record.basic != null && typeof record.basic === 'object'
      ? (record.basic as Record<string, unknown>)
      : {};
  const bearerRecord =
    record.bearer != null && typeof record.bearer === 'object'
      ? (record.bearer as Record<string, unknown>)
      : {};
  const oauth2Record =
    record.oauth2 != null && typeof record.oauth2 === 'object'
      ? (record.oauth2 as Record<string, unknown>)
      : {};

  return {
    type,
    basic: {
      username: typeof basicRecord.username === 'string' ? basicRecord.username : '',
      password: typeof basicRecord.password === 'string' ? basicRecord.password : ''
    },
    bearer: {
      token: typeof bearerRecord.token === 'string' ? bearerRecord.token : ''
    },
    oauth2: {
      tokenUrl: typeof oauth2Record.tokenUrl === 'string' ? oauth2Record.tokenUrl : '',
      clientId: typeof oauth2Record.clientId === 'string' ? oauth2Record.clientId : '',
      clientSecret: typeof oauth2Record.clientSecret === 'string' ? oauth2Record.clientSecret : '',
      scope: typeof oauth2Record.scope === 'string' ? oauth2Record.scope : '',
      audience: typeof oauth2Record.audience === 'string' ? oauth2Record.audience : '',
      clientAuth: oauth2Record.clientAuth === 'header' ? 'header' : 'body'
    }
  };
}

/**
 * Encodes username and password as a UTF-8-safe Basic Auth credential string.
 *
 * @param username - Basic Auth username (already variable-resolved at send time).
 * @param password - Basic Auth password (already variable-resolved at send time).
 * @returns Base64-encoded `username:password` suitable for the Authorization header.
 */
export function encodeBasicAuth(username: string, password: string): string {
  const credential = `${username}:${password}`;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(credential, 'utf-8').toString('base64');
  }

  const bytes = new TextEncoder().encode(credential);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

/**
 * Builds the Authorization header value from an auth config.
 *
 * Assumes credential strings are already variable-resolved. Returns null when
 * type is none or required fields are empty after trimming. OAuth 2.0 tokens
 * are fetched separately in the main process and are not handled here.
 *
 * @param auth - Auth configuration from the request or collection.
 * @returns Header value such as `Basic …` or `Bearer …`, or null when auth is inactive.
 */
export function buildAuthHeaderValue(auth: AuthConfig): string | null {
  if (auth.type === 'none' || auth.type === 'oauth2') {
    return null;
  }

  if (auth.type === 'basic') {
    const username = auth.basic.username.trim();
    const password = auth.basic.password;
    if (!username && !password.trim()) {
      return null;
    }
    return `Basic ${encodeBasicAuth(username, password)}`;
  }

  const token = auth.bearer.token.trim();
  if (!token || hasUnsafeHeaderFieldChars(token)) {
    return null;
  }
  return `Bearer ${token}`;
}

/**
 * Builds an Authorization header value from a fetched OAuth access token.
 *
 * @param result - Token fetch result from the main process.
 * @returns Header value such as `Bearer …`, or null when the token is unsafe or empty.
 */
export function buildOAuthAuthHeaderValue(result: OAuthFetchTokenResult): string | null {
  const token = result.accessToken.trim();
  if (!token || hasUnsafeHeaderFieldChars(token)) {
    return null;
  }

  const tokenType = result.tokenType.trim() || 'Bearer';
  return `${tokenType} ${token}`;
}

/**
 * Resolves {{variable}} placeholders in auth credential fields using a lookup map.
 *
 * @param auth - Auth config with raw editor values.
 * @param substitute - Function that resolves placeholders in a string.
 * @returns Auth config with substituted credential fields.
 */
export function resolveAuthVariables(
  auth: AuthConfig,
  substitute: (text: string) => string
): AuthConfig {
  return {
    ...auth,
    basic: {
      username: substitute(auth.basic.username),
      password: substitute(auth.basic.password)
    },
    bearer: {
      token: substitute(auth.bearer.token)
    },
    oauth2: {
      tokenUrl: substitute(auth.oauth2.tokenUrl),
      clientId: substitute(auth.oauth2.clientId),
      clientSecret: substitute(auth.oauth2.clientSecret),
      scope: substitute(auth.oauth2.scope),
      audience: substitute(auth.oauth2.audience),
      clientAuth: auth.oauth2.clientAuth
    }
  };
}
