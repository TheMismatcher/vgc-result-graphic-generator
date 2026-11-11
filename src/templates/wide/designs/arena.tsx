// Arena landscape: an esports broadcast. Dark glass bars with a coloured left edge and a cut corner (the style's
// .dmv-panel), huge solid italic place numbers, a slanted red CHAMPION banner, and a ticker along the bottom with
// the event facts (no tag box, no comic outlines).

import type { StandingsData } from '../../types'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto } from '../../shared/parts'
import { cardColor, lineColor } from '../../shared/format'
import { getItem, getPokemon } from '../../../data/dex'
import { displayPokemon, useDisplay } from '../../../lib/display'
import { factsOf, few, sub, type Kind, plainGrid, plainMon } from '../common'
import './arena.css'

function Head({ data, kicker }: { data: StandingsData; kicker: string }) {
  return (
    <header className="wa-head">
      <div className="wa-head-text">
        <div className="wa-kicker">{kicker}</div>
        <FitText className="wa-title" text={data.tournament.name || 'Tournament'} max={84} width={1400} min={36} />
        <div className="wa-underline" />
      </div>
      <Logo size={150} />
    </header>
  )
}

function Ticker({ data }: { data: StandingsData }) {
  const [type, ...rest] = factsOf(data)
  return (
    <footer className="wa-ticker">
      {type && <div className="wa-ticker-tag">{type}</div>}
      <div className="wa-ticker-text">{[...rest, data.formatLabel].filter(Boolean).join('   /   ')}</div>
    </footer>
  )
}

function Bar({ data, i, color, size }: { data: StandingsData; i: number; color: string; size: number }) {
  const p = data.players[i]
  return (
    <div className={`wa-bar dmv-panel ${color}`}>
      <div className="wa-num">{i + 1}</div>
      <div className="wa-bar-body">
        <div className="wa-name-line">
          <FitText className="wa-name" text={p.name || 'Player'} max={36} width={430} min={16} />
          {data.cp && <CpBadge points={data.cp(i + 1)} className="wa-cp" />}
        </div>
        <div className="wa-sub">{sub(p)}</div>
        <div className="wa-team">
          {p.team.map((m, j) => (
            <MonSprite key={j} mon={m} size={size} showTera={data.format.tera} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Rows({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className={`wa-rows ${f ? 'few' : ''}`}>
      {data.players.map((p, i) => (
        <Bar key={p.uid} data={data} i={i} color={cardColor(i)} size={f ? 132 : 100} />
      ))}
    </main>
  )
}

/** The team as glass cells with the Pokémon's name and item (the Arena Champion's cards). */
function Cells({ data, size }: { data: StandingsData; size: number }) {
  const { showMegas } = useDisplay()
  return (
    <div className="wa-cells">
      {(data.players[0]?.team ?? []).map((m, i) => (
        <div key={i} className="wa-cell">
          <MonSprite mon={m} size={size} showTera={data.format.tera} />
          <FitText className="wa-cell-mon" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={17} width={200} min={11} />
          <div className="wa-cell-item">{getItem(m.item)?.name ?? ''}</div>
        </div>
      ))}
    </div>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const [w, ...rest] = data.players
  const f = few(data)
  return (
    <main className="wa-spot">
      {w && (
        <section className="wa-champ">
          <div className="wa-banner">Champion</div>
          <div className="wa-champ-who">
            <FitText className="wa-champ-name" text={w.name || 'Player'} max={60} width={720} min={24} />
            <div className="wa-sub">
              {sub(w)}
              {data.cp && <CpBadge points={data.cp(1)} className="wa-cp" />}
            </div>
          </div>
          <div className="wa-champ-photo">
            <PlayerPhoto player={w} />
          </div>
          <Cells data={data} size={104} />
        </section>
      )}
      <section className="wa-list">
        {rest.map((p, k) =>
          f ? (
            <Bar key={p.uid} data={data} i={k + 1} color={lineColor(k + 1)} size={120} />
          ) : (
            <div key={p.uid} className={`wa-line dmv-panel ${lineColor(k + 1)}`}>
              <div className="wa-num small">{k + 2}</div>
              <div className="wa-who">
                <FitText className="wa-name" text={p.name || 'Player'} max={28} width={280} min={14} />
                <div className="wa-sub">
                  {data.cp && <CpBadge points={data.cp(k + 2)} className="wa-cp" />}
                  {sub(p)}
                </div>
              </div>
              <div className="wa-team">
                {p.team.map((m, j) => (
                  <MonSprite key={j} mon={m} size={82} showTera={data.format.tera} />
                ))}
              </div>
            </div>
          ),
        )}
      </section>
    </main>
  )
}

/** Top 4: tall glass cards, the photo with a huge place number breaking over its bottom edge. */
function Columns({ data }: { data: StandingsData }) {
  return (
    <main className="wa-cols">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wa-card dmv-panel ${lineColor(i)}`}>
          <div className="wa-card-photo">
            <PlayerPhoto player={p} />
            <div className="wa-num huge">{i + 1}</div>
          </div>
          <div className="wa-card-who">
            <FitText className="wa-name" text={p.name || 'Player'} max={36} width={360} min={16} />
            <div className="wa-sub">{sub(p)}</div>
            {data.cp && <CpBadge points={data.cp(i + 1)} className="wa-cp" />}
          </div>
          <div className="wa-card-team">
            {p.team.map((m, j) => (
              <div key={j} className="wa-mini">
                <MonSprite mon={m} size={112} showTera={data.format.tera} />
              </div>
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
    <main className="wa-plain">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wa-tcol dmv-panel ${lineColor(i)}`}>
          <div className="wa-num">{i + 1}</div>
          <FitText className="wa-name" text={p.name || 'Player'} max={f ? 36 : plainGrid(data) ? 28 : i === 0 ? 26 : 21} width={f ? 380 : plainGrid(data) ? 250 : i === 0 ? 250 : 168} min={12} />
          <div className="wa-sub">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} className="wa-cp" />}
          <div className={`wa-tcol-team ${plainGrid(data) ? 'grid' : ''}`}>
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={plainMon(data, [160, 128, 112, 100])} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function ArenaWide({ kind, data }: { kind: Kind; data: StandingsData }) {
  const n = Math.max(data.players.length, 1)
  const kicker = kind === 'spotlight' ? 'Final Standings' : `Top ${n} Standings`
  return (
    <div className="wa">
      <Head data={data} kicker={kicker} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : kind === 'columns' ? <Columns data={data} /> : <Plain data={data} />}
      <Ticker data={data} />
    </div>
  )
}
