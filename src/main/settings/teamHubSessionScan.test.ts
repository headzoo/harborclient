import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanTeamHubSessions } from '#/main/settings/teamHubSessionScan';
import type { TeamHub } from '#/shared/types';

describe('scanTeamHubSessions', () => {
  const originalFetch = globalThis.fetch;

  const userHub: TeamHub = {
    id: 'hub-user',
    name: 'Alice',
    baseUrl: 'http://127.0.0.1:8788',
    token: 'hbk_user_token'
  };

  const adminHub: TeamHub = {
    id: 'hub-admin',
    name: 'Ops',
    baseUrl: 'http://127.0.0.1:8789',
    token: 'hbk_admin_token'
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns management capability flags for each hub', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;

        if (authorization === `Bearer ${adminHub.token}`) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                user: { id: 'user-admin', name: 'ops', role: 'admin' },
                token: { id: 'token-admin', prefix: 'hbk_admin' },
                capabilities: { dataApi: false, managementApi: true, llm: false }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: { id: 'user-alice', name: 'alice', role: 'user' },
              token: { id: 'token-user', prefix: 'hbk_user' },
              capabilities: { dataApi: true, managementApi: false, llm: true }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      });
    globalThis.fetch = fetchMock;

    const results = await scanTeamHubSessions([userHub, adminHub]);

    expect(results).toEqual([
      { hubId: 'hub-user', managementApi: false },
      { hubId: 'hub-admin', managementApi: true }
    ]);
  });

  it('returns a non-throwing error result when a hub scan fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    globalThis.fetch = fetchMock;

    const results = await scanTeamHubSessions([userHub]);

    expect(results).toEqual([
      {
        hubId: 'hub-user',
        managementApi: false,
        error: 'Unauthorized'
      }
    ]);
  });
});
