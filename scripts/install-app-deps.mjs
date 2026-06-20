import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isDarwin = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const ivmDir = path.join(projectRoot, 'node_modules', 'isolated-vm')

const require = getElectronRebuildRequire()
const { rebuild } = require('@electron/rebuild')
const electronVersion = require('electron/package.json').version

await rebuild({
  buildPath: projectRoot,
  electronVersion,
  buildFromSource: isDarwin,
  useElectronClang: isWindows
})

pruneIsolatedVmPackagingArtifacts(ivmDir, { removePrebuilds: isDarwin })

function getElectronRebuildRequire() {
  const candidates = [
    path.join(projectRoot, 'node_modules/@electron/rebuild/package.json'),
    ...findPnpmElectronRebuildPackageJsons()
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return createRequire(candidate)
    }
  }

  throw new Error('Could not find @electron/rebuild')
}

function findPnpmElectronRebuildPackageJsons() {
  const pnpmDir = path.join(projectRoot, 'node_modules/.pnpm')
  if (!fs.existsSync(pnpmDir)) return []

  return fs
    .readdirSync(pnpmDir)
    .filter((entry) => entry.startsWith('@electron+rebuild@'))
    .map((entry) =>
      path.join(pnpmDir, entry, 'node_modules/@electron/rebuild/package.json')
    )
}

function pruneIsolatedVmPackagingArtifacts(ivmDir, { removePrebuilds }) {
  if (!fs.existsSync(ivmDir)) return

  for (const entry of fs.readdirSync(ivmDir)) {
    if (entry.endsWith('.tgz')) {
      fs.rmSync(path.join(ivmDir, entry), { force: true })
    }
  }

  if (!removePrebuilds) return

  const prebuildsDir = path.join(ivmDir, 'prebuilds')
  if (fs.existsSync(prebuildsDir)) {
    fs.rmSync(prebuildsDir, { recursive: true, force: true })
  }
}
