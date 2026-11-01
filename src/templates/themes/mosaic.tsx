// Mosaic theme: the tile wall of the top cut's Pokémon (squares, brand gradient) behind the
// standard layouts.

import { MosaicTiles } from '../mosaic'
import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { Theme } from './theme'
import './mosaic.css'

export const MOSAIC_THEME: Theme = {
  id: 'mosaic',
  style: 'Mosaic',
  className: 'theme-mosaic',
  Background: ({ data, width, height }) => <MosaicTiles data={data} gradient squares width={width} height={height} />,
}

export const MosaicLayouts: [StandingsTemplate, StandingsLayout][] = [
  [makeTop8Photos(false, false, MOSAIC_THEME), 'top8photos'],
  [makeTop8Mixed(false, MOSAIC_THEME), 'top8mixed'],
  [makeTop4Photos(false, MOSAIC_THEME), 'top4photos'],
  [makeChampion(false, MOSAIC_THEME), 'champion'],
  [makeChampion(false, MOSAIC_THEME, true), 'championphoto'],
  [makeBracket(false, MOSAIC_THEME), 'bracket'],
]
