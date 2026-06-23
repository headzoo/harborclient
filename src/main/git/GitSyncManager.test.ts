import * as git from 'isomorphic-git';
import fs from 'fs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { GitSyncManager } from '#/main/git/GitSyncManager';
import type { GitSettings } from '#/shared/types';

const cleanups: Array<() => void> = [];

/**
 * Writes a remote-tracking ref under refs/remotes/origin/.
 *
 * @param repoPath - Repository root path.
 * @param branch - Branch name (for example `main`).
 * @param oid - Commit oid the ref should point to.
 */
function writeOriginRef(repoPath: string, branch: string, oid: string): void {
  const refDir = join(repoPath, '.git', 'refs', 'remotes', 'origin');
  mkdirSync(refDir, { recursive: true });
  writeFileSync(join(refDir, branch), `${oid}\n`);
}

/**
 * Creates a temporary git repository with an initial commit on main.
 */
async function createTestRepo(): Promise<{ repoPath: string; manager: GitSyncManager }> {
  const repoPath = mkdtempSync(join(tmpdir(), 'harborclient-sync-'));
  mkdirSync(join(repoPath, '.harborclient'), { recursive: true });

  await git.init({ fs, dir: repoPath, defaultBranch: 'main' });
  await git.setConfig({ fs, dir: repoPath, path: 'user.name', value: 'Test' });
  await git.setConfig({ fs, dir: repoPath, path: 'user.email', value: 'test@example.com' });

  writeFileSync(join(repoPath, '.harborclient', 'readme.txt'), 'v1');
  await git.add({ fs, dir: repoPath, filepath: '.harborclient/readme.txt' });
  await git.commit({
    fs,
    dir: repoPath,
    message: 'Initial',
    author: { name: 'Test', email: 'test@example.com' }
  });

  const settings: GitSettings = {
    repoPath,
    url: 'https://github.com/example/repo.git',
    branch: 'main',
    subdir: '.harborclient',
    auth: { kind: 'pat', username: 'token' }
  };

  cleanups.push(() => rmSync(repoPath, { recursive: true, force: true }));

  return { repoPath, manager: new GitSyncManager('test-connection', settings) };
}

describe('GitSyncManager', () => {
  afterEach(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  });

  it('returns zero ahead/behind when local matches origin ref', async () => {
    const { repoPath, manager } = await createTestRepo();
    const head = await git.resolveRef({ fs, dir: repoPath, ref: 'HEAD' });
    writeOriginRef(repoPath, 'main', head);

    const status = await manager.getStatus();
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(0);
  });

  it('counts commits ahead of origin/main', async () => {
    const { repoPath, manager } = await createTestRepo();
    const initialHead = await git.resolveRef({ fs, dir: repoPath, ref: 'HEAD' });
    writeOriginRef(repoPath, 'main', initialHead);

    writeFileSync(join(repoPath, '.harborclient', 'readme.txt'), 'v2');
    await git.add({ fs, dir: repoPath, filepath: '.harborclient/readme.txt' });
    await git.commit({
      fs,
      dir: repoPath,
      message: 'Second',
      author: { name: 'Test', email: 'test@example.com' }
    });

    const status = await manager.getStatus();
    expect(status.ahead).toBe(1);
    expect(status.behind).toBe(0);
  });

  it('counts commits behind origin/main', async () => {
    const { repoPath, manager } = await createTestRepo();
    const initialHead = await git.resolveRef({ fs, dir: repoPath, ref: 'HEAD' });

    writeFileSync(join(repoPath, '.harborclient', 'readme.txt'), 'v2');
    await git.add({ fs, dir: repoPath, filepath: '.harborclient/readme.txt' });
    await git.commit({
      fs,
      dir: repoPath,
      message: 'Second',
      author: { name: 'Test', email: 'test@example.com' }
    });
    const remoteHead = await git.resolveRef({ fs, dir: repoPath, ref: 'HEAD' });

    writeOriginRef(repoPath, 'main', remoteHead);
    writeFileSync(join(repoPath, '.git', 'refs', 'heads', 'main'), `${initialHead}\n`);
    await git.checkout({ fs, dir: repoPath, ref: 'main' });

    const status = await manager.getStatus();
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(1);
  });
});
