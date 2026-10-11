// Read Pokémon Showdown replays: players, full teams (from open team sheets), winner,
// and the other games of a best-of-3 set.

import type { Mon } from '../types'
import { resolveItem, resolvePokemon } from '../data/dex'
import { emptyMon } from './state'

const BASE = 'https://replay.pokemonshowdown.com'

export interface ReplayGame {
  id: string
  formatId: string
  format: string
  uploadtime: number
  players: [string, string]
  teams: [Mon[], Mon[]]
  hasTeamSheets: boolean // false = only species from team preview, no items
  winner: string | null // player name, null for a tie
  game: number | null // 1, 2, 3 within a best-of set
  setId: string | null // shared by every game of the same best-of set
  bestOf: number // 3 for a best-of-3, 1 for a single game
  priorWins: Record<string, number> | null // set score going INTO this game (by player id), from Showdown's scoreboard
  unmatched: string[]
}

const toID = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** "https://replay.pokemonshowdown.com/gen9…-123?p2" -> "gen9…-123" */
export function replayId(input: string): string | null {
  const m = input.trim().match(/(?:replay\.pokemonshowdown\.com\/|^)([a-z0-9]+-\d+(?:-[a-z0-9]+pw)?)(?:\.json|\.log)?(?:[?#].*)?$/i)
  return m ? m[1].toLowerCase() : null
}

export async function fetchReplay(id: string): Promise<ReplayGame> {
  const res = await fetch(`${BASE}/${id}.json`)
  if (res.status === 404) throw new Error(`Replay "${id}" wasn't found. It may be private or never uploaded.`)
  if (!res.ok) throw new Error(`Couldn't load replay "${id}" (${res.status}).`)
  const data = await res.json()
  return { id: data.id, formatId: data.formatid, format: data.format, uploadtime: data.uploadtime, ...parseLog(data.log) }
}

export function parseLog(log: string) {
  const lines = log.split('\n')
  const names: Record<string, string> = {}
  const sheets: Record<string, Mon[]> = {}
  const preview: Record<string, string[]> = { p1: [], p2: [] }
  const unmatched: string[] = []
  let winner: string | null = null
  let game: number | null = null
  let setId: string | null = null
  let priorWins: Record<string, number> | null = null

  for (const line of lines) {
    const parts = line.split('|')
    switch (parts[1]) {
      case 'player':
        if (parts[3] && !names[parts[2]]) names[parts[2]] = parts[3]
        break
      case 'poke':
        preview[parts[2]]?.push(parts[3].split(',')[0])
        break
      case 'showteam':
        sheets[parts[2]] = unpackTeam(parts.slice(3).join('|'), unmatched)
        break
      case 'win':
        winner = parts[2]
        break
      case 'html':
        // Best-of sets open each game with a scoreboard: one filled circle per game won so far.
        if (!priorWins && line.includes('fa-circle')) priorWins = parseScoreboard(line)
        break
      case 'uhtml': {
        const m = line.match(/Game (\d+)<\/strong> of <a href="\/(game-bestof\d+-[^"]+)"/)
        if (m) {
          game = Number(m[1])
          setId = m[2]
        }
        break
      }
    }
  }

  const team = (side: 'p1' | 'p2'): Mon[] => {
    if (sheets[side]) return sheets[side]
    const mons = preview[side].map((species) => {
      const pokemon = resolvePokemon(species)
      if (!pokemon) unmatched.push(species)
      return { ...emptyMon(), pokemon }
    })
    return [...mons, ...Array.from({ length: 6 - mons.length }, emptyMon)].slice(0, 6)
  }

  return {
    players: [names.p1 ?? 'Player 1', names.p2 ?? 'Player 2'] as [string, string],
    teams: [team('p1'), team('p2')] as [Mon[], Mon[]],
    hasTeamSheets: Boolean(sheets.p1 && sheets.p2),
    winner,
    game,
    setId,
    bestOf: Number(setId?.match(/bestof(\d+)/)?.[1] ?? 1),
    priorWins,
    unmatched,
  }
}

/**
 * Showdown's set scoreboard, e.g. for Game 3 of a 1–1 set:
 *   <tr><td align="left">jinzo04</td><td align="right">twexxx</tr>
 *   <tr><td …><i class="fa fa-circle"></i> <i class="fa fa-circle-o"></i></td><td …><i class="fa fa-circle-o"></i> <i class="fa fa-circle"></i></tr>
 * Filled circles ("fa-circle") are games won; empty ones ("fa-circle-o") are not.
 */
function parseScoreboard(html: string): Record<string, number> | null {
  const rows = html.split(/<tr>/i).slice(1)
  if (rows.length < 2) return null
  const names = [...rows[0].matchAll(/<td[^>]*>([^<]+)/g)].map((m) => m[1].trim())
  const counts = rows[1].split(/<td[^>]*>/).slice(1).map((cell) => (cell.match(/fa-circle"/g) ?? []).length)
  if (names.length !== 2 || counts.length !== 2) return null
  return { [toID(names[0])]: counts[0], [toID(names[1])]: counts[1] }
}

/**
 * Showdown "packed" team format, one Pokémon per "]":
 * name|species|item|ability|moves|nature|evs|gender|ivs|shiny|level|happiness,pokeball,hptype,gmax,dmaxlevel,teratype
 */
function unpackTeam(packed: string, unmatched: string[]): Mon[] {
  const mons = packed
    .split(']')
    .filter(Boolean)
    .slice(0, 6)
    .map((entry) => {
      const f = entry.split('|')
      const species = f[1] || f[0]
      const pokemon = resolvePokemon(species)
      const item = f[2] ? resolveItem(f[2]) : ''
      if (!pokemon) unmatched.push(species)
      if (f[2] && !item) unmatched.push(f[2])
      const tera = (f[11] ?? '').split(',')[5] ?? ''
      return { pokemon, item, tera: tera.toLowerCase() }
    })
  return [...mons, ...Array.from({ length: 6 - mons.length }, emptyMon)]
}

/**
 * Given one game of a best-of set, find the other games by searching the player's
 * recent replays for ones from the same set. Only finds games that were uploaded.
 */
export async function findSetGames(game: ReplayGame): Promise<ReplayGame[]> {
  if (!game.setId) return [game]
  const params = new URLSearchParams({ user: toID(game.players[0]), format: game.formatId })
  const res = await fetch(`${BASE}/search.json?${params}`)
  if (!res.ok) return [game]
  const results: { id: string; uploadtime: number }[] = await res.json()
  const nearby = results
    .filter((r) => r.id !== game.id && Math.abs(r.uploadtime - game.uploadtime) < 3 * 60 * 60)
    .slice(0, 8)
  const others = await Promise.all(nearby.map((r) => fetchReplay(r.id).catch(() => null)))
  return [game, ...others.filter((g): g is ReplayGame => g?.setId === game.setId)].sort((a, b) => (a.game ?? 0) - (b.game ?? 0))
}

export interface MatchSummary {
  names: [string, string]
  teams: [Mon[], Mon[]]
  score: [number, number]
  winner: 0 | 1 | null
  bestOf: number
  gamesPlayed: number
  fromScoreboard: boolean // score read from the last game's scoreboard (earlier games not needed)
}

/** Combine games of a set: players in the first game's order, wins counted by name. */
export function summarize(games: ReplayGame[]): MatchSummary {
  const first = games[0]
  const names = first.players
  const last = games.reduce((a, b) => ((b.game ?? 0) > (a.game ?? 0) ? b : a))
  const score: [number, number] = [0, 0]
  const fromScoreboard = Boolean(last.priorWins)
  if (last.priorWins) {
    // Score going into the latest game, plus that game's result.
    names.forEach((n, i) => {
      score[i] = (last.priorWins![toID(n)] ?? 0) + (last.winner && toID(last.winner) === toID(n) ? 1 : 0)
    })
  } else {
    for (const g of games) {
      if (!g.winner) continue
      const i = names.findIndex((n) => toID(n) === toID(g.winner!))
      if (i >= 0) score[i]++
    }
  }
  const teamFor = (name: string): Mon[] => {
    for (const g of games) {
      const i = g.players.findIndex((n) => toID(n) === toID(name))
      if (i >= 0 && g.hasTeamSheets) return g.teams[i]
    }
    return first.teams[names.indexOf(name)]
  }
  return {
    names,
    teams: [teamFor(names[0]), teamFor(names[1])],
    score,
    winner: score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1,
    bestOf: last.bestOf,
    gamesPlayed: last.game ?? games.length,
    fromScoreboard,
  }
}
