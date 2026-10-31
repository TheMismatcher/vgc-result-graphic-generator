// Real places, drawn with the games' own art (no redraws):
// - Hoenn routes: Emerald's full Route 119 / Route 120 maps (Bulbapedia map rips), shown at a crisp 2x.
// - Route 201: Platinum's own tree line (Route 201 map) over its tall-grass tile repeated (built offline
//   into route-201-pt.png, 360px wide = 3x). Gen 4 overworld maps have no sky.
// - Official-art styles: Glimwood Tangle (a frame of the official 24-hour Live Camera stream),
//   Terastal (Scarlet/Violet in-game Stellar Terastallization: the jewel crown over the battle starfield)
//   and Dynamax (the official Sword/Shield Max Raid Battle key art).
// - Scarlet / Violet Book: the official book renders (Bulbagarden archives, 2047x2304) with the front cover
//   perspective-straightened onto a flat rectangle (corner medallions as anchors), cropped to the front board.
//   The main Book styles use that board widened to exactly 4:5 (1620x2025) by seam insertion: extra width goes
//   only through plain cloth, so the silhouette, title, gold frame and corner medallions keep their shape, and
//   the cover's edges are the graphic's edges. Square frames get their own 1620x1620 version (rows of cloth
//   removed, then widened the same way).
// - Spear Pillar Hall of Origin: Platinum's Hall of Origin map (Arceus on the glass platform) behind the
//   stone panels; the champion sits on the platform's own glass floor tile (hall-of-origin-floor.png).
// - Spear Pillar: Platinum's Spear Pillar map (Bulbapedia rip) with the NPCs painted out using the
//   floor's own repeating texture, and the Brilliant Diamond / Shining Pearl concept art.

import { useEffect, useState } from 'react'
import type { StandingsTemplate } from '../types'
import { LocationHead, LocationRows } from '../eras'
import route119 from './route-119.png'
import route120 from './route-120.png'
import route201 from './route-201-pt.png'
import spearPillar from './spear-pillar-pt.png'
import hallOfOrigin from './hall-of-origin-pt.png'
import spearPillarArt from './spear-pillar-bdsp-art.jpg'
import glimwood from './glimwood-tangle-swsh.jpg'
import teraStellar from './terastal-stellar-sv.jpg'
import maxRaid from './max-raid-battle-art.jpg'
import scarletBook from './scarlet-book-sv.jpg'
import violetBook from './violet-book-sv.jpg'
import scarletBookFull from './scarlet-book-full-sv.png'
import violetBookFull from './violet-book-full-sv.png'
import scarletBookCover from './scarlet-book-cover-sv.jpg'
import violetBookCover from './violet-book-cover-sv.jpg'
import scarletBookSquare from './scarlet-book-square-sv.jpg'
import violetBookSquare from './violet-book-square-sv.jpg'
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
  /** Show the whole image (transparent edges kept) centred over a blurred, darkened copy of itself; sx/sy/sw unused. */
  whole?: boolean
}

