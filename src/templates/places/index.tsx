// Real places, drawn with the games' own art (no redraws):
// - Hoenn routes: Emerald's full Route 119 / Route 120 maps (Bulbapedia map rips), shown at a crisp 2x.
// - Route 201: Platinum's own tree line (Route 201 map) over its tall-grass tile repeated (built offline
//   into route-201-pt.png, 360px wide = 3x). Gen 4 overworld maps have no sky.
// - Official-art styles: Glimwood Tangle (a frame of the official 24-hour Live Camera stream),
//   Terastal (Scarlet/Violet in-game Stellar Terastallization: the jewel crown over the battle starfield)
//   and Dynamax (the official Sword/Shield Max Raid Battle key art).
// - Scarlet / Violet Book: the official book renders (Bulbagarden archives, 2047x2304) with the front cover
//   perspective-straightened onto a flat rectangle (corner medallions as anchors), cropped to the front board.
//   The styles use that board widened to exactly 4:5 (1620x2025) by seam insertion: extra width goes
//   only through plain cloth, so the silhouette, title, gold frame and corner medallions keep their shape, and
//   the cover's edges are the graphic's edges. Square frames get their own 1620x1620 version (rows of cloth
//   removed, then widened the same way).
// - Spear Pillar Hall of Origin: Platinum's Hall of Origin map (Arceus on the glass platform) behind the
//   stone panels; the champion sits on the platform's own glass floor tile (hall-of-origin-floor.png).
// - Spear Pillar (Hall Champion, Cutscene Sky): Platinum's Spear Pillar map (Bulbapedia rip) with the NPCs painted
//   out using the floor's own repeating texture; and the Brilliant Diamond / Shining Pearl concept art.
// - Snowpoint City, Route 217, Lake Acuity: Platinum's own maps (Bulbapedia rips); the walking NPCs and the
//   half-buried trainers are painted out with tile-aligned copies of the snow around them (the Ice Rock stays).
//   Snowpoint Full Map: the whole town (temple to docks) widened to 4:5 with the map's own tiles: the right edge
//   repeats each row's last 32px (forest, harbour wall, sea), the left gets the 32px forest tile (snowpoint-full-pt.png).
// - Custom Glass: the user's own photo (uploaded and dragged into place on the Preview) behind dark glass
//   panels whose lines and place numbers use the Branding tab's colours (.pl-custom).

import { useEffect, useState } from 'react'
import type { StandingsTemplate } from '../types'
import { LocationHead, LocationRows } from '../eras'
import route119 from './route-119.png'
import route120 from './route-120.png'
import route201 from './route-201-pt.png'
import spearPillar from './spear-pillar-pt.png'
import hallOfOrigin from './hall-of-origin-pt.png'
import spearPillarArt from './spear-pillar-bdsp-art.jpg'
import snowpoint from './snowpoint-pt.png'
import snowpointFull from './snowpoint-full-pt.png'
import route217 from './route-217-pt.png'
import lakeAcuity from './lake-acuity-pt.png'
import glimwood from './glimwood-tangle-swsh.jpg'
import teraStellar from './terastal-stellar-sv.jpg'
import maxRaid from './max-raid-battle-art.jpg'
import scarletBookCover from './scarlet-book-cover-sv.jpg'
import violetBookCover from './violet-book-cover-sv.jpg'
import scarletBookSquare from './scarlet-book-square-sv.jpg'
import violetBookSquare from './violet-book-square-sv.jpg'
import { BackdropImage } from '../../lib/backdrop'
import '../eras/eras.css'
import './places.css'

const W = 1080
const H = 1350

/** A crop of a map (sx, sy, sw in source pixels; height follows the 4:5 frame). */
interface Crop {
  src: string
  sx: number
  sy: number
  sw: number
  smooth?: boolean // painted art: smooth scaling; pixel maps: nearest-neighbour
}

