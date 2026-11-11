// Event Results with each style's own design (not the shared artist layout):
// - Arena: a broadcast player profile: tracked event kicker, huge italic name, the record as a giant stat, the photo
//   in a tall cut-corner glass frame, the team as glass cells with names / items, a ticker along the bottom.
// - Comic Book: a comic cover: the event as the cover logo, the event badge as the issue badge, the photo in a tilted
//   panel with the record in a starburst, the name in a speech balloon, the team as a grid of tilted panels.

import type { CSSProperties } from 'react'
import type { Day2Data } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { LoudBackground } from '../shared/LoudBackground'
import { Burst } from '../wide/designs/comic'
import { getItem, getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { eventFor } from './events'
import './designs.css'

const SIZE = 1644
const box = (left: number, top: number, width: number, height: number): CSSProperties => ({ position: 'absolute', left, top, width, height })
const isRecord = (r: string) => /^\d+\s*-\s*\d+(\s*-\s*\d+)?$/.test(r.trim())

export function ArenaProfile({ data, bg }: { data: Day2Data; bg: 'spotlight' | 'grid' | 'sunset' }) {
  const { showMegas } = useDisplay()
  const p = data.player
  const event = eventFor(data.kind)
  const record = p.record?.trim() ?? ''
  return (
    <div className={`dmv d2 d2a themed theme-arena ar ar-${bg}`} style={{ width: SIZE, height: SIZE }}>
      <div className="ar-bg" />
      <div className="ar-bg-extra" />
      <img className="d2a-logo" src={event.logo} alt="" style={{ ...box(1214, 56, 380, 330), objectFit: 'contain' }} />

      <div style={box(90, 96, 1080, 40)}>
        <FitText className="d2a-kicker" text={data.event || event.title} max={30} width={1080} min={16} italic={false} weight={800} />
      </div>
      <div style={box(90, 150, 1100, 150)}>
        <FitText className="d2a-name" text={p.name || 'Player Name'} max={132} width={1100} min={44} />
      </div>
      <div className="d2a-underline" style={box(96, 318, 300, 12)} />

      <div className="d2a-photo" style={box(90, 420, 720, 1070)}>
        <PlayerPhoto player={p} />
      </div>

      <div style={box(870, 400, 690, 250)} className="d2a-stat">
        <div className="d2a-stat-label">Record</div>
        <FitText className="d2a-stat-value" text={record || '—'} max={isRecord(record) ? 210 : 110} width={680} min={40} />
      </div>

      <div className="d2a-cells" style={box(870, 680, 690, 810)}>
        {p.team.map((m, i) => (
          <div key={i} className="d2a-cell">
            <MonSprite mon={m} size={170} showTera={data.format.tera} />
            <FitText className="d2a-cell-mon" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={26} width={300} min={14} />
            <div className="d2a-cell-item">{getItem(m.item)?.name ?? ''}</div>
          </div>
        ))}
      </div>

      <div className="d2a-ticker" style={box(0, 1552, SIZE, 92)}>
        <div className="d2a-ticker-tag">{event.label}</div>
        <div className="d2a-ticker-text">{data.caption.trim() || data.format.name}</div>
      </div>
    </div>
  )
}

const TILTS = [-1.6, 1.2, 0.8, -1.1, -0.7, 1.4]

export function ComicCover({ data }: { data: Day2Data }) {
  const { showMegas } = useDisplay()
  const p = data.player
  const event = eventFor(data.kind)
  const record = p.record?.trim() ?? ''
  return (
    <div className="dmv d2 d2c loud" style={{ width: SIZE, height: SIZE }}>
      <LoudBackground top="blue" bottom="red" split={[30, 52]} burst={[420, 160]} />

      <div className="d2c-masthead" style={box(60, 50, 1150, 190)}>
        <FitText className="dmv-title d2c-title" text={data.event || event.title} max={118} width={1120} min={40} />
      </div>
      <div className="d2c-badge" style={box(1250, 34, 350, 350)}>
        <img src={event.logo} alt="" />
      </div>

      <div className="d2c-photo" style={box(80, 330, 860, 950)}>
        <PlayerPhoto player={p} />
        {data.caption.trim() && (
          <div className="d2c-caption">
            <FitText className="d2c-caption-text" text={data.caption} max={44} width={640} min={18} />
          </div>
        )}
      </div>
      {record && <Burst text={isRecord(record) ? `${record}!` : record} size={300} className="d2c-burst" />}

      <div className="d2c-balloon" style={box(90, 1370, 840, 210)}>
        <FitText className="dmv-title d2c-name" text={p.name || 'Player Name'} max={104} width={760} min={36} />
      </div>

      <div className="d2c-team" style={box(1010, 440, 580, 1150)}>
        {p.team.map((m, i) => (
          <div key={i} className={`d2c-cell ${i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'red' : 'gold'}`} style={{ transform: `rotate(${TILTS[i]}deg)` }}>
            <MonSprite mon={m} size={210} showTera={data.format.tera} />
            <FitText className="d2c-cell-name" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={24} width={240} min={12} />
          </div>
        ))}
      </div>
    </div>
  )
}
