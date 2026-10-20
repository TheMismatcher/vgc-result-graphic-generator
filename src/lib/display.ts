// Display options that apply to every template (e.g. drawing Mega forms).

import { createContext, useContext } from 'react'
import type { Mon } from '../types'
import { megaForm } from '../data/dex'

export interface Display {
  showMegas: boolean
  setShowMegas: (on: boolean) => void
  showCP: boolean
  setShowCP: (on: boolean) => void
  cpEvent: 'challenge' | 'cup'
  setCpEvent: (event: 'challenge' | 'cup') => void
}

export const DisplayContext = createContext<Display>({
  showMegas: false,
  setShowMegas: () => {},
  showCP: false,
  setShowCP: () => {},
  cpEvent: 'cup',
  setCpEvent: () => {},
})
export const useDisplay = () => useContext(DisplayContext)

/** The Pokémon id to draw: its Mega (or Primal) form when "Show Mega forms" is on and it holds its Mega Stone (or orb). */
export const displayPokemon = (mon: Mon, showMegas: boolean) => (showMegas && megaForm(mon.pokemon, mon.item)) || mon.pokemon
