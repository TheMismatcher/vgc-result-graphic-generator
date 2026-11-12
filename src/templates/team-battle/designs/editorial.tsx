// Team Battle Win / Loss in Editorial (from the posting team's side, on the left): a newspaper results page.
// Built from Editorial's own pieces: the Champion layout's coloured sidebar with the word set sideways
// (VICTORY on the accent colour / FINAL in ink), the red spaced-caps kicker and thick double rule, a box score
// where the winning team sits in the Top Cut's black champion band with a gold numeral, and every set as a ruled
// table row with a 01-07 numeral. Win keeps the accent and band colours; Loss is plain newsprint (ink and greys only).
// Both moods: Paper (red sidebar, black band, gold numeral) and Night (gold sidebar, red band, white numeral),
// matching each one's Champion and Top Cut.

import type { TeamBattleTemplate } from '../../types'
import type { SideTheme } from '../../themes/side'
import { FitText, MonSprite } from '../../shared/parts'
import { TeamLogo } from '../index'
import { TeamName } from './shared'
import '../../editorial/editorial.css'
import './editorial.css'

const W = 1080
const H = 1350
const TABLE_TOP = 530 // first set row
const TABLE_BOTTOM = 1262 // last set row's bottom edge (the footer sits under it)

export const makeEditorialResult = (result: 'win' | 'loss', theme: SideTheme): TeamBattleTemplate => ({
  id: `${theme.id}-dmv-team-battle-${result}`,
  name: `Team Battle · ${result === 'win' ? 'Win' : 'Loss'} (${theme.style})`,
  description: result === 'win' ? 'Your team (left) won: the results page, in print.' : 'Your team (left) lost: the results page, in plain newsprint.',
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const [a, b] = data.teams
    const mood = theme.id.endsWith('night') ? 'night' : 'paper'
    const n = Math.max(data.sets.length, 1)
    const rowH = (TABLE_BOTTOM - TABLE_TOP) / n
    // Few sets: tall rows, so each team goes to a 3 x 2 grid of bigger Pokémon (no empty bands).
    const grid = rowH >= 170
    const mon = grid ? Math.min(84, Math.floor((rowH - 56) / 2)) : Math.min(50, Math.floor(rowH * 0.46))
    const kicker = ['Team Battle', data.league, data.week].filter(Boolean)
    // Box score: your team first; on a win it's the champion band (black, gold numeral).
    const rows = [
      { team: a, score: data.score[0], fallback: 'Team A', won: result === 'win' },
      { team: b, score: data.score[1], fallback: 'Team B', won: result === 'loss' },
    ]
    return (
      <div className={`dmv tbx tbx-ed ed ed-${mood} tbx-${result}`} style={{ width: W, height: H }}>
        <aside className="tbx-ed-side">
          <FitText className="tbx-ed-side-word" text={result === 'win' ? 'Victory' : 'Final'} max={210} width={1250} italic={false} />
        </aside>

        <div className="tbx-ed-main">
          <div className="ed-kicker tbx-ed-kicker">
            {kicker.map((k, i) => (
              <span key={i}>
                {i > 0 && <span className="tbx-ed-dot"> / </span>}
                {k}
              </span>
            ))}
          </div>
          <div className="ed-rule tbx-ed-rule" />

          <div className="tbx-ed-box">
            {rows.map((r, i) => (
              <div key={i} className={`tbx-ed-line ${r.won ? 'won' : ''} ${result === 'win' && r.won ? 'band' : ''}`}>
                <TeamLogo name={r.team.name || r.fallback} logo={r.team.logo} size={96} />
                <div className="tbx-ed-team">
                  <div className="tbx-ed-team-kicker">{[r.won ? 'Winner' : '', r.team.record && `Season ${r.team.record}`].filter(Boolean).join('  ·  ') || ' '}</div>
                  <TeamName className="tbx-ed-team-name" text={r.team.name || r.fallback} max={58} width={500} twoAt={40} />
                </div>
                <div className="tbx-ed-num">{r.score}</div>
              </div>
            ))}
          </div>

          <div className="tbx-ed-head">
            <span />
            <span>{a.name || 'Team A'}</span>
            <span>Set</span>
            <span>{b.name || 'Team B'}</span>
          </div>
        </div>

        <div className="tbx-ed-sets" style={{ top: TABLE_TOP }}>
          {data.sets.map((s, i) => {
            const ours = s.winner === 0
            return (
              <div key={i} className={`tbx-ed-set ${ours ? 'ours' : s.winner === 1 ? 'theirs' : ''}`} style={{ height: rowH }}>
                <div className="tbx-ed-set-num">{String(i + 1).padStart(2, '0')}</div>
                {([0, 1] as const).map((side) => (
                  <div key={side} className={`tbx-ed-player ${side ? 'right' : 'left'} ${s.winner === side ? 'won' : s.winner === null ? '' : 'lost'}`} style={{ order: side ? 3 : 1 }}>
                    <FitText className="tbx-ed-player-name" text={s.players[side].name || 'Player'} max={Math.min(30, rowH * 0.24)} width={300} min={14} italic={false} />
                    <div className={`tbx-ed-mons ${grid ? 'grid' : ''}`}>
                      {s.players[side].team.map((m, j) => (
                        <MonSprite key={j} mon={m} size={mon} showTera={data.format.tera} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="tbx-ed-set-score" style={{ order: 2 }}>
                  <span className={s.winner === 0 ? 'w' : ''}>{s.score[0]}</span>
                  <span className="tbx-ed-dash">–</span>
                  <span className={s.winner === 1 ? 'w' : ''}>{s.score[1]}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="tbx-ed-foot">{[`${data.sets.length} set${data.sets.length === 1 ? '' : 's'}`, data.format.name].filter(Boolean).join('  ·  ')}</div>
      </div>
    )
  },
})
