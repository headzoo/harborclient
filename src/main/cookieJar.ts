import { getLocalRegistry } from '#/main/db/localRegistryInstance';
import type { KeyValue } from '#/shared/types';

const STORE_KEY = 'cookieJar';

/**
 * Parses a JSON string, returning a fallback value on failure.
 *
 * @param value - JSON string to parse.
 * @param fallback - Value returned when parsing fails or value is empty.
 */
function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Reads persisted cookies keyed by hostname.
 */
function getJarMap(): Record<string, KeyValue[]> {
  const stored = parseJson<Record<string, KeyValue[]>>(
    getLocalRegistry().getSetting(STORE_KEY),
    {}
  );
  if (!stored || typeof stored !== 'object') {
    return {};
  }
  return stored;
}

/**
 * Persists the cookie jar map to the local registry.
 *
 * @param jar - Domain to cookies map.
 */
function persistJarMap(jar: Record<string, KeyValue[]>): void {
  getLocalRegistry().setSetting(STORE_KEY, JSON.stringify(jar));
}

/**
 * Normalizes a hostname for cookie storage lookup.
 *
 * @param domain - Raw hostname or URL host.
 */
function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

/**
 * Filters out rows with both key and value empty.
 *
 * @param cookies - Cookie rows to normalize.
 */
function normalizeCookieRows(cookies: KeyValue[]): KeyValue[] {
  return cookies
    .filter((cookie) => cookie.key.trim() || cookie.value.trim())
    .map((cookie) => ({
      key: cookie.key.trim(),
      value: cookie.value,
      enabled: cookie.enabled !== false
    }));
}

/**
 * Extracts the hostname from a URL string.
 *
 * @param url - Absolute or relative URL.
 * @returns Hostname or null when parsing fails.
 */
export function hostFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).hostname || null;
  } catch {
    try {
      return new URL(`https://${trimmed}`).hostname || null;
    } catch {
      return null;
    }
  }
}

/**
 * Returns cookies stored for a hostname.
 *
 * @param domain - Hostname to query.
 */
export function getCookiesForDomain(domain: string): KeyValue[] {
  const normalized = normalizeDomain(domain);
  if (!normalized) return [];

  const cookies = getJarMap()[normalized];
  if (!Array.isArray(cookies)) return [];

  return cookies.map((cookie) => ({ ...cookie }));
}

/**
 * Persists cookies for a hostname.
 *
 * @param domain - Hostname to update.
 * @param cookies - Cookie rows to store.
 */
export function setCookiesForDomain(domain: string, cookies: KeyValue[]): void {
  const normalized = normalizeDomain(domain);
  if (!normalized) return;

  const jar = getJarMap();
  const normalizedCookies = normalizeCookieRows(cookies);

  if (normalizedCookies.length === 0) {
    if (normalized in jar) {
      delete jar[normalized];
      persistJarMap(jar);
    }
    return;
  }

  jar[normalized] = normalizedCookies;
  persistJarMap(jar);
}

/**
 * Builds a Cookie header value for enabled cookies on the request host.
 *
 * @param url - Request URL used to resolve the host.
 * @returns Semicolon-delimited cookie header value, or null when none apply.
 */
export function buildCookieHeader(url: string): string | null {
  const host = hostFromUrl(url);
  if (!host) return null;

  const cookies = getCookiesForDomain(host).filter((cookie) => cookie.enabled && cookie.key.trim());
  if (cookies.length === 0) return null;

  return cookies.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ');
}

/**
 * Parses the name and value from a Set-Cookie header value.
 *
 * @param header - Raw Set-Cookie header string.
 */
function parseSetCookieNameValue(header: string): { name: string; value: string } | null {
  const firstSegment = header.split(';')[0]?.trim();
  if (!firstSegment) return null;

  const separatorIndex = firstSegment.indexOf('=');
  if (separatorIndex <= 0) return null;

  const name = firstSegment.slice(0, separatorIndex).trim();
  if (!name) return null;

  return {
    name,
    value: firstSegment.slice(separatorIndex + 1)
  };
}

/**
 * Returns whether a Set-Cookie header indicates the cookie should be deleted.
 *
 * @param header - Raw Set-Cookie header string.
 */
function isSetCookieExpired(header: string): boolean {
  const attributes = header
    .split(';')
    .slice(1)
    .map((part) => part.trim());

  for (const attribute of attributes) {
    const [rawName, ...rawValueParts] = attribute.split('=');
    const name = rawName.trim().toLowerCase();
    const value = rawValueParts.join('=').trim();

    if (name === 'max-age') {
      const maxAge = Number(value);
      if (Number.isFinite(maxAge) && maxAge <= 0) {
        return true;
      }
    }

    if (name === 'expires') {
      const expiresAt = Date.parse(value);
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Upserts or removes cookies from the jar based on Set-Cookie response headers.
 *
 * @param url - Request URL used to resolve the host.
 * @param setCookieHeaders - Set-Cookie header values from the response.
 */
export function captureSetCookies(url: string, setCookieHeaders: string[] | undefined): void {
  if (!setCookieHeaders?.length) return;

  const host = hostFromUrl(url);
  if (!host) return;

  const cookies = getCookiesForDomain(host);
  const cookieMap = new Map(cookies.map((cookie) => [cookie.key, cookie]));

  for (const header of setCookieHeaders) {
    const parsed = parseSetCookieNameValue(header);
    if (!parsed) continue;

    if (isSetCookieExpired(header)) {
      cookieMap.delete(parsed.name);
      continue;
    }

    cookieMap.set(parsed.name, {
      key: parsed.name,
      value: parsed.value,
      enabled: true
    });
  }

  setCookiesForDomain(host, Array.from(cookieMap.values()));
}
