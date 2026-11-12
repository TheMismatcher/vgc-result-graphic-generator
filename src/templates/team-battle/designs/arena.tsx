// Team Battle Win / Loss in Arena (from the posting team's side, on the left): the broadcast's final-score screen.
// Built from Arena's own pieces: the Champion layout's slanted banner (VICTORY in the main colour / FINAL in slate),
// a scoreboard of glass team plates with the score in huge italic cells, every set as an Arena row (glass, cut
// corner, coloured left edge, big italic number), and the Champion's footer bar under a gold rule.
// Win: gold spotlight beams, your set wins in the Top Cut's gold 1st-place treatment. Loss: the arena lights go down
// (background drained and dimmed), slate in place of gold, your set wins keep the main colour's edge.

import type { TeamBattleTemplate } from '../../types'
import type { SideTheme } from '../../themes/side'
import { FitText, MonSprite } from '../../shared/parts'
import { TeamLogo } from '../index'
import { TeamName } from './shared'
import '../../arena/arena.css'
import './arena.css'
import { gt } from '../../../i18n'
import { gtFormatName } from '../../../data/options'

const W = 1080
const H = 1350
const SETS_TOP = 452
const SETS_BOTTOM = 1190
const GAP = 10

export const makeArenaResult = (result: 'win' | 'loss', theme: SideTheme): TeamBattleTemplate => ({
  id: `${theme.id}-dmv-team-battle-${result}`,
  name: `Team Battle · ${result === 'win' ? 'Win' : 'Loss'} (${theme.style})`,
  description: result === 'win' ? 'Your team (left) won: the broadcast’s final-score screen, under the spotlights.' : 'Your team (left) lost: the final-score screen with the arena lights down.',
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const [a, b] = data.teams
    const n = Math.max(data.sets.length, 1)
    const rowH = (SETS_BOTTOM - SETS_TOP - GAP * (n - 1)) / n
    const grid = rowH >= 180 // few sets: each team as a 3 x 2 grid of bigger Pokémon
    const mon = grid ? Math.min(86, Math.floor((rowH - 60) / 2)) : Math.min(58, Math.floor(rowH * 0.56))
    const us = a.name || gt('gfx.teamBattle.yourTeam')
    const headline = result === 'win' ? gt('gfx.teamBattle.winScore', { team: us, score1: data.score[0], score2: data.score[1] }) : gt('gfx.teamBattle.fallScore', { team: us, score1: data.score[0], score2: data.score[1] })
    const facts = [data.league, data.week, gt('gfx.teamBattle.setCount', { count: data.sets.length }), gtFormatName(data.format.name)].filter(Boolean).join('  ·  ')
    const plates = [
      { team: a, fallback: gt('gfx.teamBattle.teamA'), side: 'left', won: result === 'win' },
      { team: b, fallback: gt('gfx.teamBattle.teamB'), side: 'right', won: result === 'loss' },
    ] as const
    return (
      <div className={`dmv tbx tbx-ar ar tbx-${result}`} style={{ width: W, height: H }}>
        <div className="tbx-ar-wall">
          <theme.Wall mons={[]} seed="" width={W} height={H} />
        </div>
        <div className="tbx-ar-mood" />

        <div className="tbx-ar-banner">
          <div className="tbx-ar-banner-word">{result === 'win' ? gt('gfx.teamBattle.victory') : gt('gfx.teamBattle.final')}</div>
        </div>
        <div className="tbx-ar-kicker">{[gt('gfx.teamBattle.title'), data.league, data.week].filter(Boolean).join('  ·  ')}</div>

        <div className="tbx-ar-board">
          {plates.map((p, i) => (
            <div key={i} className={`tbx-ar-plate ${p.side} ${p.won ? 'won' : ''}`} style={{ order: i ? 4 : 1 }}>
              <TeamLogo name={p.team.name || p.fallback} logo={p.team.logo} size={96} />
              <div className="tbx-ar-plate-text">
                <TeamName className="tbx-ar-plate-name" text={p.team.name || p.fallback} max={40} width={194} twoAt={30} italic />
                {p.team.record && <div className="tbx-ar-plate-sub">{gt('gfx.teamBattle.season', { record: p.team.record })}</div>}
              </div>
            </div>
          ))}
          {([0, 1] as const).map((i) => (
            <div key={`s${i}`} className={`tbx-ar-cell ${plates[i].won ? 'won' : ''}`} style={{ order: i + 2 }}>
              {data.score[i]}
            </div>
          ))}
        </div>

        <div className="tbx-ar-sets">
          {data.sets.map((s, i) => (
            <div key={i} className={`tbx-ar-set ${s.winner === 0 ? 'ours' : s.winner === 1 ? 'theirs' : ''}`} style={{ height: rowH }}>
              <div className="tbx-ar-set-num">{i + 1}</div>
              {([0, 1] as const).map((side) => (
                <div key={side} className={`tbx-ar-player ${side ? 'right' : 'left'} ${s.winner === side ? 'won' : s.winner === null ? '' : 'lost'}`} style={{ order: side ? 4 : 2 }}>
                  <FitText className="tbx-ar-name" text={s.players[side].name || gt('gfx.common.player')} max={Math.min(32, rowH * 0.28)} width={360} min={14} />
                  <div className={`tbx-ar-mons ${grid ? 'grid' : ''}`}>
                    {s.players[side].team.map((m, j) => (
                      <MonSprite key={j} mon={m} size={mon} showTera={data.format.tera} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="tbx-ar-set-score" style={{ order: 3 }}>
                <span className={s.winner === 0 ? 'w' : ''}>{s.score[0]}</span>
                <span className="tbx-ar-dash">–</span>
                <span className={s.winner === 1 ? 'w' : ''}>{s.score[1]}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className="tbx-ar-foot">
          <FitText className="tbx-ar-foot-title" text={headline} max={46} width={980} min={24} />
          <div className="tbx-ar-foot-facts">{facts}</div>
        </footer>
      </div>
    )
  },
})
