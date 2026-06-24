#!/usr/bin/env node
/**
 * Generates packages/plugin-api/index.d.ts from src/shared/plugin/api.ts.
 *
 * Run after editing the public plugin author API. Pass --check to fail when
 * the committed index.d.ts is out of date (used in CI).
 */
import { execSync } from 'node:child_process';
import { readFileSync, renameSync, unlinkSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'packages/plugin-api');
const indexPath = join(pkgDir, 'index.d.ts');
const apiDtsPath = join(pkgDir, 'api.d.ts');
const apiDtsMapPath = join(pkgDir, 'api.d.ts.map');
const indexMapPath = join(pkgDir, 'index.d.ts.map');
const checkOnly = process.argv.includes('--check');

/**
 * Reads a file as UTF-8 text when it exists.
 *
 * @param path - Absolute file path.
 * @returns File contents or null when missing.
 */
function readIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, 'utf8');
}

/**
 * Removes a file when present.
 *
 * @param path - Absolute file path.
 */
function removeIfExists(path) {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

/**
 * Generates index.d.ts from api.ts and optionally verifies committed output.
 */
function main() {
  const beforeIndex = readIfExists(indexPath);
  const beforeMap = readIfExists(indexMapPath);

  removeIfExists(indexPath);
  removeIfExists(indexMapPath);
  removeIfExists(apiDtsPath);
  removeIfExists(apiDtsMapPath);

  execSync('pnpm exec tsc -p packages/plugin-api/tsconfig.build.json', {
    cwd: root,
    stdio: 'inherit'
  });

  if (!existsSync(apiDtsPath)) {
    throw new Error('Expected packages/plugin-api/api.d.ts after tsc emit');
  }

  renameSync(apiDtsPath, indexPath);
  if (existsSync(apiDtsMapPath)) {
    renameSync(apiDtsMapPath, indexMapPath);
  }

  execSync('pnpm exec prettier --write packages/plugin-api/index.d.ts', {
    cwd: root,
    stdio: 'inherit'
  });

  let afterIndex = readFileSync(indexPath, 'utf8');
  afterIndex = afterIndex.replace(
    '//# sourceMappingURL=api.d.ts.map',
    '//# sourceMappingURL=index.d.ts.map'
  );
  writeFileSync(indexPath, afterIndex);

  if (existsSync(indexMapPath)) {
    const map = JSON.parse(readFileSync(indexMapPath, 'utf8'));
    map.file = 'index.d.ts';
    writeFileSync(indexMapPath, `${JSON.stringify(map)}\n`);
  }

  const afterMap = readIfExists(indexMapPath);

  if (checkOnly) {
    if (beforeIndex !== afterIndex || beforeMap !== afterMap) {
      console.error(
        'packages/plugin-api/index.d.ts is out of date. Run: pnpm plugin-api:sync'
      );
      process.exit(1);
    }
    console.log('plugin-api types are up to date');
    return;
  }

  console.log('Generated packages/plugin-api/index.d.ts');
}

main();
