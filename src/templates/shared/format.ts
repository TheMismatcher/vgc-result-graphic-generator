import type { EventInfo } from '../types'
import { gt, gtOrdinal } from '../../i18n'

/** The small facts under a title: type, date, format, player count. */
export function eventFacts(e: EventInfo) {
  return [e.typeLabel, e.dateLabel, e.formatLabel, e.playerCount ? gt('gfx.facts.players', { count: e.playerCount }) : ''].filter(Boolean)
}

/** 1st, 2nd, 3rd… in the graphics' language. */
export const ordinal = gtOrdinal

/** Card color for a 2-column grid: 1st is gold, the rest alternate blue/red in a checkerboard. */
export const cardColor = (i: number) => (i === 0 ? 'first' : (Math.floor(i / 2) + (i % 2)) % 2 ? 'red' : 'blue')

/** Card color for a single column or row: 1st is gold, then red, blue, red, blue... (cardColor's checkerboard
 *  gives red, red, blue, blue in a line). */
export const lineColor = (i: number) => (i === 0 ? 'first' : i % 2 ? 'red' : 'blue')

/**
 * Class for a Top Cut list that should fill the page: `few` for 4 players or fewer (taller rows, bigger names,
 * team as a 3 x 2 grid), `mid nN` for 5-7 (rows share the height 8 rows would use; shared/brand.css sets --n so a
 * style can write `calc(<height of 8 rows + gaps> - (var(--n) - 1) * gap) / var(--n)`), nothing for 8.
 */
export const fillClass = (players: number) => (players <= 4 ? 'few' : players < 8 ? `mid n${players}` : '')
export const isMid = (players: number) => players > 4 && players < 8
