// Pass-through for the two sites the Event Results tab reads but that don't let other websites
// read their pages: RK9 (rosters, team lists, pairings) and Pokédata (standings JSON).
//
//   GET /api/proxy/fetch?site=rk9&path=/roster/LO002-drfp6esCSpyU3s
//   GET /api/proxy/fetch?site=pokedata&path=/standingsVGC/0000123/masters/0000123_Masters.json
//
// Runs as a DigitalOcean Function in production (see functions/README.md) and inside the Vite
// dev server locally (vite.config.ts), so both use this same code.
//
// The reply body is "gz64:" + the page gzipped and base64-encoded, which src/lib/proxy.ts unpacks.
// DigitalOcean Functions can't return more than 1 MB, and big RK9 rosters are over 2 MB of HTML
// (about 75 KB gzipped).
//
// Only these two sites and only the page shapes the app uses are allowed, so this can't be used
// to fetch anything else.

const zlib = require('zlib')

const SITES = {
  rk9: {
    origin: 'https://www.rk9.gg',
    path: /^\/(roster|pairings|tournament|teamlist\/public)\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)?$/,
    query: /^(pod=\d{1,2}&rnd=\d{1,3})?$/,
  },
  pokedata: {
    origin: 'https://pokedata.ovh',
    path: /^\/standingsVGC\/\d{7}\/(masters|seniors|juniors)\/\d{7}_(Masters|Seniors|Juniors)\.json$/,
    query: /^$/,
  },
}

const MAX_REPLY = 950000 // just under DigitalOcean's 1 MB result limit
const CORS = { 'access-control-allow-origin': '*' }

function reply(statusCode, message) {
  return { statusCode, headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' }, body: message }
}

async function main(args) {
  args = args || {}
  const method = String(args.__ow_method || 'get').toLowerCase()
  if (method === 'options') return { statusCode: 204, headers: { ...CORS, 'access-control-allow-methods': 'GET' }, body: '' }
  if (method !== 'get') return reply(405, 'GET only')

  // "web: raw" functions get the query string as __ow_query; plain web functions get it as args.
  const params = typeof args.__ow_query === 'string' ? Object.fromEntries(new URLSearchParams(args.__ow_query)) : args
  const site = SITES[params.site]
  if (!site) return reply(400, 'Unknown site')
  const full = String(params.path || '')
  const q = full.indexOf('?')
  const path = q < 0 ? full : full.slice(0, q)
  const query = q < 0 ? '' : full.slice(q + 1)
  if (!site.path.test(path) || !site.query.test(query)) return reply(400, 'That page is not allowed')

  let res
  try {
    res = await fetch(site.origin + path + (query ? `?${query}` : ''), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; vgc-graphics-proxy)', accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return reply(504, 'The site did not respond')
  }
  if (new URL(res.url).origin !== site.origin) return reply(502, 'The site redirected somewhere else')
  if (!res.ok) return reply(res.status, `The site answered ${res.status}`)

  const packed = `gz64:${zlib.gzipSync(Buffer.from(await res.arrayBuffer()), { level: 9 }).toString('base64')}`
  if (packed.length > MAX_REPLY) return reply(502, 'That page is too large')
  return {
    statusCode: 200,
    headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=60' },
    body: packed,
  }
}

exports.main = main
