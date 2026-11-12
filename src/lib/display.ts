// Display options that apply to every template (e.g. drawing Mega forms).

import { createContext, useContext } from 'react'
import type { Mon } from '../types'
import type { LookGroup, Looks } from '../templates/types'
import { megaForm } from '../data/dex'

export interface Display {
  showMegas: boolean
  setShowMegas: (on: boolean) => void
  showCP: boolean
  setShowCP: (on: boolean) => void
  cpEvent: 'challenge' | 'cup'
  setCpEvent: (event: 'challenge' | 'cup') => void
  /** Styles with switches open the way they were last set (Glass or Solid, Classic or Modern, ...). */
  looks: Looks
  setLook: (group: LookGroup, value: string) => void
  /** Mosaic tile wall: added to the wall's seed (0 = the layout from the event's name and date). */
  tileShuffle: number
  shuffleTiles: () => void
}

// map: Route 119 opens on the bridge; styles without that map open on their first one (Sinnoh Snow: Lake Acuity).
export const DEFAULT_LOOKS: Looks = { panels: 'glass', card: 'classic', champion: 'hall', map: 'bridge', book: 'scarlet', sprites: 'render', colors: 'standard', result: 'neutral', snowfall: 'game', scene: 'climax' }

export const DisplayContext = createContext<Display>({
  showMegas: false,
  setShowMegas: () => {},
  showCP: false,
  setShowCP: () => {},
  cpEvent: 'cup',
  setCpEvent: () => {},
  looks: DEFAULT_LOOKS,
  setLook: () => {},
  tileShuffle: 0,
  shuffleTiles: () => {},
})
export const useDisplay = () => useContext(DisplayContext)

/** The Pokémon id to draw: its Mega (or Primal) form when "Show Mega forms" is on and it holds its Mega Stone (or orb). */
export const displayPokemon = (mon: Mon, showMegas: boolean) => (showMegas && megaForm(mon.pokemon, mon.item)) || mon.pokemon
