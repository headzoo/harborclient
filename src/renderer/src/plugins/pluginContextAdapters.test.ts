import { describe, expect, it } from 'vitest';
import { defaultAuth } from '#/shared/auth';
import type { Collection } from '#/shared/types';
import type { RequestDraft } from '#/renderer/src/store/drafts';
import {
  toPluginRequestDraft,
  toPluginRequestTabContext
} from '#/renderer/src/plugins/pluginContextAdapters';

/**
 * Returns a minimal store draft for adapter tests.
 */
function sampleDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    name: 'Sample',
    method: 'POST',
    url: 'https://example.com',
    headers: [{ key: 'X-Custom', value: '1', enabled: true }],
    params: [{ key: 'q', value: 'test', enabled: true }],
    auth: {
      type: 'bearer',
      basic: { username: '', password: '' },
      bearer: { token: 'draft-token' }
    },
    body: '{"ok":true}',
    body_type: 'json',
    pre_request_script: '',
    post_request_script: '',
    comment: '',
    ...overrides
  };
}

/**
 * Returns a minimal collection for adapter tests.
 */
function sampleCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 1,
    uuid: '00000000-0000-0000-0000-000000000001',
    name: 'API',
    headers: [{ key: 'X-Collection', value: 'yes', enabled: true }],
    variables: [],
    auth: {
      type: 'basic',
      basic: { username: 'alice', password: 'secret' },
      bearer: { token: '' }
    },
    pre_request_script: '',
    post_request_script: '',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('toPluginRequestDraft', () => {
  it('maps auth and body_type from the store draft', () => {
    const draft = sampleDraft();
    expect(toPluginRequestDraft(draft)).toMatchObject({
      method: 'POST',
      url: 'https://example.com',
      auth: draft.auth,
      body_type: 'json'
    });
  });
});

describe('toPluginRequestTabContext', () => {
  it('includes collection auth and headers with normalized defaults', () => {
    const context = toPluginRequestTabContext(sampleDraft(), sampleCollection(), null);

    expect(context.readOnly).toBe(true);
    expect(context.response).toBeNull();
    expect(context.draft.auth.type).toBe('bearer');
    expect(context.collectionAuth.type).toBe('basic');
    expect(context.collectionHeaders).toEqual([
      { key: 'X-Collection', value: 'yes', enabled: true }
    ]);
  });

  it('uses default auth and empty headers when collection is undefined', () => {
    const context = toPluginRequestTabContext(sampleDraft(), undefined, null);

    expect(context.collectionAuth).toEqual(defaultAuth());
    expect(context.collectionHeaders).toEqual([]);
  });
});
