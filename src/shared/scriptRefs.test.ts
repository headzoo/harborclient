import { describe, expect, it } from 'vitest';
import {
  createInlineScriptRef,
  createSnippetScriptRef,
  ensureDefaultScriptRef,
  mirrorLegacyScriptString,
  normalizeScriptRefs,
  readScriptRefsFromJson,
  resolveScriptRefs
} from '#/shared/scriptRefs';

describe('resolveScriptRefs', () => {
  it('falls back to a legacy inline script when arrays are empty', () => {
    const refs = resolveScriptRefs([], 'legacy code');
    expect(refs).toHaveLength(1);
    expect(refs[0]?.kind).toBe('inline');
    expect(refs[0]?.code).toBe('legacy code');
  });

  it('prefers canonical arrays over legacy strings', () => {
    const inline = createInlineScriptRef('array code');
    expect(resolveScriptRefs([inline], 'legacy code')).toEqual([inline]);
  });
});

describe('normalizeScriptRefs', () => {
  it('preserves expanded when set on script references', () => {
    const expanded = { ...createInlineScriptRef('code'), expanded: true };
    const collapsed = { ...createInlineScriptRef('other'), expanded: false };

    expect(normalizeScriptRefs([expanded, collapsed])).toEqual([
      expect.objectContaining({ expanded: true }),
      expect.objectContaining({ expanded: false })
    ]);
  });
});

describe('mirrorLegacyScriptString', () => {
  it('concatenates enabled inline scripts and ignores snippets', () => {
    const legacy = mirrorLegacyScriptString([
      createInlineScriptRef('first'),
      createSnippetScriptRef('snippet-1'),
      { ...createInlineScriptRef('second'), enabled: false },
      createInlineScriptRef('third')
    ]);

    expect(legacy).toBe('first\n\nthird');
  });
});

describe('readScriptRefsFromJson', () => {
  it('parses stored JSON arrays', () => {
    const inline = createInlineScriptRef('stored');
    expect(readScriptRefsFromJson(JSON.stringify([inline]), '')).toEqual([inline]);
  });
});

describe('ensureDefaultScriptRef', () => {
  it('returns existing scripts when the list is non-empty', () => {
    const inline = createInlineScriptRef('existing');
    expect(ensureDefaultScriptRef([inline])).toEqual([inline]);
  });

  it('creates a blank inline script when the list is empty', () => {
    const refs = ensureDefaultScriptRef([]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      enabled: true,
      kind: 'inline',
      code: '',
      expanded: true
    });
  });
});
