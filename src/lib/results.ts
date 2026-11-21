// Import players (name, record, team) for the Event Results tab from a results link:
//   - Limitless (play.limitlesstcg.com/tournament/<id>): open to other websites, read directly.
//   - Pokédata (pokedata.ovh/standingsVGC/<id>/masters/): official Regionals, Internationals and
//     Worlds, one JSON file per division.
//   - Reportworm (standings.reportworm.com/<season>/<event>): official Regionals, Internationals,
//     Special Events and Worlds (Masters), one JSON per event (/api/v1/<season>/<event>) with each
//     player's place, record and full team. Updates while the event is running.
//   Pokédata and Reportworm don't allow other websites, so those requests go through our own
//   pass-through (lib/proxy.ts → functions/packages/proxy/fetch).

import type { Mon } from '../types'
import { resolveItem, resolvePokemon } from '../data/dex'
import { emptyMon } from './state'
import { formatRecord, limitlessId, rankedStandings, toTeam, type LimitlessStanding } from './limitless'
import { resolveRk9Species } from './rk9'
import { proxyGet } from './proxy'
import { t } from '../i18n'

export type ResultsSource = 'limitless' | 'pokedata' | 'reportworm'

export interface ResultEntry {
  name: string
  placing: number | null
  record: string
  team: Mon[]
  hasTeam: boolean
  unmatched: string[]
}

export interface ResultsLink {
  source: ResultsSource
  id: string // Reportworm: "<season>/<event code>", e.g. "2027/laic"
  division: 'masters' | 'seniors' | 'juniors' // Pokédata only
}

/** Which site a pasted link is from, and the event it points at. */
export function parseResultsLink(input: string): ResultsLink | null {
  const text = input.trim()
  const pd = text.match(/pokedata\.ovh\/standings(?:VGC)?\/(\d{7})(?:\/(masters|seniors|juniors))?/i)
  if (pd) return { source: 'pokedata', id: pd[1], division: (pd[2]?.toLowerCase() as ResultsLink['division']) ?? 'masters' }
  const rw = text.match(/reportworm\.com\/(?:api\/v1\/)?(\d{4})\/([a-z0-9_-]+)/i)
  if (rw) return { source: 'reportworm', id: `${rw[1]}/${rw[2].toLowerCase()}`, division: 'masters' }
  if (/limitlesstcg\.com/i.test(text)) {
    const id = limitlessId(text)
    if (id) return { source: 'limitless', id, division: 'masters' }
  }
  return null
}

const COUNTRY_SUFFIX = /\s*\[[A-Za-z]{2,3}\]\s*$/

export async function loadResults(link: ResultsLink): Promise<{ event: string; entries: ResultEntry[] }> {
  if (link.source === 'limitless') return loadLimitless(link.id)
  if (link.source === 'reportworm') return loadReportworm(link.id)
  return loadPokedata(link)
}

async function loadLimitless(id: string) {
  const api = `https://play.limitlesstcg.com/api/tournaments/${id}`
  const [detailsRes, standingsRes] = await Promise.all([fetch(`${api}/details`), fetch(`${api}/standings`)])
  if (!detailsRes.ok || !standingsRes.ok) throw new Error(t('ui.import.limitless.loadError'))
  const details: { name: string } = await detailsRes.json()
  const standings: LimitlessStanding[] = await standingsRes.json()
  const entries = rankedStandings(standings).map((s): ResultEntry => {
    const unmatched: string[] = []
    return { name: s.name, placing: s.placing, record: formatRecord(s.record), team: toTeam(s.decklist, unmatched), hasTeam: !!s.decklist?.length, unmatched: [...new Set(unmatched)] }
  })
  return { event: details.name, entries }
}

interface PokedataPlayer {
  name: string
  placing: number | null
  record: { wins: number; losses: number; ties: number }
  decklist?: { name: string; item?: string | null }[] | unknown
}

async function loadPokedata({ id, division }: ResultsLink) {
  const label = division[0].toUpperCase() + division.slice(1)
  const res = await proxyGet('pokedata', `/standingsVGC/${id}/${division}/${id}_${label}.json`)
  if (!res.ok) throw new Error(t('ui.import.results.pokedataError', { status: res.status }))
  const players: PokedataPlayer[] = JSON.parse(res.body)
  const entries = players
    .slice()
    .sort((a, b) => (a.placing ?? Infinity) - (b.placing ?? Infinity))
    .map((p): ResultEntry => {
      const unmatched: string[] = []
      // Some players have no team list, and Pokédata then sends something other than a list.
      const deck = (Array.isArray(p.decklist) ? p.decklist : []).filter((m) => m && typeof m.name === 'string')
      const team = deck.slice(0, 6).map((m) => {
        const pokemon = resolvePokemon(m.name) || resolveRk9Species(m.name)
        const item = m.item ? resolveItem(m.item) : ''
        if (!pokemon) unmatched.push(m.name)
        if (m.item && !item) unmatched.push(m.item)
        return { pokemon, item, tera: '' }
      })
      return {
        name: String(p.name ?? '').replace(COUNTRY_SUFFIX, '').trim(),
        placing: p.placing,
        record: p.record ? formatRecord(p.record) : '',
        team: [...team, ...Array.from({ length: 6 - team.length }, emptyMon)],
        hasTeam: deck.length > 0,
        unmatched: [...new Set(unmatched)],
      }
    })
  return { event: '', entries }
}

interface ReportwormPlayer {
  name: string
  place: number
  record?: { w: number; l: number; t: number }
  drop?: number // round they dropped after, -1 if they didn't
  team?: { name: string; item?: string | null }[]
}

async function loadReportworm(id: string) {
  const res = await proxyGet('reportworm', `/api/v1/${id}`)
  if (!res.ok) throw new Error(t('ui.import.results.reportwormError', { status: res.status }))
  const data: { event?: { name?: string }; standings?: Record<string, ReportwormPlayer> } = JSON.parse(res.body)
  const entries = Object.values(data.standings ?? {})
    .sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity))
    .map((p): ResultEntry => {
      const unmatched: string[] = []
      const deck = (Array.isArray(p.team) ? p.team : []).filter((m) => m && typeof m.name === 'string')
      const team = deck.slice(0, 6).map((m) => {
        // Reportworm writes the dot in Mr. Mime / Mr. Rime / Mime Jr. as a dash ("Mr- Mime"),
        // and an empty item slot as "No Item".
        const species = m.name.replace(/-(?= |$)/g, '.')
        const pokemon = resolvePokemon(m.name) || resolvePokemon(species) || resolveRk9Species(m.name)
        const itemName = m.item && !/^no item$/i.test(m.item.trim()) ? m.item : ''
        const item = itemName ? resolveItem(itemName) : ''
        if (!pokemon) unmatched.push(m.name)
        if (itemName && !item) unmatched.push(itemName)
        return { pokemon, item, tera: '' }
      })
      return {
        name: String(p.name ?? '').trim(),
        placing: p.place ?? null,
        record: p.record ? formatRecord({ wins: p.record.w, losses: p.record.l, ties: p.record.t }) : '',
        team: [...team, ...Array.from({ length: 6 - team.length }, emptyMon)],
        hasTeam: deck.length > 0,
        unmatched: [...new Set(unmatched)],
      }
    })
  // Reportworm names most events without the season ("Latin America International"); the year
  // goes in front the way the event box's examples show it ("2027 Louisville Regionals").
  const season = id.split('/')[0]
  const name = data.event?.name?.trim() ?? ''
  return { event: name && !/^\d{4}\b/.test(name) ? `${season} ${name}` : name, entries }
}
