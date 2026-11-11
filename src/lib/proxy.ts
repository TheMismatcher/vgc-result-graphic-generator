// RK9 and Pokédata don't let other websites read their pages, so the app asks our own pass-through
// for them: functions/packages/proxy/fetch (a DigitalOcean Function in production, run by the Vite
// server locally). It sends pages gzipped + base64 ("gz64:…") to stay under DigitalOcean's 1 MB
// limit; this unpacks them.
//
// VITE_PROXY_URL can point the app at the function's own address instead, if it isn't served at
// /api/proxy/fetch on the same site.

const BASE: string = import.meta.env.VITE_PROXY_URL || '/api/proxy/fetch'

export type ProxySite = 'rk9' | 'pokedata'

/** Fetch a page from RK9 or Pokédata. `path` is the site's path, e.g. "/roster/LO002-…". */
export async function proxyGet(site: ProxySite, path: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${BASE}?site=${site}&path=${encodeURIComponent(path)}`)
  if (!res.ok) return { ok: false, status: res.status, body: '' }
  const raw = await res.text()
  return { ok: true, status: res.status, body: raw.startsWith('gz64:') ? await gunzipBase64(raw.slice(5)) : raw }
}

async function gunzipBase64(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}
