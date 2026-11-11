// Ghost Pixels landscape: a handheld game's menus on the haunted sprite wall. Every player is a pixel WINDOW with a
// title bar (No.1 in the pixel font), each Pokémon sits in its own dark slot (like a PC box), and the champion
// gets a game text box with the blinking ▼ under their name.

import type { StandingsData } from '../../types'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto } from '../../shared/parts'
import { factsOf, few, sub, type Kind, plainGrid, plainMon } from '../common'
import './ghost.css'

function Head({ data, kicker }: { data: StandingsData; kicker: string }) {
  return (
    <header className="wg-head">
      <Logo size={130} />
      <div className="wg-head-text">
        <div className="wg-kicker">{kicker}</div>
        <FitText className="wg-title" text={data.tournament.name || 'Tournament'} max={70} width={1100} min={30} italic={false} />
      </div>
      <div className="wg-head-facts">
        {[...factsOf(data), data.formatLabel].filter(Boolean).map((f) => (
          <div key={f}>{f}</div>
        ))}
      </div>
    </header>
  )
}

/** The team: a PC-box grid of slots, or (`strip`) one dark team plate like the Ghost Pixels Top Cut's team box. */
function Slots({ data, i, size, cols, strip = false }: { data: StandingsData; i: number; size: number; cols?: number; strip?: boolean }) {
  return (
    <div className={`wg-slots ${strip ? 'strip' : ''}`} style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}>
      {data.players[i].team.map((m, j) => (
        <div key={j} className="wg-slot">
          <MonSprite mon={m} size={size} showTera={data.format.tera} />
        </div>
      ))}
    </div>
  )
}

/** A pixel window: title bar (No.N + name), body. */
function Window({ data, i, children, className = '', name = true, side = false }: { data: StandingsData; i: number; children: React.ReactNode; className?: string; name?: boolean; side?: boolean }) {
  const p = data.players[i]
  if (side)
    return (
      <div className={`wg-win side ${i === 0 ? 'first' : ''} ${className}`}>
        <div className="wg-bar">
          <div className="wg-bar-top">
            <span className="wg-no">No.{i + 1}</span>
            {data.cp && <CpBadge points={data.cp(i + 1)} />}
          </div>
          <FitText className="wg-name" text={p.name || 'Player'} max={28} width={290} min={12} italic={false} />
        </div>
        {children}
      </div>
    )
  return (
    <div className={`wg-win ${i === 0 ? 'first' : ''} ${className}`}>
      <div className="wg-bar">
        <span className="wg-no">No.{i + 1}</span>
        {name && <FitText className="wg-name" text={p.name || 'Player'} max={30} width={440} min={12} italic={false} />}
        {data.cp && <CpBadge points={data.cp(i + 1)} />}
      </div>
      {children}
    </div>
  )
}

/** Record over handle, beside the team plate. */
function Who({ p }: { p: StandingsData['players'][number] }) {
  return (
    <div className="wg-who">
      <div className="wg-sub">{p.record}</div>
      {p.social && <div className="wg-sub dim">{p.social}</div>}
    </div>
  )
}

function Rows({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className={`wg-rows ${f ? 'few' : ''}`}>
      {data.players.map((p, i) => (
        <Window key={p.uid} data={data} i={i}>
          {f ? (
            <div className="wg-body">
              <div className="wg-sub">{sub(p)}</div>
              <Slots data={data} i={i} size={124} cols={3} strip />
            </div>
          ) : (
            <div className="wg-body row">
              <Who p={p} />
              <Slots data={data} i={i} size={100} cols={6} strip />
            </div>
          )}
        </Window>
      ))}
    </main>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const [w, ...rest] = data.players
  const f = few(data)
  return (
    <main className="wg-spot">
      {w && (
        <section className="wg-win first wg-champ">
          <div className="wg-bar">
            <span className="wg-no">Champion</span>
            {data.cp && <CpBadge points={data.cp(1)} />}
          </div>
          <div className="wg-champ-photo">
            <PlayerPhoto player={w} />
          </div>
          <div className="wg-textbox">
            <FitText className="wg-textbox-name" text={w.name || 'Player'} max={46} width={600} min={18} italic={false} />
            <div className="wg-sub">{sub(w)}</div>
            <span className="wg-cursor">▼</span>
          </div>
          <Slots data={data} i={0} size={112} cols={6} strip />
        </section>
      )}
      <section className="wg-list">
        {rest.map((p, k) => (
          <Window key={p.uid} data={data} i={k + 1} className="line" side>
            <div className="wg-body row">
              <Who p={p} />
              <Slots data={data} i={k + 1} size={f ? 112 : 80} cols={f ? 3 : 6} strip />
            </div>
          </Window>
        ))}
      </section>
    </main>
  )
}

function Columns({ data }: { data: StandingsData }) {
  return (
    <main className="wg-cols">
      {data.players.map((p, i) => (
        <Window key={p.uid} data={data} i={i} className="col" name={false}>
          <div className="wg-col-photo">
            <PlayerPhoto player={p} />
          </div>
          <FitText className="wg-name dark" text={p.name || 'Player'} max={34} width={370} min={14} italic={false} />
          <div className="wg-sub center">{sub(p)}</div>
          <Slots data={data} i={i} size={112} cols={3} />
        </Window>
      ))}
    </main>
  )
}

function Plain({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className="wg-plain">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wg-win tall ${i === 0 ? 'first' : ''}`}>
          <div className="wg-bar center">
            <span className="wg-no">No.{i + 1}</span>
          </div>
          <FitText className="wg-name dark" text={p.name || 'Player'} max={f ? 30 : plainGrid(data) ? 22 : i === 0 ? 22 : 18} width={f ? 380 : plainGrid(data) ? 250 : i === 0 ? 250 : 170} min={10} italic={false} />
          <div className="wg-sub center">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} />}
          <div className={`wg-stack ${plainGrid(data) ? 'grid' : ''}`}>
            {p.team.map((m, j) => (
              <div key={j} className="wg-slot">
                <MonSprite mon={m} size={plainMon(data, [150, 116, 100, 92])} showTera={data.format.tera} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function GhostWide({ kind, data }: { kind: Kind; data: StandingsData }) {
  const n = Math.max(data.players.length, 1)
  return (
    <div className="wg">
      <Head data={data} kicker={kind === 'spotlight' ? 'Results' : `Top ${n}`} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : kind === 'columns' ? <Columns data={data} /> : <Plain data={data} />}
    </div>
  )
}
