// Terastal / Mega Evolution / Dynamax as themes on the standard layouts (Top 8 Photos, Top 8 +
// Top 4, Top 4 Photos, Champion, Bracket). power.css restyles the cards for all three from CSS
// variables; terastal.css, mega.css and dynamax.css add each look's own touches.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { Theme } from '../themes/theme'
import { DynamaxBackground, MegaBackground, TeraBackground } from '.'

export const TERASTAL_THEME: Theme = { id: 'power-terastal', style: 'Terastal', className: 'theme-power pw-tera', Background: TeraBackground }
export const MEGA_THEME: Theme = { id: 'power-mega', style: 'Mega Evolution', className: 'theme-power pw-mega', Background: MegaBackground }
export const DYNAMAX_THEME: Theme = { id: 'power-dynamax', style: 'Dynamax', className: 'theme-power pw-dyna', Background: DynamaxBackground }

const layouts = (theme: Theme): [StandingsTemplate, StandingsLayout][] => [
  [makeTop8Photos(false, false, theme), 'top8photos'],
  [makeTop8Mixed(false, theme), 'top8mixed'],
  [makeTop4Photos(false, theme), 'top4photos'],
  [makeChampion(false, theme), 'champion'],
  [makeBracket(false, theme), 'bracket'],
]

export const TerastalLayouts = layouts(TERASTAL_THEME)
export const MegaLayouts = layouts(MEGA_THEME)
export const DynamaxLayouts = layouts(DYNAMAX_THEME)
