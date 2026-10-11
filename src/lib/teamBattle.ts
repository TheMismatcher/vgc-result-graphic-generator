// Team battles (e.g. USPL weeks): two teams play several one-on-one sets. Each set is loaded from
// a Showdown replay of its last game, which carries the set score (see replay.ts).

import type { TeamBattle, TeamSet } from '../types'
import type { TeamBattleData } from '../templates/types'
import type { Format } from '../types'
import { fetchReplay, replayId, summarize } from './replay'
import { newPlayer } from './state'

const toID = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Load one set from a replay link. `teamAPlayers` are names already known to play for team A
 * (from other sets), so the players land on the right side when possible.
 */
export async function loadSet(set: TeamSet, link: string, teamAPlayers: string[], teamBPlayers: string[]): Promise<{ set: TeamSet; notes: string[] }> {
  const id = replayId(link)
  if (!id) throw new Error('That isn’t a Showdown replay link.')
  const game = await fetchReplay(id)
  const sum = summarize([game])
  let order: [0 | 1, 0 | 1] = [0, 1]
  const knownA = new Set(teamAPlayers.map(toID))
  const knownB = new Set(teamBPlayers.map(toID))
  if (knownA.has(toID(sum.names[1])) || knownB.has(toID(sum.names[0]))) order = [1, 0]

  const notes: string[] = []
  if (sum.bestOf > 1 && Math.max(...sum.score) < Math.ceil(sum.bestOf / 2)) {
    notes.push(`Set isn’t finished in this replay (${sum.score[0]}–${sum.score[1]}); paste the last game of the set.`)
  }
  if (!game.hasTeamSheets) notes.push('No team sheets in this replay, so items are missing.')
  if (game.unmatched.length) notes.push(`Couldn’t match: ${game.unmatched.join(', ')}.`)

  const winner = sum.winner === null ? null : sum.winner === order[0] ? 0 : 1
  return {
    set: {
      ...set,
      link,
      players: order.map((i, side) => ({ ...newPlayer(), uid: set.players[side].uid, name: sum.names[i], team: sum.teams[i] })) as TeamSet['players'],
      score: [sum.score[order[0]], sum.score[order[1]]],
      winner,
    },
    notes,
  }
}

/** Put each player on the other team (when the replay listed them in the opposite order). */
export const swapSides = (set: TeamSet): TeamSet => ({
  ...set,
  players: [set.players[1], set.players[0]],
  score: [set.score[1], set.score[0]],
  winner: set.winner === null ? null : set.winner === 0 ? 1 : 0,
})

/** Sets won by each team, counting only sets with a winner. */
export function teamScore(battle: TeamBattle): [number, number] {
  const score: [number, number] = [0, 0]
  for (const s of battle.sets) if (s.winner !== null) score[s.winner]++
  return score
}

export function teamBattleData(battle: TeamBattle, format: Format): TeamBattleData {
  const score = teamScore(battle)
  const num = (v: number | '') => (v === '' ? 0 : v)
  return {
    league: battle.league,
    week: battle.week,
    teams: battle.teams,
    sets: battle.sets
      .filter((s) => s.players.some((p) => p.name) || s.winner !== null)
      .map((s) => ({ players: s.players, score: [num(s.score[0]), num(s.score[1])], winner: s.winner })),
    score,
    winner: score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1,
    format,
  }
}
