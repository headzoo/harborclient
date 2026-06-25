import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoDir, 'plugins/public.key');
const outputPath = path.join(repoDir, 'docs/.vitepress/static/plugins/public.key');

try {
  await access(sourcePath);
} catch {
  console.error(`Missing plugin signing public key: ${path.relative(repoDir, sourcePath)}`);
  console.error('Generate it with: openssl pkey -in plugins/signing.pem -pubout -out plugins/public.key');
  process.exit(1);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await copyFile(sourcePath, outputPath);

console.log(`Synced ${path.relative(repoDir, outputPath)} from plugins/public.key`);
