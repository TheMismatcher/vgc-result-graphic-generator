// Real places, drawn with the games' own art (no redraws):
// - Hoenn routes: Emerald's full Route 119 / Route 120 maps (Bulbapedia map rips), shown at a crisp 2x.
// - Spear Pillar: Platinum's Spear Pillar map (Bulbapedia rip) with the NPCs painted out using the
//   floor's own repeating texture, and the Brilliant Diamond / Shining Pearl concept art.

import { useEffect, useState } from 'react'
import type { StandingsTemplate } from '../types'
import { LocationHead, LocationRows } from '../eras'
import route119 from './route-119.png'
import route120 from './route-120.png'
import spearPillar from './spear-pillar-pt.png'
import spearPillarArt from './spear-pillar-bdsp-art.jpg'
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
// Spear Pillar (351px wide map) filling the width, from the altar down to the stairs.
export const SPEAR: Crop = { src: spearPillar, sx: 0, sy: 110, sw: 351 }
// Concept art is already cropped to 4:5.
export const SPEAR_ART: Crop = { src: spearPillarArt, sx: 0, sy: 0, sw: 1067, smooth: true }

const makePlace = (id: string, name: string, description: string, crop: Crop, cls: string, mod: string, kicker: string): StandingsTemplate => ({
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
      <LocationHead data={data} cls="pl" kicker={kicker} />
      <LocationRows data={data} cls="pl" />
    </div>
  ),
})

export const Route119 = makePlace('place-route-119', 'Top Cut (Route 119)', 'Emerald’s Route 119 map (Weather Institute, waterfall and bridge) behind white panels.', R119_TOP, 'pl-hoenn', '', 'Route 119')
export const Route119Glass = makePlace('place-route-119-glass', 'Top Cut (Route 119 Glass)', 'Route 119 map with see-through dark panels so more of the route shows.', R119_TOP, 'pl-hoenn', 'glass', 'Route 119')
export const Route119Bridge = makePlace('place-route-119-bridge', 'Top Cut (Route 119 Bridge)', 'The long bridge and Feebas pool on Emerald’s Route 119.', R119_BRIDGE, 'pl-hoenn', '', 'Route 119')
export const Route119BridgeGlass = makePlace('place-route-119-bridge-glass', 'Top Cut (Route 119 Bridge Glass)', 'Route 119’s long bridge and Feebas pool with see-through dark panels.', R119_BRIDGE, 'pl-hoenn', 'glass', 'Route 119')
export const Route120 = makePlace('place-route-120', 'Top Cut (Route 120)', 'Emerald’s Route 120 map: the bridge over the pond and the Ancient Tomb.', R120, 'pl-hoenn', '', 'Route 120')
export const Route120Glass = makePlace('place-route-120-glass', 'Top Cut (Route 120 Glass)', 'Route 120 map with see-through dark panels so more of the route shows.', R120, 'pl-hoenn', 'glass', 'Route 120')
export const SpearPillar = makePlace('place-spear-pillar', 'Top Cut (Spear Pillar)', 'Platinum’s Spear Pillar map (NPCs removed) behind dark stone panels with Dialga blue and Palkia pink.', SPEAR, 'pl-spear', '', 'Spear Pillar')
export const SpearPillarGlass = makePlace('place-spear-pillar-glass', 'Top Cut (Spear Pillar Glass)', 'Spear Pillar map with see-through panels so the pillars show.', SPEAR, 'pl-spear', 'glass', 'Spear Pillar')
export const SpearPillarArt = makePlace('place-spear-pillar-art', 'Top Cut (Spear Pillar Concept Art)', 'Official Brilliant Diamond / Shining Pearl concept art of Spear Pillar behind dark panels.', SPEAR_ART, 'pl-spear', 'glass art', 'Spear Pillar')
