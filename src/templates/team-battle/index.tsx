import type { TeamBattleTemplate } from '../types'
import { FitText, MonSprite } from '../shared/parts'
import { LoudBackground } from '../shared/LoudBackground'
import { displayPokemon, useDisplay } from '../../lib/display'
import type { SideTheme } from '../themes/side'
import './team-battle.css'

const W = 1080
const H = 1350
const ROWS_TOP = 330
const ROWS_BOTTOM = 1196
const GAP = 10

function TeamLogo({ name, logo, size }: { name: string; logo: string; size: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
  return logo ? (
    <img className="tb-logo" src={logo} alt={name} style={{ width: size, height: size }} />
  ) : (
    <div className="tb-logo tb-logo-empty" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

// Three looks: neutral, or from the posting team's side (Team A, on the left): a celebratory
// "win" version and a subdued "loss" version.
type Variant = 'neutral' | 'win' | 'loss'
const INFO: Record<Variant, { id: string; name: string; description: string }> = {
  neutral: { id: 'dmv-team-battle', name: 'Team Battle', description: 'Two teams, every set with both players’ teams, and who won.' },
  win: { id: 'dmv-team-battle-win', name: 'Team Battle · Win', description: 'Your team (left) won: Victory version.' },
  loss: { id: 'dmv-team-battle-loss', name: 'Team Battle · Loss', description: 'Your team (left) lost: subdued version.' },
}

export const makeTeamBattle = (variant: Variant, loud = false, theme?: SideTheme): TeamBattleTemplate => ({
  ...INFO[variant],
  ...(loud && { id: `${INFO[variant].id}-loud`, name: `${INFO[variant].name} (Comic Book)` }),
  ...(theme && { id: `${theme.id}-${INFO[variant].id}`, name: `${INFO[variant].name} (${theme.style})` }),
  kind: 'teamBattle',
  width: W,
  height: H,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const [a, b] = data.teams
    const n = Math.max(data.sets.length, 1)
    const rowH = Math.min(118, (ROWS_BOTTOM - ROWS_TOP - GAP * (n - 1)) / n)
    const mon = Math.min(56, Math.floor(rowH * 0.5))
    const kicker = [data.league, data.week].filter(Boolean).join('  ·  ')
    const winnerName = data.winner === null ? '' : data.teams[data.winner].name || `Team ${data.winner ? 'B' : 'A'}`
    const logoSize = variant === 'neutral' ? 140 : 112 // smaller when the Victory/Final tag takes room up top
    const us = a.name || 'Your team'
    const banner =
      variant === 'win'
        ? `${us} win ${data.score[0]}–${data.score[1]}`
        : variant === 'loss'
          ? `${us} fall ${data.score[0]}–${data.score[1]}`
          : winnerName
            ? `${winnerName} wins`
            : data.week || 'Team Battle'

    return (
      <div className={`dmv tb tb-${variant} ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: W, height: H }}>
        {theme ? (
          <theme.Wall mons={data.sets.flatMap((st) => st.players.flatMap((p) => p.team.map((m) => (m.pokemon ? displayPokemon(m, showMegas) : ''))))} seed={`tb|${a.name}|${b.name}|${data.week}`} width={W} height={H} />
        ) : loud ? (
          <LoudBackground top="blue" bottom="red" split={[54, 46]} burst={[540, 110]} vertical />
        ) : (
          <>
            <div className="tb-bg" />
            <div className="dmv-halftone" />
          </>
        )}

        {variant !== 'neutral' && <div className="tb-result-tag">{variant === 'win' ? 'Victory' : 'Final'}</div>}
        {kicker && <div className={`tb-kicker dmv-pill ${variant !== 'neutral' ? 'with-tag' : ''}`}>{kicker}</div>}

        <header className="tb-header">
          <div className="tb-team">
            <TeamLogo name={a.name} logo={a.logo} size={logoSize} />
            <FitText className="dmv-title tb-team-name" text={a.name || 'Team A'} max={40} width={300} min={18} />
            {a.record && <div className="tb-record">Season {a.record}</div>}
          </div>
          <div className="tb-score dmv-title">
            {data.score[0]}
            <span className="tb-dash">–</span>
            {data.score[1]}
          </div>
          <div className="tb-team">
            <TeamLogo name={b.name} logo={b.logo} size={logoSize} />
            <FitText className="dmv-title tb-team-name" text={b.name || 'Team B'} max={40} width={300} min={18} />
            {b.record && <div className="tb-record">Season {b.record}</div>}
          </div>
        </header>

        {data.sets.map((s, i) => (
          <div key={i} className="tb-row" style={{ top: ROWS_TOP + i * (rowH + GAP), height: rowH }}>
            {([0, 1] as const).map((side) => (
              <div
                key={side}
                className={`tb-card dmv-panel ${side ? 'right' : 'left'} ${s.winner === null ? '' : s.winner === side ? 'won' : 'lost'}`}
                style={{ order: side ? 3 : 1 }}
              >
                <FitText className="tb-player" text={s.players[side].name || 'Player'} max={Math.min(26, rowH * 0.24)} width={390} min={14} />
                <div className="tb-mons">
                  {s.players[side].team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={mon} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            ))}
            <div className="tb-set-score" style={{ order: 2 }}>
              <span className={s.winner === 0 ? 'win' : ''}>{s.score[0]}</span>–<span className={s.winner === 1 ? 'win' : ''}>{s.score[1]}</span>
            </div>
          </div>
        ))}

        <div className="tb-banner">
          <FitText className="dmv-title" text={banner} max={72} width={860} min={30} />
        </div>
      </div>
    )
  },
})

const TeamBattle = makeTeamBattle('neutral')
export default TeamBattle
export const TeamBattleWin = makeTeamBattle('win')
export const TeamBattleLoss = makeTeamBattle('loss')
export const TeamBattleLoud = makeTeamBattle('neutral', true)
