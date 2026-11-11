// Shared bits for the landscape (1920x1080) layouts and their per-style designs (designs/*).
import type { Player } from '../../types'
import type { StandingsData } from '../types'

export type Kind = 'rows' | 'spotlight' | 'columns' | 'plain'
export const W = 1920
export const H = 1080
/** 4 or fewer players: bigger cards and sprites. */
export const few = (data: StandingsData) => data.players.length <= 4
/** No Photos columns: up to 6 players the team is a 2-across grid (wider columns), 7-8 a single stack. */
export const plainGrid = (data: StandingsData) => data.players.length <= 6
/** No Photos columns: sprite size for [4 or fewer, 5, 6, 7-8] players. */
export const plainMon = (data: StandingsData, s: [number, number, number, number]) => {
  const n = data.players.length
  return n <= 4 ? s[0] : n === 5 ? s[1] : n === 6 ? s[2] : s[3]
}
/** Record and handle on one line. */
export const sub = (p: Player) => [p.record, p.social].filter(Boolean).join('  ·  ')
/** Two-digit numeral (01, 02, ...), the Editorial way. */
export const num = (i: number) => String(i + 1).padStart(2, '0')
/** Event facts without the format (it gets its own line). */
export const factsOf = (d: StandingsData) => [d.typeLabel, d.dateLabel, d.playerCount ? `${d.playerCount} Players` : ''].filter(Boolean)
