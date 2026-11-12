// Team Battle Win / Loss on the Scarlet / Violet Book covers (from the posting team's side, on the left).
// Built from the Book style's own pieces: panels in the cover's cloth colour framed in its gold foil (thick rule +
// thin inner rule), the Top Cut's place cell (gold for 1st; here, gold = a set your player won), the Champion
// layout's framed tag and its footer bar. The score sits in two place cells: gold for the winning team.
// Win: the foil glows. Loss: the cover dims and loses its colour, the tag turns to the cover's dark cloth.

import type { TeamBattleTemplate } from '../../types'
import type { SideTheme } from '../../themes/side'
import { FitText, MonSprite } from '../../shared/parts'
import { TeamLogo } from '../index'
import { TeamName } from './shared'
import './book.css'

const W = 1080
const H = 1350
const SETS_TOP = 470
const SETS_BOTTOM = 1186
const GAP = 14

export const makeBookResult = (result: 'win' | 'loss', theme: SideTheme): TeamBattleTemplate => ({
  id: `${theme.id}-dmv-team-battle-${result}`,
  name: `Team Battle · ${result === 'win' ? 'Win' : 'Loss'} (${theme.style})`,
  description: result === 'win' ? 'Your team (left) won: gold-framed results on the book cover.' : 'Your team (left) lost: the results on a dimmed cover.',
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const [a, b] = data.teams
    const us = a.name || 'Team A'
    const n = Math.max(data.sets.length, 1)
    const rowH = (SETS_BOTTOM - SETS_TOP - GAP * (n - 1)) / n
    const grid = rowH >= 180
    const mon = grid ? Math.min(84, Math.floor((rowH - 58) / 2)) : Math.min(56, Math.floor(rowH * 0.5))
    const winSide = result === 'win' ? 0 : 1
    const facts = [data.league, data.week, `${data.sets.length} set${data.sets.length === 1 ? '' : 's'}`, data.format.name].filter(Boolean).join(' • ')
    return (
      <div className={`dmv tbx tbx-bk themed ${theme.className} tbx-${result}`} style={{ width: W, height: H }}>
        <div className="tbx-bk-wall">
          <theme.Wall mons={[]} seed="" width={W} height={H} />
        </div>
        <div className="tbx-bk-shade" />

        <div className="tbx-bk-tag">{result === 'win' ? 'Victory' : 'Final'}</div>
        <div className="tbx-bk-kicker">{['Team Battle', data.league, data.week].filter(Boolean).join(' • ')}</div>

        <div className="tbx-bk-panel tbx-bk-board">
          {[a, b].map((t, i) => (
            <div key={i} className={`tbx-bk-team ${i ? 'right' : 'left'}`} style={{ order: i ? 4 : 1 }}>
              <TeamLogo name={t.name || (i ? 'Team B' : 'Team A')} logo={t.logo} size={104} />
              <div className="tbx-bk-team-text">
                <TeamName className="tbx-bk-team-name" text={t.name || (i ? 'Team B' : 'Team A')} max={42} width={200} twoAt={32} />
                {t.record && <div className="tbx-bk-sub">Season {t.record}</div>}
              </div>
            </div>
          ))}
          {([0, 1] as const).map((i) => (
            <div key={`c${i}`} className={`tbx-bk-cell big ${i === winSide ? 'gold' : ''}`} style={{ order: i + 2 }}>
              {data.score[i]}
            </div>
          ))}
        </div>

        <div className="tbx-bk-sets">
          {data.sets.map((s, i) => (
            <div key={i} className={`tbx-bk-panel tbx-bk-set ${s.winner === 0 ? 'ours' : ''}`} style={{ height: rowH }}>
              <div className={`tbx-bk-cell ${s.winner === 0 ? 'gold' : i % 2 ? 'b' : ''}`}>{i + 1}</div>
              {([0, 1] as const).map((side) => (
                <div key={side} className={`tbx-bk-player ${side ? 'right' : 'left'} ${s.winner === side ? 'won' : s.winner === null ? '' : 'lost'}`} style={{ order: side ? 4 : 2 }}>
                  <FitText className="tbx-bk-name" text={s.players[side].name || 'Player'} max={Math.min(28, rowH * 0.27)} width={330} min={13} italic={false} />
                  <div className={`tbx-bk-mons ${grid ? 'grid' : ''}`}>
                    {s.players[side].team.map((m, j) => (
                      <MonSprite key={j} mon={m} size={mon} showTera={data.format.tera} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="tbx-bk-set-score" style={{ order: 3 }}>
                <span className={s.winner === 0 ? 'w' : ''}>{s.score[0]}</span>–<span className={s.winner === 1 ? 'w' : ''}>{s.score[1]}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className="tbx-bk-foot">
          <FitText className="tbx-bk-foot-title" text={result === 'win' ? `${us} win ${data.score[0]}–${data.score[1]}` : `${us} fall ${data.score[0]}–${data.score[1]}`} max={40} width={960} min={22} />
          <div className="tbx-bk-foot-facts">{facts}</div>
        </footer>
      </div>
    )
  },
})
