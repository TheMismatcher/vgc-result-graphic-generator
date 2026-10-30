// Which big event a Regional Results graphic is for: sets the badge in the top right and the
// default background colour (still changeable with the slider). Badges are the official ones from
// championships.pokemon.com; Special Championships have no badge of their own, so they use the
// Play! Pokémon logo.

import regionals from './regionals-logo.png'
import internationals from './internationals-logo.png'
import worlds from './worlds-logo.png'
import special from './special-logo.png'

export type Day2EventKind = 'regionals' | 'internationals' | 'special' | 'worlds'

// `title` is the top bar's text when no event name is typed.
export const DAY2_EVENTS: Record<Day2EventKind, { label: string; title: string; logo: string; hue: number; example: string }> = {
  // Red from the Regionals broadcast graphics (the artwork's red).
  regionals: { label: 'Regionals', title: 'Regional Championships', logo: regionals, hue: 354, example: 'e.g. 2027 Louisville Regionals' },
  // The blue of the International Championships shield.
  internationals: { label: 'Internationals', title: 'International Championships', logo: internationals, hue: 205, example: 'e.g. 2027 North America Internationals' },
  // Play! Pokémon red.
  special: { label: 'Special Event', title: 'Special Championships', logo: special, hue: 354, example: 'e.g. 2027 Special Championships' },
  // The blue of the World Championships rings.
  worlds: { label: 'Worlds', title: 'World Championships', logo: worlds, hue: 222, example: 'e.g. 2027 World Championships' },
}

export const DAY2_EVENT_KINDS = Object.keys(DAY2_EVENTS) as Day2EventKind[]
