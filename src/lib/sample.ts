// Example tournament for trying out templates (also handy for artists previewing a design).

import type { AppState, Mon } from '../types'
import { initialState } from './state'
import { DMV_BRAND } from '../brand'
import { usageFromPlayers } from './usage'
import { bracketFromStandings, setBracketWinner } from './bracket'

const t = (...mons: [string, string][]): Mon[] => mons.map(([pokemon, item]) => ({ pokemon, item, tera: '' }))

const TEAMS: Mon[][] = [
  t(['garchomp-mega-z', 'garchompite-z'], ['incineroar', 'sitrus-berry'], ['kingambit', 'black-glasses'], ['whimsicott', 'focus-sash'], ['rotom-wash', 'leftovers'], ['amoonguss', 'rocky-helmet']),
  t(['dragonite-mega', 'dragoninite'], ['sinistcha', 'sitrus-berry'], ['torkoal', 'charcoal'], ['venusaur', 'life-orb'], ['farigiraf', 'safety-goggles'], ['gholdengo', 'choice-specs']),
  t(['charizard-mega-y', 'charizardite-y'], ['incineroar', 'safety-goggles'], ['garchomp', 'choice-scarf'], ['milotic', 'leftovers'], ['kingambit', 'lum-berry'], ['pelipper', 'focus-sash']),
  t(['lucario-mega-z', 'lucarionite-z'], ['tyranitar', 'chople-berry'], ['excadrill', 'life-orb'], ['amoonguss', 'sitrus-berry'], ['rotom-heat', 'choice-scarf'], ['dragapult', 'focus-sash']),
  t(['glimmora-mega', 'glimmoranite'], ['incineroar', 'sitrus-berry'], ['basculegion-male', 'choice-scarf'], ['sinistcha', 'leftovers'], ['kingambit', 'black-glasses'], ['talonflame', 'sharp-beak']),
  t(['froslass-mega', 'froslassite'], ['gholdengo', 'leftovers'], ['garchomp', 'yache-berry'], ['primarina', 'throat-spray'], ['incineroar', 'sitrus-berry'], ['whimsicott', 'focus-sash']),
  t(['delphox-mega', 'delphoxite'], ['milotic', 'sitrus-berry'], ['kingambit', 'lum-berry'], ['farigiraf', 'throat-spray'], ['dragonite', 'choice-band'], ['amoonguss', 'rocky-helmet']),
  t(['chandelure-mega', 'chandelurite'], ['tyranitar', 'assault-vest'], ['excadrill', 'focus-sash'], ['incineroar', 'sitrus-berry'], ['rotom-wash', 'leftovers'], ['sinistcha', 'mental-herb']),
]

const NAMES = ['Ash Ketchum', 'Misty Waterflower', 'Brock Harrison', 'Dawn Berlitz', 'Serena Yvonne', 'Gary Oak', 'Iris Opelucid', 'Cynthia Shirona']
const RECORDS = ['8-1', '7-2', '7-1', '6-2', '6-2', '5-3', '5-3', '5-3']

export const sampleState = (): AppState => {
  const base = initialState()
  const state: AppState = {
    ...base,
    tournament: {
      ...base.tournament,
      name: 'DMV Fall League Cup',
      type: 'cup',
      divisions: { masters: 48, seniors: 6, juniors: 4 },
    },
    players: TEAMS.map((team, i) => ({
      uid: crypto.randomUUID(),
      name: NAMES[i],
      record: RECORDS[i],
      social: i < 3 ? `@${NAMES[i].split(' ')[0].toLowerCase()}vgc` : '',
      team,
    })),
  }
  const day2Players = state.players.slice(0, 2).map((p, i) => ({ ...p, uid: crypto.randomUUID(), record: ['7-1', '6-2'][i] }))
  // Team battle: 7 sets between two made-up teams, reusing the sample players' teams.
  const copy = (i: number) => ({ ...state.players[i % 8], uid: crypto.randomUUID(), record: '', social: '' })
  const results: [number, number][] = [[2, 1], [0, 2], [2, 0], [1, 2], [2, 1], [2, 0], [1, 2]]
  const sets = results.map(([x, y], i) => ({
    uid: crypto.randomUUID(),
    link: '',
    players: [copy(i), copy(i + 4)] as [typeof state.players[0], typeof state.players[0]],
    score: [x, y] as [number, number],
    winner: (x > y ? 0 : 1) as 0 | 1,
  }))
  // Top 8 bracket where the higher seed always wins, matching the standings (1st beats 2nd in the final).
  let bracket = bracketFromStandings(state.players, 8)
  bracket.winners.forEach((round, r) => round.forEach((_, m) => (bracket = setBracketWinner(bracket, r, m, 0))))

  return {
    ...state,
    // Usage from the 8 sample teams.
    usage: { entries: usageFromPlayers(state.players), totalTeams: state.players.length, countTop: '' },
    bracket,
    // Replay tab: the final, 1st vs 2nd, won 2–1.
    match: {
      ...base.match,
      players: [copy(0), copy(1)],
      score: [2, 1],
      winner: 0,
      round: 'Top Cut Finals',
      bestOf: 3,
      gamesPlayed: 3,
    },
    day2: { ...base.day2, event: '2027 Louisville Regionals', players: day2Players, selected: day2Players[0].uid },
    teamBattle: {
      league: 'USPL',
      week: 'Week 5',
      teams: [
        { name: 'DMV Falinks', logo: DMV_BRAND.logo, record: '4-1' },
        { name: 'Rival Squad', logo: '', record: '3-2' },
      ],
      sets,
    },
  }
}
