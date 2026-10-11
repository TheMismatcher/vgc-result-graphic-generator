import type { BracketEntry, StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import './bracket.css'

const W = 1080
const H = 1350
const TOP = 290 // where the bracket area starts (below the header and column labels)
const BOTTOM = 1300
const LEFT = 40
const GAP = 36 // space between columns, where the bracket lines go
const LINE = 6

const ROUND_NAMES: Record<number, string> = { 8: 'Quarterfinals', 4: 'Semifinals', 2: 'Final' }

function Entry({ entry, width, height, state }: { entry: BracketEntry; width: number; height: number; state: 'won' | 'lost' | 'open' }) {
  const { showMegas } = useDisplay()
  const team = entry.player?.team.filter((m) => m.pokemon) ?? []
  const icon = Math.min(38, Math.floor((width - 44) / 6)) // box padding + border + gaps
  return (
    <div className={`br-entry dmv-panel ${state}`} style={{ width, height }}>
      <FitText className="br-name" text={entry.name || 'TBD'} max={26} width={width - 30} min={14} />
      {team.length > 0 && (
        <div className="br-team">
          {team.map((m, i) => (
            <img key={i} src={sprites.render(displayPokemon(m, showMegas))} alt="" style={{ width: icon, height: icon }} />
          ))}
        </div>
      )}
    </div>
  )
}

const Bracket: StandingsTemplate = {
  id: 'dmv-bracket',
  name: 'Bracket',
  description: 'Top cut bracket with results. Set it up under Top cut bracket.',
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => {
    const rounds = data.bracket?.rounds ?? []
    const R = rounds.length
    const colW = R ? (W - LEFT * 2 - R * GAP) / (R + 1) : 0
    const colX = (c: number) => LEFT + c * (colW + GAP)

    // Vertical centers of each match: first round evenly spaced, later rounds between their two feeders.
    const centers: number[][] = []
    rounds.forEach((ms, r) => {
      centers.push(
        ms.map((_, i) => (r === 0 ? TOP + ((BOTTOM - TOP) / ms.length) * (i + 0.5) : (centers[r - 1][i * 2] + centers[r - 1][i * 2 + 1]) / 2)),
      )
    })
    const slot = R ? (BOTTOM - TOP) / rounds[0].length : 0
    const boxH = Math.min(118, slot * 0.42)
    const inner = 12 // gap between the two players of a match
    const champ = data.bracket?.champion
    const champCenter = R ? centers[R - 1][0] : 0
    const champH = 330

    return (
      <div className="dmv br" style={{ width: W, height: H }}>
        <div className="br-bg" />
        <div className="dmv-halftone" />

        <header className="br-header">
          <Logo size={160} />
          <div className="br-heading">
            <div className="br-tag">Top Cut</div>
            <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={60} width={800} />
            <div className="br-facts">{eventFacts(data).join('  ·  ')}</div>
          </div>
        </header>

        {!R && <div className="br-empty">Set up the bracket under “Top cut bracket” on the Standings tab, or import from Limitless.</div>}

        {rounds.map((ms, r) => (
          <div key={`label-${r}`} className="br-label" style={{ left: colX(r), width: colW, top: TOP - 52 }}>
            {ROUND_NAMES[ms.length * 2] ?? `Round ${r + 1}`}
          </div>
        ))}
        {R > 0 && (
          <div className="br-label" style={{ left: colX(R), width: colW, top: TOP - 52 }}>Champion</div>
        )}

        {rounds.map((ms, r) =>
          ms.map((m, i) => {
            const c = centers[r][i]
            const x = colX(r)
            const tops = [c - inner / 2 - boxH, c + inner / 2]
            const mids = tops.map((t) => t + boxH / 2)
            return (
              <div key={`${r}-${i}`}>
                {m.entries.map((e, side) => (
                  <div key={side} style={{ position: 'absolute', left: x, top: tops[side] }}>
                    <Entry entry={e} width={colW} height={boxH} state={m.winner === null ? 'open' : m.winner === side ? 'won' : 'lost'} />
                  </div>
                ))}
                {/* "]" joining the two players, then a line to the next round */}
                <div className="br-line" style={{ left: x + colW, top: mids[0] - LINE / 2, width: GAP / 2, height: mids[1] - mids[0] + LINE, borderLeft: 'none' }} />
                <div className="br-line-h" style={{ left: x + colW + GAP / 2, top: c - LINE / 2, width: GAP / 2 + 2 }} />
              </div>
            )
          }),
        )}

        {R > 0 && (
          <div className={`br-champ dmv-panel ${champ ? '' : 'open'}`} style={{ left: colX(R), top: champCenter - champH / 2, width: colW, height: champH }}>
            <div className="br-champ-label">★ Champion ★</div>
            {data.cp && champ && <CpBadge points={data.cp(1)} style={{ marginTop: 6, background: '#fff' }} />}
            <FitText className="dmv-title br-champ-name" text={champ?.name || 'TBD'} max={34} width={colW - 30} min={16} />
            <div className="br-champ-team">
              {(champ?.player?.team ?? []).map((m, i) => (
                <MonSprite key={i} mon={m} size={Math.floor((colW - 44) / 3)} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  },
}

export default Bracket
