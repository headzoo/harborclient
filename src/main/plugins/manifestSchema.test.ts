import { describe, expect, it } from 'vitest';
import {
  parsePluginManifest,
  satisfiesHarborClientEngine,
  validatePluginManifest
} from '#/main/plugins/manifestSchema';

describe('manifestSchema', () => {
  const validManifest = {
    id: 'com.example.test',
    name: 'Test Plugin',
    version: '1.0.0',
    engines: { harborclient: '>=1.0.0' },
    renderer: 'dist/renderer.js',
    permissions: ['ui', 'storage']
  };

  it('parses a valid manifest', () => {
    const manifest = parsePluginManifest(validManifest);
    expect(manifest.id).toBe('com.example.test');
    expect(manifest.permissions).toEqual(['ui', 'storage']);
  });

  it('rejects manifests without renderer or main', () => {
    expect(() =>
      validatePluginManifest(
        {
          id: 'com.example.test',
          name: 'Test',
          version: '1.0.0',
          engines: { harborclient: '>=1.0.0' },
          permissions: ['ui']
        },
        '1.6.2'
      )
    ).toThrow(/renderer.*main/);
  });

  it('checks harborclient engine compatibility', () => {
    expect(satisfiesHarborClientEngine('>=1.6.0', '1.6.2')).toBe(true);
    expect(satisfiesHarborClientEngine('>=1.7.0', '1.6.2')).toBe(false);
  });
});
