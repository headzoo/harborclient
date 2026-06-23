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
  ['images/screenshots/hc-2.png', 'screenshots/hc-2.png'],
  ['images/screenshots/hc-3.png', 'screenshots/hc-3.png'],
  ['images/screenshots/hc-4.png', 'screenshots/hc-4.png'],
  ['images/screenshots/hc-5.png', 'screenshots/hc-5.png'],
  ['images/screenshots/hc-6.png', 'screenshots/hc-6.png'],
  ['images/screenshots/hc-7.png', 'screenshots/hc-7.png'],
  ['images/screenshots/hc-8.png', 'screenshots/hc-8.png'],
  ['images/screenshots/hc-9.png', 'screenshots/hc-9.png'],
  ['images/screenshots/hc-10.png', 'screenshots/hc-10.png'],
  ['images/screenshots/hc-11.png', 'screenshots/hc-11.png'],
  ['images/screenshots/hc-12.png', 'screenshots/hc-12.png'],
  ['images/screenshots/hc-13.png', 'screenshots/hc-13.png'],
  ['build/icons/16x16.png', 'favicon-16x16.png'],
  ['build/icons/32x32.png', 'favicon-32x32.png'],
  ['build/icons/128x128.png', 'apple-touch-icon.png'],
];

await mkdir(staticImagesDir, { recursive: true });

/** Markdown image paths (e.g. `images/screenshots/hc-7.png`) resolve from `docs/`. */
const docsImagesDir = path.join(repoDir, 'docs/images');

for (const [source, target] of assets) {
  const staticDestination = path.join(staticImagesDir, target);
  await mkdir(path.dirname(staticDestination), { recursive: true });
  await copyFile(path.join(repoDir, source), staticDestination);

  if (source.startsWith('images/')) {
    const docsDestination = path.join(docsImagesDir, source.slice('images/'.length));
    await mkdir(path.dirname(docsDestination), { recursive: true });
    await copyFile(path.join(repoDir, source), docsDestination);
  }
}

console.log(`Synced ${assets.length} asset(s) into docs/.vitepress/static/images/`);
