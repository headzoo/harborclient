import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoDir, 'plugins/catalog.json');
const outputPath = path.join(repoDir, 'docs/.vitepress/static/plugin_catalog.json');

/**
 * Bundles `parsePluginCatalog` for Node execution without TypeScript path-alias resolution.
 *
 * @returns Parsed catalog validator from the shared plugin module.
 */
async function loadParsePluginCatalog() {
  const result = await esbuild.build({
    absWorkingDir: repoDir,
    stdin: {
      contents: "export { parsePluginCatalog } from './src/shared/plugin/catalog.ts';",
      resolveDir: repoDir,
      loader: 'ts',
      sourcefile: 'generate-plugin-catalog-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    tsconfigRaw: {
      compilerOptions: {
        paths: {
          '#/*': ['./src/*'],
        },
      },
    },
  });

  const bundled = result.outputFiles[0]?.text;
  if (!bundled) {
    throw new Error('Failed to bundle parsePluginCatalog for docs catalog generation.');
  }

  const tempModulePath = path.join(
    os.tmpdir(),
    `harborclient-generate-plugin-catalog-${process.pid}.mjs`,
  );
  await writeFile(tempModulePath, bundled, 'utf8');

  try {
    return await import(pathToFileURL(tempModulePath).href);
  } finally {
    await unlink(tempModulePath).catch(() => undefined);
  }
}

const raw = JSON.parse(await readFile(sourcePath, 'utf8'));
const { parsePluginCatalog } = await loadParsePluginCatalog();
const catalog = parsePluginCatalog(raw);
const plugins = [...catalog.plugins].sort((left, right) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
);

const output = {
  schemaVersion: catalog.schemaVersion,
  updatedAt: new Date().toISOString(),
  plugins,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(
  `Wrote ${path.relative(repoDir, outputPath)} with ${plugins.length} plugin listing(s)`,
);
