// Save a tournament to a file and open it again later (another computer, a co-organizer, a backup).
// Branding (and the Custom Glass photo) is not included: it belongs to whoever is using the app.

import type { AppState } from '../types'
import { initialState } from './state'
import { slugify } from './exportImage'
import { t } from '../i18n'

const APP = 'dmv-generator'
const VERSION = 1

export function saveTournamentFile(state: AppState) {
  const { brand: _brand, backdrop: _backdrop, customPanels: _customPanels, ...data } = state
  const file = { app: APP, version: VERSION, savedAt: new Date().toISOString(), data }
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slugify(state.tournament.name || 'tournament')}-${state.tournament.date || 'event'}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Read a saved tournament file and merge it into the current state (keeping branding). */
export async function openTournamentFile(file: File, current: AppState): Promise<AppState> {
  let parsed: { app?: string; version?: number; data?: Partial<AppState> }
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error(t('ui.app.fileUnreadable'))
  }
  if (parsed.app !== APP || !parsed.data?.tournament) throw new Error(t('ui.app.fileNotFromHere'))
  if ((parsed.version ?? 0) > VERSION) throw new Error(t('ui.app.fileTooNew'))
  const base = initialState()
  const d = parsed.data
  return {
    ...base,
    ...d,
    brand: current.brand,
    backdrop: current.backdrop,
    customPanels: current.customPanels,
    settings: { ...base.settings, ...d.settings },
    templates: { ...base.templates, ...d.templates },
  }
}
