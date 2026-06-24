import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import {
  parsePluginCatalog,
  PLUGIN_CATALOG_URL,
  type PluginCatalog
} from '#/shared/plugin/catalog';

/**
 * Candidate filesystem paths for the repository catalog used when the remote
 * marketplace JSON is unavailable (for example before docs deploy).
 *
 * @returns Absolute paths to try in priority order.
 */
export function getLocalPluginCatalogPaths(): string[] {
  const paths = new Set<string>();

  if (app.isPackaged) {
    paths.add(join(process.resourcesPath, 'plugins/catalog.json'));
  }

  paths.add(join(app.getAppPath(), 'plugins/catalog.json'));
  paths.add(join(__dirname, '../../plugins/catalog.json'));

  return [...paths];
}

/**
 * Reads and validates the bundled or repository plugin catalog from disk.
 *
 * @param paths - Optional override list of catalog paths for tests.
 * @returns Parsed catalog when a readable file is found.
 */
export function readLocalPluginCatalog(paths = getLocalPluginCatalogPaths()): PluginCatalog | null {
  for (const catalogPath of paths) {
    if (!existsSync(catalogPath)) {
      continue;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown;
    } catch {
      continue;
    }

    try {
      return parsePluginCatalog(raw);
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Fetches the public plugin marketplace catalog, falling back to the local
 * repository catalog when harborclient.com has not been deployed yet.
 *
 * @returns Parsed catalog entries sorted for display by the renderer.
 * @throws When neither the remote nor local catalog can be loaded.
 */
export async function fetchPluginCatalog(): Promise<PluginCatalog> {
  try {
    const response = await fetch(PLUGIN_CATALOG_URL, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      const raw: unknown = await response.json();
      return parsePluginCatalog(raw);
    }
  } catch {
    // Network errors fall through to the local catalog.
  }

  const local = readLocalPluginCatalog();
  if (local) {
    return local;
  }

  throw new Error(
    'Failed to load plugin catalog. The marketplace is unavailable and no local catalog was found.'
  );
}
