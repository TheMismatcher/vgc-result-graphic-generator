// Comic Book (Poster): Replay (VS Result) and Team Battle built from Nicholas's original DMV reference artwork
// (the 1080 x 1080 VS / Week posters the Comic Book style came from): blue halftone half and yellow sunburst half
// split by a jagged black slash, a long name band with the logos at both ends and a big VS, ink-outlined panels
// with a faint Poké Ball watermark, and a tilted yellow "WINS" strip in the bottom corner.
// Replay: player 1 on blue, player 2 on red (team 3 x 2 + games won), the winner's photo on the right.
// Team Battle: one big panel, VS tab, WEEK band, every set as name  score  name, team logos in the top corners.

import { createContext, useContext, type JSX } from 'react'
import type { MatchTemplate, TeamBattleTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, textWidth, useFontsReady } from '../shared/parts'
import './comic-ref.css'

const S = 1080

/** Comic Book Poster, flipped: blue and red swap places (Colors switch). */
const PosterFlip = createContext(false)
export function withPosterFlip<T extends { id: string; name: string; Component: (props: { data: never }) => JSX.Element }>(t: T): T {
  const Inner = t.Component as (props: object) => JSX.Element
  const Component = (props: object) => (
    <PosterFlip.Provider value={true}>
      <Inner {...props} />
    </PosterFlip.Provider>
  )
  return { ...t, id: `${t.id}-flipped`, name: `${t.name} · Flipped`, Component }
}
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
      <div className={`dmv cr cr-vs ${useContext(PosterFlip) ? 'cr-flip' : ''}`} style={{ width: S, height: S }}>
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

// Win / Loss (from the posting team's side, on the left), on the card's Result switch.
// Win: the VS tab becomes a yellow WIN! tab, a sunburst blasts out behind your logo, the beaten team's logo is
// knocked sideways, your players' set wins are marked with the yellow highlighter, the strip reads "<team> win".
// Loss: the poster at night (sunburst drained, blue half dimmed, comic rain lines), an ink FINAL tab and strip.
type PosterResult = 'neutral' | 'win' | 'loss'
const POSTER_INFO: Record<PosterResult, { suffix: string; name: string; description: string }> = {
  neutral: { suffix: '', name: 'Team Battle (Comic Book Poster)', description: 'Built from the original DMV week poster: one big panel with a VS tab, the week, every set, team logos in the corners.' },
  win: { suffix: '-win', name: 'Team Battle · Win (Comic Book Poster)', description: 'Your team (left) won: WIN! tab, a sunburst behind your logo, your set wins highlighted.' },
  loss: { suffix: '-loss', name: 'Team Battle · Loss (Comic Book Poster)', description: 'Your team (left) lost: the poster at night, with a FINAL tab.' },
}

const makeTeamBattlePoster = (result: PosterResult): TeamBattleTemplate => ({
  id: `dmv-team-battle-poster${POSTER_INFO[result].suffix}`,
  name: POSTER_INFO[result].name,
  description: POSTER_INFO[result].description,
  kind: 'teamBattle',
  width: S,
  height: S,
  Component: ({ data }) => {
    const [a, b] = data.teams
    const n = Math.max(data.sets.length, 1)
    // Rows share the board (7 sets = 74px rows); fewer sets get taller rows and bigger names, not an empty board.
    const rowH = Math.min(120, 520 / n)
    const nameMax = Math.min(54, Math.round(rowH * 0.512))
    const scoreSize = Math.max(42, Math.round(nameMax * 1.1))
    const scoreW = Math.max(140, Math.round(scoreSize * 3.1))
    const nameW = Math.min(320, (828 - scoreW - 28) / 2)
    const winner = data.winner === null ? '' : data.teams[data.winner].name || `Team ${data.winner ? 'B' : 'A'}`
    const score = data.winner === 1 ? `${data.score[1]} - ${data.score[0]}` : `${data.score[0]} - ${data.score[1]}`
    const us = a.name || 'Team A'
    const strip =
      result === 'win'
        ? [`${us} win`, `${data.score[0]} - ${data.score[1]}`]
        : result === 'loss'
          ? [`${us} fall`, `${data.score[0]} - ${data.score[1]}`]
          : winner
            ? [`${winner} win`, score]
            : [data.league || 'Team Battle', score]
    return (
      <div className={`dmv cr cr-tb cr-${result} ${useContext(PosterFlip) ? 'cr-flip' : ''}`} style={{ width: S, height: S }}>
        <Poster />
        {result === 'loss' && <div className="cr-rain" />}

        <div className="cr-board">
          <div className="cr-week">
            <FitText className="cr-week-text" text={data.week || data.league || 'Team Battle'} max={84} width={560} min={30} />
          </div>
          <div className="cr-sets" style={{ gridAutoRows: rowH }}>
            {data.sets.map((s, i) => (
              <div key={i} className="cr-set" style={{ gridTemplateColumns: `1fr ${scoreW}px 1fr` }}>
                <FitText className={`cr-set-name ${s.winner === 0 ? 'won ours' : ''}`} text={s.players[0].name || 'Player'} max={nameMax} width={nameW} min={16} italic={false} weight={800} uppercase={false} />
                <div className="cr-set-score" style={{ fontSize: scoreSize }}>
                  <span className={s.winner === 0 ? 'w' : ''}>{s.score[0]}</span> - <span className={s.winner === 1 ? 'w' : ''}>{s.score[1]}</span>
                </div>
                <FitText className={`cr-set-name ${s.winner === 1 ? 'won' : ''}`} text={s.players[1].name || 'Player'} max={nameMax} width={nameW} min={16} italic={false} weight={800} uppercase={false} />
              </div>
            ))}
          </div>
        </div>
        <div className="cr-tab">
          {/* WIN! / FINAL are wider than VS: fitted inside the tab's slanted sides. */}
          {result === 'neutral' ? 'VS' : <FitText className="cr-tab-word" text={result === 'win' ? 'WIN!' : 'FINAL'} max={118} width={236} min={60} />}
        </div>
        <div className="cr-corner left">
          {result === 'win' && <div className="cr-burst" />}
          <TeamLogo name={a.name} logo={a.logo} size={290} />
        </div>
        <div className="cr-corner right">
          <TeamLogo name={b.name} logo={b.logo} size={290} />
        </div>

        <WinStrip lines={strip} width={640} />
      </div>
    )
  },
})

export const TeamBattlePoster = makeTeamBattlePoster('neutral')
export const TeamBattlePosterWin = makeTeamBattlePoster('win')
export const TeamBattlePosterLoss = makeTeamBattlePoster('loss')
