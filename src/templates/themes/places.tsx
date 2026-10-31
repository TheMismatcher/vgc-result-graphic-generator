// Place themes (Spear Pillar, Hoenn routes): the official map/art behind the standard layouts, with
// panels in each place's own colours (see themes/places.css). One theme per Top Cut style.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { MapWall, R119_BRIDGE, R119_TOP, R120, SPEAR, SPEAR_ART } from '../places'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { StandingsLayout, StandingsTemplate } from '../types'
import type { SideTheme } from './side'
import type { Theme } from './theme'
import '../places/places.css'
import './places.css'

type Crop = typeof SPEAR

export interface Place {
  id: string
  style: string
  className: string
  crop: Crop
}

export const PLACES: Place[] = [
  { id: 'place-spear-pillar', style: 'Spear Pillar', className: 'theme-place pl-spear', crop: SPEAR },
  { id: 'place-spear-pillar-glass', style: 'Spear Pillar Glass', className: 'theme-place pl-spear glass', crop: SPEAR },
  { id: 'place-spear-pillar-art', style: 'Spear Pillar Concept Art', className: 'theme-place pl-spear glass art', crop: SPEAR_ART },
  { id: 'place-route-119', style: 'Route 119', className: 'theme-place pl-hoenn', crop: R119_TOP },
  { id: 'place-route-119-glass', style: 'Route 119 Glass', className: 'theme-place pl-hoenn glass', crop: R119_TOP },
  { id: 'place-route-119-bridge', style: 'Route 119 Bridge', className: 'theme-place pl-hoenn', crop: R119_BRIDGE },
  { id: 'place-route-119-bridge-glass', style: 'Route 119 Bridge Glass', className: 'theme-place pl-hoenn glass', crop: R119_BRIDGE },
  { id: 'place-route-120', style: 'Route 120', className: 'theme-place pl-hoenn', crop: R120 },
  { id: 'place-route-120-glass', style: 'Route 120 Glass', className: 'theme-place pl-hoenn glass', crop: R120 },
]

const Wall = ({ crop, width, height }: { crop: Crop; width: number; height: number }) => (
  <div style={{ position: 'absolute', inset: 0 }}>
    <MapWall crop={crop} width={width} height={height} />
    <div className="pl-shade" />
  </div>
)

const theme = (p: Place): Theme => ({
  id: p.id,
  style: p.style,
  className: p.className,
  Background: ({ width, height }) => <Wall crop={p.crop} width={width} height={height} />,
})

/** The five non-Top-Cut layouts for each place, keyed by style name. */
export const PLACE_LAYOUTS: Record<string, [StandingsTemplate, StandingsLayout][]> = Object.fromEntries(
  PLACES.map((p) => {
    const t = theme(p)
    return [
      p.style,
      [
        [makeTop8Photos(false, false, t), 'top8photos'],
        [makeTop8Mixed(false, t), 'top8mixed'],
        [makeTop4Photos(false, t), 'top4photos'],
        [makeChampion(false, t), 'champion'],
        [makeBracket(false, t), 'bracket'],
      ],
    ]
  }),
)

/** Usage / Replay / Team Battle versions. */
export const PLACE_SIDE_THEMES: SideTheme[] = PLACES.map((p) => ({
  id: p.id,
  style: p.style,
  className: p.className,
  Wall: ({ width, height }) => <Wall crop={p.crop} width={width} height={height} />,
}))
