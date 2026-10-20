// How many players made top cut, for "Use top" after importing standings.

/**
 * Official top cut by attendance for VGC League Challenges and Cups: Play! Pokémon Tournament
 * Rules Handbook, 5.5.6.1 "Variant #1: VG Single Day" (single-elimination rounds → top cut).
 */
export function officialTopCut(players: number): number {
  if (players <= 7) return 0 // no top cut
  if (players === 8) return 2
  if (players <= 16) return 4
  if (players <= 226) return 8
  if (players <= 409) return 16
  return 32
}

/**
 * From the records: top cut players have played more games than the Swiss rounds everyone else
 * played (the most common game count; dropped players have fewer). If nobody has, the standings
 * are from before top cut, so use the official size for the attendance.
 */
export function suggestTopCut(records: string[], players = records.length): { top: number; from: 'records' | 'attendance' } {
  const games = records.map((r) => r.split('-').reduce((sum, n) => sum + Number(n), 0)).filter((g) => g > 0)
  const tally = new Map<number, number>()
  for (const g of games) tally.set(g, (tally.get(g) ?? 0) + 1)
  const swiss = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0
  const played = games.filter((g) => g > swiss).length
  // A real top cut is 2, 4, 8, …
  if ([2, 4, 8, 16, 32, 64].includes(played)) return { top: played, from: 'records' }
  const official = officialTopCut(players)
  return { top: official || Math.min(players, 8), from: 'attendance' }
}
