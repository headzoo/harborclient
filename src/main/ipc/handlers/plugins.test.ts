import { describe, expect, it } from 'vitest';
import { Headers } from '#/main/http/Headers';
import { mergePluginHttpHeaders } from '#/main/ipc/handlers/plugins';

describe('mergePluginHttpHeaders', () => {
  it('disables enabled headers removed by a plugin hook', () => {
    const original = [{ key: 'Authorization', value: 'Bearer secret', enabled: true }];
    const mutated = {};

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers).toEqual([{ key: 'Authorization', value: 'Bearer secret', enabled: false }]);
    const built = new Headers().build(headers, 'none');
    expect(built).toEqual({ ok: true, headers: {} });
  });

  it('updates header values from the hook result', () => {
    const original = [{ key: 'X-Trace', value: '0', enabled: true }];
    const mutated = { 'X-Trace': '1' };

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers).toEqual([{ key: 'X-Trace', value: '1', enabled: true }]);
  });

  it('appends headers added by a plugin hook', () => {
    const original = [{ key: 'Accept', value: 'application/json', enabled: true }];
    const mutated = { Accept: 'application/json', 'X-Plugin-Trace': '1' };

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers).toEqual([
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'X-Plugin-Trace', value: '1', enabled: true }
    ]);
  });

  it('matches header keys case-insensitively when syncing deletions', () => {
    const original = [{ key: 'Authorization', value: 'Bearer secret', enabled: true }];
    const mutated = {};

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers[0]?.enabled).toBe(false);
  });

  it('leaves originally disabled headers unchanged when absent from the hook result', () => {
    const original = [{ key: 'X-Legacy', value: 'keep', enabled: false }];
    const mutated = {};

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers).toEqual([{ key: 'X-Legacy', value: 'keep', enabled: false }]);
  });

  it('appends a new enabled row when a plugin adds a header that exists disabled', () => {
    const original = [{ key: 'X-Custom', value: 'old', enabled: false }];
    const mutated = { 'X-Custom': 'new' };

    const headers = mergePluginHttpHeaders(original, mutated);

    expect(headers).toEqual([
      { key: 'X-Custom', value: 'old', enabled: false },
      { key: 'X-Custom', value: 'new', enabled: true }
    ]);
    const built = new Headers().build(headers, 'none');
    expect(built).toEqual({ ok: true, headers: { 'X-Custom': 'new' } });
  });
});
