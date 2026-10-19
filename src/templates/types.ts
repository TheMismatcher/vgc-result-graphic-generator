// The contract between the generator and a template.
//
// A template is a fixed-size React component (e.g. 1080x1350) that receives
// ready-to-draw data. It never edits state, so a new design can be added by
// creating a folder and registering it in ./registry.ts. See TEMPLATES.md.

import type { JSX } from 'react'
import type { Format, Player, Tournament } from '../types'

export interface EventInfo {
  tournament: Tournament
  format: Format
  formatLabel: string // custom name when "Custom Format" is picked
  typeLabel: string // e.g. "League Cup"
  dateLabel: string // e.g. "October 9, 2026"
  playerCount: number // 0 if not entered
}

export interface BracketEntry {
  name: string
  player: Player | null // the matching player from the standings (for their team), if any
}

export interface BracketView {
  rounds: { entries: [BracketEntry, BracketEntry]; winner: 0 | 1 | null }[][]
  champion: BracketEntry | null
}

export interface StandingsData extends EventInfo {
  players: Player[] // ordered by placing, already trimmed to the template's maxPlayers
  bracket: BracketView | null // top cut bracket, if one was set up
  /** Championship Points earned for a 1-based placing, when "Show CP earned" is on; null when off. */
  cp: ((place: number) => number) | null
  cpEventLabel: string // "League Cup" / "League Challenge"
}

export interface UsageData extends EventInfo {
  entries: { pokemon: string; count: number; percent: number }[]
  totalTeams: number
}

export interface MatchData extends EventInfo {
  players: [Player, Player]
  score: [number, number]
  winner: 0 | 1 | null
  round: string
  bestOf: number // 1 = single game
  gamesPlayed: number
}

export interface Day2Data {
  event: string
  caption: string
  player: Player
  format: Format
  hue?: number // background colour for templates that support it (degrees on the colour wheel)
}

export interface TeamBattleData {
  league: string
  week: string
  teams: [{ name: string; logo: string; record: string }, { name: string; logo: string; record: string }]
  sets: { players: [Player, Player]; score: [number, number]; winner: 0 | 1 | null }[]
  score: [number, number] // sets won by each team
  winner: 0 | 1 | null
  format: Format
}

interface TemplateBase {
  id: string
  name: string
  description: string
  width: number
  height: number
}

export interface StandingsTemplate extends TemplateBase {
  kind: 'standings'
  maxPlayers: number
  Component: (props: { data: StandingsData }) => JSX.Element
}

export interface UsageTemplate extends TemplateBase {
  kind: 'usage'
  maxEntries: number
  Component: (props: { data: UsageData }) => JSX.Element
}

export interface MatchTemplate extends TemplateBase {
  kind: 'match'
  Component: (props: { data: MatchData }) => JSX.Element
}

export interface Day2Template extends TemplateBase {
  kind: 'day2'
  Component: (props: { data: Day2Data }) => JSX.Element
}

export interface TeamBattleTemplate extends TemplateBase {
  kind: 'teamBattle'
  Component: (props: { data: TeamBattleData }) => JSX.Element
}

export type Template = StandingsTemplate | UsageTemplate | MatchTemplate | Day2Template | TeamBattleTemplate
