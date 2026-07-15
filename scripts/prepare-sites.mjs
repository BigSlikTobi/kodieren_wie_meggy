import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const project = process.cwd()
const dist = join(project, 'dist')

for (const stalePath of [join(dist, 'index.html'), join(dist, 'assets')]) {
  if (existsSync(stalePath)) rmSync(stalePath, { recursive: true, force: true })
}

mkdirSync(join(dist, 'server'), { recursive: true })
mkdirSync(join(dist, '.openai'), { recursive: true })
copyFileSync(join(project, '.openai', 'hosting.json'), join(dist, '.openai', 'hosting.json'))

const serverEntry = `export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static asset binding unavailable', { status: 500 })
    }

    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) return response

    const url = new URL(request.url)
    url.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(url, request))
  },
}
`

writeFileSync(join(dist, 'server', 'index.js'), serverEntry)
