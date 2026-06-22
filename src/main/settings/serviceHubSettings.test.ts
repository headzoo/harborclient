import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalRegistry } from '#/main/db/LocalRegistry';
import {
  clearLocalRegistryForTesting,
  setLocalRegistryForTesting
} from '#/main/db/localRegistryInstance';
import {
  deleteServiceHub,
  listServiceHubs,
  saveServiceHub
} from '#/main/settings/serviceHubSettings';

describe('serviceHubSettings', () => {
  let settingsStore: Record<string, string>;

  beforeEach(() => {
    settingsStore = {};
    const registry = {
      getSetting: (key: string) => settingsStore[key],
      setSetting: (key: string, value: string) => {
        settingsStore[key] = value;
      }
    } as LocalRegistry;
    setLocalRegistryForTesting(registry);
  });

  afterEach(() => {
    clearLocalRegistryForTesting();
  });

  it('returns an empty list when unset', () => {
    expect(listServiceHubs()).toEqual([]);
  });

  it('creates a service hub with a generated id and normalized base URL', () => {
    const saved = saveServiceHub({
      id: '',
      name: ' Team Hub ',
      baseUrl: 'http://127.0.0.1:8788/',
      token: ' hbk_test '
    });

    expect(saved).toHaveLength(1);
    expect(saved[0]?.name).toBe('Team Hub');
    expect(saved[0]?.baseUrl).toBe('http://127.0.0.1:8788');
    expect(saved[0]?.token).toBe('hbk_test');
    expect(saved[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('updates an existing service hub by id', () => {
    const created = saveServiceHub({
      id: '',
      name: 'Original',
      baseUrl: 'http://127.0.0.1:8788',
      token: 'hbk_old'
    });
    const id = created[0]?.id ?? '';

    saveServiceHub({
      id,
      name: 'Updated',
      baseUrl: 'https://hub.example.com/',
      token: 'hbk_new'
    });

    expect(listServiceHubs()).toEqual([
      {
        id,
        name: 'Updated',
        baseUrl: 'https://hub.example.com',
        token: 'hbk_new'
      }
    ]);
  });

  it('deletes a service hub by id', () => {
    const first = saveServiceHub({
      id: '',
      name: 'First',
      baseUrl: 'http://127.0.0.1:8788',
      token: 'hbk_one'
    });
    const second = saveServiceHub({
      id: '',
      name: 'Second',
      baseUrl: 'http://127.0.0.1:8789',
      token: 'hbk_two'
    });
    const firstId = first[0]?.id ?? '';
    const secondId = second[1]?.id ?? '';

    const remaining = deleteServiceHub(firstId);

    expect(remaining).toEqual([
      {
        id: secondId,
        name: 'Second',
        baseUrl: 'http://127.0.0.1:8789',
        token: 'hbk_two'
      }
    ]);
  });

  it('throws when deleting an unknown service hub', () => {
    expect(() => deleteServiceHub('missing-id')).toThrow('Unknown service hub: missing-id');
  });
});
