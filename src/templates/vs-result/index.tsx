import type { MatchTemplate } from '../types'
import { FitText, Logo, MonSprite } from '../shared/parts'
import { LoudBackground } from '../shared/LoudBackground'
import { useBrand } from '../../brand'
import { displayPokemon, useDisplay } from '../../lib/display'
import type { SideTheme } from '../themes/side'
import './vs-result.css'

// `loud`: the Comic Book background (blue and red halves, one per player).
export const makeVsResult = (theme?: SideTheme, loud = false): MatchTemplate => ({
  id: theme ? `${theme.id}-vs-result` : loud ? 'dmv-vs-result-loud' : 'dmv-vs-result',
  name: theme ? `VS Result (${theme.style})` : loud ? 'VS Result (Comic Book)' : 'VS Result',
  description: 'Both players, both teams, the score, and the winner.',
  kind: 'match',
  width: 1080,
  height: 1080,
  Component: ({ data }) => {
    const brand = useBrand()
    const { showMegas } = useDisplay()
    const [p1, p2] = data.players
    const winnerName = data.winner === null ? '' : data.players[data.winner].name
    return (
      <div className={`dmv vs ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: 1080, height: 1080 }}>
        {theme ? (
          <theme.Wall mons={data.players.flatMap((p) => p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : '')))} seed={`vs|${p1.name}|${p2.name}`} width={1080} height={1080} />
        ) : loud ? (
          <LoudBackground top="blue" bottom="red" split={[54, 46]} burst={[540, 120]} vertical />
        ) : (
          <div className="vs-bg" />
        )}

        <header className="vs-top">
          <Logo size={120} />
          <div className="vs-event">
            <FitText className="dmv-title" text={data.tournament.name || brand.name} max={46} width={800} />
            <div className="vs-rule" />
            {/* Round and set length on one line, the (long) format name under it. No bubbles. */}
            <div className="vs-meta">
              {[data.round, data.bestOf > 1 ? `Best of ${data.bestOf}${data.gamesPlayed ? ` · ${data.gamesPlayed} games` : ''}` : '']
                .filter(Boolean)
                .map((f, i) => (
                  <span key={f}>
                    {i > 0 && <span className="vs-dot">•</span>}
                    {f}
                  </span>
                ))}
            </div>
            {data.formatLabel && <div className="vs-format">{data.formatLabel}</div>}
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
})

const VsResult = makeVsResult()
export default VsResult
export const VsResultLoud = makeVsResult(undefined, true)
