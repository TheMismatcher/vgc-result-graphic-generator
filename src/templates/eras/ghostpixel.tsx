// Top Cut (Ghost Pixel): black wall of tiled pixel sprites of the Gen 1-5 Ghost types, redrawn in a
// four-step purple/lavender/white palette (like a ghost-type pattern print), under dark purple panels.

import '@fontsource/press-start-2p/400.css'
import { useEffect, useState } from 'react'
import type { StandingsTemplate } from '../types'
import { sprites } from '../../data/dex'
import { LocationHead, LocationRows, seededRand } from './index'
import './more.css'
import './ghostpixel.css'

/** Every Ghost-type line from Gen 1-5 (plus Sableye, Shedinja, Rotom, Froslass, Spiritomb). */
const GHOSTS = [
  'gastly', 'haunter', 'gengar', 'misdreavus', 'mismagius', 'shuppet', 'banette', 'duskull', 'dusclops', 'dusknoir',
  'drifloon', 'drifblim', 'spiritomb', 'rotom', 'froslass', 'shedinja', 'sableye', 'yamask', 'cofagrigus',
  'litwick', 'lampent', 'chandelure',
]

// Dark outline -> deep purple -> lavender -> white.
const RAMP = [[16, 12, 22], [92, 62, 150], [182, 156, 228], [255, 255, 255]]

const W = 1080
const H = 1350

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

/** One sprite as a posterised purple copy on its own canvas (alpha kept). */
function recolour(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d')!
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] < 40) {
      d.data[i + 3] = 0
      continue
    }
    const lum = (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255
    const step = lum < 0.26 ? 0 : lum < 0.5 ? 1 : lum < 0.76 ? 2 : 3
    d.data[i] = RAMP[step][0]
    d.data[i + 1] = RAMP[step][1]
    d.data[i + 2] = RAMP[step][2]
    d.data[i + 3] = 255
  }
  g.putImageData(d, 0, 0)
  return c
}

const wallCache = new Map<string, Promise<string>>()
function wall(seed: string, cell: number, scale: number, w = W, h = H) {
  const key = `${seed}|${cell}|${scale}|${w}x${h}`
  if (!wallCache.has(key))
    wallCache.set(
      key,
      (async () => {
        const imgs = await Promise.all(GHOSTS.map((id) => load(sprites.icon(id))))
        const tiles = imgs.filter((i): i is HTMLImageElement => !!i).map(recolour)
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const g = c.getContext('2d')!
        g.fillStyle = '#0c090d'
        g.fillRect(0, 0, w, h)
        g.imageSmoothingEnabled = false
        if (!tiles.length) return c.toDataURL('image/png')
        // Half-drop staggered grid; the species order is shuffled once per event, then cycles.
        const rand = seededRand(`ghostpixel|${seed}`)
        const CELL = cell
        const SCALE = scale
        const order = tiles.map((_, i) => i).sort(() => rand() - 0.5)
        let n = 0
        for (let row = -1; row * CELL * 0.86 < h + CELL; row++) {
          for (let col = -1; col * CELL < w + CELL; col++) {
            const t = tiles[order[n++ % order.length]]
            const x = col * CELL + (row % 2 ? CELL / 2 : 0)
            const y = row * CELL * 0.86
            g.drawImage(t, 0, 0, t.width, t.height, Math.round(x), Math.round(y), t.width * SCALE, t.height * SCALE)
          }
        }
        return c.toDataURL('image/png')
      })(),
    )
  return wallCache.get(key)!
}

/** The sprite wall as a full-size background (used by the Ghost Pixel theme on the other layouts). */
export function GhostWall({ seed, width, height, cell = 198, scale = 2 }: { seed: string; width: number; height: number; cell?: number; scale?: number }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    wall(seed || 'ghost', cell, scale, width, height).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [seed, cell, scale, width, height])
  return url ? <img className="gp-wall" src={url} alt="" /> : null
}

// cell/scale: tile spacing and sprite zoom (96px sprites, whole-number zoom keeps the pixels crisp).
const makeGhostPixel = (id: string, name: string, description: string, cell: number, scale: number, mod: string): StandingsTemplate => ({
  id,
  name,
  description,
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => {
    const [url, setUrl] = useState('')
    const seed = data.tournament.name || 'ghost'
    useEffect(() => {
      let live = true
      wall(seed, cell, scale).then((u) => live && setUrl(u))
      return () => {
        live = false
      }
    }, [seed])
    return (
      <div className={`dmv gp ${mod}`} style={{ width: W, height: H }}>
        {url && <img className="gp-wall" src={url} alt="" />}
        <div className="gp-dim" />
        <LocationHead data={data} cls="gp" kicker="" />
        <LocationRows data={data} cls="gp" />
      </div>
    )
  },
})

export const GhostPixel = makeGhostPixel('season-ghost-pixel', 'Top Cut (Ghost Pixel)', 'Black wall of tiled pixel Ghost-type Pokémon (Gen 1-5) in purple and lavender, with dark purple panels.', 198, 2, '')
export const GhostPixelDense = makeGhostPixel('season-ghost-pixel-dense', 'Top Cut (Ghost Pixel Dense)', 'Ghost Pixel with smaller, tightly packed sprites so the pattern fills the wall.', 104, 1, 'dense')
export const GhostPixelGlass = makeGhostPixel('season-ghost-pixel-glass', 'Top Cut (Ghost Pixel Glass)', 'Ghost Pixel with see-through panels so the sprite wall shows behind the list.', 198, 2, 'glass')
export const GhostPixelGlassTeam = makeGhostPixel('season-ghost-pixel-glass-team', 'Top Cut (Ghost Pixel Glass Team Box)', 'Glass panels with a darker translucent box behind each team so the Pokémon stay easy to read.', 198, 2, 'glass teambox')
export const GhostPixelGlassLine = makeGhostPixel('season-ghost-pixel-glass-line', 'Top Cut (Ghost Pixels)', 'Glass panels with a single divider line inside each row to set the team apart.', 198, 2, 'glass teamline')
