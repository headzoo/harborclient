import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { defaultAuth } from '#/shared/auth';
import {
  collectionDir,
  ensureHarborclientLayout,
  manifestToCollectionExport,
  readCollectionFromDir,
  writeCollectionToDir,
  type CollectionManifest
} from '#/main/git/fileLayout';

describe('git file layout', () => {
  it('round-trips collection manifest and request files', () => {
    const root = mkdtempSync(join(tmpdir(), 'hc-git-layout-'));
    ensureHarborclientLayout(root);

    const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const manifest: CollectionManifest = {
      harborclientVersion: 1,
      harborclientExport: 'collection',
      uuid,
      name: 'API',
      variables: [
        { key: 'shared', value: 'visible', defaultValue: '', share: true },
        { key: 'private', value: 'secret', defaultValue: '', share: false }
      ],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      auth: defaultAuth(),
      pre_request_script: 'pre',
      post_request_script: 'post',
      folders: [],
      created_at: '2026-01-01T00:00:00.000Z'
    };

    const dir = collectionDir(root, uuid, manifest.name);
    writeCollectionToDir(dir, manifest, [
      {
        uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Health',
        method: 'GET',
        url: 'https://example.com/health',
        headers: [],
        params: [],
        auth: defaultAuth(),
        body: '',
        body_type: 'none',
        pre_request_script: '',
        post_request_script: '',
        comment: '',
        sort_order: 0,
        folder_name: null
      }
    ]);

    const collectionJson = JSON.parse(readFileSync(join(dir, 'collection.json'), 'utf-8'));
    expect(collectionJson.variables.find((v: { key: string }) => v.key === 'private').value).toBe(
      ''
    );

    const { manifest: loadedManifest, requests } = readCollectionFromDir(dir);
    const exported = manifestToCollectionExport(loadedManifest, requests);

    expect(exported.name).toBe('API');
    expect(exported.requests.length).toBe(1);
    expect(exported.requests[0]?.name).toBe('Health');
    expect(existsSync(join(root, '.gitignore'))).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});
