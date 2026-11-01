// Arena themes (Spotlight, Grid, Sunset): the Arena backgrounds behind the standard layouts, with
// Arena's esports styling — dark glass panels, accent edges, big solid place numbers.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { Theme } from './theme'
import '../arena/arena.css'
import './arena.css'

type ArenaBg = 'spotlight' | 'grid' | 'sunset'

const arenaTheme = (bg: ArenaBg, style: string): Theme => ({
  id: `arena-${bg}`,
  style,
  className: 'theme-arena',
  Background: () => (
    <div className={`ar ar-${bg}`} style={{ position: 'absolute', inset: 0 }}>
      <div className="ar-bg" />
      <div className="ar-bg-extra" />
    </div>
  ),
})

const layouts = (theme: Theme): [StandingsTemplate, StandingsLayout][] => [
  [makeTop8Photos(false, false, theme), 'top8photos'],
  [makeTop8Mixed(false, theme), 'top8mixed'],
  [makeTop4Photos(false, theme), 'top4photos'],
  [makeChampion(false, theme), 'champion'],
  [makeChampion(false, theme, true), 'championphoto'],
  [makeBracket(false, theme), 'bracket'],
]

export const ArenaSpotlightLayouts = layouts(arenaTheme('spotlight', 'Arena Spotlight'))
export const ArenaGridLayouts = layouts(arenaTheme('grid', 'Arena Grid'))
export const ArenaSunsetLayouts = layouts(arenaTheme('sunset', 'Arena Sunset'))
