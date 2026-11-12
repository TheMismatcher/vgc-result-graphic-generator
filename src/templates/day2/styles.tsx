// Event Results in the standings styles: Classic, Comic Book, the three Arenas and the Trading Card. Classic uses the
// artist's layout (Comic Book and Arena have their own designs in designs.tsx) (event bar, name, record, photo, logo, team panel with six cells at the same coordinates as the
// other Event Results); each style draws its own panels and background, so none looks like a recolour of another.

import type { CSSProperties, ReactNode } from 'react'
import type { Day2Data, Day2Template, StandingsData } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { TradingCardClassicRole, TradingCardModernRole } from '../cards'
import { eventFor } from './events'
import { ArenaProfile, ComicCover } from './designs'
import { formatByName } from '../../data/options'
import './day2.css'
import './styles.css'
import { gt } from '../../i18n'
import { gtFormatName } from '../../data/options'

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
const recordText = (record: string) => (!record ? gt('gfx.day2.record') : /[a-z]/i.test(record) ? record : gt('gfx.day2.recordN', { record }))

/** The shared layout; `root` is the style's own root class(es), `back` its background. */
function Layout({ data, root, back }: { data: Day2Data; root: string; back: ReactNode }) {
  const p = data.player
  const event = eventFor(data.kind)
  return (
    <div className={`dmv d2 d2s ${root}`} style={{ width: SIZE, height: SIZE }}>
      {back}
      <img className="d2s-logo" src={event.logo} alt="" style={{ ...box(1028, 98, 572, 520), objectFit: 'contain' }} />

      <div className="d2s-event" style={box(70, 105, 850, 105)}>
        <FitText className="d2s-event-text" text={data.event || event.title} max={58} width={760} min={20} italic={false} weight={800} />
      </div>
      <div className="d2s-name dmv-panel" style={box(110, 245, 880, 157)}>
        <FitText className="d2s-name-text" text={p.name || gt('gfx.common.playerName')} max={100} width={780} min={30} italic={false} weight={900} />
      </div>
      <div className="d2s-record" style={box(110, 445, 520, 80)}>
        <FitText className="d2s-record-text" text={recordText(p.record)} max={52} width={450} min={18} italic={false} weight={800} />
      </div>

      <div className="d2s-photo dmv-panel" style={box(62, 640, 803, 802)}>
        <PlayerPhoto player={p} />
      </div>
      {data.caption.trim() && (
        <div className="d2s-caption" style={box(110, 1383, 700, 117)}>
          <FitText className="d2s-caption-text" text={data.caption} max={56} width={620} min={20} italic={false} weight={800} />
        </div>
      )}

      <div className="d2s-panel dmv-panel" style={box(905, 628, 688, 1040)} />
      {TEAM_CELLS.map(([x, y], i) => (
        <div key={i} className={`d2s-cell ${i === 0 ? 'ace' : ''}`} style={box(x, y, CELL, CELL)} />
      ))}
      {p.team.map((m, i) => {
        const [x, y] = TEAM_CELLS[i]
        const inset = (CELL - MON) / 2
        return <MonSprite key={i} mon={m} size={MON} showTera={data.format.tera} style={{ position: 'absolute', left: x + inset, top: y + inset }} />
      })}
    </div>
  )
}

const common = { kind: 'day2' as const, width: SIZE, height: SIZE }

// ---- Classic: the DMV comic look: blue / red split with halftone, ink-outlined panels, gold first place ----
export const Day2Classic: Day2Template = {
  ...common,
  id: 'dmv-day2-classic',
  name: 'Event Results (Classic)',
  description: 'One player at a big event in the Classic comic look: blue and red, ink-outlined panels, the team in a gold-edged panel.',
  style: 'Classic',
  Component: ({ data }) => (
    <Layout
      data={data}
      root="d2s-classic"
      back={
        <>
          <div className="d2s-classic-bg" />
          <div className="dmv-halftone" />
        </>
      }
    />
  ),
}

// ---- Comic Book: the same panels over the sunburst / speed-line background with the jagged split ----
export const Day2ComicBook: Day2Template = {
  ...common,
  id: 'dmv-day2-comic-book',
  name: 'Event Results (Comic Book)',
  description: 'One player at a big event as a comic cover: the event as the cover logo, the record in a starburst, the name in a speech balloon.',
  style: 'Comic Book',
  Component: ({ data }) => <ComicCover data={data} />,
}

// ---- Arena: dark glass cards with a coloured edge and a cut corner on the Arena backgrounds ----
const arena = (bg: 'spotlight' | 'grid' | 'sunset', style: string): Day2Template => ({
  ...common,
  id: `dmv-day2-arena-${bg}`,
  name: `Event Results (${style})`,
  description: `One player at a big event as a broadcast player profile (${style} background): giant record stat, glass team cells, ticker.`,
  style,
  Component: ({ data }) => <ArenaProfile data={data} bg={bg} />,
})
export const Day2ArenaSpotlight = arena('spotlight', 'Arena Spotlight')
export const Day2ArenaGrid = arena('grid', 'Arena Grid')
export const Day2ArenaSunset = arena('sunset', 'Arena Sunset')

// ---- Trading Card: the player as a card (their photo as the art, their team as the attacks) on a play mat ----
/** The standings data a card needs, from the Event Results data: the event is the "tournament", the player is the champion. */
function cardData(data: Day2Data): StandingsData {
  const event = eventFor(data.kind)
  return {
    tournament: { name: data.event || event.title, type: '', date: '', format: data.format.name, customFormat: '', divisions: { masters: '', seniors: '', juniors: '' } },
    format: data.format ?? formatByName(''),
    formatLabel: gtFormatName(data.format.name),
    typeLabel: event.label,
    dateLabel: '',
    playerCount: 0,
    players: [data.player],
    bracket: null,
    cp: null,
    cpEventLabel: '',
  }
}

const SCALE = 1.2
const card = (modern: boolean): Day2Template => ({
  ...common,
  id: modern ? 'dmv-day2-card-modern' : 'dmv-day2-card-classic',
  name: `Event Results (Trading Card ${modern ? 'Modern' : 'Classic'})`,
  description: `One player at a big event as a ${modern ? 'Scarlet & Violet' : 'Base Set'}-era trading card, photo in the art window, team as the attacks.`,
  style: modern ? 'Trading Card Modern' : 'Trading Card',
  look: { card: modern ? 'modern' : 'classic' },
  ...(modern ? { variantOf: 'Trading Card' } : {}),
  Component: ({ data }) => {
    const event = eventFor(data.kind)
    const Card = modern ? TradingCardModernRole : TradingCardClassicRole
    return (
      <div className="dmv d2 d2s d2s-card" style={{ width: SIZE, height: SIZE }}>
        <div style={{ position: 'absolute', left: 340, top: 12, width: 1080, height: 1350, transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
          <Card data={cardData(data)} role="competitor" />
        </div>
        <img className="d2s-logo" src={event.logo} alt="" style={{ ...box(36, 70, 360, 330), objectFit: 'contain' }} />
        <div className="d2s-card-event" style={box(36, 430, 350, 520)}>
          <div className="d2s-card-event-text">{data.event || event.title}</div>
        </div>
        {data.caption.trim() && <div className="d2s-card-caption" style={box(36, 1380, 350, 200)}>{data.caption}</div>}
      </div>
    )
  },
})
export const Day2CardClassic = card(false)
export const Day2CardModern = card(true)
