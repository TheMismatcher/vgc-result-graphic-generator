// Comic Book (Poster): Replay (VS Result) and Team Battle built from Nicholas's original DMV reference artwork
// (the 1080 x 1080 VS / Week posters the Comic Book style came from): blue halftone half and yellow sunburst half
// split by a jagged black slash, a long name band with the logos at both ends and a big VS, ink-outlined panels
// with a faint Poké Ball watermark, and a tilted yellow "WINS" strip in the bottom corner.
// Replay: player 1 on blue, player 2 on red (team 3 x 2 + games won), the winner's photo on the right.
// Team Battle: one big panel, VS tab, WEEK band, every set as name  score  name, team logos in the top corners.

import type { MatchTemplate, TeamBattleTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, textWidth, useFontsReady } from '../shared/parts'
import './comic-ref.css'

const S = 1080
const NAME_W = 240 // each name's slot in the band, between its logo and the VS

/** The two-tone poster background: blue halftone + speed lines (left), yellow sunburst + dots (right), black slash. */
function Poster() {
  return (
    <>
      <div className="cr-blue" />
      <div className="cr-yellow" />
      <div className="cr-slash" />
      <div className="cr-streaks" />
    </>
  )
}

/** The tilted yellow strip in the bottom-left corner with the result in big white italic. */
function WinStrip({ lines, width = 560 }: { lines: string[]; width?: number }) {
  return (
    <>
      <div className="cr-strip" />
      <div className="cr-strip-text">
        {lines.map((l, i) => (
          <FitText key={i} className="cr-strip-line" text={l} max={i ? 70 : 84} width={width} min={28} />
        ))}
      </div>
    </>
  )
}

function TeamLogo({ name, logo, size }: { name: string; logo: string; size: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
  return logo ? (
    <img className="cr-logo" src={logo} alt={name} style={{ width: size, height: size }} />
  ) : (
    <div className="cr-logo cr-logo-empty" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

export const VsResultPoster: MatchTemplate = {
  id: 'dmv-vs-result-poster',
  name: 'VS Result (Comic Book Poster)',
  description: 'Built from the original DMV VS poster: name band with a big VS, both teams with games won, the winner’s photo, a WINS strip.',
  kind: 'match',
  width: S,
  height: S,
  Component: ({ data }) => {
    useFontsReady()
    const [p1, p2] = data.players
    const n1 = (p1.name || 'Player 1').toUpperCase()
    const n2 = (p2.name || 'Player 2').toUpperCase()
    // Both names at one size (the longer one decides) so the band reads evenly, each in its 240px slot beside the
    // VS. If one line would make them small, they go to two lines (by word) at a bigger size instead.
    const fit = (t: string) => (54 * NAME_W) / (textWidth(t, '800 54px Montserrat') * 1.04 || 1)
    const oneLine = Math.min(54, fit(n1), fit(n2))
    const words = [...n1.split(/\s+/), ...n2.split(/\s+/)]
    const twoLines = Math.min(44, ...words.map(fit))
    const nameSize = Math.max(22, oneLine >= 36 ? oneLine : Math.max(oneLine, twoLines))
    const shown = data.players[data.winner ?? 0]
    const winnerName = data.winner === null ? '' : data.players[data.winner].name
    return (
      <div className="dmv cr cr-vs" style={{ width: S, height: S }}>
        <Poster />

        <div className="cr-band">
          <div className="cr-band-name left" style={{ fontSize: nameSize }}>
            {n1}
          </div>
          <div className="cr-band-name right" style={{ fontSize: nameSize }}>
            {n2}
          </div>
        </div>
        <div className="cr-band-logo left">
          <Logo size={176} />
        </div>
        <div className="cr-band-logo right">
          <Logo size={176} />
        </div>
        <div className="cr-vs-word">VS</div>

        {data.players.map((p, i) => (
          <div key={i} className={`cr-panel ${i ? 'red' : 'blue'}`} style={{ top: i ? 562 : 232 }}>
            <div className="cr-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={128} showTera={data.format.tera} />
              ))}
            </div>
            <div className="cr-score">{data.score[i]}</div>
          </div>
        ))}

        <div className="cr-photo">
          <PlayerPhoto player={shown} />
        </div>

        <WinStrip lines={!winnerName ? [data.round || 'Match result'] : winnerName.length <= 12 ? [`${winnerName} wins`] : [winnerName, 'Wins']} />
      </div>
    )
  },
}

export const TeamBattlePoster: TeamBattleTemplate = {
  id: 'dmv-team-battle-poster',
  name: 'Team Battle (Comic Book Poster)',
  description: 'Built from the original DMV week poster: one big panel with a VS tab, the week, every set, team logos in the corners.',
  kind: 'teamBattle',
  width: S,
  height: S,
  Component: ({ data }) => {
    const [a, b] = data.teams
    const n = Math.max(data.sets.length, 1)
    const rowH = Math.min(78, 520 / n)
    const winner = data.winner === null ? '' : data.teams[data.winner].name || `Team ${data.winner ? 'B' : 'A'}`
    const score = data.winner === 1 ? `${data.score[1]} - ${data.score[0]}` : `${data.score[0]} - ${data.score[1]}`
    return (
      <div className="dmv cr cr-tb" style={{ width: S, height: S }}>
        <Poster />

        <div className="cr-board">
          <div className="cr-week">
            <FitText className="cr-week-text" text={data.week || data.league || 'Team Battle'} max={84} width={560} min={30} />
          </div>
          <div className="cr-sets" style={{ gridAutoRows: rowH }}>
            {data.sets.map((s, i) => (
              <div key={i} className="cr-set">
                <FitText className={`cr-set-name ${s.winner === 0 ? 'won' : ''}`} text={s.players[0].name || 'Player'} max={38} width={320} min={16} italic={false} weight={800} uppercase={false} />
                <div className="cr-set-score">
                  {s.score[0]} - {s.score[1]}
                </div>
                <FitText className={`cr-set-name ${s.winner === 1 ? 'won' : ''}`} text={s.players[1].name || 'Player'} max={38} width={320} min={16} italic={false} weight={800} uppercase={false} />
              </div>
            ))}
          </div>
        </div>
        <div className="cr-tab">VS</div>
        <div className="cr-corner left">
          <TeamLogo name={a.name} logo={a.logo} size={290} />
        </div>
        <div className="cr-corner right">
          <TeamLogo name={b.name} logo={b.logo} size={290} />
        </div>

        <WinStrip lines={winner ? [`${winner} win`, score] : [data.league || 'Team Battle', score]} width={640} />
      </div>
    )
  },
}
