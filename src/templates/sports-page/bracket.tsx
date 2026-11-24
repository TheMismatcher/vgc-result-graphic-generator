// Sports Page Bracket: the playoff bracket the way a newspaper prints it. Names sit on thin ink rules
// that join into the next round (no boxes); the champion's path runs in spot red all the way to the
// last column, where the champion's name, team, the FINAL stamp and the facts sit. The page keeps the
// masthead, the off-register headline and the deck; the round names are a box-score header bar.

import type { BracketEntry, StandingsTemplate } from '../types'
import { FitText, MonSprite, usePokemonSrc, useFontsReady } from '../shared/parts'
import { displayPokemon, useDisplay } from '../../lib/display'
import { Foot, Grain, Headline, Mast, deckSize, deckText, headlineText } from './parts'
import './sports-page.css'
import './bracket.css'
import { gt, type GfxKey } from '../../i18n'

const W = 1080
const H = 1350
const INNER = 992 // page width inside the margins
const ROUND_NAMES: Record<number, GfxKey> = { 8: 'gfx.bracket.quarterfinals', 4: 'gfx.bracket.semifinals', 2: 'gfx.bracket.finals' }

function Icon({ id, size }: { id: string; size: number }) {
  const src = usePokemonSrc(id, size)
  return src ? <img src={src} alt="" style={{ width: size, height: size }} /> : <span style={{ display: 'inline-block', width: size, height: size }} />
}

const pct = (f: number) => `${(f * 100).toFixed(3)}%`

