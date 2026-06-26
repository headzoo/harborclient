import { describe, expect, it } from 'vitest';
import { filterCollectionProviders, type ProviderOption } from '#/renderer/src/hooks/useProviders';

const databaseProvider: ProviderOption = {
  id: 'db-1',
  name: 'Local SQLite',
  kind: 'database',
  type: 'sqlite'
};

const userHubProvider: ProviderOption = {
  id: 'hub-user',
  name: 'Team Hub User',
  kind: 'team-hub'
};

const adminHubProvider: ProviderOption = {
  id: 'hub-admin',
  name: 'Team Hub Admin',
  kind: 'team-hub'
};

describe('filterCollectionProviders', () => {
  it('omits admin team hubs while keeping databases and user team hubs', () => {
    const providers = [databaseProvider, userHubProvider, adminHubProvider];
    const adminHubIds = new Set(['hub-admin']);

    expect(filterCollectionProviders(providers, adminHubIds)).toEqual([
      databaseProvider,
      userHubProvider
    ]);
  });

  it('retains an admin hub when retainConnectionId matches', () => {
    const providers = [databaseProvider, userHubProvider, adminHubProvider];
    const adminHubIds = new Set(['hub-admin']);

    expect(filterCollectionProviders(providers, adminHubIds, 'hub-admin')).toEqual([
      databaseProvider,
      userHubProvider,
      adminHubProvider
    ]);
  });

  it('never filters database providers', () => {
    const providers = [databaseProvider, adminHubProvider];
    const adminHubIds = new Set(['db-1', 'hub-admin']);

    expect(filterCollectionProviders(providers, adminHubIds)).toEqual([databaseProvider]);
  });
});
