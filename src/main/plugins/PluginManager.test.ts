import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearDevRegistryForTesting } from '#/main/plugins/devRegistry';
import { PluginManager } from '#/main/plugins/PluginManager';
import {
  clearLocalDatabaseForTesting,
  getLocalDatabase,
  initLocalDatabase
} from '#/main/storage/localDatabaseInstance';

const cleanups: Array<() => void | Promise<void>> = [];

/**
 * Creates an isolated userData directory and plugin manager for tests.
 */
async function createManager(): Promise<{ manager: PluginManager; rootDir: string }> {
  const rootDir = mkdtempSync(join(tmpdir(), 'harborclient-plugins-'));
  await initLocalDatabase(rootDir);
  const manager = new PluginManager(rootDir, '1.6.2');
  cleanups.push(async () => {
    manager.dispose();
    await getLocalDatabase().close();
    rmSync(rootDir, { recursive: true, force: true });
  });
  return { manager, rootDir };
}

/**
 * Writes a minimal valid plugin folder for discovery tests.
 *
 * @param rootDir - userData root.
 * @param pluginId - Plugin manifest id.
 */
function writePlugin(rootDir: string, pluginId: string): string {
  const pluginDir = join(rootDir, 'plugins', pluginId);
  mkdirSync(join(pluginDir, 'dist'), { recursive: true });
  writeFileSync(
    join(pluginDir, 'manifest.json'),
    JSON.stringify(
      {
        id: pluginId,
        name: 'Sample',
        version: '1.0.0',
        engines: { harborclient: '>=1.0.0' },
        renderer: 'dist/renderer.js',
        permissions: ['ui']
      },
      null,
      2
    )
  );
  writeFileSync(join(pluginDir, 'dist', 'renderer.js'), 'export function activate() {}');
  return pluginDir;
}

beforeEach(() => {
  clearDevRegistryForTesting();
});

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
  clearDevRegistryForTesting();
  clearLocalDatabaseForTesting();
});

describe('PluginManager', () => {
  it('discovers installed plugins', async () => {
    const { manager, rootDir } = await createManager();
    writePlugin(rootDir, 'com.example.sample');
    const plugins = manager.discover();
    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.id).toBe('com.example.sample');
  });

  it('namespaces plugin storage by plugin id', async () => {
    const { manager, rootDir } = await createManager();
    writePlugin(rootDir, 'com.example.one');
    writePlugin(rootDir, 'com.example.two');
    manager.discover();
    manager.setStorageValue('com.example.one', 'enabled', true);
    manager.setStorageValue('com.example.two', 'enabled', false);
    expect(manager.getStorageValue('com.example.one', 'enabled')).toBe(true);
    expect(manager.getStorageValue('com.example.two', 'enabled')).toBe(false);
  });

  it('loads unpacked plugins from a source directory', async () => {
    const { manager, rootDir } = await createManager();
    const sourceDir = join(rootDir, 'dev-plugin');
    mkdirSync(join(sourceDir, 'dist'), { recursive: true });
    writeFileSync(
      join(sourceDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.example.dev',
        name: 'Dev Plugin',
        version: '0.1.0',
        engines: { harborclient: '>=1.0.0' },
        renderer: 'dist/renderer.js',
        permissions: ['ui']
      })
    );
    writeFileSync(join(sourceDir, 'dist', 'renderer.js'), 'export function activate() {}');
    const info = manager.loadUnpacked(sourceDir);
    expect(info.source).toBe('unpacked');
    expect(info.path).toBe(sourceDir);
  });
});
