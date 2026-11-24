// Template use counts: each copy or download on the live site sends the template's id, its style, the tab and
// whether it was copied or downloaded to bot.mismatched.gg, which keeps daily totals (plus the country / US state
// from the IP address, which it doesn't store) for our own design work. Nothing about the graphic's contents, the
// visitor or their event is sent, and no cookies are set. Explained on the Credits page.

import type { Template } from '../templates/types'

const ENDPOINT = 'https://bot.mismatched.gg/templates/used'
const LIVE_HOSTS = new Set(['mismatched.gg', 'www.mismatched.gg'])
// "Don't count me" for our own testing: open the generator once with ?nocount (and ?count to undo).
const OPT_OUT_KEY = 'mismatched:dontCount'

function optedOut(): boolean {
  try {
    const query = new URLSearchParams(location.search)
    if (query.has('nocount')) localStorage.setItem(OPT_OUT_KEY, '1')
    if (query.has('count')) localStorage.removeItem(OPT_OUT_KEY)
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}
const OFF = typeof location === 'undefined' || !LIVE_HOSTS.has(location.hostname) || optedOut()

/** Count one copy or download of this template (the registry's own entry, not a "Condense similar styles" one). */
export function countUse(template: Template, action: 'copy' | 'download') {
  if (OFF) return
  const body = JSON.stringify({ template: template.id, style: template.variantOf ?? template.style ?? '', tab: template.kind, action })
  try {
    // text/plain: a "simple" request, so no CORS preflight; the page never waits on it or sees the answer.
    const blob = new Blob([body], { type: 'text/plain' })
    if (!navigator.sendBeacon?.(ENDPOINT, blob)) void fetch(ENDPOINT, { method: 'POST', body: blob, keepalive: true, mode: 'no-cors' }).catch(() => {})
  } catch {
    // Counting must never get in the way of the graphic.
  }
}
