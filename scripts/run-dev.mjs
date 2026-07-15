import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'

const project = process.cwd()
const node = process.execPath
const typescript = join(project, 'node_modules/typescript/bin/tsc')
const vite = join(project, 'node_modules/vite/bin/vite.js')

const typecheck = spawnSync(node, [typescript, '-b'], { cwd: project, stdio: 'inherit' })
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1)

const build = spawnSync(node, [vite, 'build'], { cwd: project, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const forwardedArgs = process.argv.slice(2)
const server = spawn(node, [vite, 'preview', '--port', '5173', ...forwardedArgs], {
  cwd: project,
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}

server.on('exit', (code) => process.exit(code ?? 0))