// Pre-scaled once on a canvas so the PNG export gets the exact pixels (CSS pixelated scaling isn't reliable there).
const cache = new Map<string, Promise<string>>()
function scaled({ src, sx, sy, sw, smooth }: Crop, w: number, h: number) {
  const key = `${src}|${sx}|${sy}|${sw}|${w}x${h}`
  if (!cache.has(key))
    cache.set(
      key,
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const g = c.getContext('2d')!
          g.imageSmoothingEnabled = !!smooth
          if (smooth) g.imageSmoothingQuality = 'high'
          // Height follows the frame's aspect; slide up if the crop would run off the bottom of the map.
          const sh = Math.min((sw * h) / w, img.naturalHeight)
          const top = Math.max(0, Math.min(sy, img.naturalHeight - sh))
          g.drawImage(img, sx, top, sw, sh, 0, 0, w, h)
          resolve(c.toDataURL(smooth ? 'image/jpeg' : 'image/png', 0.92))
        }
        img.onerror = () => resolve('')
        img.src = src
      }),
    )
  return cache.get(key)!
}

export function MapWall({ crop, width = W, height = H }: { crop: Crop; width?: number; height?: number }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    scaled(crop, width, height).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [crop, width, height])
  return url ? <img className="pl-wall" src={url} alt="" /> : null
}

// Route 119: Weather Institute, the waterfall and the first bridge. Map is 640x2240 at 16px tiles; 540px wide = 2x.
export const R119_TOP: Crop = { src: route119, sx: 0, sy: 250, sw: 540 }
// Route 119 further south: the long bridge over the waterfall and the Feebas pool.
export const R119_BRIDGE: Crop = { src: route119, sx: 50, sy: 1150, sw: 540 }
// Route 120: the bridge over the pond and the Ancient Tomb.
export const R120: Crop = { src: route120, sx: 50, sy: 130, sw: 540 }
export const R201: Crop = { src: route201, sx: 0, sy: 0, sw: 360 }
// Spear Pillar (351px wide map) filling the width, from the altar down to the stairs.
export const SPEAR: Crop = { src: spearPillar, sx: 0, sy: 110, sw: 351 }
// Hall of Origin map, same framing as Spear Pillar: the glass platform and Arceus under the header, stairs down the middle.
export const HALL: Crop = { src: hallOfOrigin, sx: 0, sy: 110, sw: 351 }
// Snowpoint City (512x864): full width from the Gym down past the Pokémon Center and Mart to the docks, the ship and the icy sea.
export const SNOWPOINT: Crop = { src: snowpoint, sx: 0, sy: 224, sw: 512 }
// The whole of Snowpoint (691x864 = 4:5), from the temple to the icy sea; square frames take the middle.
export const SNOWPOINT_FULL: Crop = { src: snowpointFull, sx: 0, sy: 86, sw: 691 }
// Route 217 (north end of the 528x1589 map, trimmed to 528x700): the tall grass and the two cabins in the blizzard.
export const R217: Crop = { src: route217, sx: 0, sy: 0, sw: 528 }
// Lake Acuity (752x612) at full height, centred on Uxie's cavern island; square frames take the middle (sy 60).
export const ACUITY: Crop = { src: lakeAcuity, sx: 105, sy: 60, sw: 490 }
// Official art: each crop is the 4:5 window over the art's focal point (they're scaled up smoothly).
// Frame from the official 24-hour 'Pokémon Live Camera' stream (Oct 2019); the window skips a Pokémon at the far right.
export const GLIMWOOD: Crop = { src: glimwood, sx: 720, sy: 2, sw: 659, smooth: true }
export const TERA: Crop = { src: teraStellar, sx: 352, sy: 0, sw: 576, smooth: true }
export const MAX_RAID: Crop = { src: maxRaid, sx: 0, sy: 40, sw: 764, smooth: true }
// The whole front board at exactly 4:5; sy centres it in square frames (4:5 frames clamp it to 0).
export const SCARLET_BOOK_COVER: Crop = { src: scarletBookCover, sx: 0, sy: 202, sw: 1620, smooth: true }
export const VIOLET_BOOK_COVER: Crop = { src: violetBookCover, sx: 0, sy: 202, sw: 1620, smooth: true }
export const SCARLET_BOOK_SQUARE: Crop = { src: scarletBookSquare, sx: 0, sy: 0, sw: 1620, smooth: true }
export const VIOLET_BOOK_SQUARE: Crop = { src: violetBookSquare, sx: 0, sy: 0, sw: 1620, smooth: true }
// Concept art is already cropped to 4:5.
export const SPEAR_ART: Crop = { src: spearPillarArt, sx: 0, sy: 0, sw: 1067, smooth: true }

