// Read Regionals/ICs data from RK9 (rk9.gg): the roster (with public team lists) and the
// pairings (for each player's current record).
//
// RK9 doesn't allow other websites to read its pages directly, so requests go through
// "/rk9/…" on our own site, which forwards them to rk9.gg:
//   - locally: the proxy in vite.config.ts
//   - on Netlify: public/_redirects
// RK9 has no official API; if they redesign their pages, the parsing below needs updating.

import type { Mon } from '../types'
import { resolveForm, resolveItem, resolvePokemon } from '../data/dex'
import { emptyMon } from './state'

const BASE = '/rk9'

export interface RosterEntry {
  first: string
  last: string
  country: string
  division: string // "Masters" | "Seniors" | "Juniors"
  trainer: string
  teamUrl: string // path of the public team list, or ''
}

export const fullName = (p: RosterEntry) => `${p.first} ${p.last}`.trim()

/** "https://rk9.gg/roster/LO002-drfp6esCSpyU3s" (or /tournament/, /pairings/) -> "LO002-drfp6esCSpyU3s" */
export function rk9Id(input: string): string | null {
  const m = input.trim().match(/(?:tournament|pairings|roster)\/([A-Za-z0-9]+-[A-Za-z0-9]+)/) ?? input.trim().match(/^([A-Za-z0-9]+-[A-Za-z0-9]{10,})$/)
  return m ? m[1] : null
}

async function page(path: string): Promise<Document> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`RK9 didn't respond (${res.status}). Check the link, or try again in a moment.`)
  return new DOMParser().parseFromString(await res.text(), 'text/html')
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

export async function fetchRoster(id: string): Promise<{ event: string; players: RosterEntry[] }> {
  const doc = await page(`/roster/${id}`)
  const headers = [...doc.querySelectorAll('table thead th')].map((th) => text(th).toLowerCase())
  const col = (name: string) => headers.findIndex((h) => h.includes(name))
  const [first, last, country, division, trainer, team] = ['first', 'last', 'country', 'division', 'trainer', 'team'].map(col)
  if (first < 0 || last < 0) throw new Error('That doesn’t look like an RK9 roster page.')
  const players = [...doc.querySelectorAll('table tbody tr')].map((tr) => {
    const cells = tr.querySelectorAll('td')
    return {
      first: text(cells[first]),
      last: text(cells[last]),
      country: text(cells[country]),
      division: text(cells[division]),
      trainer: text(cells[trainer]),
      teamUrl: (team >= 0 && cells[team]?.querySelector('a')?.getAttribute('href')) || '',
    }
  })
  const event = text(doc.querySelector('h3, h2, h1')) || ''
  return { event, players: players.filter((p) => p.first || p.last) }
}

/** Parse a public team list into 6 team slots. */
export async function fetchTeam(teamUrl: string): Promise<{ team: Mon[]; unmatched: string[] }> {
  const doc = await page(teamUrl)
  const english = doc.querySelector('#lang-EN') ?? doc
  const unmatched: string[] = []
  const team = [...english.querySelectorAll('.pokemon')].slice(0, 6).map((div) => {
    // The species is the text before the first <b> (e.g. "Sinistcha [Masterpiece Form]").
    let species = ''
    for (const node of div.childNodes) {
      if (node.nodeName === 'B') break
      if (node.nodeType === Node.TEXT_NODE) species += node.textContent
    }
    species = species.replace(/\s+/g, ' ').trim()
    const itemLabel = [...div.querySelectorAll('b')].find((b) => text(b).startsWith('Held Item'))
    const itemName = (itemLabel?.nextSibling?.textContent ?? '').trim()
    const pokemon = resolveRk9Species(species)
    const item = itemName ? resolveItem(itemName) : ''
    if (!pokemon) unmatched.push(species)
    if (itemName && !item) unmatched.push(itemName)
    return { pokemon, item, tera: '' }
  })
  return { team: [...team, ...Array.from({ length: 6 - team.length }, emptyMon)], unmatched }
}

const REGIONAL: Record<string, string> = { alolan: 'alola', galarian: 'galar', hisuian: 'hisui', paldean: 'paldea' }

/** "Ninetales [Alolan Form]" -> "ninetales-alola", "Ogerpon [Wellspring Mask]" -> "ogerpon-wellspring-mask". */
export function resolveRk9Species(name: string): string {
  const m = name.match(/^(.*?)\s*\[(.+?)\]$/)
  if (!m) return resolvePokemon(name)
  const base = m[1]
  // Best case: the bracket is the game's own form label, e.g. "[Heat Rotom]", "[Paldean Form (Blaze Breed)]".
  const official = resolveForm(base, m[2])
  if (official) return official
  // Otherwise forms come as "[Alolan Form]", "[Wellspring Mask]", or "[Heat Rotom]" (base name repeated).
  const form = m[2].replace(/\s+(Forme?|Style|Mode|Cloak|Breed)$/i, '').replace(new RegExp(`\\b${base}\\b`, 'i'), '').trim()
  const regional = REGIONAL[form.toLowerCase()]
  for (const candidate of [regional && `${base}-${regional}`, m[2], `${base}-${form}`, `${form} ${base}`, base]) {
    const id = candidate && resolvePokemon(candidate)
    if (id) return id
  }
  return ''
}

const POD: Record<string, number> = { Juniors: 0, Seniors: 1, Masters: 2 }

/**
 * A player's latest record from the pairings, e.g. "7-1". Looks at the most recent round
 * first, then earlier rounds (for players who dropped or didn't make the latest round).
 */
export async function fetchRecord(id: string, player: RosterEntry): Promise<string> {
  const pod = POD[player.division] ?? 2
  const key = `${player.first} ${player.last} [${player.country}]`.replace(/\s+/g, ' ').toLowerCase()
  const main = await page(`/pairings/${id}`)
  const rounds = [...main.querySelectorAll(`[id^="P${pod}R"]`)].map((el) => Number(el.id.split('R')[1])).filter(Boolean)
  const latest = Math.max(0, ...rounds)

  const find = (root: ParentNode) => {
    for (const cell of root.querySelectorAll('.player')) {
      if (text(cell.querySelector('.name')).toLowerCase() !== key) continue
      // Latest round: <span class="record" data-wins=".." …>; earlier rounds: plain text "(2-2-0) 6 pts".
      const r = cell.querySelector('.record') as HTMLElement | null
      const [wins, losses, ties] = r?.dataset.wins
        ? [r.dataset.wins, r.dataset.losses ?? '0', r.dataset.ties ?? '0']
        : (text(cell).match(/\((\d+)-(\d+)-(\d+)\)/)?.slice(1) ?? [])
      if (wins === undefined) continue
      return `${wins}-${losses}${ties && ties !== '0' ? `-${ties}` : ''}`
    }
    return ''
  }
  const current = main.querySelector(`#P${pod}R${latest}`)
  const fromCurrent = current ? find(current) : ''
  if (fromCurrent) return fromCurrent
  // Not in the latest round (dropped, or didn't advance): use the last round they played.
  for (let r = latest - 1; r >= 1; r--) {
    const found = find(await page(`/pairings/${id}?pod=${pod}&rnd=${r}`))
    if (found) return found
  }
  return ''
}
