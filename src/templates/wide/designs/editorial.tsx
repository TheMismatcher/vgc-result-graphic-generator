// Editorial (Paper / Night) landscape: a magazine spread. No cards: hairline rules, a heavy rule under the
// masthead, tight two-digit numerals in the accent colour, and the winner on the colour band (as in the
// Editorial Top Cut). Spotlight = the Editorial Champion's spec sheet on a full-height band.

import type { StandingsData } from '../../types'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto } from '../../shared/parts'
import { getItem, getPokemon } from '../../../data/dex'
import { displayPokemon, useDisplay } from '../../../lib/display'
import { factsOf, few, num, sub, type Kind, plainGrid, plainMon } from '../common'
import './editorial.css'
import { gt } from '../../../i18n'

function Masthead({ data, kicker }: { data: StandingsData; kicker: string }) {
  return (
    <header className="we-head">
      <div className="we-head-text">
        <div className="we-kicker">{kicker}</div>
        <FitText className="we-title" text={data.tournament.name || gt('gfx.common.tournament')} max={92} width={1420} min={40} weight={900} italic={false} />
        <div className="we-facts">
          {factsOf(data).map((f, i) => (
            <span key={f}>
              {i > 0 && <span className="we-sep">/</span>}
              {f}
            </span>
          ))}
          {data.formatLabel && <span className="we-format">{data.formatLabel}</span>}
        </div>
      </div>
      <Logo size={120} style={{ border: 'none', boxShadow: 'none' }} />
    </header>
  )
}

/** One ruled entry: numeral, name + record, team. `band` = the winner's colour band. */
function Entry({ data, i, size, grid = false }: { data: StandingsData; i: number; size: number; grid?: boolean }) {
  const p = data.players[i]
  return (
    <div className={`we-entry ${i === 0 ? 'band' : ''}`}>
      <div className="we-num">{num(i)}</div>
      <div className="we-body">
        <div className="we-name-line">
          {i === 0 && <span className="we-label">{gt('gfx.common.champion')}</span>}
          <FitText className="we-name" text={p.name || gt('gfx.common.player')} max={grid ? 52 : 38} width={grid ? 560 : 520} min={18} weight={800} italic={false} />
          {data.cp && <CpBadge points={data.cp(i + 1)} className="we-cp" />}
        </div>
        <div className="we-sub">{sub(p)}</div>
        <div className={`we-team ${grid ? 'grid' : ''}`}>
          {p.team.map((m, j) => (
            <MonSprite key={j} mon={m} size={size} showTera={data.format.tera} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Rows({ data }: { data: StandingsData }) {
  const n = data.players.length
  const half = Math.ceil(n / 2)
  const f = few(data)
  const col = (from: number, to: number) => (
    <div className="we-col">
      {data.players.slice(from, to).map((p, k) => (
        <Entry key={p.uid} data={data} i={from + k} size={f ? 120 : 100} grid={f} />
      ))}
    </div>
  )
  // Reads down the columns, like a printed table: 01-04 on the left, 05-08 on the right.
  return (
    <main className="we-rows">
      {col(0, half)}
      <div className="we-vrule" />
      {col(half, n)}
    </main>
  )
}

function SpecSheet({ data }: { data: StandingsData }) {
  const { showMegas } = useDisplay()
  const w = data.players[0]
  return (
    <div className="we-spec">
      {(w?.team ?? []).map((m, i) => (
        <div key={i} className="we-spec-cell">
          <MonSprite mon={m} size={112} showTera={data.format.tera} />
          <FitText className="we-spec-mon" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={18} width={180} min={12} weight={800} italic={false} />
          <div className="we-spec-item">{getItem(m.item)?.name ?? ''}</div>
        </div>
      ))}
    </div>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const [w, ...rest] = data.players
  const f = few(data)
  return (
    <main className="we-spot">
      {w && (
        <section className="we-cover">
          <div className="we-cover-top">
            <div className="we-cover-num">01</div>
            <div className="we-cover-who">
              <div className="we-label">{gt('gfx.common.champion')}</div>
              <FitText className="we-cover-name" text={w.name || gt('gfx.common.player')} max={60} width={500} min={24} weight={900} italic={false} />
              <div className="we-sub">{sub(w)}</div>
              {data.cp && <CpBadge points={data.cp(1)} className="we-cp" />}
            </div>
          </div>
          <div className="we-cover-photo">
            <PlayerPhoto player={w} />
          </div>
          <SpecSheet data={data} />
        </section>
      )}
      <section className="we-list">
        {/* 4 or fewer: each entry gets room for the name on top and the team in a line under it. */}
        {f && rest.map((p, k) => <Entry key={p.uid} data={data} i={k + 1} size={112} />)}
        {!f && rest.map((p, k) => (
          <div key={p.uid} className="we-line">
            <div className="we-num">{num(k + 1)}</div>
            <div className="we-who">
              <FitText className="we-name" text={p.name || gt('gfx.common.player')} max={30} width={290} min={14} weight={800} italic={false} />
              <div className="we-sub">{sub(p)}</div>
            </div>
            {data.cp && <CpBadge points={data.cp(k + 2)} className="we-cp" />}
            <div className="we-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={88} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

/** Top 4: four portrait columns divided by hairlines, a heavy rule on top, the winner's column on the band. */
function Columns({ data }: { data: StandingsData }) {
  return (
    <main className="we-cols">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`we-pcol ${i === 0 ? 'band' : ''}`}>
          <div className="we-pcol-head">
            <div className="we-num">{num(i)}</div>
            {i === 0 && <div className="we-label">{gt('gfx.common.champion')}</div>}
            {data.cp && <CpBadge points={data.cp(i + 1)} className="we-cp" />}
          </div>
          <div className="we-pcol-photo">
            <PlayerPhoto player={p} />
          </div>
          <FitText className="we-name" text={p.name || gt('gfx.common.player')} max={38} width={390} min={16} weight={800} italic={false} />
          <div className="we-sub">{sub(p)}</div>
          <div className="we-pcol-team">
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={124} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

/** Up to 8, no photos: a ruled table turned on its side, the team running down each column. */
function Plain({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className="we-plain">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`we-tcol ${i === 0 ? 'band' : ''}`}>
          <div className="we-num">{num(i)}</div>
          <FitText className="we-name" text={p.name || gt('gfx.common.player')} max={f ? 36 : plainGrid(data) ? 28 : i === 0 ? 26 : 22} width={f ? 380 : plainGrid(data) ? 250 : i === 0 ? 250 : 170} min={12} weight={800} italic={false} />
          <div className="we-sub">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} className="we-cp" />}
          <div className={`we-tcol-team ${plainGrid(data) ? 'grid' : ''}`}>
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={plainMon(data, [160, 128, 112, 100])} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function EditorialWide({ kind, data }: { kind: Kind; data: StandingsData }) {
  const kicker = kind === 'spotlight' ? gt('gfx.editorial.finalStandings') : kind === 'columns' ? gt('gfx.wide.theTopN', { count: Math.max(data.players.length, 1) }) : gt('gfx.arena.kicker', { count: Math.max(data.players.length, 1) })
  return (
    <div className="we">
      <Masthead data={data} kicker={kicker} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : kind === 'columns' ? <Columns data={data} /> : <Plain data={data} />}
    </div>
  )
}
