// Event Results (Editorial Paper / Night): the magazine look on the 1644px graphic: flat paper or navy
// ground, upright black type, thick rules, the event logo straight on the page. The accent colour
// follows the event type and the colour controls (the first gradient colour if one is picked).

import type { CSSProperties } from 'react'
import type { Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { eventFor } from './events'
import './day2.css'
import './editorial.css'

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

const make = (mood: 'paper' | 'night'): Day2Template => ({
  id: `dmv-day2-editorial-${mood}`,
  name: `Event Results (Editorial ${mood === 'paper' ? 'Paper' : 'Night'})`,
  description: `Magazine-style Event Results on a flat ${mood === 'paper' ? 'warm paper' : 'deep navy'} page with thick rules and upright type. The accent follows the event colour.`,
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  Component: ({ data }) => {
    const p = data.player
    const event = eventFor(data.kind)
    const hue = (((data.hue ?? event.hue) % 360) + 360) % 360
    const accent = data.colors?.main ?? `hsl(${hue} ${mood === 'paper' ? 68 : 78}% ${mood === 'paper' ? 44 : 62}%)`
    return (
      <div className={`dmv d2 d2e d2e-${mood}`} style={{ width: SIZE, height: SIZE, ['--d2e-accent' as string]: accent }}>
        <div className="d2e-topbar" />

        <img src={event.logo} alt="" style={{ ...box(1028, 98, 572, 520), objectFit: 'contain' }} />

        <div className="d2e-event" style={box(70, 96, 900, 90)}>
          <FitText className="d2e-eventtext" text={data.event || event.title} max={54} width={760} min={20} italic={false} weight={800} />
        </div>
        <div className="d2e-rule" style={box(70, 196, 900, 8)} />
        <div className="d2e-namebox" style={box(70, 230, 920, 190)}>
          <FitText className="d2e-name" text={p.name || 'Player Name'} max={120} width={900} min={40} italic={false} weight={900} />
        </div>
        <div className="d2e-record" style={box(70, 450, 460, 84)}>
          <FitText className="d2e-recordtext" text={!p.record ? 'Record' : /[a-z]/i.test(p.record) ? p.record : `Record ${p.record}`} max={50} width={410} min={20} italic={false} weight={800} />
        </div>

        <div className="d2e-photo" style={box(62, 640, 803, 802)}>
          {p.photo && <PlayerPhoto player={p} />}
        </div>
        {data.caption.trim() && (
          <div className="d2e-caption" style={box(62, 1362, 803, 80)}>
            <FitText className="d2e-captiontext" text={data.caption} max={44} width={740} min={20} italic={false} weight={800} />
          </div>
        )}

        <div className="d2e-panel" style={box(905, 628, 688, 1040)} />
        {TEAM_CELLS.map(([x, y], i) => (
          <div key={i} className="d2e-cell" style={box(x, y, CELL, CELL)} />
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

export const EventEditorialPaper = make('paper')
export const EventEditorialNight = make('night')
