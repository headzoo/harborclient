import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const staticImagesDir = path.join(repoDir, 'docs/.vitepress/static/images');

/** Repo-relative sources copied into the VitePress static dir on each docs build. */
const assets = [
  ['images/logo.png', 'logo.png'],
  ['images/screenshots/hc-1.png', 'screenshots/hc-1.png'],
  ['build/icons/16x16.png', 'favicon-16x16.png'],
  ['build/icons/32x32.png', 'favicon-32x32.png'],
  ['build/icons/128x128.png', 'apple-touch-icon.png'],
];

await mkdir(staticImagesDir, { recursive: true });

for (const [source, target] of assets) {
  const destination = path.join(staticImagesDir, target);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(repoDir, source), destination);
}

console.log(`Synced ${assets.length} asset(s) into docs/.vitepress/static/images/`);
