import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalRegistry } from '#/main/db/LocalRegistry';
import {
  clearLocalRegistryForTesting,
  setLocalRegistryForTesting
} from '#/main/db/localRegistryInstance';
import type { KeyValue } from '#/shared/types';

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

let tempDir: string;
let registry: LocalRegistry;
let cookieJar: typeof import('#/main/cookieJar');

/**
 * Sets up an isolated local registry for cookie jar tests.
 */
async function setupCookieJarTest(): Promise<void> {
  vi.resetModules();
  tempDir = mkdtempSync(join(tmpdir(), 'hc-cookie-test-'));
  registry = new LocalRegistry(tempDir);
  await registry.init();
  setLocalRegistryForTesting(registry);
  cookieJar = await import('#/main/cookieJar');
}

describeSqlite('hostFromUrl', () => {
  beforeEach(async () => {
    await setupCookieJarTest();
  });

  afterEach(async () => {
    await registry.close();
    rmSync(tempDir, { recursive: true, force: true });
    clearLocalRegistryForTesting();
  });

  it('returns null for empty or whitespace URLs', () => {
    expect(cookieJar.hostFromUrl('')).toBeNull();
    expect(cookieJar.hostFromUrl('   ')).toBeNull();
  });

  it('extracts hostname from absolute URLs', () => {
    expect(cookieJar.hostFromUrl('https://Example.com/path?q=1')).toBe('example.com');
    expect(cookieJar.hostFromUrl('http://api.test.local:8080/')).toBe('api.test.local');
  });

  it('parses host-only values with an https fallback', () => {
    expect(cookieJar.hostFromUrl('example.com')).toBe('example.com');
    expect(cookieJar.hostFromUrl('example.com/path')).toBe('example.com');
  });

  it('returns null for invalid URLs', () => {
    expect(cookieJar.hostFromUrl('://bad')).toBeNull();
  });
});

describeSqlite('getCookiesForDomain and setCookiesForDomain', () => {
  beforeEach(async () => {
    await setupCookieJarTest();
  });

  afterEach(async () => {
    await registry.close();
    rmSync(tempDir, { recursive: true, force: true });
    clearLocalRegistryForTesting();
  });

  it('returns an empty list for unknown domains', () => {
    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([]);
  });

  it('round-trips cookies for a domain', () => {
    const cookies: KeyValue[] = [
      { key: 'session', value: 'abc123', enabled: true },
      { key: 'theme', value: 'dark', enabled: false }
    ];

    cookieJar.setCookiesForDomain('example.com', cookies);
    expect(cookieJar.getCookiesForDomain('example.com')).toEqual(cookies);
  });

  it('normalizes domain casing and whitespace', () => {
    cookieJar.setCookiesForDomain(' Example.COM ', [{ key: 'token', value: 'xyz', enabled: true }]);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'token', value: 'xyz', enabled: true }
    ]);
  });

  it('filters fully empty rows and trims cookie names', () => {
    cookieJar.setCookiesForDomain('example.com', [
      { key: ' session ', value: 'abc', enabled: true },
      { key: '', value: '', enabled: true },
      { key: ' ', value: 'kept', enabled: true }
    ]);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'session', value: 'abc', enabled: true },
      { key: '', value: 'kept', enabled: true }
    ]);
  });

  it('removes the domain entry when all rows are empty', () => {
    cookieJar.setCookiesForDomain('example.com', [{ key: 'session', value: 'abc', enabled: true }]);
    cookieJar.setCookiesForDomain('example.com', [{ key: '', value: '', enabled: true }]);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([]);
    expect(registry.getSetting('cookieJar')).toBe('{}');
  });

  it('returns defensive copies that do not mutate stored cookies', () => {
    cookieJar.setCookiesForDomain('example.com', [{ key: 'session', value: 'abc', enabled: true }]);

    const cookies = cookieJar.getCookiesForDomain('example.com');
    cookies[0].value = 'mutated';

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'session', value: 'abc', enabled: true }
    ]);
  });
});

describeSqlite('buildCookieHeader', () => {
  beforeEach(async () => {
    await setupCookieJarTest();
  });

  afterEach(async () => {
    await registry.close();
    rmSync(tempDir, { recursive: true, force: true });
    clearLocalRegistryForTesting();
  });

  it('returns null when the URL has no host', () => {
    expect(cookieJar.buildCookieHeader('')).toBeNull();
  });

  it('returns null when no enabled cookies exist for the host', () => {
    cookieJar.setCookiesForDomain('example.com', [
      { key: 'session', value: 'abc', enabled: false }
    ]);

    expect(cookieJar.buildCookieHeader('https://example.com/')).toBeNull();
  });

  it('joins enabled cookies into a Cookie header value', () => {
    cookieJar.setCookiesForDomain('example.com', [
      { key: 'session', value: 'abc', enabled: true },
      { key: 'theme', value: 'dark', enabled: false },
      { key: 'lang', value: 'en', enabled: true }
    ]);

    expect(cookieJar.buildCookieHeader('https://example.com/api')).toBe('session=abc; lang=en');
  });
});

describeSqlite('captureSetCookies', () => {
  beforeEach(async () => {
    await setupCookieJarTest();
  });

  afterEach(async () => {
    await registry.close();
    rmSync(tempDir, { recursive: true, force: true });
    clearLocalRegistryForTesting();
    vi.useRealTimers();
  });

  it('does nothing when headers are missing or empty', () => {
    cookieJar.captureSetCookies('https://example.com/', undefined);
    cookieJar.captureSetCookies('https://example.com/', []);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([]);
  });

  it('upserts cookies from Set-Cookie headers', () => {
    cookieJar.captureSetCookies('https://example.com/login', [
      'session=abc123; Path=/; HttpOnly',
      'theme=dark; Path=/'
    ]);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'session', value: 'abc123', enabled: true },
      { key: 'theme', value: 'dark', enabled: true }
    ]);
  });

  it('updates an existing cookie with the same name', () => {
    cookieJar.setCookiesForDomain('example.com', [{ key: 'session', value: 'old', enabled: true }]);

    cookieJar.captureSetCookies('https://example.com/refresh', ['session=new; Path=/']);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'session', value: 'new', enabled: true }
    ]);
  });

  it('deletes cookies when Max-Age is zero', () => {
    cookieJar.setCookiesForDomain('example.com', [
      { key: 'session', value: 'abc', enabled: true },
      { key: 'theme', value: 'dark', enabled: true }
    ]);

    cookieJar.captureSetCookies('https://example.com/logout', ['session=; Max-Age=0; Path=/']);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([
      { key: 'theme', value: 'dark', enabled: true }
    ]);
  });

  it('deletes cookies when Expires is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'));

    cookieJar.setCookiesForDomain('example.com', [{ key: 'session', value: 'abc', enabled: true }]);

    cookieJar.captureSetCookies('https://example.com/logout', [
      'session=; Expires=Wed, 01 Jan 2020 00:00:00 GMT; Path=/'
    ]);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([]);
  });

  it('ignores malformed Set-Cookie headers', () => {
    cookieJar.captureSetCookies('https://example.com/', ['invalid-header', '=missing-name']);

    expect(cookieJar.getCookiesForDomain('example.com')).toEqual([]);
  });

  it('does nothing when the URL has no host', () => {
    cookieJar.captureSetCookies('', ['session=abc']);

    expect(registry.getSetting('cookieJar')).toBeUndefined();
  });
});
