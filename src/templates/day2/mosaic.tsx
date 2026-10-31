// Event Results (Mosaic): the player's result on a wall of rounded silhouette tiles (the team's
// Pokémon) in the event colour, with soft white cards and drop shadows like the Mosaic standings.
// The background colour follows the event type and the hue slider.

import type { CSSProperties } from 'react'
import type { Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { MosaicWall } from '../mosaic'
import { displayPokemon, useDisplay } from '../../lib/display'
import { eventFor } from './events'
import './day2.css'
import './mosaic.css'

const SIZE = 1644
const WALL = 1080 // the wall is built at 1080 and scaled up to the 1644 artwork size
const TEAM_CELLS = [
  [945, 678],
  [1265, 680],
  [946, 997],
  [1265, 1000],
  [946, 1316],
  [1267, 1320],
]
const CELL = 288
const MON = 252

const box = (left: number, top: number, width: number, height: number): CSSProperties => ({ position: 'absolute', left, top, width, height })

/** hsl (degrees, percent) to #rrggbb, because the tile colours are mixed as hex. */
function hslHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** contrast: opaque white cards with a heavier shadow on a slightly dimmed wall, so they stand out from the tiles. */
/** The wall's two colours when none are picked: the event hue, deep. */
export const mosaicDefaults = (hue: number) => {
  const h = ((hue % 360) + 360) % 360
  return { main: hslHex(h, 62, 46), second: hslHex((h + 6) % 360, 52, 26) }
}

const makeRegionalMosaic = (contrast: boolean): Day2Template => ({
  id: contrast ? 'dmv-day2-regionals-mosaic-contrast' : 'dmv-day2-regionals-mosaic',
  name: contrast ? 'Event Results (Mosaic Contrast)' : 'Event Results (Mosaic)',
  description: contrast
    ? 'Mosaic Event Results with opaque white cards, heavier shadows and a dimmed wall. Pick the two gradient colours.'
    : 'One player at a big event on a wall of silhouette tiles in the event colour, with soft white cards. Pick the two gradient colours.',
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const p = data.player
    const event = eventFor(data.kind)
    const hue = ((data.hue ?? event.hue) % 360 + 360) % 360
    const main = data.colors?.main ?? mosaicDefaults(hue).main
    const second = data.colors?.second ?? mosaicDefaults(hue).second
    const ink = data.colors ? '#1f2330' : `hsl(${hue} 38% 24%)`
    const mons = p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : '')).filter(Boolean)
    const tint = `color-mix(in srgb, ${second} 16%, #fff)`
    return (
      <div className={`dmv d2 d2m ${contrast ? 'contrast' : ''}`} style={{ width: SIZE, height: SIZE, background: second, ['--d2m-ink' as string]: ink, ['--d2m-accent' as string]: second }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: WALL, height: WALL, transform: `scale(${SIZE / WALL})`, transformOrigin: '0 0' }}>
          <MosaicWall mons={mons.length ? mons : ['pikachu']} seed={`${data.event}|${p.name}`} gradient squares width={WALL} height={WALL} colors={{ main, second }} splitEdge bigAt={[[10, 4]]} />
        </div>

        {contrast && <div style={{ ...box(0, 0, SIZE, SIZE), background: 'rgba(8, 10, 22, 0.22)' }} />}

        <img
          src={event.logo}
          alt=""
          style={{ ...box(1028, 98, 572, 520), objectFit: 'contain', filter: 'drop-shadow(0 10px 0 rgba(20, 24, 40, 0.25)) drop-shadow(0 20px 28px rgba(20, 24, 40, 0.35))' }}
        />

        <div className="d2m-card d2m-accent" style={{ ...box(70, 105, 850, 105), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FitText className="d2-text light" text={data.event || event.title} max={58} width={780} italic={false} weight={800} />
        </div>
        <div className="d2m-card" style={{ ...box(110, 245, 850, 157), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FitText className="d2-text" style={{ color: 'var(--d2m-ink)' }} text={p.name || 'Player Name'} max={100} width={770} italic={false} weight={800} />
        </div>
        <div className="d2m-card d2m-accent" style={{ ...box(110, 445, 520, 80), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FitText className="d2-text light" text={!p.record ? 'Record' : /[a-z]/i.test(p.record) ? p.record : `Record ${p.record}`} max={52} width={450} italic={false} weight={800} />
        </div>

        <div className="d2m-card" style={{ ...box(62, 640, 803, 802), background: p.photo ? 'rgba(255,255,255,0.92)' : tint, overflow: 'hidden' }}>
          {p.photo && (
            <div style={{ position: 'absolute', inset: 18, overflow: 'hidden', borderRadius: 8 }}>
              <PlayerPhoto player={p} />
            </div>
          )}
        </div>
        {data.caption.trim() && (
          <div className="d2m-card d2m-accent" style={{ ...box(110, 1383, 700, 117), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FitText className="d2-text light" text={data.caption} max={56} width={620} italic={false} weight={800} />
          </div>
        )}

        <div className="d2m-card" style={box(905, 628, 688, 1040)} />
        {TEAM_CELLS.map(([x, y], i) => (
          <div key={i} style={{ ...box(x, y, CELL, CELL), background: tint, borderRadius: 14, border: `4px solid color-mix(in srgb, ${second} 35%, #fff)` }} />
        ))}
        {p.team.map((m, i) => {
          const [x, y] = TEAM_CELLS[i]
          const inset = (CELL - MON) / 2
          return <MonSprite key={i} mon={m} size={MON} showTera={data.format.tera} style={{ position: 'absolute', left: x + inset, top: y + inset }} />
        })}
      </div>
    )
  },
})

export const RegionalMosaic = makeRegionalMosaic(false)
export const RegionalMosaicContrast = makeRegionalMosaic(true)
