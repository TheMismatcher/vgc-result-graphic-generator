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
  preset: 'dmv' | 'glimwood' | 'custom' // built-in looks, or the user's own (saved brands)
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
  hue?: number // background colour for the Event Results graphic (colour-wheel degrees)
  colors?: { main: string; second: string } // Mosaic Event Results: the two gradient colours (#rrggbb); overrides hue
  kind?: 'regionals' | 'play' | 'internationals' | 'special' | 'worlds' // which event: badge + default colour
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

/** Custom Glass background photo: x/y = position in the frame (0..1, 0.5 = centred), zoom >= 1. */
export interface BackdropPhoto {
  src: string // JPEG data URL
  w: number
  h: number
  x: number
  y: number
  zoom: number
}

export interface AppState {
  brand: BrandSettings
  backdrop?: BackdropPhoto | null // Custom Glass photo; belongs to the user like branding (not saved in tournament files)
  customPanels?: { glass: number; solid: number } // Custom Glass panel opacity (0..1) for each Panels setting
  settings: {
    showMegas: boolean
    showCP: boolean
    // Last pick on the Preview's switch for paired styles; every paired style opens this way
    looks?: Partial<Record<'panels' | 'card' | 'champion', string>>
  }
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
