// Core data shapes. Everything the forms edit and every template reads lives here.

export interface Mon {
  pokemon: string // PokeAPI id, e.g. "garchomp-mega-z"; "" = empty slot
  item: string // PokeAPI item id, e.g. "choice-scarf"; "" = none
  tera: string // type id, e.g. "fairy"; "" = none
}

export interface Player {
  uid: string
  name: string
  record: string // e.g. "6-1-0"
  social: string // e.g. "@handle"
  team: Mon[] // always 6 slots
  photo?: string // resized JPEG data URL, for photo templates
  photoY?: number // vertical framing of the photo, 0 = top, 100 = bottom
  wins?: number
  losses?: number
  ties?: number
  finalStanding?: number
  division?: 'masters' | 'seniors' | 'juniors';
}

export interface Tournament {
  name: string
  type: string // TournamentType id
  date: string // yyyy-mm-dd
  format: string // Format name
  customFormat: string
  divisions: { masters: number | ''; seniors: number | ''; juniors: number | '' }
}

export interface UsageEntry {
  pokemon: string
  count: number
}

export interface Bracket {
  size: 0 | 2 | 4 | 8 // 0 = no bracket
  slots: string[] // first-round player names, top to bottom
  winners: (0 | 1 | null)[][] // per round, per match: top (0) or bottom (1) player won
}

export interface Match {
  links: string // replay links as typed
  games: { id: string; game: number | null; winner: string | null }[]
  players: [Player, Player]
  score: [number | '', number | '']
  winner: 0 | 1 | null
  round: string // e.g. "Top 8 · Game 3"
  bestOf?: number // 3 = best-of-3 (from the replay)
  gamesPlayed?: number
}

export interface BrandSettings {
  preset: 'dmv' | 'custom'
  name: string
  tagline: string
  logo: string // PNG data URL
  colors: { main: string; second: string; highlight: string }
  savedId?: string // which saved brand this is (Branding tab), so edits update it
}

export interface Day2 {
  rk9: string // RK9 tournament link
  event: string // top bar, e.g. "2027 Louisville Regionals"
  caption: string // bar on the photo, e.g. "DMV TO DAY 2"
  players: Player[]
  selected: string // uid of the player shown in the preview
  hue?: number // background colour for the Regional Results graphic (colour-wheel degrees)
}

export interface TeamSide {
  name: string
  logo: string // PNG data URL, or ''
  record: string // season record, e.g. "4-1"
}

export interface TeamSet {
  uid: string
  link: string // Showdown replay (last game of the set)
  players: [Player, Player] // [0] plays for team A (left), [1] for team B (right)
  score: [number | '', number | '']
  winner: 0 | 1 | null // which side won the set
}

export interface TeamBattle {
  league: string // e.g. "USPL"
  week: string // e.g. "Week 5"
  teams: [TeamSide, TeamSide]
  sets: TeamSet[]
}

export interface AppState {
  brand: BrandSettings
  settings: { showMegas: boolean; showCP: boolean }
  tournament: Tournament
  players: Player[] // ordered by placing: index 0 = 1st place
  bracket: Bracket
  usage: { entries: UsageEntry[]; totalTeams: number | ''; countTop: number | '' }
  match: Match
  day2: Day2
  teamBattle: TeamBattle
  templates: { standings: string; usage: string; match: string; day2: string; teamBattle: string } // selected template ids
}

export interface Format {
  name: string
  tera: boolean
  items: boolean
}
