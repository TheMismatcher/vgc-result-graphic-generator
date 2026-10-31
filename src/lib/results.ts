// Import players (name, record, team) for the Event Results tab from a results link:
//   - Limitless (play.limitlesstcg.com/tournament/<id>): open to other websites, read directly.
//   - Pokédata (pokedata.ovh/standingsVGC/<id>/masters/): official Regionals, Internationals and
//     Worlds, one JSON file per division. It doesn't allow other websites, so requests go through
//     "/pokedata/…" on our own site (vite.config.ts locally, public/_redirects on Netlify).

import type { Mon } from '../types'
import { resolveItem, resolvePokemon } from '../data/dex'
import { emptyMon } from './state'
import { formatRecord, limitlessId, rankedStandings, toTeam, type LimitlessStanding } from './limitless'
import { resolveRk9Species } from './rk9'

export type ResultsSource = 'limitless' | 'pokedata'

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
  id: string
  division: 'masters' | 'seniors' | 'juniors' // Pokédata only
}

/** Which site a pasted link is from, and the event it points at. */
export function parseResultsLink(input: string): ResultsLink | null {
  const text = input.trim()
  const pd = text.match(/pokedata\.ovh\/standings(?:VGC)?\/(\d{7})(?:\/(masters|seniors|juniors))?/i)
  if (pd) return { source: 'pokedata', id: pd[1], division: (pd[2]?.toLowerCase() as ResultsLink['division']) ?? 'masters' }
  if (/limitlesstcg\.com/i.test(text)) {
    const id = limitlessId(text)
    if (id) return { source: 'limitless', id, division: 'masters' }
  }
  return null
}

const COUNTRY_SUFFIX = /\s*\[[A-Za-z]{2,3}\]\s*$/

export async function loadResults(link: ResultsLink): Promise<{ event: string; entries: ResultEntry[] }> {
  return link.source === 'limitless' ? loadLimitless(link.id) : loadPokedata(link)
}

async function loadLimitless(id: string) {
  const api = `https://play.limitlesstcg.com/api/tournaments/${id}`
  const [detailsRes, standingsRes] = await Promise.all([fetch(`${api}/details`), fetch(`${api}/standings`)])
  if (!detailsRes.ok || !standingsRes.ok) throw new Error("Couldn't load that tournament from Limitless. Check the link.")
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
  const res = await fetch(`/pokedata/standingsVGC/${id}/${division}/${id}_${label}.json`)
  if (!res.ok) throw new Error(`Pokédata didn't respond (${res.status}). Check the link, or try again in a moment.`)
  const players: PokedataPlayer[] = await res.json()
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
