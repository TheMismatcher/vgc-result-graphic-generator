// Landscape (1920x1080) standings: three trial layouts that read across instead of down.
// - rows: two columns of four cards; a slanted place block, name + record, then the team in one line.
// - spotlight: the champion big on the left (photo, name, team 3x2), 2nd-8th as slim rows on the right.
// - columns: eight tall player columns side by side, each team stacked top to bottom; 1st wider and gold.
// Classic look by default; with a Theme (map / Glass styles) its background and panel colours.

import { Facts } from '../shared/Facts'
import type { Theme } from '../themes/theme'
import type { StandingsData, StandingsTemplate } from '../types'
import type { Player } from '../../types'
import { CpBadge, FitText, Logo, MonSprite, PlayerPhoto } from '../shared/parts'
import { cardColor, ordinal } from '../shared/format'
import './wide.css'

const W = 1920
const H = 1080

type Kind = 'rows' | 'spotlight' | 'columns'
const INFO: Record<Kind, { id: string; name: string; description: string }> = {
  rows: { id: 'wide-rows', name: 'Wide Rows', description: 'Landscape: two columns of four, each team in a line.' },
  spotlight: { id: 'wide-spotlight', name: 'Wide Spotlight', description: 'Landscape: the champion big on the left, 2nd–8th as rows on the right.' },
  columns: { id: 'wide-columns', name: 'Wide Columns', description: 'Landscape: eight player columns side by side, teams stacked.' },
}

const sub = (p: Player) => [p.record, p.social].filter(Boolean).join('  ·  ')

function Header({ data, theme, tag }: { data: StandingsData; theme?: Theme; tag: string }) {
  return (
    <header className="wd-header">
      <Logo size={150} />
      <div className="wd-heading">
        <div className="wd-tag">{tag}</div>
        <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={70} width={1000} />
      </div>
      <div className="wd-facts-box">
        <Facts data={data} className="wd-facts" split={theme?.splitFacts ?? true} />
      </div>
    </header>
  )
}

// 4 or fewer players ("few"): bigger cards and sprites; teams in grids where a single line would leave room.
const few = (data: StandingsData) => data.players.length <= 4

function Rows({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className="wd-rows">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wd-row dmv-panel ${cardColor(i)}`}>
          <div className={`wd-place ${cardColor(i)}`}>
            <span>{ordinal(i + 1)}</span>
          </div>
          <div className="wd-row-body">
            <div className="wd-row-who">
              <div className="wd-name-line">
                <FitText className="wd-name" text={p.name || 'Player'} max={f ? 44 : 32} width={f ? 480 : 500} min={16} />
                {data.cp && <CpBadge points={data.cp(i + 1)} />}
              </div>
              <div className="wd-sub">{sub(p)}</div>
            </div>
            <div className="wd-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={f ? 138 : 104} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </main>
  )
}

function Spotlight({ data }: { data: StandingsData }) {
  const [champ, ...rest] = data.players
  return (
    <main className="wd-spot">
      {champ && (
        <section className="wd-champ dmv-panel first">
          <div className="wd-champ-photo">
            <PlayerPhoto player={champ} />
            <div className="wd-champ-tag">Champion</div>
          </div>
          <div className="wd-champ-info">
            <FitText className="wd-champ-name" text={champ.name || 'Player'} max={54} width={560} min={22} />
            <div className="wd-sub">{sub(champ)}</div>
            {data.cp && <CpBadge points={data.cp(1)} />}
            <div className="wd-champ-team">
              {champ.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={150} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="wd-list">
        {rest.map((p, k) =>
          few(data) ? (
            <div key={p.uid} className={`wd-line dmv-panel ${cardColor(k + 1)}`}>
              <div className={`wd-place ${cardColor(k + 1)}`}>
                <span>{ordinal(k + 2)}</span>
              </div>
              <div className="wd-row-body">
                <div className="wd-row-who">
                  <div className="wd-name-line">
                    <FitText className="wd-name" text={p.name || 'Player'} max={38} width={540} min={16} />
                    {data.cp && <CpBadge points={data.cp(k + 2)} />}
                  </div>
                  <div className="wd-sub">{sub(p)}</div>
                </div>
                <div className="wd-team">
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={124} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div key={p.uid} className={`wd-line dmv-panel ${cardColor(k + 1)}`}>
            <div className={`wd-place small ${cardColor(k + 1)}`}>
              <span>{ordinal(k + 2)}</span>
            </div>
            <div className="wd-who">
              <FitText className="wd-name" text={p.name || 'Player'} max={28} width={300} min={14} />
              <div className="wd-sub">{sub(p)}</div>
            </div>
            {data.cp && <CpBadge points={data.cp(k + 2)} />}
            <div className="wd-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={88} showTera={data.format.tera} />
              ))}
            </div>
          </div>
          ),
        )}
      </section>
    </main>
  )
}

function Columns({ data }: { data: StandingsData }) {
  const f = few(data)
  return (
    <main className="wd-cols">
      {data.players.map((p, i) => (
        <div key={p.uid} className={`wd-col dmv-panel ${cardColor(i)}`}>
          <div className={`wd-col-place ${cardColor(i)}`}>{ordinal(i + 1)}</div>
          <FitText className="wd-name" text={p.name || 'Player'} max={f ? 40 : i === 0 ? 30 : 24} width={f ? 400 : i === 0 ? 270 : 180} min={12} />
          <div className="wd-sub">{p.record}</div>
          {data.cp && <CpBadge points={data.cp(i + 1)} />}
          <div className="wd-col-team">
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={f ? 150 : i === 0 ? 104 : 94} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export const makeWide = (kind: Kind, theme?: Theme): StandingsTemplate => ({
  id: theme ? `${theme.id}-${INFO[kind].id}` : `dmv-${INFO[kind].id}`,
  name: theme ? `${INFO[kind].name} (${theme.style})` : INFO[kind].name,
  description: INFO[kind].description,
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className={`dmv wd wd-is-${kind} ${few(data) ? 'few' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: W, height: H }}>
      {theme ? (
        <theme.Background data={data} width={W} height={H} />
      ) : (
        <>
          <div className="wd-bg" />
          <div className="dmv-halftone" />
        </>
      )}
      <Header data={data} theme={theme} tag={kind === 'spotlight' ? 'Results' : `Top ${Math.max(data.players.length, 1)}`} />
      {kind === 'rows' ? <Rows data={data} /> : kind === 'spotlight' ? <Spotlight data={data} /> : <Columns data={data} />}
    </div>
  ),
})

export const WideRows = makeWide('rows')
export const WideSpotlight = makeWide('spotlight')
export const WideColumns = makeWide('columns')
