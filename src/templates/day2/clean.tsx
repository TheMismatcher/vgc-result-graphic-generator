// Event Results (the default): drawn as sharp vector shapes in the artist's layout, so the stripes and
// bars stay crisp at any size and the whole background can be recoloured with a hue.

import type { CSSProperties } from 'react'
import type { Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { eventFor } from './events'
import './day2.css'

const SIZE = 1644

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
function regionalPalette(hue: number) {
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

// Slanted bar with softly rounded corners: a polygon with a thick round-joined outline in the same colour.
function Slant({ points, fill }: { points: number[][]; fill: string }) {
  return <polygon points={points.map((p) => p.join(',')).join(' ')} fill={fill} stroke={fill} strokeWidth={22} strokeLinejoin="round" />
}

const Day2Clean: Day2Template = {
  id: 'dmv-day2-regionals-clean', // id kept so saved selections still work
  name: 'Event Results',
  description: 'One player at a big event: photo, record, and team. Background colour can be changed.',
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  Component: ({ data }) => {
    const p = data.player
    const event = eventFor(data.kind)
    const c = regionalPalette(data.hue ?? event.hue)
    return (
      <div className="dmv d2" style={{ width: SIZE, height: SIZE, background: c.bg }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={box(0, 0, SIZE, SIZE)}>
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

          {/* Photo box and team panel */}
          <rect x={62} y={640} width={803} height={802} rx={12} fill="#dbe2e9" />
          <rect x={905} y={628} width={688} height={1040} rx={14} fill={c.bar} />
          {TEAM_CELLS.map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={CELL} height={CELL} rx={10} fill={c.square} />
          ))}
        </svg>

        <img src={event.logo} alt="" style={{ ...box(1028, 98, 572, 520), objectFit: 'contain' }} />

        <div className="d2-bar" style={box(70, 105, 850, 105)}>
          <FitText className="d2-text light" text={data.event || event.title} max={58} width={760} italic={false} weight={800} />
        </div>
        <div className="d2-bar" style={box(150, 245, 840, 157)}>
          <FitText className="d2-text" style={{ color: c.nameText }} text={p.name || 'Player Name'} max={100} width={740} italic={false} weight={800} />
        </div>
        <div className="d2-bar" style={box(615, 445, 415, 80)}>
          <FitText className="d2-text light" text={!p.record ? 'Record' : /[a-z]/i.test(p.record) ? p.record : `Record ${p.record}`} max={52} width={350} italic={false} weight={800} />
        </div>

        {p.photo && (
          <div className="d2-photo" style={box(62, 640, 803, 802)}>
            <PlayerPhoto player={p} />
          </div>
        )}

        {/* Caption bar over the bottom of the photo (left out when the caption is empty) */}
        {data.caption.trim() && (
          <>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ ...box(0, 0, SIZE, SIZE), pointerEvents: 'none' }}>
              <Slant points={[[186, 1394], [786, 1394], [730, 1489], [126, 1489]]} fill={c.bar} />
            </svg>
            <div className="d2-bar" style={box(150, 1383, 600, 117)}>
              <FitText className="d2-text light" text={data.caption} max={56} width={520} italic={false} weight={800} />
            </div>
          </>
        )}

        {p.team.map((m, i) => {
          const [x, y] = TEAM_CELLS[i]
          const inset = (CELL - MON) / 2
          return <MonSprite key={i} mon={m} size={MON} showTera={data.format.tera} style={{ position: 'absolute', left: x + inset, top: y + inset }} />
        })}
      </div>
    )
  },
}

export default Day2Clean
