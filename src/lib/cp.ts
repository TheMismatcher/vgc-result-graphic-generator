// Championship Points for League Challenges and League Cups, from the official
// 2027 season tables (championships.pokemon.com, "League Challenge & League Cup").
// A placing only earns CP when attendance reaches its kicker (minimum players).
// Update these numbers when Play! Pokémon publishes a new season's tables.

export type CpEvent = 'challenge' | 'cup'

interface Tier { upTo: number; kicker: number; cp: number } // places 1..upTo after the previous tier

export const CP_TABLES: Record<CpEvent, Tier[]> = {
  challenge: [
    { upTo: 1, kicker: 0, cp: 15 },
    { upTo: 2, kicker: 4, cp: 12 },
    { upTo: 4, kicker: 8, cp: 10 },
    { upTo: 8, kicker: 14, cp: 8 },
    { upTo: 16, kicker: 25, cp: 6 },
    { upTo: 32, kicker: 48, cp: 4 },
  ],
  cup: [
    { upTo: 1, kicker: 0, cp: 50 },
    { upTo: 2, kicker: 4, cp: 40 },
    { upTo: 4, kicker: 8, cp: 32 },
    { upTo: 8, kicker: 17, cp: 25 },
    { upTo: 16, kicker: 48, cp: 20 },
    { upTo: 32, kicker: 80, cp: 16 },
    { upTo: 64, kicker: 128, cp: 13 },
  ],
}

/** CP earned for finishing in `place` (1-based) with `players` in the division; 0 if below the kicker. */
export function cpFor(place: number, players: number, event: CpEvent): number {
  const tier = CP_TABLES[event].find((t) => place <= t.upTo)
  return tier && players >= tier.kicker ? tier.cp : 0
}

export const cpEventFor = (tournamentType: string): CpEvent => (tournamentType === 'challenge' ? 'challenge' : 'cup')
