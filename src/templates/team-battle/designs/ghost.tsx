// Team Battle Win / Loss in Ghost Pixels (from the posting team's side, on the left): the end of a battle in a
// handheld game. Built from Ghost Pixels' own pieces: pixel windows (lavender border, black ring, hard purple drop),
// the Top Cut's pixel number cell (white = 1st, here = a set your player won), PC-box slots for each team, and the
// game text box with the ▼ prompt telling you how it went: "<them> was defeated!" or "<you> blacked out!".
// Win: the score window gets the white 1st-place frame. Loss: the screen fades to black, as when you black out.

import type { TeamBattleTemplate } from '../../types'
import type { SideTheme } from '../../themes/side'
import { FitText, MonSprite } from '../../shared/parts'
import { displayPokemon, useDisplay } from '../../../lib/display'
import { TeamLogo } from '../index'
import { TeamName } from './shared'
import '../../wide/designs/ghost.css'
import './ghost.css'
import { gt } from '../../../i18n'

const W = 1080
const H = 1350
const SETS_TOP = 418
const SETS_BOTTOM = 1094
const GAP = 16

export const makeGhostResult = (result: 'win' | 'loss', theme: SideTheme): TeamBattleTemplate => ({
  id: `${theme.id}-dmv-team-battle-${result}`,
  name: `Team Battle · ${result === 'win' ? 'Win' : 'Loss'} (${theme.style})`,
  description: result === 'win' ? 'Your team (left) won: the battle’s end screen, “… was defeated!”.' : 'Your team (left) lost: the screen fades out, “… blacked out!”.',
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const [a, b] = data.teams
    const us = a.name || gt('gfx.teamBattle.teamA')
    const them = b.name || gt('gfx.teamBattle.teamB')
    const n = Math.max(data.sets.length, 1)
    const rowH = (SETS_BOTTOM - SETS_TOP - GAP * (n - 1)) / n
    const grid = rowH >= 190
    const mon = grid ? Math.min(78, Math.floor((rowH - 70) / 2) - 8) : Math.min(50, Math.floor(rowH * 0.5))
    const wallMons = data.sets.flatMap((st) => st.players.flatMap((p) => p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : ''))))
    const lines = result === 'win' ? [gt('gfx.teamBattle.defeated', { team: them }), gt('gfx.teamBattle.won', { team: us, score1: data.score[0], score2: data.score[1] })] : [gt('gfx.teamBattle.blackedOut', { team: us }), gt('gfx.teamBattle.finalScore', { score1: data.score[0], score2: data.score[1] })]
    const msgSize = lines.join('').length > 64 ? 20 : 24
    return (
      <div className={`dmv tbx tbx-gp themed ${theme.className} tbx-${result}`} style={{ width: W, height: H }}>
        <theme.Wall mons={wallMons} seed={`tb|${a.name}|${b.name}|${data.week}`} width={W} height={H} />
        {result === 'loss' && <div className="tbx-gp-fade" />}

        <div className={`wg-win tbx-gp-head ${result === 'win' ? 'first' : ''}`}>
          <div className="wg-bar">
            <span className="wg-no">{gt('gfx.teamBattle.title')}</span>
            <span className="tbx-gp-bar-facts">{[data.league, data.week].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="tbx-gp-board">
            {[a, b].map((t, i) => (
              <div key={i} className="tbx-gp-team" style={{ order: i ? 3 : 1 }}>
                <TeamLogo name={t.name || (i ? gt('gfx.teamBattle.teamB') : gt('gfx.teamBattle.teamA'))} logo={t.logo} size={124} />
                <TeamName className="tbx-gp-team-name" text={t.name || (i ? gt('gfx.teamBattle.teamB') : gt('gfx.teamBattle.teamA'))} max={34} width={300} twoAt={26} />
                {t.record && <div className="wg-sub">{gt('gfx.teamBattle.season', { record: t.record })}</div>}
              </div>
            ))}
            <div className="tbx-gp-score" style={{ order: 2 }}>
              {data.score[0]}-{data.score[1]}
            </div>
          </div>
        </div>

        <div className="tbx-gp-sets">
          {data.sets.map((s, i) => (
            <div key={i} className={`wg-win tbx-gp-set ${s.winner === 0 ? 'ours' : ''}`} style={{ height: rowH }}>
              <div className="tbx-gp-num">{i + 1}</div>
              {([0, 1] as const).map((side) => (
                <div key={side} className={`tbx-gp-player ${side ? 'right' : 'left'} ${s.winner === side ? 'won' : s.winner === null ? '' : 'lost'}`} style={{ order: side ? 4 : 2 }}>
                  <FitText className="wg-name tbx-gp-name" text={s.players[side].name || gt('gfx.common.player')} max={Math.min(26, rowH * 0.26)} width={360} min={12} italic={false} />
                  <div className={`tbx-gp-slots ${grid ? 'grid' : ''}`}>
                    {s.players[side].team.map((m, j) => (
                      <div key={j} className="wg-slot" style={{ width: mon + 8, height: mon + 8 }}>
                        <MonSprite mon={m} size={mon} showTera={data.format.tera} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="tbx-gp-set-score" style={{ order: 3 }}>
                {s.score[0]}-{s.score[1]}
              </div>
            </div>
          ))}
        </div>

        <div className="wg-textbox tbx-gp-text">
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: msgSize }}>
              {l}
            </div>
          ))}
          <span className="wg-cursor">▼</span>
        </div>
      </div>
    )
  },
})
