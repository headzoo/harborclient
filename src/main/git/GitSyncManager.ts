import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import { join } from 'path';
import { buildGitOnAuth } from '#/main/git/gitAuth';
import { resolveHarborclientRoot } from '#/main/git/fileLayout';
import { countConflictFiles } from '#/main/git/slug';
import type { GitLogEntry, GitSettings, SourceControlStatus } from '#/shared/types';

/**
 * Git operations for a single linked repository working tree.
 */
export class GitSyncManager {
  readonly #repoPath: string;
  readonly #settings: GitSettings;
  readonly #connectionId: string;

  /**
   * @param connectionId - Git connection id for auth resolution.
   * @param settings - Git connection settings including repo path and remote url.
   */
  constructor(connectionId: string, settings: GitSettings) {
    this.#connectionId = connectionId;
    this.#settings = settings;
    this.#repoPath = settings.repoPath;
  }

  /**
   * Absolute repository root used as isomorphic-git dir.
   */
  get repoDir(): string {
    return this.#repoPath;
  }

  /**
   * Returns local source-control status without network access.
   */
  async getStatus(): Promise<SourceControlStatus> {
    const matrix = await git.statusMatrix({ fs, dir: this.#repoPath, filepaths: ['.'] });
    let changedCount = 0;
    for (const row of matrix) {
      const [, head, workdir, stage] = row;
      if (head !== workdir || head !== stage || workdir !== stage) {
        changedCount += 1;
      }
    }

    const branch = await this.currentBranch();
    const ahead = 0;
    const behind = 0;

    if (branch) {
      try {
        await git.resolveRef({ fs, dir: this.#repoPath, ref: 'HEAD' });
        await git.resolveRef({
          fs,
          dir: this.#repoPath,
          ref: `refs/remotes/origin/${branch}`
        });
      } catch {
        // Upstream may not exist yet for new repos.
      }
    }

    const status = {
      changedCount,
      branch,
      ahead,
      behind,
      conflictCount: countConflictFiles(
        resolveHarborclientRoot(this.#repoPath, this.#settings.subdir)
      )
    };
    return status;
  }

  /**
   * Stages all changes under the HarborClient subdirectory and commits.
   *
   * @param message - Commit message.
   */
  async commit(message: string): Promise<void> {
    const subdir = this.#settings.subdir.trim() || '.harborclient';
    await this.stagePath(subdir);

    const trimmed = message.trim();
    if (!trimmed) {
      throw new Error('Commit message is required.');
    }

    await git.commit({
      fs,
      dir: this.#repoPath,
      message: trimmed,
      author: await this.resolveAuthor()
    });
  }

  /**
   * Fetches from the configured remote over HTTPS.
   */
  async fetch(): Promise<void> {
    await git.fetch({
      fs,
      http,
      dir: this.#repoPath,
      url: this.#settings.url,
      ref: this.#settings.branch,
      singleBranch: true,
      onAuth: buildGitOnAuth(this.#connectionId)
    });
  }

  /**
   * Pulls (fetch + merge) from the configured remote.
   */
  async pull(): Promise<void> {
    await this.fetch();
    const branch = await git.currentBranch({ fs, dir: this.#repoPath });
    if (!branch) {
      throw new Error('Cannot pull: repository is not on a branch.');
    }
    await git.merge({
      fs,
      dir: this.#repoPath,
      ours: branch,
      theirs: `origin/${this.#settings.branch}`
    });
  }

  /**
   * Pushes commits to the configured remote.
   */
  async push(): Promise<void> {
    await git.push({
      fs,
      http,
      dir: this.#repoPath,
      url: this.#settings.url,
      ref: this.#settings.branch,
      onAuth: buildGitOnAuth(this.#connectionId)
    });
  }

  /**
   * Returns recent commit log entries.
   *
   * @param depth - Maximum number of commits.
   */
  async log(depth = 20): Promise<GitLogEntry[]> {
    const commits = await git.log({ fs, dir: this.#repoPath, depth });
    return commits.map((entry) => ({
      oid: entry.oid,
      message: entry.commit.message.split('\n')[0] ?? '',
      author: entry.commit.author.name,
      timestamp: new Date(entry.commit.author.timestamp * 1000).toISOString()
    }));
  }

  /**
   * Validates credentials by attempting a fetch.
   */
  async testCredentials(): Promise<void> {
    await this.fetch();
  }

  /**
   * Returns the current branch name, if any.
   */
  private async currentBranch(): Promise<string | null> {
    try {
      const branch = await git.currentBranch({ fs, dir: this.#repoPath });
      return branch ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolves commit author from git config or falls back to HarborClient defaults.
   */
  private async resolveAuthor(): Promise<{ name: string; email: string }> {
    try {
      const name = await git.getConfig({ fs, dir: this.#repoPath, path: 'user.name' });
      const email = await git.getConfig({ fs, dir: this.#repoPath, path: 'user.email' });
      if (typeof name === 'string' && typeof email === 'string' && name && email) {
        return { name, email };
      }
    } catch {
      // Fall through to defaults.
    }
    return { name: 'HarborClient', email: 'harborclient@local' };
  }

  /**
   * Stages all files under a repository-relative path recursively.
   *
   * @param relPath - Path relative to repo root.
   */
  private async stagePath(relPath: string): Promise<void> {
    const abs = join(this.#repoPath, relPath);
    if (!fs.existsSync(abs)) {
      return;
    }

    const walk = async (dir: string, prefix: string): Promise<void> => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, rel);
        } else {
          await git.add({ fs, dir: this.#repoPath, filepath: rel });
        }
      }
    };

    await walk(abs, relPath.replace(/\\/g, '/'));
  }
}