export const SportsBracket: StandingsTemplate = {
  id: 'sports-page-bracket',
  name: 'Bracket (Sports Page)',
  description: 'The top cut bracket as a newspaper prints it, with the champion’s path in red. Set it up under Top cut bracket.',
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    useFontsReady()
    const deck = deckText(data)
    const rounds = data.bracket?.rounds ?? []
    const R = rounds.length
    const cols = R + 1 // the last column is the champion's
    const colW = R ? INNER / cols : INNER
    const colX = (c: number) => c * colW
    const big = R <= 2 // four players or fewer: more room per line

    // Height (0..1 of the bracket area) of each entry's rule: the first round evenly spaced, later rounds
    // level with the middle of the match that fed them.
    const ys: [number, number][][] = []
    const mid = (r: number, i: number) => (ys[r][i][0] + ys[r][i][1]) / 2
    rounds.forEach((ms, r) => {
      ys.push(ms.map((_, i) => (r === 0 ? [(2 * i + 0.5) / (2 * ms.length), (2 * i + 1.5) / (2 * ms.length)] : [mid(r - 1, 2 * i), mid(r - 1, 2 * i + 1)])))
    })
    const champY = R ? mid(R - 1, 0) : 0
    const champ = data.bracket?.champion ?? null
    // The champion's own lines (every round they won) are the ones printed in red.
    const isChamp = (e: BracketEntry) => !!champ && (champ.player && e.player ? champ.player.uid === e.player.uid : !!e.name && e.name === champ.name)

    // CP for a bracket player is the CP for their place in the standings (Show CP earned), shown once,
    // on the last line the player appears on.
    const cpFor = (e: BracketEntry, r: number) => {
      const uid = e.player?.uid
      const place = data.players.findIndex((p) => p.uid === uid) + 1
      if (!data.cp || !place) return 0
      const advanced = rounds[r + 1]?.some((m) => m.entries.some((x) => x.player?.uid === uid))
      return advanced || (r === R - 1 && champ?.player?.uid === uid) ? 0 : data.cp(place)
    }
    const icon = Math.min(big ? 44 : 32, Math.floor((colW - 24) / 6))
    const nameMax = big ? 34 : 26
    const first = data.players[0]
    const champSprite = Math.min(big ? 96 : 76, Math.floor((colW - 16) / 3))

    return (
      <div className="sp sp-br" style={{ width: W, height: H }}>
        <Grain width={W} height={H} />
        <Mast data={data} />

        <div className="sp-head">
          <Headline text={headlineText(data)} />
        </div>
        <p className="sp-deck" style={{ fontSize: deckSize(deck) }}>{deck}</p>

        {R > 0 && (
          <div className="sp-br-bar">
            {rounds.map((ms, r) => (
              <span key={r} style={{ width: colW }}>
                {ROUND_NAMES[ms.length * 2] ? gt(ROUND_NAMES[ms.length * 2]) : gt('gfx.bracket.roundN', { n: r + 1 })}
              </span>
            ))}
            <span style={{ width: colW }}>{gt('gfx.common.champion')}</span>
          </div>
        )}

        <div className="sp-br-area">
          {!R && <div className="sp-br-empty">{gt('gfx.bracket.empty')}</div>}

          {rounds.map((ms, r) =>
            ms.map((m, i) => {
              const [y0, y1] = ys[r][i]
              const x = colX(r)
              const won = m.winner
              return (
                <div key={`${r}-${i}`}>
                  {m.entries.map((e, side) => {
                    const state = won === null ? 'open' : won === side ? (isChamp(e) ? 'won path' : 'won') : 'lost'
                    const cp = cpFor(e, r)
                    const team = e.player?.team.filter((t) => t.pokemon) ?? []
                    return (
                      <div key={side} className={`sp-br-line ${state}`} style={{ left: x, top: pct(side ? y1 : y0), width: colW }}>
                        <div className="sp-br-name">
                          <FitText text={e.name || gt('gfx.bracket.tbd')} max={nameMax} width={colW - 20 - (cp ? 56 : 0)} min={14} weight={700} italic={false} family="Oswald" />
                          {!!cp && <span className="sp-br-cp">+{cp}</span>}
                        </div>
                        {team.length > 0 && (
                          <div className="sp-br-team">
                            {team.map((t, k) => (
                              <Icon key={k} id={displayPokemon(t, showMegas)} size={icon} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {/* The join: an ink upright from one rule to the other, the winner's half in red. */}
                  <div className="sp-br-join" style={{ left: x + colW, top: pct(y0), height: pct(y1 - y0) }} />
                  {won !== null && isChamp(m.entries[won]) && (
                    <div className="sp-br-join win" style={{ left: x + colW, top: pct(won ? (y0 + y1) / 2 : y0), height: pct((y1 - y0) / 2) }} />
                  )}
                </div>
              )
            }),
          )}

          {R > 0 && (
            <>
              {champ && (
                <div className="sp-br-stampbox" style={{ left: colX(R), width: colW, height: pct(champY) }}>
                  <div className="sp-stamp">{gt('gfx.sportsPage.final')}</div>
                </div>
              )}
              <div className={`sp-br-line sp-br-champ ${champ ? 'won path' : 'open'}`} style={{ left: colX(R), top: pct(champY), width: colW }}>
                <div className="sp-br-name">
                  <FitText text={champ?.name || gt('gfx.bracket.tbd')} max={big ? 50 : 40} width={colW - 16} min={16} weight={400} italic={false} family="Anton" />
                </div>
                <div className="sp-br-below">
                <div className="sp-br-champteam">
                  {(champ?.player?.team ?? []).map((t, k) => (
                    <MonSprite key={k} mon={t} size={champSprite} showTera={data.format.tera} />
                  ))}
                </div>
                <dl className="sp-facts">
                  {data.cp && champ && (
                    <div>
                      <dt>{gt('gfx.sportsPage.earned')}</dt>
                      <dd>{gt('gfx.common.cpEarned', { cp: data.cp(1) })}</dd>
                    </div>
                  )}
                  {data.playerCount > 0 && (
                    <div>
                      <dt>{gt('gfx.sportsPage.field')}</dt>
                      <dd>{gt('gfx.sportsPage.fieldPlayers', { count: data.playerCount })}</dd>
                    </div>
                  )}
                  {champ && first?.social && champ.player?.uid === first.uid && (
                    <div>
                      <dt>{gt('gfx.sportsPage.follow')}</dt>
                      <dd>
                        <FitText text={first.social} max={20} width={colW - 16} min={12} weight={700} italic={false} uppercase={false} />
                      </dd>
                    </div>
                  )}
                </dl>
                </div>
              </div>
            </>
          )}
        </div>

        <Foot data={data} />
      </div>
    )
  },
}
