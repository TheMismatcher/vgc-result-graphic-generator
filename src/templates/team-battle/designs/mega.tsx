// Team Battle Win / Loss in Mega Evolution (from the posting team's side, on the left).
// Built from Mega's own pieces: the Champion layout's energy pill tag, the Top Cut header's Mega symbol orb, cards
// with glowing purple-pink-orange energy borders, the Top Cut's ring-shaped place badges (gold ring = 1st; here,
// gold = a set your player won, and a big ring holds the final score), and the Champion layout's footer bar.
// Win: everything charged, gold where you won. Loss: the Mega Evolution wears off: rays and borders drained to
// grey, the orb goes dark, and colour stays only on the sets your players took.

import type { TeamBattleTemplate } from '../../types'
import type { SideTheme } from '../../themes/side'
import { FitText, MonSprite } from '../../shared/parts'
import { displayPokemon, useDisplay } from '../../../lib/display'
import { MegaSymbol } from '../../power'
import { TeamLogo } from '../index'
import { TeamName } from './shared'
import './mega.css'

const W = 1080
const H = 1350
const SETS_TOP = 462
const SETS_BOTTOM = 1192
const GAP = 12

export const makeMegaResult = (result: 'win' | 'loss', theme: SideTheme): TeamBattleTemplate => ({
  id: `${theme.id}-dmv-team-battle-${result}`,
  name: `Team Battle · ${result === 'win' ? 'Win' : 'Loss'} (${theme.style})`,
  description: result === 'win' ? 'Your team (left) won: fully charged, gold where you won.' : 'Your team (left) lost: the Mega Evolution wears off.',
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const [a, b] = data.teams
    const us = a.name || 'Team A'
    const n = Math.max(data.sets.length, 1)
    const rowH = (SETS_BOTTOM - SETS_TOP - GAP * (n - 1)) / n
    const grid = rowH >= 180
    const mon = grid ? Math.min(86, Math.floor((rowH - 56) / 2)) : Math.min(58, Math.floor(rowH * 0.54))
    const wallMons = data.sets.flatMap((st) => st.players[0].team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : '')))
    const facts = [data.league, data.week, `${data.sets.length} set${data.sets.length === 1 ? '' : 's'}`, data.format.name].filter(Boolean).join(' · ')
    return (
      <div className={`dmv tbx tbx-mg themed ${theme.className} tbx-${result}`} style={{ width: W, height: H }}>
        <div className="tbx-mg-wall">
          <theme.Wall mons={wallMons} seed={`tb|${a.name}|${b.name}|${data.week}`} width={W} height={H} />
        </div>

        <div className="tbx-mg-pill">{result === 'win' ? 'Victory' : 'Final'}</div>
        <MegaSymbol size={150} className="tbx-mg-orb" />
        <div className="tbx-mg-kicker">{['Team Battle', data.league, data.week].filter(Boolean).join(' · ')}</div>

        <div className="tbx-mg-board">
          {[a, b].map((t, i) => (
            <div key={i} className={`tbx-mg-card tbx-mg-team ${i ? 'right' : 'left'} ${(result === 'win') === !i ? 'won' : ''}`} style={{ order: i ? 3 : 1 }}>
              <TeamLogo name={t.name || (i ? 'Team B' : 'Team A')} logo={t.logo} size={110} />
              <TeamName className="tbx-mg-team-name" text={t.name || (i ? 'Team B' : 'Team A')} max={34} width={290} twoAt={26} />
              {t.record && <div className="tbx-mg-sub">Season {t.record}</div>}
            </div>
          ))}
          <div className="tbx-mg-ring big" style={{ order: 2 }}>
            <span>
              {data.score[0]}–{data.score[1]}
            </span>
          </div>
        </div>

        <div className="tbx-mg-sets">
          {data.sets.map((s, i) => (
            <div key={i} className={`tbx-mg-card tbx-mg-set ${i % 2 ? 'alt' : ''} ${s.winner === 0 ? 'ours' : ''}`} style={{ height: rowH }}>
              <div className="tbx-mg-ring">
                <span>{i + 1}</span>
              </div>
              {([0, 1] as const).map((side) => (
                <div key={side} className={`tbx-mg-player ${side ? 'right' : 'left'} ${s.winner === side ? 'won' : s.winner === null ? '' : 'lost'}`} style={{ order: side ? 4 : 2 }}>
                  <FitText className="tbx-mg-name" text={s.players[side].name || 'Player'} max={Math.min(28, rowH * 0.27)} width={330} min={13} italic={false} uppercase={false} weight={700} />
                  <div className={`tbx-mg-mons ${grid ? 'grid' : ''}`}>
                    {s.players[side].team.map((m, j) => (
                      <MonSprite key={j} mon={m} size={mon} showTera={data.format.tera} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="tbx-mg-set-score" style={{ order: 3 }}>
                <span className={s.winner === 0 ? 'w' : ''}>{s.score[0]}</span>–<span className={s.winner === 1 ? 'w' : ''}>{s.score[1]}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className="tbx-mg-foot">
          <FitText className="tbx-mg-foot-title" text={result === 'win' ? `${us} win ${data.score[0]}–${data.score[1]}` : `${us} fall ${data.score[0]}–${data.score[1]}`} max={40} width={960} min={22} italic={false} />
          <div className="tbx-mg-foot-facts">{facts}</div>
        </footer>
      </div>
    )
  },
})
