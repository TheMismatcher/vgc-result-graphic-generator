import type { MatchTemplate } from '../types'
import { FitText, Logo, MonSprite } from '../shared/parts'
import { useBrand } from '../../brand'
import './vs-result.css'

const VsResult: MatchTemplate = {
  id: 'dmv-vs-result',
  name: 'VS Result',
  description: 'Both players, both teams, the score, and the winner.',
  kind: 'match',
  width: 1080,
  height: 1080,
  Component: ({ data }) => {
    const brand = useBrand()
    const [p1, p2] = data.players
    const winnerName = data.winner === null ? '' : data.players[data.winner].name
    return (
      <div className="dmv vs" style={{ width: 1080, height: 1080 }}>
        <div className="vs-bg" />

        <header className="vs-top">
          <Logo size={120} />
          <div className="vs-event">
            <FitText className="dmv-title" text={data.tournament.name || brand.name} max={46} width={600} />
            <div className="vs-meta">
              {data.round && <span className="dmv-pill">{data.round}</span>}
              <span className="vs-format">{data.formatLabel}</span>
              {data.bestOf > 1 && (
                <span className="vs-format">
                  Best of {data.bestOf}
                  {data.gamesPlayed ? ` · ${data.gamesPlayed} games` : ''}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="vs-names">
          <div className="vs-plate blue dmv-panel">
            <FitText className="dmv-title" text={p1.name || 'Player 1'} max={44} width={330} min={20} />
          </div>
          <div className="vs-word dmv-title">VS</div>
          <div className="vs-plate red dmv-panel">
            <FitText className="dmv-title" text={p2.name || 'Player 2'} max={44} width={330} min={20} />
          </div>
        </div>

        {data.players.map((p, i) => (
          <div key={i} className={`vs-panel dmv-panel ${i ? 'red' : 'blue'} ${data.winner === i ? 'won' : ''}`} style={{ top: i ? 590 : 316 }}>
            <div className="vs-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={118} showTera={data.format.tera} />
              ))}
            </div>
            <div className="vs-score dmv-title">{data.score[i]}</div>
          </div>
        ))}

        <div className="vs-banner">
          <FitText className="dmv-title" text={winnerName ? `${winnerName} wins` : data.round || 'Match result'} max={88} width={880} min={36} />
        </div>
      </div>
    )
  },
}

export default VsResult
