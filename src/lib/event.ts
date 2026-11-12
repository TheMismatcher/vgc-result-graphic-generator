import type { AppState, Tournament } from '../types'
import type { EventInfo, StandingsData } from '../templates/types'
import { bracketView } from './bracket'
import { cpEventFor, cpFor } from './cp'
import { formatByName, gtFormatName, tournamentTypeName } from '../data/options'
import { gt, gtDate } from '../i18n'

export function eventInfo(t: Tournament): EventInfo {
  const format = formatByName(t.format)
  const [y, m, d] = t.date.split('-').map(Number)
  const dateLabel = y ? gtDate(y, m, d) : ''
  const { masters, seniors, juniors } = t.divisions
  return {
    tournament: t,
    format,
    formatLabel: format.name === 'Custom Format' ? t.customFormat : gtFormatName(format.name),
    typeLabel: tournamentTypeName(t.type),
    dateLabel,
    playerCount: Number(masters || 0) + Number(seniors || 0) + Number(juniors || 0),
  }
}

/** Everything a standings template needs, trimmed to how many players it shows. */
export function standingsData(state: AppState, maxPlayers: number): StandingsData {
  const event = eventInfo(state.tournament)
  const kind = cpEventFor(state.tournament.type)
  // Kickers count players in the division; use the Masters count when entered, otherwise the total.
  const players = Number(state.tournament.divisions.masters) || event.playerCount
  return {
    ...event,
    players: state.players.slice(0, maxPlayers),
    bracket: bracketView(state.bracket, state.players),
    cp: state.settings.showCP ? (place) => cpFor(place, players, kind) : null,
    cpEventLabel: gt(kind === 'cup' ? 'term.eventType.cup' : 'term.eventType.challenge'),
  }
}
