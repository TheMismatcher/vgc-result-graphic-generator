// Terastal / Mega Evolution / Dynamax as themes on the standard layouts (Top 8 Photos, Top 8 +
// Top 4, Top 4 Photos, Champion, Bracket). power.css restyles the cards for all three from CSS
// variables; terastal.css, mega.css and dynamax.css add each look's own touches.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsData, StandingsLayout, StandingsTemplate } from '../types'
import type { SideTheme } from '../themes/side'
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
  [makeChampion(false, theme, true), 'championphoto'],
  [makeBracket(false, theme), 'bracket'],
]

export const TerastalLayouts = layouts(TERASTAL_THEME)
export const MegaLayouts = layouts(MEGA_THEME)
export const DynamaxLayouts = layouts(DYNAMAX_THEME)

/** Usage / Replay / Team Battle versions: the same backgrounds, seeded from the graphic and led by its first Pokémon. */
const sideTheme = (theme: Theme): SideTheme => ({
  id: theme.id,
  style: theme.style,
  className: theme.className,
  Wall: ({ mons, seed, width, height }) => {
    const data = { tournament: { name: seed }, players: [{ team: mons.filter(Boolean).map((pokemon) => ({ pokemon })) }], format: { tera: false } } as unknown as StandingsData
    return <theme.Background data={data} width={width} height={height} />
  },
})
export const POWER_SIDE_THEMES: SideTheme[] = [sideTheme(MEGA_THEME), sideTheme(DYNAMAX_THEME)]
