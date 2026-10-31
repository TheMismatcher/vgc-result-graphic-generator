import type { Theme } from '../themes/theme'
import type { BracketEntry, StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { LoudBackground } from '../shared/LoudBackground'
import './bracket.css'

const W = 1080
const H = 1350
const TOP = 290 // where the bracket area starts (below the header and column labels)
const BOTTOM = 1300
const LEFT = 40
const GAP = 36 // space between columns, where the bracket lines go
const LINE = 6

const ROUND_NAMES: Record<number, string> = { 8: 'Quarterfinals', 4: 'Semifinals', 2: 'Finals' }

function Entry({ entry, width, height, state, cp }: { entry: BracketEntry; width: number; height: number; state: 'won' | 'lost' | 'open'; cp?: number }) {
  const { showMegas } = useDisplay()
  const team = entry.player?.team.filter((m) => m.pokemon) ?? []
  const icon = Math.min(38, Math.floor((width - 44) / 6)) // box padding + border + gaps
  return (
    <div className={`br-entry dmv-panel ${state}`} style={{ width, height }}>
      {!!cp && <CpBadge points={cp} className="br-cp" />}
      <FitText className="br-name" text={entry.name || 'TBD'} max={26} width={width - 30 - (cp ? 84 : 0)} min={14} />
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

/** bigChampion (default): no separate Champion column; the winner of the final becomes a larger, labelled Champion card in the Final column (wider columns, less cramped). */
export const makeBracket = (loud = false, theme?: Theme, bigChampion = true): StandingsTemplate => ({
  id: theme ? `${theme.id}-bracket` : loud ? 'dmv-bracket-loud' : 'dmv-bracket',
  name: theme ? `Bracket (${theme.style})` : loud ? 'Bracket (Comic Book)' : 'Bracket',
  description: 'Top cut bracket with results. Set it up under Top cut bracket.',
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => {
    const rounds = data.bracket?.rounds ?? []
    const R = rounds.length
    const cols = bigChampion ? R : R + 1
    const colW = R ? (W - LEFT * 2 - (cols - 1) * GAP) / cols : 0
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
    // CP for a bracket player is the CP for their place in the standings (Show CP earned). It is shown once,
    // in the last box the player appears in (a player who moves on has no chip until their final round).
    const cpFor = (e: BracketEntry, r: number) => {
      const uid = e.player?.uid
      const place = data.players.findIndex((p) => p.uid === uid) + 1
      if (!data.cp || !place) return 0
      const advanced = rounds[r + 1]?.some((m) => m.entries.some((x) => x.player?.uid === uid))
      return advanced ? 0 : data.cp(place)
    }
    const champCenter = R ? centers[R - 1][0] : 0

    return (
      <div className={`dmv br ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: W, height: H }}>
        {theme ? <theme.Background data={data} width={W} height={H} /> : loud ? (
          <LoudBackground top="blue" bottom="red" split={[24, 8]} burst={[120, 110]} />
        ) : (
          <>
            <div className="br-bg" />
            <div className="dmv-halftone" />
          </>
        )}

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
        {R > 0 && !bigChampion && (
          <div className="br-label" style={{ left: colX(R), width: colW, top: TOP - 52 }}>Champion</div>
        )}

        {rounds.map((ms, r) =>
          ms.map((m, i) => {
            const c = centers[r][i]
            const x = colX(r)
            const tops = [c - inner / 2 - boxH, c + inner / 2]
            const mids = tops.map((t) => t + boxH / 2)
            const bigFinal = bigChampion && r === R - 1 && m.winner !== null
            return (
              <div key={`${r}-${i}`}>
                {m.entries.map((e, side) =>
                  bigFinal && m.winner === side ? (
                    // The winner grows away from the centre: upward when on top, downward when below.
                    <div
                      key={side}
                      className="br-champ dmv-panel"
                      style={{ left: x, top: side === 0 ? c - inner / 2 : c + inner / 2, width: colW, transform: side === 0 ? 'translateY(-100%)' : undefined }}
                    >
                      <div className="br-champ-label">★ Champion ★</div>
                      {data.cp && <CpBadge points={data.cp(1)} style={{ marginTop: 6, background: '#fff' }} />}
                      <FitText className="dmv-title br-champ-name" text={e.name || 'TBD'} max={38} width={colW - 30} min={16} />
                      <div className="br-champ-team">
                        {(e.player?.team ?? []).map((mon, k) => (
                          <MonSprite key={k} mon={mon} size={Math.floor((colW - 44) / 3)} showTera={data.format.tera} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div key={side} style={{ position: 'absolute', left: x, top: tops[side] }}>
                      <Entry entry={e} width={colW} height={boxH} state={m.winner === null ? 'open' : m.winner === side ? 'won' : 'lost'} cp={cpFor(e, r)} />
                    </div>
                  ),
                )}
                {/* "]" joining the two players, then a line to the next round */}
                {!(bigChampion && r === R - 1) && <div className="br-line" style={{ left: x + colW, top: mids[0] - LINE / 2, width: GAP / 2, height: mids[1] - mids[0] + LINE, borderLeft: 'none' }} />}
                {!(bigChampion && r === R - 1) && <div className="br-line-h" style={{ left: x + colW + GAP / 2, top: c - LINE / 2, width: GAP / 2 + 2 }} />}
              </div>
            )
          }),
        )}

        {R > 0 && !bigChampion && (
          <div className={`br-champ dmv-panel ${champ ? '' : 'open'}`} style={{ left: colX(R), top: champCenter, width: colW, transform: 'translateY(-50%)' }}>
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
})

const Bracket = makeBracket()
export default Bracket
export const BracketLoud = makeBracket(true)
