// Single-elimination top cut bracket: built from the standings (by seed) or from Limitless
// results, with winners clicked in by hand or imported.

import type { Bracket, Player } from '../types'
import type { BracketEntry, BracketView } from '../templates/types'

export type BracketSize = 2 | 4 | 8
export const BRACKET_SIZES: BracketSize[] = [2, 4, 8]

// Standard seeding, top to bottom: 1v8, 4v5, 2v7, 3v6 (so 1 and 2 can only meet in the final).
const SEED_ORDER: Record<BracketSize, number[]> = { 2: [1, 2], 4: [1, 4, 2, 3], 8: [1, 8, 4, 5, 2, 7, 3, 6] }

export const emptyBracket = (): Bracket => ({ size: 0, slots: [], winners: [] })

const emptyWinners = (size: number) => {
  const rounds: (0 | 1 | null)[][] = []
  for (let n = size / 2; n >= 1; n /= 2) rounds.push(Array(n).fill(null))
  return rounds
}

export function bracketFromStandings(players: Player[], size: BracketSize): Bracket {
  return { size, slots: SEED_ORDER[size].map((seed) => players[seed - 1]?.name ?? ''), winners: emptyWinners(size) }
}

export interface BracketMatch {
  names: [string, string]
  winner: 0 | 1 | null
}

/** Every round's matches, working out who advanced from the winners picked so far. */
export function bracketRounds(b: Bracket): { rounds: BracketMatch[][]; champion: string } {
  if (!b.size) return { rounds: [], champion: '' }
  const rounds: BracketMatch[][] = []
  let names = b.slots
  b.winners.forEach((ws, r) => {
    const matches = ws.map((winner, i) => ({ names: [names[i * 2] ?? '', names[i * 2 + 1] ?? ''] as [string, string], winner }))
    rounds.push(matches)
    names = matches.map((m) => (m.winner === null ? '' : m.names[m.winner]))
    if (r === b.winners.length - 1) names = names.slice(0, 1)
  })
  return { rounds, champion: names[0] ?? '' }
}

/** Pick (or un-pick) a match winner; later results that depended on it are cleared. */
export function setBracketWinner(b: Bracket, round: number, match: number, winner: 0 | 1): Bracket {
  const winners = b.winners.map((ws) => ws.slice())
  winners[round][match] = winners[round][match] === winner ? null : winner
  for (let r = round + 1, m = match >> 1; r < winners.length; r++, m >>= 1) winners[r][m] = null
  return { ...b, winners }
}

/**
 * Rebuild a bracket from Limitless top cut pairings (match codes like "T8-1", "T4-2", "T2-1").
 * Uses the largest round of 8 or fewer. `nameOf` turns a Limitless username into a display name.
 */
export function bracketFromLimitless(
  pairings: { match?: string; player1?: string; player2?: string; winner?: string | null }[],
  nameOf: (username: string) => string,
): Bracket {
  const byCode = new Map<string, (typeof pairings)[number]>()
  for (const p of pairings) if (p.match && /^T\d+-\d+$/.test(p.match)) byCode.set(p.match, p)
  const size = ([8, 4, 2] as const).find((s) => byCode.has(`T${s}-1`))
  if (!size) return emptyBracket()

  const slots: string[] = []
  for (let i = 1; i <= size / 2; i++) {
    const m = byCode.get(`T${size}-${i}`)
    slots.push(m?.player1 ? nameOf(m.player1) : '', m?.player2 ? nameOf(m.player2) : '')
  }
  let b: Bracket = { size, slots, winners: emptyWinners(size) }
  // Fill winners round by round, matching each Limitless result to the player who advanced.
  for (let r = 0, n = size; n >= 2; r++, n /= 2) {
    const { rounds } = bracketRounds(b)
    rounds[r].forEach((match, i) => {
      const winner = byCode.get(`T${n}-${i + 1}`)?.winner
      const idx = winner ? match.names.indexOf(nameOf(winner)) : -1
      if (idx === 0 || idx === 1) b = setBracketWinner(b, r, i, idx)
    })
  }
  return b
}

/** Bracket ready for templates: names matched to players (for their teams). */
export function bracketView(b: Bracket, players: Player[]): BracketView | null {
  if (!b.size) return null
  const entry = (name: string): BracketEntry => ({ name, player: players.find((p) => p.name === name) ?? null })
  const { rounds, champion } = bracketRounds(b)
  return {
    rounds: rounds.map((ms) => ms.map((m) => ({ entries: [entry(m.names[0]), entry(m.names[1])], winner: m.winner }))),
    champion: champion ? entry(champion) : null,
  }
}
