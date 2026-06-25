import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const staticPluginsDir = path.join(repoDir, 'docs/.vitepress/static/plugins');

/**
 * Ensures a source file exists before syncing it into the docs static directory.
 *
 * @param {string} sourceRelative - Path relative to the repository root.
 * @param {string} helpMessage - Optional hint printed when the source file is missing.
 */
async function assertSourceExists(sourceRelative, helpMessage) {
  const sourcePath = path.join(repoDir, sourceRelative);
  try {
    await access(sourcePath);
  } catch {
    console.error(`Missing plugin static asset: ${sourceRelative}`);
    if (helpMessage) {
      console.error(helpMessage);
    }
    process.exit(1);
  }
  return sourcePath;
}

/**
 * Copies one plugins/ asset into the VitePress static directory.
 *
 * @param {string} sourceRelative - Path relative to the repository root.
 * @param {string} helpMessage - Optional hint printed when the source file is missing.
 */
async function syncPluginStaticAsset(sourceRelative, helpMessage) {
  const sourcePath = await assertSourceExists(sourceRelative, helpMessage);
  const outputPath = path.join(staticPluginsDir, path.basename(sourceRelative));
  await mkdir(staticPluginsDir, { recursive: true });
  await copyFile(sourcePath, outputPath);
  console.log(`Synced ${path.relative(repoDir, outputPath)} from ${sourceRelative}`);
}

await syncPluginStaticAsset(
  'plugins/harborclient.key',
  'Generate it with: openssl pkey -in plugins/signing.pem -pubout -out plugins/harborclient.key'
);

const trustedSourcePath = await assertSourceExists('plugins/trusted.json');
let trustedRaw;
try {
  trustedRaw = JSON.parse(await readFile(trustedSourcePath, 'utf8'));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Plugin trusted keys file is not valid JSON: plugins/trusted.json (${message})`);
  process.exit(1);
}

if (!Array.isArray(trustedRaw)) {
  console.error('Plugin trusted keys file must be a JSON array: plugins/trusted.json');
  process.exit(1);
}

await syncPluginStaticAsset('plugins/trusted.json');
