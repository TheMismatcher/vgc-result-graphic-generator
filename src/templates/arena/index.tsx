import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge } from '../shared/parts'
import { eventFacts } from '../shared/format'
import './arena.css'

// A sleek esports-style design: dark base, glass rows, outlined place numbers.
// Three background options share the same layout.
type Background = 'spotlight' | 'grid' | 'sunset'
const NAMES: Record<Background, string> = { spotlight: 'Spotlight', grid: 'Grid', sunset: 'Sunset' }

const makeArena = (bg: Background): StandingsTemplate => ({
  id: `dmv-arena-${bg}`,
  name: `Arena · ${NAMES[bg]}`,
  description: 'Dark esports look with glass rows and outlined place numbers.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className={`dmv ar ar-${bg}`} style={{ width: 1080, height: 1350 }}>
      <div className="ar-bg" />
      <div className="ar-bg-extra" />

      <header className="ar-header">
        <div className="ar-heading">
          <div className="ar-kicker">Top {Math.max(data.players.length, 1)} Standings</div>
          <FitText className="ar-title" text={data.tournament.name || 'Tournament'} max={66} width={780} />
          <div className="ar-underline" />
          <div className="ar-facts">{eventFacts(data).join('   /   ')}</div>
        </div>
        <Logo size={150} />
      </header>

      <main className="ar-rows">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`ar-row ${i === 0 ? 'first' : ''}`}>
            <div className="ar-place">{i + 1}</div>
            <div className="ar-player">
              <FitText className="ar-name" text={p.name || 'Player'} max={36} width={300} min={18} />
              <div className="ar-subrow">
                <div className="ar-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
                {data.cp && <CpBadge points={data.cp(i + 1)} className="ar-cp" />}
              </div>
            </div>
            <div className="ar-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={84} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
})

export const ArenaSpotlight = makeArena('spotlight')
export const ArenaGrid = makeArena('grid')
export const ArenaSunset = makeArena('sunset')
