import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'node:module'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

// RK9 and Pokédata don't let other websites read their pages, so the app asks our own pass-through
// at /api/proxy/fetch. In production that's a DigitalOcean Function (functions/README.md); here
// the dev/preview server runs the same function file, so both behave the same.
const require = createRequire(import.meta.url)
const proxyFunction = require('./functions/packages/proxy/fetch/index.js') as {
  main: (args: Record<string, string>) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>
}

function proxyRoute(): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/api/proxy/fetch') return next()
    const out = await proxyFunction.main({ __ow_method: (req.method ?? 'GET').toLowerCase(), __ow_query: url.search.slice(1) })
    res.statusCode = out.statusCode
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v)
    res.end(out.body)
  }
  return {
    name: 'proxy-route',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the built site works on any host or sub-folder.
  base: './',
  plugins: [react(), tailwindcss(), proxyRoute()],
})
