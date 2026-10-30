// A theme = a style's background + card colours, applied to the standard layouts (Top 8 Photos,
// Top 8 + Top 4, Top 4 Photos, Champion, Bracket) so each layout keeps its proven design.

import type { ReactNode } from 'react'
import type { StandingsData } from '../types'

export interface Theme {
  id: string // used in template ids, e.g. 'mosaic'
  style: string // style name in the picker, e.g. 'Mosaic'
  className: string // root class the theme's CSS hangs off, e.g. 'theme-mosaic'
  /** Everything behind the content, filling width × height. */
  Background: (props: { data: StandingsData; width: number; height: number }) => ReactNode
}
