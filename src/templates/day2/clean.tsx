// Regional Results redrawn as sharp vector shapes (same layout as the artist background), so the
// stripes and bars stay crisp at any size and the whole background can be recoloured with a hue.

import type { CSSProperties } from 'react'
import type { Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import logo from './regionals-logo.png'
import './day2.css'

const SIZE = 1644
export const DEFAULT_HUE = 354 // the artwork's red

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

/** The artwork's palette, turned to any hue (saturation and lightness kept). */
export function regionalPalette(hue: number) {
  const h = ((hue % 360) + 360) % 360
  return {
    bgLight: `hsl(${h} 62% 60%)`,
    bg: `hsl(${h} 46% 49%)`,
    bgDark: `hsl(${h} 44% 42%)`,
    stripe: `hsl(${h} 78% 66%)`,
    bar: `hsl(${h + 6} 33% 41%)`,
    square: `hsl(${h - 3} 60% 34%)`,
    nameText: `hsl(${h + 2} 41% 39%)`,
  }
}

/** Colours sampled from the artist's background, turned by the slider (offset from its red). */
export function matchPalette(hue: number) {
  const d = hue - DEFAULT_HUE
  const h = (x: number) => (((x + d) % 360) + 360) % 360
  return {
    bgDark: `hsl(${h(356)} 40% 46%)`,
    bg: `hsl(${h(352)} 47% 51%)`,
    bgWarm: `hsl(${h(0)} 57% 55%)`,
    salmon: `hsl(${h(1)} 75% 63%)`,
    gap: `hsl(${h(0)} 33% 42%)`,
    bar: `hsl(${h(1)} 33% 40%)`,
    square: `hsl(${h(351)} 59% 34%)`,
    nameText: `hsl(${h(356)} 41% 39%)`,
  }
}

/**
 * A slanted bar given by its outer edges in artwork pixels (top/bottom y, and the left/right x at
 * the top and bottom), drawn as an inset polygon with a round-joined outline so the corners have
 * radius `r` and the outer edges land where the artist put them.
 */
function OuterSlant({ top, bottom, tl, tr, bl, br, r, fill }: { top: number; bottom: number; tl: number; tr: number; bl: number; br: number; r: number; fill: string }) {
  const lean = (bl - tl) / (bottom - top) // x change per pixel down the left edge (same slant on the right)
  const leanR = (br - tr) / (bottom - top)
  const side = r * Math.sqrt(1 + lean * lean) // horizontal inset that keeps the slanted edge r away
  const sideR = r * Math.sqrt(1 + leanR * leanR)
  const y1 = top + r
  const y2 = bottom - r
  const pts = [
    [tl + lean * r + side, y1],
    [tr + leanR * r - sideR, y1],
    [br - leanR * r - sideR, y2],
    [bl - lean * r + side, y2],
  ]
  return <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={fill} stroke={fill} strokeWidth={r * 2} strokeLinejoin="round" />
}

// Slanted bar with softly rounded corners: a polygon with a thick round-joined outline in the same colour.
function Slant({ points, fill }: { points: number[][]; fill: string }) {
  return <polygon points={points.map((p) => p.join(',')).join(' ')} fill={fill} stroke={fill} strokeWidth={22} strokeLinejoin="round" />
}

const makeDay2 = (match: boolean): Day2Template => ({
  id: match ? 'dmv-day2-regionals-match' : 'dmv-day2-regionals-clean',
  name: match ? 'Regional Results (Artist Match)' : 'Regional Results',
  description: match
    ? 'Closest to the artist’s original (same stripes, shading and colours), redrawn crisp. Background colour can be changed.'
    : 'One player at a Regional: photo, record, and team. Background colour can be changed.',
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  Component: ({ data }) => {
    const p = data.player
    const hue = data.hue ?? DEFAULT_HUE
    const c = regionalPalette(hue)
    const m = matchPalette(hue)
    const bar = match ? m.bar : c.bar
    const square = match ? m.square : c.square
    return (
      <div className="dmv d2" style={{ width: SIZE, height: SIZE, background: match ? m.bg : c.bg }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={box(0, 0, SIZE, SIZE)}>
          {match ? (
            <>
              <defs>
                {/* Dark at the top left, lighter toward the bottom right, warm at the far right. */}
                <linearGradient id="d2m-bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={SIZE} y2={SIZE}>
                  <stop offset="0.2" stopColor={m.bgDark} />
                  <stop offset="0.55" stopColor={m.bg} />
                  <stop offset="1" stopColor={m.bgWarm} />
                </linearGradient>
                {/* The soft lighter sweep across the middle of the artwork. */}
                <linearGradient id="d2m-sweep" gradientUnits="userSpaceOnUse" x1="1257" y1="452" x2="1143" y2="958">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width={SIZE} height={SIZE} fill="url(#d2m-bg)" />
              <rect width={SIZE} height={SIZE} fill="url(#d2m-sweep)" />
              {/* 45° bands in the top-left corner, at the artist's positions (x + y). */}
              <polygon points="0,0 92,0 0,92" fill={m.bar} />
              <polygon points="92,0 418,0 0,418 0,92" fill={m.salmon} />
              <polygon points="418,0 488,0 0,488 0,418" fill={m.gap} />
              <polygon points="488,0 622,0 0,622 0,488" fill="#d9d8cf" />
              <OuterSlant top={105} bottom={208} tl={100} tr={960} bl={15} br={880} r={20} fill={bar} />
              <OuterSlant top={245} bottom={403} tl={190} tr={1032} bl={105} br={955} r={22} fill="#e8e8e4" />
              <OuterSlant top={445} bottom={523} tl={630} tr={1050} bl={585} br={1010} r={16} fill={bar} />
            </>
          ) : (
            <>
              <defs>
                <linearGradient id="d2c-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={c.bgLight} />
                  <stop offset="0.35" stopColor={c.bg} />
                  <stop offset="0.7" stopColor={c.bgDark} />
                  <stop offset="1" stopColor={c.bg} />
                </linearGradient>
              </defs>
              <rect width={SIZE} height={SIZE} fill="url(#d2c-bg)" />
              {/* Diagonal stripes, top left */}
              <polygon points="0,0 300,0 0,330" fill={c.stripe} opacity={0.75} />
              <polygon points="330,0 440,0 0,480 0,365" fill={c.stripe} opacity={0.35} />
              <polygon points="470,0 610,0 0,670 0,515" fill="#ece9e2" opacity={0.85} />
              {/* Bars: event, name (white), record */}
              <Slant points={[[106, 116], [950, 116], [878, 198], [26, 198]]} fill={c.bar} />
              <Slant points={[[196, 256], [1020, 256], [946, 392], [116, 392]]} fill="#e9e8e3" />
              <Slant points={[[636, 456], [1040, 456], [1004, 512], [596, 512]]} fill={c.bar} />
            </>
          )}

          {/* Photo box and team panel */}
          <rect x={62} y={640} width={803} height={802} rx={12} fill={match ? '#dae2e9' : '#dbe2e9'} />
          <rect x={905} y={628} width={688} height={1040} rx={14} fill={bar} />
          {TEAM_CELLS.map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={CELL} height={CELL} rx={10} fill={square} />
          ))}
        </svg>

        <img src={logo} alt="" style={box(1028, 98, 572, 520)} />

        <div className="d2-bar" style={box(70, 105, 850, 105)}>
          <FitText className="d2-text light" text={data.event || 'Regional Championships'} max={58} width={760} italic={false} weight={800} />
        </div>
        <div className="d2-bar" style={box(150, 245, 840, 157)}>
          <FitText className="d2-text" style={{ color: match ? m.nameText : c.nameText }} text={p.name || 'Player Name'} max={100} width={740} italic={false} weight={800} />
        </div>
        <div className="d2-bar" style={box(615, 445, 415, 80)}>
          <FitText className="d2-text light" text={!p.record ? 'Record' : /[a-z]/i.test(p.record) ? p.record : `Record ${p.record}`} max={52} width={350} italic={false} weight={800} />
        </div>

        {p.photo && (
          <div className="d2-photo" style={box(62, 640, 803, 802)}>
            <PlayerPhoto player={p} />
          </div>
        )}

        {/* Caption bar over the bottom of the photo */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ ...box(0, 0, SIZE, SIZE), pointerEvents: 'none' }}>
          {match ? (
            <OuterSlant top={1383} bottom={1500} tl={175} tr={797} bl={115} br={740} r={20} fill={bar} />
          ) : (
            <Slant points={[[186, 1394], [786, 1394], [730, 1489], [126, 1489]]} fill={c.bar} />
          )}
        </svg>
        <div className="d2-bar" style={box(150, 1383, 600, 117)}>
          <FitText className="d2-text light" text={data.caption} max={56} width={520} italic={false} weight={800} />
        </div>

        {p.team.map((m, i) => {
          const [x, y] = TEAM_CELLS[i]
          const inset = (CELL - MON) / 2
          return <MonSprite key={i} mon={m} size={MON} showTera={data.format.tera} style={{ position: 'absolute', left: x + inset, top: y + inset }} />
        })}
      </div>
    )
  },
})

const Day2Clean = makeDay2(false)
export default Day2Clean
export const Day2Match = makeDay2(true)
