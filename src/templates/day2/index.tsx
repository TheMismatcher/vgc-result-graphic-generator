import type { CSSProperties } from 'react'
import type { Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import background from './regionals-background.webp'
import { DAY2_EVENTS } from './events'
import './day2.css'

// Built on an artist background (1644×1644). Every box below is positioned in that image's pixels.
const SIZE = 1644

// The six red team squares (top-left corner of each; all are 288px).
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

const Day2Regionals: Day2Template = {
  id: 'dmv-day2-regionals',
  name: 'Regional Results (Artist Original)',
  description: 'One player at a Regional: photo, record, and team.',
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  Component: ({ data }) => {
    const p = data.player
    return (
      <div className="dmv d2" style={{ width: SIZE, height: SIZE }}>
        <img src={background} alt="" style={box(0, 0, SIZE, SIZE)} />

        {/* Top bar: event */}
        <div className="d2-bar" style={box(70, 105, 850, 105)}>
          <FitText className="d2-text light" text={data.event || DAY2_EVENTS[data.kind ?? 'regionals'].title} max={58} width={760} italic={false} weight={800} />
        </div>

        {/* Big white bar: player name */}
        <div className="d2-bar" style={box(150, 245, 840, 157)}>
          <FitText className="d2-text dark" text={p.name || 'Player Name'} max={100} width={740} italic={false} weight={800} />
        </div>

        {/* Small bar: record */}
        <div className="d2-bar" style={box(615, 445, 415, 80)}>
          <FitText className="d2-text light" text={!p.record ? 'Record' : /[a-z]/i.test(p.record) ? p.record : `Record ${p.record}`} max={52} width={350} italic={false} weight={800} />
        </div>

        {/* Photo (the background's light box shows through when there's no photo) */}
        {p.photo && (
          <div className="d2-photo" style={box(62, 640, 803, 802)}>
            <PlayerPhoto player={p} />
          </div>
        )}

        {/* Caption bar over the bottom of the photo (redrawn so it sits on top of the photo; left out
            when the caption is empty, though the artwork's own bar still shows if there's no photo) */}
        {data.caption.trim() && (
          <>
            <div className="d2-caption" style={box(150, 1383, 600, 117)} />
            <div className="d2-bar" style={box(150, 1383, 600, 117)}>
              <FitText className="d2-text light" text={data.caption} max={56} width={520} italic={false} weight={800} />
            </div>
          </>
        )}

        {/* Team */}
        {p.team.map((m, i) => {
          const [x, y] = TEAM_CELLS[i]
          const inset = (CELL - MON) / 2
          return <MonSprite key={i} mon={m} size={MON} showTera={data.format.tera} style={{ position: 'absolute', left: x + inset, top: y + inset }} />
        })}
      </div>
    )
  },
}

export default Day2Regionals
