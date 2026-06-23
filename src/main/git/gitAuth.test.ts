import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConnection } from '#/shared/types';

const mockConnections: DatabaseConnection[] = [];

vi.mock('#/main/settings/databaseSettings', () => ({
  listDatabaseConnections: () => mockConnections
}));

vi.mock('#/main/git/gitSecrets', () => ({
  getGitAccessToken: vi.fn(() => 'stored-pat'),
  getGitRefreshToken: vi.fn(() => null),
  getGitTokenExpiresAt: vi.fn(() => null),
  storeGitOAuthTokens: vi.fn(),
  storeGitPat: vi.fn(),
  deleteGitSecrets: vi.fn()
}));

vi.mock('#/main/git/githubOAuth', () => ({
  startGitHubDeviceFlow: vi.fn(async () => ({
    userCode: 'ABCD-1234',
    verificationUri: 'https://github.com/login/device'
  })),
  completeGitHubDeviceFlow: vi.fn(async () => ({
    accessToken: 'oauth-token',
    refreshToken: 'refresh-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  })),
  refreshGitHubAccessToken: vi.fn()
}));

import { deleteGitSecrets, getGitAccessToken } from '#/main/git/gitSecrets';
import {
  beginGitHubOAuth,
  finishGitHubOAuth,
  resolveGitAuth,
  revokeGitHubOAuth
} from '#/main/git/gitAuth';

describe('git auth resolver', () => {
  beforeEach(() => {
    mockConnections.length = 0;
    vi.mocked(getGitAccessToken).mockReturnValue('stored-pat');
  });

  it('resolves PAT credentials from encrypted storage', async () => {
    mockConnections.push({
      id: 'git-1',
      name: 'Git',
      type: 'git',
      settings: {
        repoPath: '/tmp/repo',
        url: 'https://github.com/example/repo.git',
        branch: 'main',
        subdir: '.harborclient',
        auth: { kind: 'pat', username: 'token' }
      }
    });

    const auth = await resolveGitAuth('git-1');
    expect(auth).toEqual({ username: 'token', password: 'stored-pat' });
  });

  it('starts and completes GitHub device flow', async () => {
    mockConnections.push({
      id: 'git-oauth',
      name: 'Git OAuth',
      type: 'git',
      settings: {
        repoPath: '/tmp/repo',
        url: 'https://github.com/example/repo.git',
        branch: 'main',
        subdir: '.harborclient',
        auth: { kind: 'pat', username: 'token' }
      }
    });

    const started = await beginGitHubOAuth('git-oauth');
    expect(started.userCode).toBe('ABCD-1234');

    await finishGitHubOAuth('git-oauth');
    const conn = mockConnections[0];
    expect(conn.type === 'git' && conn.settings.auth).toEqual({
      kind: 'oauth',
      provider: 'github'
    });
  });

  it('revokes GitHub OAuth and resets auth metadata', async () => {
    mockConnections.push({
      id: 'git-oauth',
      name: 'Git OAuth',
      type: 'git',
      settings: {
        repoPath: '/tmp/repo',
        url: 'https://github.com/example/repo.git',
        branch: 'main',
        subdir: '.harborclient',
        auth: { kind: 'oauth', provider: 'github' }
      }
    });

    revokeGitHubOAuth('git-oauth');

    expect(deleteGitSecrets).toHaveBeenCalledWith('git-oauth');
    const conn = mockConnections[0];
    expect(conn.type === 'git' && conn.settings.auth).toEqual({
      kind: 'pat',
      username: 'token'
    });
  });
});
