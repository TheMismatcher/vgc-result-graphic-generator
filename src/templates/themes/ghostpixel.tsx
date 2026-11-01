// Ghost Pixel theme (the "Team Line" look): the purple sprite wall behind the standard layouts, with
// pixel-bordered translucent purple panels, pixel-font place numbers and white type.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { GhostWall } from '../eras/ghostpixel'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { Theme } from './theme'
import '../eras/ghostpixel.css'
import './ghostpixel.css'

const ghostTheme: Theme = {
  id: 'ghost-pixel',
  style: 'Ghost Pixels',
  className: 'theme-ghostpixel',
  Background: ({ data, width, height }) => (
    <div style={{ position: 'absolute', inset: 0, background: '#0c090d' }}>
      <GhostWall seed={data.tournament.name} width={width} height={height} />
    </div>
  ),
}

export const GhostPixelLayouts: [StandingsTemplate, StandingsLayout][] = [
  [makeTop8Photos(false, false, ghostTheme), 'top8photos'],
  [makeTop8Mixed(false, ghostTheme), 'top8mixed'],
  [makeTop4Photos(false, ghostTheme), 'top4photos'],
  [makeChampion(false, ghostTheme), 'champion'],
  [makeChampion(false, ghostTheme, true), 'championphoto'],
  [makeBracket(false, ghostTheme), 'bracket'],
]
