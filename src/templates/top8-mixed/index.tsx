import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, CpBadge } from '../shared/parts'
import { cardColor, eventFacts, ordinal } from '../shared/format'
import './top8-mixed.css'

// Two looks: alternating blue/red cards, or white cards. 1st place is gold in both.
const makeTop8Mixed = (white: boolean): StandingsTemplate => ({
  id: white ? 'dmv-top8-mixed-white' : 'dmv-top8-mixed',
  name: white ? 'Top 8 Mixed (White)' : 'Top 8 Mixed',
  description: 'Photo cards for the top 4, compact rows for 5th–8th.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const top4 = data.players.slice(0, 4)
    const rest = data.players.slice(4)
    return (
      <div className="dmv m8" style={{ width: 1080, height: 1350 }}>
        <div className="m8-bg" />
        <div className="dmv-halftone" />

        <header className="m8-header">
          <Logo size={160} />
          <div className="m8-heading">
            <div className="m8-tag">Top {Math.max(data.players.length, 1)}</div>
            <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={62} width={800} />
            <div className="m8-facts">{eventFacts(data).join('  ·  ')}</div>
          </div>
        </header>

        <main className="m8-top4">
          {top4.map((p, i) => (
            <div key={p.uid} className={`m8-card dmv-panel ${white ? (i === 0 ? 'first' : '') : cardColor(i)}`}>
              <div className="m8-photo">
                <PlayerPhoto player={p} />
                <div className="m8-place">{ordinal(i + 1)}</div>
                {data.cp && <CpBadge points={data.cp(i + 1)} className="photo-cp" />}
              </div>
              <div className="m8-info">
                <FitText className="m8-name" text={p.name || 'Player'} max={30} width={196} min={16} />
                <div className="m8-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
                <div className="m8-team">
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={62} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </main>

        {rest.length > 0 && (
          <section className="m8-rest">
            {rest.map((p, i) => (
              <div key={p.uid} className={`m8-row dmv-panel ${i % 2 ? 'red' : 'blue'}`}>
                <div className="m8-row-place">
                  {ordinal(i + 5)}
                  {data.cp && <CpBadge points={data.cp(i + 5)} className="tc-cp" />}
                </div>
                <div className="m8-row-player">
                  <FitText className="dmv-title" text={p.name || 'Player'} max={30} width={300} min={18} />
                  <div className="m8-row-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
                </div>
                <div className="m8-row-team">
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={70} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    )
  },
})

const Top8Mixed = makeTop8Mixed(false)
export default Top8Mixed
export const Top8MixedWhite = makeTop8Mixed(true)
