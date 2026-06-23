import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { countConflictFiles, toFileSlug, uuidSlugPrefix } from '#/main/git/slug';

describe('git slug helpers', () => {
  it('normalizes display names into filesystem slugs', () => {
    expect(toFileSlug('  My API Collection!  ')).toBe('my-api-collection');
    expect(toFileSlug('---')).toBe('untitled');
  });

  it('builds uuid-slug prefixes for directories and files', () => {
    const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(uuidSlugPrefix(uuid, 'Users API')).toBe(`${uuid}-users-api`);
  });

  it('counts json files containing merge conflict markers', () => {
    const root = mkdtempSync(join(tmpdir(), 'hc-git-conflicts-'));
    const nested = join(root, 'collections', 'api');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'clean.json'), '{"name":"ok"}', 'utf-8');
    writeFileSync(
      join(nested, 'conflict.json'),
      '<<<<<<< HEAD\n{"name":"ours"}\n=======\n{"name":"theirs"}\n>>>>>>> branch',
      'utf-8'
    );

    expect(countConflictFiles(root)).toBe(1);
    expect(existsSync(root)).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});
