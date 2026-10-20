import { useEffect, useRef, useState } from 'react'
import type { AppState, Mon, Player, TeamSet } from '../types'
import { FORMATS } from '../data/options'
import { defaultBrandSettings } from '../brand'

export const emptyMon = (): Mon => ({ pokemon: '', item: '', tera: '' })
export const emptyTeam = (): Mon[] => Array.from({ length: 6 }, emptyMon)
export const newPlayer = (): Player => ({ uid: crypto.randomUUID(), name: '', record: '', social: '', team: emptyTeam() })
export const newTeamSet = (): TeamSet => ({ uid: crypto.randomUUID(), link: '', players: [newPlayer(), newPlayer()], score: ['', ''], winner: null })

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const initialState = (): AppState => ({
  brand: defaultBrandSettings(),
  settings: { showMegas: true, showCP: false },
  tournament: {
    name: '',
    type: 'grassroots',
    date: today(),
    format: FORMATS[0].name,
    customFormat: '',
    divisions: { masters: '', seniors: '', juniors: '' },
  },
  players: [newPlayer()],
  bracket: { size: 0, slots: [], winners: [] },
  usage: { entries: [], totalTeams: '', countTop: '' },
  match: { links: '', games: [], players: [newPlayer(), newPlayer()], score: ['', ''], winner: null, round: '' },
  day2: { rk9: '', event: '', caption: 'DMV TO DAY 2', players: [], selected: '' },
  teamBattle: {
    league: '',
    week: '',
    teams: [
      { name: '', logo: '', record: '' },
      { name: '', logo: '', record: '' },
    ],
    sets: Array.from({ length: 7 }, newTeamSet),
  },
  templates: { standings: '', usage: '', match: '', day2: '', teamBattle: '' },
})

/**
 * True if the data on screen matches one of `baselines` (e.g. the untouched sample or an empty
 * tournament). Ignores branding, display settings, chosen templates, the date, and random IDs.
 */
export function isUnchanged(state: AppState, baselines: AppState[]): boolean {
  const key = (s: AppState) =>
    JSON.stringify({ ...s, brand: null, settings: null, templates: null, tournament: { ...s.tournament, date: null } }).replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      'id',
    )
  const mine = key(state)
  return baselines.some((b) => key(b) === mine)
}

const KEY = 'dmv-generator:v1'

/**
 * App state that survives a page refresh (saved in this browser only).
 * `firstVisit` builds the state for someone who has never used the app (e.g. the sample).
 * `onSaveFailed` is called when saving fails (storage full).
 */
export function usePersistentState(firstVisit: () => AppState = initialState, onSaveFailed?: () => void) {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const base = initialState()
        // Older saves may lack newer sections (e.g. match), so fill those in.
        return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings }, templates: { ...base.templates, ...parsed.templates } }
      }
    } catch {
      // ignore unreadable saves
    }
    return firstVisit()
  })
  const failed = useRef(false)
  const onFail = useRef(onSaveFailed)
  useEffect(() => {
    onFail.current = onSaveFailed
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      failed.current = false
    } catch {
      // Storage full (usually too many photos) or blocked. The app still works, it just won't remember.
      if (!failed.current) onFail.current?.()
      failed.current = true
    }
  }, [state])
  return [state, setState] as const
}
