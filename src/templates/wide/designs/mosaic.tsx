// Mosaic landscape: the tile wall is the picture, so the cards are tiles too. Every card snaps to the wall's own
// 120px grid (16 x 9 at 1920 x 1080) and leaves whole tiles showing around it: a compact header plate in the
// top-left corner, staggered columns (the second column starts two tiles lower), gaps of a full tile between the
// Top 4 cards. Cards are Mosaic's soft white with a brand tint, the place in a coloured rounded tab.

import type { CSSProperties } from 'react'
import type { StandingsData } from '../../types'
import { useBrand } from '../../../brand'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto, textWidth, useFontsReady } from '../../shared/parts'
import { lineColor, ordinal } from '../../shared/format'
import { factsOf, few, sub, type Kind } from '../common'
import './mosaic.css'

const T = 120 // one tile
const IN = 6 // inset inside a tile cell, so cards line up with the tiles' gaps
/** Position in tiles: column, row, width, height. */
const at = (c: number, r: number, w: number, h: number): CSSProperties => ({ left: c * T + IN, top: r * T + IN, width: w * T - IN * 2, height: h * T - IN * 2 })

/** Header plate: as many whole tiles wide as the title (at full size) and facts need, 5 to `cols` (the rest of the
 *  top rows stays wall). No logo, no room kept for one. */
function Head({ data, tag, cols = 8 }: { data: StandingsData; tag: string; cols?: number }) {
  useFontsReady()
  const logo = !!useBrand().logo
  const title = data.tournament.name || 'Tournament'
  const facts = factsOf(data).join('  •  ')
  const side = 56 + (logo ? 174 : 0) + IN * 2 // padding, logo + gap, tile inset
  const need = side + Math.max(textWidth(title.toUpperCase(), '900 58px Montserrat') * 1.08, textWidth(facts.toUpperCase(), '800 20px Montserrat'), textWidth(data.formatLabel ?? '', '700 17px Montserrat'))
  const c = Math.min(cols, Math.max(5, Math.ceil(need / T)))
  return (
    <header className="wm-head" style={at(0, 0, c, 2)}>
      <Logo size={150} />
      <div className="wm-head-text">
        <div className="wm-tag">{tag}</div>
        <FitText className="wm-title" text={title} max={58} width={c * T - side} min={24} weight={900} italic={false} />
        <div className="wm-facts">{facts}</div>
        {data.formatLabel && <div className="wm-format">{data.formatLabel}</div>}
      </div>
    </header>
  )
}

