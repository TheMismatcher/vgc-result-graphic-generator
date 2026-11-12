// Which big event an Event Results graphic is for: sets the logo in the top right and the default
// background colour (still changeable with the slider). Regionals, Internationals and Worlds use the
// official badges from championships.pokemon.com; Play! Pokémon and Special Events have no badge of
// their own here, so they use the Play! Pokémon logo.

import regionals from './regionals-logo.png'
import internationals from './internationals-logo.png'
import worlds from './worlds-logo.png'
import play from './special-logo.png'
import { gt, type GfxKey, type UiKey } from '../../i18n'

export type Day2EventKind = 'regionals' | 'play' | 'internationals' | 'special' | 'worlds'

// `title` is the top bar's text when no event name is typed. `label` and `title` are looked up in the catalog each
// time they're read (getters), so they follow the graphics' language.
export const DAY2_EVENTS: Record<Day2EventKind, { label: string; title: string; logo: string; hue: number }> = {
  // Red from the Regionals broadcast graphics.
  regionals: { get label() { return gt(day2LabelKey('regionals')) }, get title() { return gt('gfx.day2.title.regionals') }, logo: regionals, hue: 354 },
  // Play! Pokémon red.
  play: { get label() { return gt(day2LabelKey('play')) }, get title() { return gt('gfx.day2.title.play') }, logo: play, hue: 354 },
  // The blue of the International Championships shield.
  internationals: { get label() { return gt(day2LabelKey('internationals')) }, get title() { return gt('gfx.day2.title.internationals') }, logo: internationals, hue: 205 },
  special: { get label() { return gt(day2LabelKey('special')) }, get title() { return gt('gfx.day2.title.special') }, logo: play, hue: 28 },
  // The blue of the World Championships rings.
  worlds: { get label() { return gt(day2LabelKey('worlds')) }, get title() { return gt('gfx.day2.title.worlds') }, logo: worlds, hue: 222 },
}

/** Catalog keys for what people see on the website (the graphics read `label` and `title` above until they move to gt()). */
export const day2LabelKey = (kind: Day2EventKind) => `term.day2Event.${kind}` as UiKey & GfxKey
const EXAMPLE_KEYS: Record<Day2EventKind, UiKey> = {
  regionals: 'ui.day2.example.regionals',
  play: 'ui.day2.example.play',
  internationals: 'ui.day2.example.internationals',
  special: 'ui.day2.example.special',
  worlds: 'ui.day2.example.worlds',
}
export const day2ExampleKey = (kind: Day2EventKind) => EXAMPLE_KEYS[kind]

export const DAY2_EVENT_KINDS = Object.keys(DAY2_EVENTS) as Day2EventKind[]

/** The event for a saved `kind` (graphics saved with no type were Regionals). */
export const eventFor = (kind?: string) => DAY2_EVENTS[kindFor(kind)]
export const kindFor = (kind?: string): Day2EventKind => (kind && kind in DAY2_EVENTS ? (kind as Day2EventKind) : 'regionals')
