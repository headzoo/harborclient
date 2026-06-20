import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.npm_config_build_from_source = 'true'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const electronBuilder = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
)

const result = spawnSync(electronBuilder, ['install-app-deps'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32'
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

pruneIsolatedVmPackagingArtifacts(path.join(projectRoot, 'node_modules', 'isolated-vm'))

function pruneIsolatedVmPackagingArtifacts(ivmDir) {
  if (!fs.existsSync(ivmDir)) return

  for (const entry of fs.readdirSync(ivmDir)) {
    if (entry.endsWith('.tgz')) {
      fs.rmSync(path.join(ivmDir, entry), { force: true })
    }
  }

  const prebuildsDir = path.join(ivmDir, 'prebuilds')
  if (fs.existsSync(prebuildsDir)) {
    fs.rmSync(prebuildsDir, { recursive: true, force: true })
  }
}
