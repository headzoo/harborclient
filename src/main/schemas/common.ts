import { z } from 'zod';
import type { AuthConfig, KeyValue, Variable } from '#/shared/types';

/**
 * Supported HTTP methods for saved and live requests.
 */
export const httpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Supported request body content types.
 */
export const bodyType = z.enum(['none', 'json', 'text', 'multipart', 'urlencoded']);

/**
 * Authorization type for the Auth tab.
 */
export const authType = z.enum(['none', 'basic', 'bearer', 'oauth2']);

/**
 * OAuth 2.0 Client Credentials settings for requests and collections.
 */
export const oauth2Config = z.object({
  tokenUrl: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  scope: z.string(),
  audience: z.string(),
  clientAuth: z.enum(['body', 'header'])
}) satisfies z.ZodType<AuthConfig['oauth2']>;

/**
 * Authorization settings for requests and collections.
 */
export const authConfig = z.object({
  type: authType,
  basic: z.object({
    username: z.string(),
    password: z.string()
  }),
  bearer: z.object({
    token: z.string()
  }),
  oauth2: oauth2Config
}) satisfies z.ZodType<AuthConfig>;

/**
 * Header or query parameter key-value row.
 */
export const keyValue = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean()
}) satisfies z.ZodType<KeyValue>;

/**
 * Collection or environment variable row.
 */
export const variable = z.object({
  key: z.string(),
  value: z.string(),
  defaultValue: z.string(),
  share: z.boolean()
}) satisfies z.ZodType<Variable>;
