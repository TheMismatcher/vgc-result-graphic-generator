import type { EventInfo } from '../types'

/** The small facts under a title: type, date, format, player count. */
export function eventFacts(e: EventInfo) {
  return [e.typeLabel, e.dateLabel, e.formatLabel, e.playerCount ? `${e.playerCount} Players` : ''].filter(Boolean)
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Card color for a 2-column grid: 1st is gold, the rest alternate blue/red in a checkerboard. */
export const cardColor = (i: number) => (i === 0 ? 'first' : (Math.floor(i / 2) + (i % 2)) % 2 ? 'red' : 'blue')