function Card({ data, i, color, style, size, stack = false }: { data: StandingsData; i: number; color: string; style: CSSProperties; size: number; stack?: boolean }) {
  const p = data.players[i]
  return (
    <div className={`wm-card ${color} ${stack ? 'stack' : ''}`} style={style}>
      <div className="wm-place">{ordinal(i + 1)}</div>
      <div className="wm-body">
        <div className="wm-who">
          <div className="wm-name-line">
            <FitText className="wm-name" text={p.name || 'Player'} max={stack ? 40 : 28} width={stack ? 520 : 256} min={14} weight={900} italic={false} />
            {stack && data.cp && <CpBadge points={data.cp(i + 1)} className="wm-cp" />}
          </div>
          {/* one tile high: the CP sits on the record line, so the name keeps its width */}
          <div className="wm-sub-line">
            {!stack && data.cp && <CpBadge points={data.cp(i + 1)} className="wm-cp" />}
            <div className="wm-sub">{sub(p)}</div>
          </div>
        </div>
        <div className="wm-team">
          {p.team.map((m, j) => (
            <MonSprite key={j} mon={m} size={size} showTera={data.format.tera} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Rows: two rows of big tiles read left to right (1st..4th on top, the rest underneath), every other column
 *  one tile lower so the wall breaks through at the top and bottom, and the top-right corner left open beside the
 *  header. 7-8 players: tiles 4 wide butted edge to edge (the tile gap between them); 5-6: 5 wide; 4 or fewer:
 *  7 wide with a tile of wall between the columns. */
function Rows({ data }: { data: StandingsData }) {
  const n = data.players.length
  const c = Math.max(1, Math.ceil(n / 2))
  const w = c <= 2 ? 7 : c === 3 ? 5 : 4
  const gap = c <= 2 ? 1 : 0
  const start = Math.round((16 - (c * w + (c - 1) * gap)) / 2)
  return (
    <main>
      {data.players.map((p, i) => {
        const row = i < c ? 0 : 1
        const col = i % c
        const color = i === 0 ? 'first' : (row + col) % 2 ? 'red' : 'blue'
        return (
          <RowTile key={p.uid} data={data} i={i} color={color} wide={w === 7} style={at(start + col * (w + gap), 2 + (col % 2) + row * 3, w, 3)} w={w} />
        )
      })}
    </main>
  )
}

function RowTile({ data, i, color, style, wide, w }: { data: StandingsData; i: number; color: string; style: CSSProperties; wide: boolean; w: number }) {
  const p = data.players[i]
  const nameW = wide ? 7 * T - 110 - 60 : w * T - 48
  return (
    <div className={`wm-tile ${color} ${wide ? 'wide' : ''}`} style={style}>
      {wide ? <div className="wm-place">{ordinal(i + 1)}</div> : null}
      <div className="wm-tile-body">
        <div className="wm-tile-who">
          {!wide && <div className="wm-place pill">{ordinal(i + 1)}</div>}
          <FitText className="wm-name" text={p.name || 'Player'} max={wide ? 44 : w === 5 ? 38 : 34} width={nameW} min={14} weight={900} italic={false} />
          <div className="wm-sub-line">
            {data.cp && <CpBadge points={data.cp(i + 1)} className="wm-cp" />}
            <div className="wm-sub">{sub(p)}</div>
          </div>
        </div>
        <div className={`wm-tile-team ${wide ? 'line' : ''}`}>
          {p.team.map((m, j) => (
            <MonSprite key={j} mon={m} size={wide ? 112 : w === 5 ? 112 : 104} showTera={data.format.tera} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const [w, ...rest] = data.players
  const f = few(data)
  return (
    <main>
      {w && (
        <section className="wm-champ" style={at(1, 2, 6, 7)}>
          <div className="wm-champ-photo">
            <PlayerPhoto player={w} />
            <div className="wm-champ-tag">Champion</div>
          </div>
          <div className="wm-champ-who">
            <div className="wm-name-line">
              <FitText className="wm-name" text={w.name || 'Player'} max={44} width={500} min={18} weight={900} italic={false} />
              {data.cp && <CpBadge points={data.cp(1)} className="wm-cp" />}
            </div>
            <div className="wm-sub">{sub(w)}</div>
          </div>
          <div className="wm-champ-team">
            {w.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={140} showTera={data.format.tera} />
            ))}
          </div>
        </section>
      )}
      {rest.map((p, k) =>
        f ? (
          <Card key={p.uid} data={data} i={k + 1} color={lineColor(k + 1)} style={at(8, 1 + k * 2, 7, 2)} size={104} stack />
        ) : (
          <Card key={p.uid} data={data} i={k + 1} color={lineColor(k + 1)} style={at(8, 1 + k, 7, 1)} size={72} />
        ),
      )}
    </main>
  )
}

/** Top 4: tall cards three tiles wide with a whole tile between them, alternately one tile up / down. */
function Columns({ data }: { data: StandingsData }) {
  const n = data.players.length
  const start = Math.round((16 - (n * 3 + (n - 1))) / 2)
  return (
    <main>
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wm-col ${lineColor(i)}`} style={at(start + i * 4, i % 2 ? 3 : 2, 3, 6)}>
          <div className="wm-col-photo">
            <PlayerPhoto player={p} />
            <div className="wm-place pill">{ordinal(i + 1)}</div>
          </div>
          <div className="wm-col-who">
            <FitText className="wm-name" text={p.name || 'Player'} max={30} width={320} min={14} weight={900} italic={false} />
            <div className="wm-sub">{sub(p)}</div>
            {data.cp && <CpBadge points={data.cp(i + 1)} className="wm-cp" />}
          </div>
          <div className="wm-col-team">
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={98} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

/** Up to 8, no photos: tiles two wide, staggered up / down by half the wall's rhythm. */
function Plain({ data }: { data: StandingsData }) {
  const n = data.players.length
  const f = few(data)
  // 4 or fewer: 3 wide with a tile between; 5: 3 wide butted; 6-8: 2 wide butted (8 x 2 = the whole width).
  const w = f || n === 5 ? 3 : 2
  const gap = f ? 1 : 0
  const start = Math.round((16 - (n * w + (n - 1) * gap)) / 2)
  return (
    <main>
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wm-tall ${lineColor(i)}`} style={at(start + i * (w + gap), i % 2 ? 3 : 2, w, 6)}>
          <div className="wm-place pill">{ordinal(i + 1)}</div>
          <FitText className="wm-name" text={p.name || 'Player'} max={w === 3 ? 32 : 24} width={w * T - 44} min={11} weight={900} italic={false} />
          <div className="wm-sub center">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} className="wm-cp" />}
          <div className="wm-tall-team grid">
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={w === 3 ? 136 : 100} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function MosaicWide({ kind, data }: { kind: Kind; data: StandingsData }) {
  const n = Math.max(data.players.length, 1)
  return (
    <div className="wm">
      <Head data={data} tag={kind === 'spotlight' ? 'Results' : `Top ${n}`} cols={kind === 'spotlight' ? 7 : 8} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : kind === 'columns' ? <Columns data={data} /> : <Plain data={data} />}
    </div>
  )
}