// Pre-scaled once on a canvas so the PNG export gets the exact pixels (CSS pixelated scaling isn't reliable there).
const cache = new Map<string, Promise<string>>()
function scaled({ src, sx, sy, sw, smooth, whole }: Crop, w: number, h: number) {
  const key = `${src}|${sx}|${sy}|${sw}|${whole ? 'whole' : ''}|${w}x${h}`
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
          if (whole) {
            paintWhole(g, img, w, h)
            resolve(c.toDataURL('image/jpeg', 0.92))
            return
          }
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

// Backdrop: the image scaled to fill the frame, blurred and darkened. On top: the whole image fitted
// inside a 3% margin, centred, with a soft shadow so its edges (a book's rounded corners) read.
function paintWhole(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const fill = Math.max(w / iw, h / ih) * 1.15
  g.fillStyle = '#000'
  g.fillRect(0, 0, w, h)
  g.filter = `blur(${Math.round(w / 40)}px) brightness(0.45)`
  g.drawImage(img, (w - iw * fill) / 2, (h - ih * fill) / 2, iw * fill, ih * fill)
  g.filter = 'none'
  const fit = Math.min((w * 0.94) / iw, (h * 0.94) / ih)
  g.shadowColor = 'rgba(0, 0, 0, 0.75)'
  g.shadowBlur = w / 30
  g.shadowOffsetY = w / 90
  g.drawImage(img, (w - iw * fit) / 2, (h - ih * fit) / 2, iw * fit, ih * fit)
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
// Zoomed book covers (1170x1620 front boards): the window keeps the silhouette and Paldean title, trimming the corners evenly.
export const SCARLET_BOOK: Crop = { src: scarletBook, sx: 0, sy: 79, sw: 1170, smooth: true }
export const VIOLET_BOOK: Crop = { src: violetBook, sx: 0, sy: 79, sw: 1170, smooth: true }
// The whole book (spine, rounded corners, ink outline; 1000x1280 PNG with transparent corners).
export const SCARLET_BOOK_FULL: Crop = { src: scarletBookFull, sx: 0, sy: 0, sw: 0, smooth: true, whole: true }
export const VIOLET_BOOK_FULL: Crop = { src: violetBookFull, sx: 0, sy: 0, sw: 0, smooth: true, whole: true }
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
export const GlimwoodOfficial = makePlace('art-glimwood', 'Top Cut (Glimwood Tangle Official)', 'Glimwood Tangle from Sword & Shield: the glowing-mushroom forest behind dark green glass.', GLIMWOOD, 'pl-glim', 'pl-art')
export const TerastalOfficial = makePlace('art-terastal', 'Top Cut (Terastal Official)', 'Scarlet & Violet’s Stellar Terastallization: the jewel crown over the battle starfield, behind dark glass.', TERA, 'pl-tera', 'pl-art')
export const DynamaxOfficial = makePlace('art-dynamax', 'Top Cut (Dynamax Official)', 'The official Sword & Shield Max Raid Battle artwork behind dark magenta glass.', MAX_RAID, 'pl-dyna', 'pl-art')
export const SpearPillar = makePlace('place-spear-pillar', 'Top Cut (Spear Pillar)', 'Platinum’s Spear Pillar map (NPCs removed) behind dark stone panels with Dialga blue and Palkia pink.', SPEAR, 'pl-spear', '')
export const SpearPillarGlass = makePlace('place-spear-pillar-glass', 'Top Cut (Spear Pillar Glass)', 'Spear Pillar map with see-through panels so the pillars show.', SPEAR, 'pl-spear', 'glass')
export const SpearPillarHall = makePlace('place-spear-pillar-hall', 'Top Cut (Spear Pillar Hall of Origin)', 'Platinum’s Hall of Origin map with Arceus; the champion stands on the Hall’s glass floor tiles.', HALL, 'pl-spear', 'hoo')
export const SpearPillarHallChampion = makePlace('place-spear-pillar-hall-floor', 'Top Cut (Spear Pillar Hall Champion)', 'The Spear Pillar map, with only the champion standing on the Hall of Origin’s glass floor tiles.', SPEAR, 'pl-spear', 'hoo')
export const SpearPillarArt = makePlace('place-spear-pillar-art', 'Top Cut (Spear Pillar Concept Art)', 'Official Brilliant Diamond / Shining Pearl concept art of Spear Pillar behind dark panels.', SPEAR_ART, 'pl-spear', 'glass art')
export const ScarletBook = makePlace('art-scarlet-book', 'Top Cut (Scarlet Book)', 'The Scarlet Book’s cover (official art, laid flat) edge to edge: Koraidon’s silhouette and gold foil behind crimson panels.', SCARLET_BOOK_COVER, 'pl-scarlet', 'pl-art pl-book')
export const VioletBook = makePlace('art-violet-book', 'Top Cut (Violet Book)', 'The Violet Book’s cover (official art, laid flat) edge to edge: Miraidon’s silhouette and gold foil behind indigo panels.', VIOLET_BOOK_COVER, 'pl-violet', 'pl-art pl-book')
export const ScarletBookFull = makePlace('art-scarlet-book-full', 'Top Cut (Scarlet Book Full Cover)', 'The whole Scarlet Book cover, edges and spine included, over a blurred copy of itself; crimson panels.', SCARLET_BOOK_FULL, 'pl-scarlet', 'pl-art pl-book pl-whole')
export const VioletBookFull = makePlace('art-violet-book-full', 'Top Cut (Violet Book Full Cover)', 'The whole Violet Book cover, edges and spine included, over a blurred copy of itself; indigo panels.', VIOLET_BOOK_FULL, 'pl-violet', 'pl-art pl-book pl-whole')
export const ScarletBookZoomed = makePlace('art-scarlet-book-zoomed', 'Top Cut (Scarlet Book Zoomed)', 'The Scarlet Book’s cover cropped in: corners trimmed, silhouette larger.', SCARLET_BOOK, 'pl-scarlet', 'pl-art pl-book')
export const VioletBookZoomed = makePlace('art-violet-book-zoomed', 'Top Cut (Violet Book Zoomed)', 'The Violet Book’s cover cropped in: corners trimmed, silhouette larger.', VIOLET_BOOK, 'pl-violet', 'pl-art pl-book')
