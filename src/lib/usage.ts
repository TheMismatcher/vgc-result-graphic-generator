import type { Player, UsageEntry } from '../types'

/** Count how many of the given players' teams use each Pokémon, most used first. */
export function usageFromPlayers(players: Player[]): UsageEntry[] {
  const counts = new Map<string, number>()
  for (const p of players) {
    for (const id of new Set(p.team.map((m) => m.pokemon).filter(Boolean))) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return [...counts].map(([pokemon, count]) => ({ pokemon, count })).sort((a, b) => b.count - a.count)
}

export const percent = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0)
