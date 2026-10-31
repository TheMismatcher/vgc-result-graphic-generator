// "Mosaic": the top cut over a wall of rounded tiles, each holding one of the top cut's Pokémon
// drawn as a flat one-colour silhouette (inspired by the Championship Series website patterns).
// Mono uses one tint of the brand; Gradient fades from the main colour to the second.

import { useEffect, useState } from 'react'
import type { StandingsTemplate } from '../types'
import { CpBadge, FitText, Logo, MonSprite } from '../shared/parts'
import { eventFacts, ordinal } from '../shared/format'
import { sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { useBrand } from '../../brand'
import './mosaic.css'

const W = 1080
const H = 1350
const CELL = 90 // tile grid unit (12 × 15 cells)
const GAP = 8
const COLS = W / CELL
const ROWS = H / CELL

/** Small seeded random generator, so an event always gets the same layout. */
function seeded(text: string) {
  let a = 0
  for (const ch of text) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Tile { x: number; y: number; w: number; h: number }

/**
 * Pack the page with tiles, left to right, top to bottom: 1×1, 2×1, 1×2 and 2×2 cells, or with
 * `squares` only 1×1 and 2×2 (so every Pokémon fills its tile).
 */
function layout(seed: string, squares = false): Tile[] {
  const rand = seeded(seed)
  const used = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false))
  const free = (x: number, y: number, w: number, h: number) => {
    if (x + w > COLS || y + h > ROWS) return false
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (used[j][i]) return false
    return true
  }
  const tiles: Tile[] = []
  if (squares) {
    // Big 2×2 tiles first, scattered so neighbours are staggered (never level with a nearby big
    // tile in the next columns, or stacked right above one), then 1×1 tiles fill every gap.
    const big: Tile[] = []
    for (let tries = 0; tries < 600 && big.length < 18; tries++) {
      const x = Math.floor(rand() * (COLS - 1))
      const y = Math.floor(rand() * (ROWS - 1))
      if (!free(x, y, 2, 2)) continue
      const clash = big.some((b) => (b.y === y && Math.abs(b.x - x) <= 3) || (b.x === x && Math.abs(b.y - y) <= 3))
      if (clash) continue
      for (let j = y; j < y + 2; j++) for (let i = x; i < x + 2; i++) used[j][i] = true
      big.push({ x, y, w: 2, h: 2 })
    }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!used[y][x]) tiles.push({ x, y, w: 1, h: 1 })
    // Interleave so the Pokémon order still runs top to bottom.
    return [...big, ...tiles].sort((a, b) => a.y - b.y || a.x - b.x)
  }
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (used[y][x]) continue
      const r = rand()
      const options: [number, number][] = squares
        ? r < 0.3 ? [[2, 2], [1, 1]] : [[1, 1]]
        : r < 0.22 ? [[2, 2], [2, 1], [1, 1]] : r < 0.45 ? [[2, 1], [1, 1]] : r < 0.62 ? [[1, 2], [1, 1]] : [[1, 1]]
      const [w, h] = options.find(([w, h]) => free(x, y, w, h)) ?? [1, 1]
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) used[j][i] = true
      tiles.push({ x, y, w, h })
    }
  return tiles
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`
}

/** A sprite redrawn as a flat silhouette in one colour (data URL), so it works in exported PNGs. */
const cache = new Map<string, Promise<string>>()
function silhouette(src: string, color: string) {
  const key = `${src}|${color}`
  if (!cache.has(key))
    cache.set(
      key,
      new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const g = c.getContext('2d')!
          g.drawImage(img, 0, 0)
          g.globalCompositeOperation = 'source-in'
          g.fillStyle = color
          g.fillRect(0, 0, c.width, c.height)
          resolve(c.toDataURL('image/png'))
        }
        img.onerror = () => resolve('')
        img.src = src
      }),
    )
  return cache.get(key)!
}

export function Silhouette({ src, color, style }: { src: string; color: string; style: React.CSSProperties }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    silhouette(src, color).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [src, color])
  return url ? <img className="mz-sil" src={url} alt="" style={style} /> : null
}

/** The tile wall of the top cut's Pokémon as silhouettes, filling the whole graphic (shared with
 * the Mosaic theme's other layouts). Size defaults to 1080×1350. */
export function MosaicTiles({ data, gradient, squares, width = W, height = H }: { data: Parameters<StandingsTemplate['Component']>[0]['data']; gradient: boolean; squares: boolean; width?: number; height?: number }) {
  const { showMegas } = useDisplay()
  const mons = data.players.flatMap((p) => p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : '')))
  return <MosaicWall mons={mons} seed={`${data.tournament.name}|${data.dateLabel}`} gradient={gradient} squares={squares} width={width} height={height} />
}

/** The tile wall for any list of Pokémon ids (repeats removed); `seed` fixes the tile layout. */
export function MosaicWall({ mons: list, seed, gradient, squares, width = W, height = H, colors, splitEdge = false, bigAt }: { mons: string[]; seed: string; gradient: boolean; squares: boolean; width?: number; height?: number; colors?: { main: string; second: string }; splitEdge?: boolean; bigAt?: [number, number][] }) {
  const brand = useBrand()
  const { main, second } = colors ?? brand.colors // `colors` (#rrggbb) overrides the brand, e.g. an event's colour
  const mons = [...new Set(list.filter(Boolean))]
  // splitEdge: a big tile that would run off the bottom edge becomes small tiles along the visible row,
  // so every tile shows a whole Pokémon. Off by default (the other styles keep their original tiles).
  const rowsShown = Math.floor(height / CELL)
  const tiles: Tile[] = layout(seed, squares)
    .filter((t) => t.y * CELL < height && t.x * CELL < width)
    .flatMap((t): Tile[] =>
      splitEdge && t.y + t.h > rowsShown ? Array.from({ length: t.w }, (_, k) => ({ x: t.x + k, y: t.y, w: 1, h: 1 })) : [t],
    )
  // bigAt: [column, row] cells that become one 2×2 tile (the tiles under it are cleared; any cells they
  // covered outside it stay as 1×1 tiles so there are no holes).
  for (const [bx, by] of bigAt ?? []) {
    const inside = (x: number, y: number) => x >= bx && x < bx + 2 && y >= by && y < by + 2
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]
      const cells = Array.from({ length: t.w * t.h }, (_, k) => [t.x + (k % t.w), t.y + Math.floor(k / t.w)])
      if (!cells.some(([x, y]) => inside(x, y))) continue
      tiles.splice(i, 1, ...cells.filter(([x, y]) => !inside(x, y)).map(([x, y]) => ({ x, y, w: 1, h: 1 })))
    }
    tiles.push({ x: bx, y: by, w: 2, h: 2 })
  }
  tiles.sort((a, b) => a.y - b.y || a.x - b.x)
  const lineColor = (t: Tile) => (gradient ? mix(main, second, (t.x + t.y) / (COLS + ROWS - 2)) : second)
  return (
    <div className="mz-wall" style={{ position: 'absolute', inset: 0, background: gradient ? `linear-gradient(135deg, ${main}, ${second})` : second }}>
      {tiles.map((t, i) => {
        const size = Math.min(t.w, t.h) * CELL - GAP - 14
        const id = mons.length ? mons[i % mons.length] : ''
        return (
          <div key={i} className="mz-tile" style={{ left: t.x * CELL + GAP / 2, top: t.y * CELL + GAP / 2, width: t.w * CELL - GAP, height: t.h * CELL - GAP }}>
            {id && <Silhouette src={sprites.render(id)} color={lineColor(t)} style={{ width: size, height: size }} />}
          </div>
        )
      })}
    </div>
  )
}

/** `cardTint`: soft brand-tinted cards like the Mosaic theme's other layouts, see-through or solid. */
const makeMosaic = (gradient: boolean, squares = false, cardTint?: 'glass' | 'semi' | 'solid', shadow = false): StandingsTemplate => ({
  id: `mosaic${squares ? '-squares' : ''}-${gradient ? 'gradient' : 'mono'}${cardTint ? `-tint-${cardTint}` : ''}${shadow ? '-shadow' : ''}`,
  name: `Top Cut (Mosaic${squares ? ' Squares' : ''} ${gradient ? 'Gradient' : 'Mono'}${cardTint ? `, Tinted ${{ glass: 'Glass', semi: 'Semi', solid: 'Solid' }[cardTint]}` : ''}${shadow ? ', Drop Shadow' : ''})`,
  description: 'The top 8 over a wall of tiles showing every Pokémon on their teams as one-colour silhouettes.',
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => {
    const brand = useBrand()
    const { showMegas } = useDisplay()
    const { main, second } = brand.colors
    // Every Pokémon on the top cut's teams (no repeats), then repeated to fill all the tiles.
    const mons = [...new Set(data.players.flatMap((p) => p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : ''))).filter(Boolean))]
    const tiles = layout(`${data.tournament.name}|${data.dateLabel}`, squares)
    const tint = (t: Tile) => (gradient ? (t.x + t.y) / (COLS + ROWS - 2) : 0)
    const lineColor = (t: Tile) => (gradient ? mix(main, second, tint(t)) : second)
    // Four players or fewer: taller rows, bigger names, and the team as a 3 x 2 grid of larger Pokémon.
    const few = data.players.length <= 4

    return (
      <div className={`dmv mz ${cardTint ? `mz-tint ${cardTint}` : ''} ${shadow ? 'shadow' : ''} ${few ? 'few' : ''}`} style={{ width: W, height: H, background: gradient ? `linear-gradient(135deg, ${main}, ${second})` : second }}>
        {tiles.map((t, i) => {
          const size = Math.min(t.w, t.h) * CELL - GAP - 14
          const id = mons.length ? mons[i % mons.length] : ''
          return (
            <div
              key={i}
              className="mz-tile"
              style={{ left: t.x * CELL + GAP / 2, top: t.y * CELL + GAP / 2, width: t.w * CELL - GAP, height: t.h * CELL - GAP }}
            >
              {id && <Silhouette src={sprites.render(id)} color={lineColor(t)} style={{ width: size, height: size }} />}
            </div>
          )
        })}

        <header className="mz-head">
          <Logo size={130} />
          <div className="mz-head-text">
            <FitText className="mz-title" text={data.tournament.name || 'Tournament'} max={58} width={680} italic={false} weight={900} />
            <FitText className="mz-facts" text={eventFacts(data).filter((f) => f !== data.formatLabel).join('  •  ')} max={24} width={680} min={16} weight={800} italic={false} />
            {data.formatLabel && <FitText className="mz-format" text={data.formatLabel} max={18} width={680} min={13} weight={700} italic={false} uppercase={false} />}
          </div>
        </header>

        <main className="mz-rows">
          {data.players.map((p, i) => (
            <div key={p.uid} className={`mz-row ${i === 0 ? 'first' : ''}`}>
              <div className="mz-place">
                {ordinal(i + 1)}
                {data.cp && <CpBadge points={data.cp(i + 1)} className="mz-cp" />}
              </div>
              <div className="mz-player">
                <FitText className="mz-name" text={p.name || 'Player'} max={few ? 48 : 32} width={few ? 360 : 280} min={16} weight={900} italic={false} />
                <div className="mz-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
              </div>
              <div className="mz-team">
                {p.team.map((m, j) => (
                  <MonSprite key={j} mon={m} size={few ? 100 : 72} showTera={data.format.tera} />
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    )
  },
})

export const MosaicMono = makeMosaic(false)
export const MosaicGradient = makeMosaic(true)
export const MosaicSquaresMono = makeMosaic(false, true)
export const MosaicSquaresGradient = makeMosaic(true, true)
export const MosaicTintGlass = makeMosaic(true, true, 'glass')
export const MosaicTintSolid = makeMosaic(true, true, 'solid')
export const MosaicTintGlassShadow = makeMosaic(true, true, 'glass', true)
export const MosaicTintSolidShadow = makeMosaic(true, true, 'solid', true)
export const MosaicTintSemiShadow = makeMosaic(true, true, 'semi', true)
