// Place themes (Spear Pillar, Hoenn routes): the official map/art behind the standard layouts, with
// panels in each place's own colours (see themes/places.css). One theme per Top Cut style.

import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { BackdropImage } from '../../lib/backdrop'
import { MapWall, R119_BRIDGE, R119_TOP, R120, R201, SPEAR, SPEAR_ART, HALL, SNOWPOINT, SNOWPOINT_FULL, R217, ACUITY, GLIMWOOD, TERA, MAX_RAID, SCARLET_BOOK_COVER, VIOLET_BOOK_COVER, SCARLET_BOOK_SQUARE, VIOLET_BOOK_SQUARE } from '../places'
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
  /** Used instead of `crop` when the frame is square (Champion). */
  square?: Crop
  /** Custom Glass: the user's photo instead of a map. */
  custom?: boolean
}

export const PLACES: Place[] = [
  { id: 'place-spear-pillar', style: 'Spear Pillar', className: 'theme-place pl-spear', crop: SPEAR },
  { id: 'place-spear-pillar-glass', style: 'Spear Pillar Glass', className: 'theme-place pl-spear glass', crop: SPEAR },
  { id: 'place-spear-pillar-hall', style: 'Spear Pillar Hall of Origin', className: 'theme-place pl-spear hoo', crop: HALL },
  { id: 'place-spear-pillar-hall-floor', style: 'Spear Pillar Hall Champion', className: 'theme-place pl-spear hoo', crop: SPEAR },
  { id: 'place-spear-pillar-hall-floor-glass', style: 'Spear Pillar Hall Champion Glass', className: 'theme-place pl-spear hoo glass', crop: SPEAR },
  { id: 'place-spear-pillar-sky', style: 'Spear Pillar Sky Champion', className: 'theme-place pl-spear sky', crop: SPEAR },
  { id: 'place-spear-pillar-sky-glass', style: 'Spear Pillar Sky Champion Glass', className: 'theme-place pl-spear sky glass', crop: SPEAR },
  { id: 'place-spear-pillar-cutscene', style: 'Spear Pillar Cutscene Sky', className: 'theme-place pl-spear sky dsky', crop: SPEAR },
  { id: 'place-spear-pillar-cutscene-glass', style: 'Spear Pillar Cutscene Sky Glass', className: 'theme-place pl-spear sky dsky glass', crop: SPEAR },
  { id: 'place-spear-pillar-art', style: 'Spear Pillar Concept Art', className: 'theme-place pl-spear glass art', crop: SPEAR_ART },
  { id: 'art-glimwood', style: 'Glimwood Tangle Official', className: 'theme-place pl-glim', crop: GLIMWOOD },
  { id: 'art-terastal', style: 'Terastal Official', className: 'theme-place pl-tera', crop: TERA },
  { id: 'art-scarlet-book', style: 'Scarlet Book', className: 'theme-place pl-scarlet pl-book', crop: SCARLET_BOOK_COVER, square: SCARLET_BOOK_SQUARE },
  { id: 'art-violet-book', style: 'Violet Book', className: 'theme-place pl-violet pl-book', crop: VIOLET_BOOK_COVER, square: VIOLET_BOOK_SQUARE },
  { id: 'art-dynamax', style: 'Dynamax Official', className: 'theme-place pl-dyna', crop: MAX_RAID },
  { id: 'place-route-201', style: 'Route 201 Official', className: 'theme-place pl-sinnoh', crop: R201 },
  { id: 'place-route-201-glass', style: 'Route 201 Official Glass', className: 'theme-place pl-sinnoh glass', crop: R201 },
  { id: 'place-snowpoint', style: 'Snowpoint Official', className: 'theme-place pl-snow', crop: SNOWPOINT },
  { id: 'place-snowpoint-full', style: 'Snowpoint Full Map', className: 'theme-place pl-snow', crop: SNOWPOINT_FULL },
  { id: 'place-snowpoint-full-glass', style: 'Snowpoint Full Map Glass', className: 'theme-place pl-snow glass', crop: SNOWPOINT_FULL },
  { id: 'place-route-217', style: 'Route 217', className: 'theme-place pl-snow', crop: R217 },
  { id: 'place-acuity-lakefront', style: 'Lake Acuity', className: 'theme-place pl-snow', crop: ACUITY },
  { id: 'place-snowpoint-glass', style: 'Snowpoint Official Glass', className: 'theme-place pl-snow glass', crop: SNOWPOINT },
  { id: 'place-route-217-glass', style: 'Route 217 Glass', className: 'theme-place pl-snow glass', crop: R217 },
  { id: 'place-acuity-lakefront-glass', style: 'Lake Acuity Glass', className: 'theme-place pl-snow glass', crop: ACUITY },
  { id: 'place-route-119', style: 'Route 119', className: 'theme-place pl-hoenn', crop: R119_TOP },
  { id: 'place-route-119-glass', style: 'Route 119 Glass', className: 'theme-place pl-hoenn glass', crop: R119_TOP },
  { id: 'place-route-119-bridge', style: 'Route 119 Bridge', className: 'theme-place pl-hoenn', crop: R119_BRIDGE },
  { id: 'place-route-119-bridge-glass', style: 'Route 119 Bridge Glass', className: 'theme-place pl-hoenn glass', crop: R119_BRIDGE },
  { id: 'place-route-120', style: 'Route 120', className: 'theme-place pl-hoenn', crop: R120 },
  { id: 'place-route-120-glass', style: 'Route 120 Glass', className: 'theme-place pl-hoenn glass', crop: R120 },
  { id: 'custom-glass', style: 'Custom Glass', className: 'theme-place pl-custom', crop: SPEAR, custom: true },
  { id: 'custom-glass-light', style: 'Custom Glass Light', className: 'theme-place pl-custom light', crop: SPEAR, custom: true },
]

const Wall = ({ place, width, height }: { place: Place; width: number; height: number }) => (
  <div style={{ position: 'absolute', inset: 0 }}>
    {place.custom ? <BackdropImage width={width} height={height} /> : <MapWall crop={cropFor(place, width, height)} width={width} height={height} />}
    <div className="pl-shade" />
  </div>
)

const cropFor = (p: Place, width: number, height: number) => (width === height && p.square ? p.square : p.crop)

const theme = (p: Place): Theme => ({
  id: p.id,
  style: p.style,
  className: p.className,
  Background: ({ width, height }) => <Wall place={p} width={width} height={height} />,
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
  Wall: ({ width, height }) => <Wall place={p} width={width} height={height} />,
}))
