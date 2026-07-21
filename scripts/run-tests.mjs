import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const project = process.cwd()
const testRoot = join(tmpdir(), 'kodierpfad-prototyp-tests')

if (process.platform === 'win32') {
  const result = spawnSync(process.execPath, [join(project, 'node_modules/vitest/vitest.mjs'), 'run'], {
    cwd: project,
    stdio: 'inherit',
  })
  process.exit(result.status ?? 1)
}

if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true })
mkdirSync(testRoot, { recursive: true })
cpSync(join(project, 'src'), join(testRoot, 'src'), { recursive: true })
for (const file of ['vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'package.json']) {
  copyFileSync(join(project, file), join(testRoot, file))
}
symlinkSync(join(project, 'node_modules'), join(testRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')

const result = spawnSync(process.execPath, [join(project, 'node_modules/vitest/vitest.mjs'), 'run'], {
  cwd: testRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