const makePlace = (id: string, name: string, description: string, crop: Crop, cls: string, mod: string): StandingsTemplate => ({
  id,
  name,
  description,
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className={`dmv pl ${cls} ${mod}`} style={{ width: W, height: H }}>
      <MapWall crop={crop} />
      <div className="pl-shade" />
      <LocationHead data={data} cls="pl" kicker="" />
      <LocationRows data={data} cls="pl" />
    </div>
  ),
})

export const Route119 = makePlace('place-route-119', 'Top Cut (Route 119)', 'Emerald’s Route 119 map (Weather Institute, waterfall and bridge) behind white panels.', R119_TOP, 'pl-hoenn', '')
export const Route119Glass = makePlace('place-route-119-glass', 'Top Cut (Route 119 Glass)', 'Route 119 map with see-through dark panels so more of the route shows.', R119_TOP, 'pl-hoenn', 'glass')
export const Route119Bridge = makePlace('place-route-119-bridge', 'Top Cut (Route 119 Bridge)', 'The long bridge and Feebas pool on Emerald’s Route 119.', R119_BRIDGE, 'pl-hoenn', '')
export const Route119BridgeGlass = makePlace('place-route-119-bridge-glass', 'Top Cut (Route 119 Bridge Glass)', 'Route 119’s long bridge and Feebas pool with see-through dark panels.', R119_BRIDGE, 'pl-hoenn', 'glass')
export const Route120 = makePlace('place-route-120', 'Top Cut (Route 120)', 'Emerald’s Route 120 map: the bridge over the pond and the Ancient Tomb.', R120, 'pl-hoenn', '')
export const Route120Glass = makePlace('place-route-120-glass', 'Top Cut (Route 120 Glass)', 'Route 120 map with see-through dark panels so more of the route shows.', R120, 'pl-hoenn', 'glass')
export const Route201Tiles = makePlace('place-route-201', 'Top Cut (Route 201 Official)', 'Route 201 built from Platinum’s own tiles: the tree line and the tall grass.', R201, 'pl-sinnoh', '')
export const Route201TilesGlass = makePlace('place-route-201-glass', 'Top Cut (Route 201 Official Glass)', 'Route 201 from Platinum’s own tiles with see-through dark panels.', R201, 'pl-sinnoh', 'glass')
export const GlimwoodOfficial = makePlace('art-glimwood', 'Top Cut (Glimwood Tangle)', 'Glimwood Tangle from Sword & Shield: the glowing-mushroom forest behind dark green glass.', GLIMWOOD, 'pl-glim', 'pl-art')
export const TerastalOfficial = makePlace('art-terastal', 'Top Cut (Terastal Official)', 'Scarlet & Violet’s Stellar Terastallization: the jewel crown over the battle starfield, behind dark glass.', TERA, 'pl-tera', 'pl-art')
export const DynamaxOfficial = makePlace('art-dynamax', 'Top Cut (Dynamax Official)', 'The official Sword & Shield Max Raid Battle artwork behind dark magenta glass.', MAX_RAID, 'pl-dyna', 'pl-art')
export const SpearPillarHall = makePlace('place-spear-pillar-hall', 'Top Cut (Spear Pillar Hall of Origin)', 'Platinum’s Hall of Origin map with Arceus; the champion stands on the Hall’s glass floor tiles.', HALL, 'pl-spear', 'hoo')
export const SpearPillarHallChampion = makePlace('place-spear-pillar-hall-floor', 'Top Cut (Spear Pillar Hall Champion)', 'The Spear Pillar map, with only the champion standing on the Hall of Origin’s glass floor tiles.', SPEAR, 'pl-spear', 'hoo')
export const SpearPillarHallChampionGlass = makePlace('place-spear-pillar-hall-floor-glass', 'Top Cut (Spear Pillar Hall Champion Glass)', 'The Spear Pillar map with see-through panels; the champion stands on the Hall of Origin’s glass floor tiles.', SPEAR, 'pl-spear', 'hoo glass')
// The climax of Diamond & Pearl: the champion in the streaked sky from the Spear Pillar cutscene.
export const SpearPillarCutscene = makePlace('place-spear-pillar-cutscene', 'Top Cut (Spear Pillar Cutscene Sky)', 'The Spear Pillar map; the champion’s panel is the streaked sky copied from Diamond & Pearl’s Spear Pillar cutscene.', SPEAR, 'pl-spear', 'sky')
export const SpearPillarCutsceneGlass = makePlace('place-spear-pillar-cutscene-glass', 'Top Cut (Spear Pillar Cutscene Sky Glass)', 'Spear Pillar with see-through panels; the champion’s panel is the streaked sky from the Diamond & Pearl cutscene.', SPEAR, 'pl-spear', 'sky glass')
export const SpearPillarArt = makePlace('place-spear-pillar-art', 'Top Cut (Spear Pillar Concept Art)', 'Official Brilliant Diamond / Shining Pearl concept art of Spear Pillar behind dark panels.', SPEAR_ART, 'pl-spear', 'glass art')
export const ScarletBook = makePlace('art-scarlet-book', 'Top Cut (Scarlet Book)', 'The Scarlet Book’s cover (official art, laid flat) edge to edge: Koraidon’s silhouette and gold foil behind crimson panels.', SCARLET_BOOK_COVER, 'pl-scarlet', 'pl-art pl-book')
export const VioletBook = makePlace('art-violet-book', 'Top Cut (Violet Book)', 'The Violet Book’s cover (official art, laid flat) edge to edge: Miraidon’s silhouette and gold foil behind indigo panels.', VIOLET_BOOK_COVER, 'pl-violet', 'pl-art pl-book')
export const SnowpointOfficial = makePlace('place-snowpoint', 'Top Cut (Snowpoint Official)', 'Platinum’s Snowpoint City map (people painted out): the Gym, Pokémon Center and Mart down to the docks and the icy sea.', SNOWPOINT, 'pl-snow', 'pl-art')
export const Route217 = makePlace('place-route-217', 'Top Cut (Route 217)', 'Platinum’s Route 217 map (trainers painted out): deep snow, tall grass and the two cabins.', R217, 'pl-snow', 'pl-art')
export const AcuityLakefront = makePlace('place-acuity-lakefront', 'Top Cut (Lake Acuity)', 'Platinum’s Lake Acuity map: the lake and Uxie’s cavern island ringed by snowy pines.', ACUITY, 'pl-snow', 'pl-art')
export const SnowpointOfficialGlass = makePlace('place-snowpoint-glass', 'Top Cut (Snowpoint Official Glass)', 'Snowpoint City’s map with see-through navy panels so more of the town shows.', SNOWPOINT, 'pl-snow', 'pl-art glass')
export const Route217Glass = makePlace('place-route-217-glass', 'Top Cut (Route 217 Glass)', 'Route 217’s map with see-through navy panels so more of the snowfield shows.', R217, 'pl-snow', 'pl-art glass')
export const AcuityLakefrontGlass = makePlace('place-acuity-lakefront-glass', 'Top Cut (Lake Acuity Glass)', 'Lake Acuity’s map with see-through navy panels so the lake and Uxie’s island show.', ACUITY, 'pl-snow', 'pl-art glass')
export const SnowpointFull = makePlace('place-snowpoint-full', 'Top Cut (Snowpoint Full Map)', 'All of Platinum’s Snowpoint City, from the temple to the docks and the icy sea, with the forest carried out to the edges.', SNOWPOINT_FULL, 'pl-snow', 'pl-art')
export const SnowpointFullGlass = makePlace('place-snowpoint-full-glass', 'Top Cut (Snowpoint Full Map Glass)', 'All of Snowpoint City from the temple to the docks, with see-through navy panels.', SNOWPOINT_FULL, 'pl-snow', 'pl-art glass')

const makeCustom = (light: boolean): StandingsTemplate => ({
  id: light ? 'custom-glass-light' : 'custom-glass',
  name: light ? 'Top Cut (Custom Glass Light)' : 'Top Cut (Custom Glass)',
  description: light
    ? 'Your own photo behind white panels edged in your branding colours. Upload it above the preview and drag to frame it.'
    : 'Your own photo behind see-through glass panels in your branding colours. Upload it above the preview and drag to frame it.',
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className={`dmv pl pl-custom pl-art ${light ? 'light' : ''}`} style={{ width: W, height: H }}>
      <BackdropImage width={W} height={H} />
      <div className="pl-shade" />
      <LocationHead data={data} cls="pl" kicker="" />
      <LocationRows data={data} cls="pl" />
    </div>
  ),
})
export const CustomGlass = makeCustom(false)
export const CustomLight = makeCustom(true)
