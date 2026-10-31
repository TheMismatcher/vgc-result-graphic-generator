// Editorial themes (Paper, Night): the magazine look (flat colour, hairline rules, upright type, brand
// colours as accents) on the standard layouts. Top Cut and Champion keep their own Editorial designs.

import { makeBracket } from '../bracket'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { Theme } from './theme'
import '../editorial/editorial.css'
import './editorial.css'

const editorialTheme = (mood: 'paper' | 'night'): Theme => ({
  id: `editorial-${mood}`,
  style: mood === 'paper' ? 'Editorial Paper' : 'Editorial Night',
  className: `theme-editorial ed-${mood}`,
  // The flat paper / navy ground (the same one the Editorial Top Cut uses).
  Background: () => <div className={`ed ed-${mood}`} style={{ position: 'absolute', inset: 0 }} />,
})

const layouts = (theme: Theme): [StandingsTemplate, StandingsLayout][] => [
  [makeTop8Photos(false, false, theme), 'top8photos'],
  [makeTop8Mixed(false, theme), 'top8mixed'],
  [makeTop4Photos(false, theme), 'top4photos'],
  [makeBracket(false, theme), 'bracket'],
]

export const EditorialPaperLayouts = layouts(editorialTheme('paper'))
export const EditorialNightLayouts = layouts(editorialTheme('night'))
