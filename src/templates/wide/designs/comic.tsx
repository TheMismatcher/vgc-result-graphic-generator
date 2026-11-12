// Comic Book landscape: a comic page. Ink-outlined panels with hard offset shadows, each tilted a touch, the place
// in a yellow narration caption pinned over the panel's corner, a jagged starburst for the winner, the champion's
// name in a speech balloon, and the title as a cover logo. Sits on the Comic Book (LoudBackground) background.

import type { StandingsData } from '../../types'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto } from '../../shared/parts'
import { cardColor, lineColor, ordinal } from '../../shared/format'
import { getPokemon } from '../../../data/dex'
import { displayPokemon, useDisplay } from '../../../lib/display'
import { factsOf, few, sub, type Kind, plainGrid, plainMon } from '../common'
import './comic.css'
import { gt } from '../../../i18n'

/** Jagged starburst with a word in it (POW-style). */
export function Burst({ text, size, className = '' }: { text: string; size: number; className?: string }) {
  const n = 14
  const pts = Array.from({ length: n * 2 }, (_, k) => {
    const a = (Math.PI * k) / n - Math.PI / 2
    const r = k % 2 ? 0.66 : 1
    return `${50 + Math.cos(a) * 50 * r},${50 + Math.sin(a) * 50 * r}`
  }).join(' ')
  return (
    <div className={`wc-burst ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="-4 -4 108 108" width={size} height={size}>
        <polygon points={pts} fill="var(--ink)" transform="translate(3 3)" />
        <polygon points={pts} fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: Math.min(size * 0.17, (size * 0.62) / (text.length * 0.62)) }}>{text}</span>
    </div>
  )
}

// Small, fixed tilts so the page looks hand-laid but stays readable (by position, not random).
const TILT = [-1.2, 0.9, 0.6, -0.8, -0.5, 1, 0.8, -0.9]
const tilt = (i: number) => ({ transform: `rotate(${TILT[i % TILT.length]}deg)` })

function Head({ data, burst }: { data: StandingsData; burst: string }) {
  return (
    <header className="wc-head">
      <Logo size={150} />
      <div className="wc-head-text">
        <FitText className="dmv-title wc-title" text={data.tournament.name || gt('gfx.common.tournament')} max={92} width={1180} min={40} />
        <div className="wc-caption wc-facts">{[...factsOf(data), data.formatLabel].filter(Boolean).join('  •  ')}</div>
      </div>
      <Burst text={burst} size={190} className="wc-head-burst" />
    </header>
  )
}

function Caption({ i, className = '' }: { i: number; className?: string }) {
  return <div className={`wc-caption wc-place ${i === 0 ? 'first' : ''} ${className}`}>{ordinal(i + 1)}</div>
}

function Rows({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className={`wc-rows ${f ? 'few' : ''}`}>
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wc-panel dmv-panel ${cardColor(i)}`} style={tilt(i)}>
          <Caption i={i} />
          {i === 0 && <Burst text={gt('gfx.wide.winnerBurst')} size={f ? 170 : 140} className="wc-panel-burst" />}
          <div className="wc-panel-who">
            <FitText className="dmv-title wc-name" text={p.name || gt('gfx.common.player')} max={f ? 46 : 34} width={f ? 600 : 470} min={16} />
            <div className="wc-sub">
              {sub(p)}
              {data.cp && <CpBadge points={data.cp(i + 1)} />}
            </div>
          </div>
          <div className={`wc-team ${f ? 'grid' : ''}`}>
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={f ? 128 : data.players.length > 6 ? 76 : 100} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const { showMegas } = useDisplay()
  const [w, ...rest] = data.players
  const f = few(data)
  return (
    <main className="wc-spot">
      {w && (
        <section className="wc-champ" style={tilt(0)}>
          <div className="wc-champ-photo dmv-panel">
            <PlayerPhoto player={w} />
          </div>
          <Burst text={gt('gfx.wide.championBurst')} size={220} className="wc-champ-burst" />
          <div className="wc-balloon">
            <FitText className="dmv-title wc-balloon-name" text={w.name || gt('gfx.common.player')} max={54} width={560} min={22} />
            <div className="wc-sub">
              {sub(w)}
              {data.cp && <CpBadge points={data.cp(1)} />}
            </div>
          </div>
          <div className="wc-champ-team">
            {w.team.map((m, j) => (
              <div key={j} className="wc-mini dmv-panel">
                <MonSprite mon={m} size={104} showTera={data.format.tera} />
                <FitText className="wc-mini-name" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={15} width={170} min={10} />
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="wc-list">
        {rest.map((p, k) => (
          <div key={p.uid} className={`wc-strip dmv-panel ${lineColor(k + 1)}`} style={tilt(k + 1)}>
            <Caption i={k + 1} className="side" />
            <div className="wc-who">
              <FitText className="dmv-title wc-name" text={p.name || gt('gfx.common.player')} max={f ? 40 : 28} width={290} min={14} />
              <div className="wc-sub">
                {sub(p)}
                {data.cp && <CpBadge points={data.cp(k + 2)} />}
              </div>
            </div>
            <div className="wc-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={f ? 96 : 80} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

/** Top 4: a four-panel strip. Photo on top with the caption pinned to it, the name on an ink banner, then the team. */
function Columns({ data }: { data: StandingsData }) {
  return (
    <main className="wc-cols">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wc-frame dmv-panel ${lineColor(i)}`} style={tilt(i)}>
          <div className="wc-frame-photo">
            <PlayerPhoto player={p} />
            <Caption i={i} />
          </div>
          {i === 0 && <Burst text={gt('gfx.wide.winnerBurst')} size={180} className="wc-frame-burst" />}
          <div className="wc-banner">
            <FitText className="wc-banner-name" text={p.name || gt('gfx.common.player')} max={34} width={300} min={14} />
          </div>
          <div className="wc-sub center wc-frame-sub">
            <span className="wc-frame-sub-text">{sub(p)}</span>
            {data.cp && <CpBadge points={data.cp(i + 1)} />}
          </div>
          <div className="wc-frame-team">
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={112} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

function Plain({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className="wc-plain">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wc-tall dmv-panel ${lineColor(i)}`} style={tilt(i)}>
          <Caption i={i} className="top" />
          <FitText className="dmv-title wc-name" text={p.name || gt('gfx.common.player')} max={f ? 36 : plainGrid(data) ? 28 : i === 0 ? 26 : 21} width={f ? 370 : plainGrid(data) ? 226 : i === 0 ? 240 : 140} min={12} />
          <div className="wc-sub center">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} />}
          <div className={`wc-tall-team ${plainGrid(data) ? 'grid' : ''}`}>
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={plainMon(data, [160, 128, 112, 100])} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function ComicWide({ kind, data }: { kind: Kind; data: StandingsData }) {
  const n = Math.max(data.players.length, 1)
  return (
    <div className="wc">
      <Head data={data} burst={kind === 'spotlight' ? gt('gfx.wide.resultsBurst') : gt('gfx.wide.topBurst', { count: n })} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : kind === 'columns' ? <Columns data={data} /> : <Plain data={data} />}
    </div>
  )
}
