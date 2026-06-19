import { describe, expect, it } from 'vitest';
import {
  applyScriptRequestMutations,
  buildRuntimeVars,
  buildScriptSlots,
  mergeVariableSets,
  substituteWithMap
} from '#/renderer/src/store/scriptOrchestration';
import type { ScriptRunResult } from '#/shared/types';

describe('buildRuntimeVars', () => {
  it('resolves value and defaultValue', () => {
    expect(
      buildRuntimeVars([
        { key: 'host', value: 'api.example.com', defaultValue: 'localhost', share: false },
        { key: 'token', value: '', defaultValue: 'fallback', share: false }
      ])
    ).toEqual({
      host: 'api.example.com',
      token: 'fallback'
    });
  });
});

describe('substituteWithMap', () => {
  it('replaces known tokens', () => {
    expect(substituteWithMap('https://{{host}}/api', { host: 'example.com' })).toBe(
      'https://example.com/api'
    );
  });

  it('leaves unknown tokens unchanged', () => {
    expect(substituteWithMap('{{known}}/{{missing}}', { known: 'ok' })).toBe('ok/{{missing}}');
  });
});

describe('mergeVariableSets', () => {
  it('merges ephemeral sets over runtime vars', () => {
    expect(mergeVariableSets({ a: '1', b: '2' }, { b: 'updated', c: '3' })).toEqual({
      a: '1',
      b: 'updated',
      c: '3'
    });
  });
});

describe('applyScriptRequestMutations', () => {
  it('applies request mutations from script result', () => {
    const current = {
      method: 'GET' as const,
      url: 'https://old.example',
      headers: [{ key: 'X-Test', value: '1', enabled: true }],
      params: [{ key: 'q', value: 'search', enabled: true }],
      body: '',
      bodyType: 'none' as const
    };
    const result: ScriptRunResult = {
      request: {
        method: 'POST',
        url: 'https://new.example',
        headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        params: current.params,
        body: '{"ok":true}',
        bodyType: 'json'
      },
      variableSets: {},
      tests: [],
      logs: []
    };

    expect(applyScriptRequestMutations(current, result)).toEqual({
      method: 'POST',
      url: 'https://new.example',
      headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      params: [{ key: 'q', value: 'search', enabled: true }],
      body: '{"ok":true}',
      bodyType: 'none'
    });
  });
});

describe('buildScriptSlots', () => {
  it('returns collection then request pre scripts', () => {
    expect(
      buildScriptSlots('collection pre', '', 'request pre', '', 'pre').map((slot) => slot.label)
    ).toEqual(['Collection pre-request', 'Request pre-request']);
  });

  it('returns collection then request post scripts', () => {
    expect(
      buildScriptSlots('', 'collection post', '', 'request post', 'post').map((slot) => slot.label)
    ).toEqual(['Collection post-request', 'Request post-request']);
  });

  it('filters empty scripts', () => {
    expect(buildScriptSlots('', '', 'request pre', '', 'pre')).toHaveLength(1);
  });
});

describe('script substitution chain', () => {
  it('uses updated runtime vars for later scripts', () => {
    let runtimeVars = buildRuntimeVars([
      { key: 'token', value: '', defaultValue: 'initial', share: false }
    ]);
    runtimeVars = mergeVariableSets(runtimeVars, { token: 'updated' });

    const scriptSource = 'const t = "{{token}}";';
    expect(substituteWithMap(scriptSource, runtimeVars)).toBe('const t = "updated";');
  });
});
