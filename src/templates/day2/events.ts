// Which big event an Event Results graphic is for: sets the logo in the top right and the default
// background colour (still changeable with the slider). Regionals, Internationals and Worlds use the
// official badges from championships.pokemon.com; Play! Pokémon and Special Events have no badge of
// their own here, so they use the Play! Pokémon logo.

import regionals from './regionals-logo.png'
import internationals from './internationals-logo.png'
import worlds from './worlds-logo.png'
import play from './special-logo.png'

export type Day2EventKind = 'regionals' | 'play' | 'internationals' | 'special' | 'worlds'

// `title` is the top bar's text when no event name is typed.
export const DAY2_EVENTS: Record<Day2EventKind, { label: string; title: string; logo: string; hue: number; example: string }> = {
  // Red from the Regionals broadcast graphics.
  regionals: { label: 'Regionals', title: 'Regional Championships', logo: regionals, hue: 354, example: 'e.g. 2027 Louisville Regionals' },
  // Play! Pokémon red.
  play: { label: 'Play! Pokémon', title: 'Play! Pokémon Event', logo: play, hue: 354, example: 'e.g. 2027 Play! Pokémon Event' },
  // The blue of the International Championships shield.
  internationals: { label: 'Internationals', title: 'International Championships', logo: internationals, hue: 205, example: 'e.g. 2027 North America Internationals' },
  special: { label: 'Special Events', title: 'Special Championships', logo: play, hue: 28, example: 'e.g. 2027 Special Championships' },
  // The blue of the World Championships rings.
  worlds: { label: 'Worlds', title: 'World Championships', logo: worlds, hue: 222, example: 'e.g. 2027 World Championships' },
}

export const DAY2_EVENT_KINDS = Object.keys(DAY2_EVENTS) as Day2EventKind[]

/** The event for a saved `kind` (graphics saved with no type were Regionals). */
export const eventFor = (kind?: string) => DAY2_EVENTS[kindFor(kind)]
export const kindFor = (kind?: string): Day2EventKind => (kind && kind in DAY2_EVENTS ? (kind as Day2EventKind) : 'regionals')
