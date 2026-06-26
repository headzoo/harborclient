import { afterEach, describe, expect, it, vi } from 'vitest';

const manifest = {
  id: 'com.example.demo',
  name: 'Demo Plugin',
  version: '1.0.0',
  author: 'Example Inc.',
  description: 'README.md',
  engines: { harborclient: '>=1.8.0' },
  renderer: 'dist/renderer.js',
  permissions: ['ui']
};

const readme = '# Demo Plugin\n\nA sample plugin.';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchPluginPreviewFromGit', () => {
  it('fetches manifest, description, and screenshot from GitHub', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/manifest.json')) {
        return new Response(JSON.stringify(manifest), { status: 200 });
      }
      if (url.endsWith('/README.md')) {
        return new Response(readme, { status: 200 });
      }
      if (url.endsWith('/screenshot.png')) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchPluginPreviewFromGit } = await import('#/main/plugins/gitPluginPreview');
    await expect(
      fetchPluginPreviewFromGit('https://github.com/example/demo-plugin', 'main')
    ).resolves.toEqual({
      manifest,
      descriptionMarkdown: readme,
      screenshotSrc: expect.stringMatching(/^data:image\/png;base64,/)
    });
  });

  it('throws for non-GitHub repository URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );

    const { fetchPluginPreviewFromGit } = await import('#/main/plugins/gitPluginPreview');
    await expect(
      fetchPluginPreviewFromGit('https://gitlab.com/example/demo-plugin')
    ).rejects.toThrow(/github repositories/i);
  });

  it('throws when manifest.json cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404 }))
    );

    const { fetchPluginPreviewFromGit } = await import('#/main/plugins/gitPluginPreview');
    await expect(
      fetchPluginPreviewFromGit('https://github.com/example/demo-plugin')
    ).rejects.toThrow(/manifest\.json/i);
  });

  it('returns preview without description when README fetch fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/manifest.json')) {
        return new Response(JSON.stringify(manifest), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchPluginPreviewFromGit } = await import('#/main/plugins/gitPluginPreview');
    await expect(
      fetchPluginPreviewFromGit('https://github.com/example/demo-plugin')
    ).resolves.toEqual({
      manifest,
      descriptionMarkdown: undefined,
      screenshotSrc: undefined
    });
  });
});
