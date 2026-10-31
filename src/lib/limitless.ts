// Import a tournament's standings and teams from Limitless (play.limitlesstcg.com).

import type { Bracket, Mon, Player, Tournament, UsageEntry } from '../types'
import { usageFromPlayers } from './usage'
import { bracketFromLimitless } from './bracket'
import { resolveItem, resolvePokemon } from '../data/dex'
import { FORMATS } from '../data/options'
import { emptyMon, newPlayer } from './state'

const API = 'https://play.limitlesstcg.com/api/tournaments'

export interface LimitlessPokemon { id: string; name: string; item?: string | null; tera?: string | null }
export interface LimitlessStanding {
  name: string
  player: string
  placing: number | null
  record: { wins: number; losses: number; ties: number }
  decklist: LimitlessPokemon[] | null
}
interface LimitlessDetails { name: string; date: string; format: string; players: number; decklists: boolean }

export interface LimitlessImport {
  tournament: Partial<Tournament>
  players: Player[]
  usage: { entries: UsageEntry[]; totalTeams: number } // whole field
  bracket: Bracket
  unmatched: string[]
  missingTeams: number // players whose team sheet is hidden or wasn't submitted
}

/** "https://play.limitlesstcg.com/tournament/6ac38c4f…/standings" -> "6ac38c4f…" */
export function limitlessId(input: string): string | null {
  const m = input.trim().match(/(?:tournament\/)?([a-f0-9]{24})/i)
  return m ? m[1].toLowerCase() : null
}

export async function importLimitless(id: string, top: number): Promise<LimitlessImport> {
  const [detailsRes, standingsRes, pairingsRes] = await Promise.all([
    fetch(`${API}/${id}/details`),
    fetch(`${API}/${id}/standings`),
    fetch(`${API}/${id}/pairings`),
  ])
  if (!detailsRes.ok || !standingsRes.ok) throw new Error("Couldn't load that tournament from Limitless. Check the link.")
  const details: LimitlessDetails = await detailsRes.json()
  const standings: LimitlessStanding[] = await standingsRes.json()
  const pairings = pairingsRes.ok ? await pairingsRes.json() : []
  const displayName = new Map(standings.map((s) => [s.player, s.name]))

  const unmatched: string[] = []
  let missingTeams = 0
  const ranked = rankedStandings(standings)
  const players = ranked.slice(0, top).map((s) => {
    const team = toTeam(s.decklist, unmatched)
    if (!s.decklist?.length) missingTeams++
    return { ...newPlayer(), name: s.name, record: formatRecord(s.record), team }
  })

  // Limitless formats look like "M-C"; match them to "VGC 2026 - Regulation M-C".
  const format = FORMATS.find((f) => f.name.endsWith(`Regulation ${details.format}`))
  return {
    tournament: {
      name: details.name,
      date: details.date.slice(0, 10),
      format: format?.name ?? 'Custom Format',
      customFormat: format ? '' : details.format,
      divisions: { masters: details.players, seniors: '', juniors: '' },
    },
    players,
    usage: usageFrom(ranked),
    bracket: bracketFromLimitless(pairings, (username) => displayName.get(username) ?? username),
    unmatched: [...new Set(unmatched)],
    missingTeams,
  }
}

/** Players in final order (dropped players without a placing go last). */
export const rankedStandings = (standings: LimitlessStanding[]) =>
  standings.slice().sort((a, b) => (a.placing ?? Infinity) - (b.placing ?? Infinity))

export const formatRecord = ({ wins, losses, ties }: LimitlessStanding['record']) => `${wins}-${losses}${ties ? `-${ties}` : ''}`

export function toTeam(decklist: LimitlessPokemon[] | null, unmatched: string[]): Mon[] {
  const team = (decklist ?? []).slice(0, 6).map((p) => {
    const pokemon = resolvePokemon(p.id) || resolvePokemon(p.name)
    const item = p.item ? resolveItem(p.item) : ''
    if (!pokemon) unmatched.push(p.name)
    if (p.item && !item) unmatched.push(p.item)
    return { pokemon, item, tera: (p.tera ?? '').toLowerCase() }
  })
  return [...team, ...Array.from({ length: 6 - team.length }, emptyMon)]
}

/** Usage across the given players' team sheets (players without a public team are skipped). */
function usageFrom(standings: LimitlessStanding[]) {
  const withTeams = standings.filter((s) => s.decklist?.length)
  const teams = withTeams.map((s) => ({ ...newPlayer(), team: toTeam(s.decklist, []) }))
  return { entries: usageFromPlayers(teams), totalTeams: teams.length }
}

/** Usage only: count the whole field, or just the top N. */
export async function importLimitlessUsage(id: string, countTop: number | null) {
  const res = await fetch(`${API}/${id}/standings`)
  if (!res.ok) throw new Error("Couldn't load that tournament from Limitless. Check the link.")
  const ranked = rankedStandings(await res.json())
  return usageFrom(countTop ? ranked.slice(0, countTop) : ranked)
}
