// "Sports Page": the results as the front of a newspaper sports section. A real headline about
// the winner, a box-score table for the rest of the top cut, newsprint texture and the brand red
// as the spot ink (slightly off-register on the headline, like a cheap print run).

import { Fragment } from 'react'
import { fillClass } from '../shared/format'
import type { StandingsTemplate } from '../types'
import { FitText, MonSprite, useFontsReady } from '../shared/parts'
import { getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { Foot, Grain, Headline, Mast, deckSize, deckText, headlineText } from './parts'
import './sports-page.css'
import { gt } from '../../i18n'

export { autoDeck, autoHeadline } from './parts'

const SportsPage: StandingsTemplate = {
  id: 'sports-page',
  name: 'Top Cut (Sports Page)',
  description: 'The results as a newspaper sports page: a headline about the winner and a box score for the rest of the top cut.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const [first, ...rest] = data.players
    // The user's own headline / subheadline (Preview boxes), else the automatic ones.
    const headline = headlineText(data)
    const deck = deckText(data)
    useFontsReady()
    // Four players or fewer: box-score rows grow to fill the page, teams as a 3 x 2 grid.
    const few = data.players.length <= 4

    return (
      <div className={`sp ${fillClass(data.players.length)}`} style={{ width: 1080, height: 1350 }}>
        <Grain width={1080} height={1350} />

        <Mast data={data} />

        <div className="sp-head">
          <Headline text={headline} />
        </div>
        <p className="sp-deck" style={{ fontSize: deckSize(deck) }}>{deck}</p>

        <section className="sp-lead">
          <div className="sp-team">
            {(first?.team ?? []).map((m, i) => (
              <figure key={i}>
                <MonSprite mon={m} size={118} showTera={data.format.tera} />
                <figcaption>{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</figcaption>
              </figure>
            ))}
          </div>
          <aside className="sp-side">
            <div className="sp-stamp">{gt('gfx.sportsPage.final')}</div>
            <dl>
              {data.playerCount > 0 && (
                <>
                  <dt>{gt('gfx.sportsPage.field')}</dt>
                  <dd>
                    {data.tournament.showDivisions
                      ? data.playerLines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)
                      : gt('gfx.sportsPage.fieldPlayers', { count: data.playerCount })}
                  </dd>
                </>
              )}
              {first?.social && (
                <>
                  <dt>{gt('gfx.sportsPage.follow')}</dt>
                  <dd>
                    <FitText text={first.social} max={22} width={160} min={13} weight={700} italic={false} uppercase={false} />
                  </dd>
                </>
              )}
              {data.cp && (
                <>
                  <dt>{gt('gfx.sportsPage.earned')}</dt>
                  <dd>{gt('gfx.common.cpEarned', { cp: data.cp(1) })}</dd>
                </>
              )}
            </dl>
          </aside>
        </section>

        <table className="sp-box">
          <thead>
            <tr>
              <th>{gt('gfx.sportsPage.colPlace')}</th>
              <th>{gt('gfx.sportsPage.colPlayer')}</th>
              <th>{gt('gfx.sportsPage.colRecord')}</th>
              {data.cp && <th className="sp-cp-col">{gt('gfx.sportsPage.colCP')}</th>}
              <th>{gt('gfx.sportsPage.colTeam')}</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((p, i) => (
              <tr key={p.uid}>
                <td className="sp-pl">{i + 2}</td>
                <td className="sp-name">
                  <FitText text={p.name || gt('gfx.common.player')} max={few ? 44 : 32} width={330} min={18} weight={700} italic={false} family="Oswald" />
                  {p.social && <span className="sp-handle">{p.social}</span>}
                </td>
                <td className="sp-rec">{p.record}</td>
                {data.cp && <td className="sp-cp-col">{data.cp(i + 2) ? `+${data.cp(i + 2)}` : '–'}</td>}
                <td className="sp-mons">
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={few ? 76 : 62} showTera={data.format.tera} />
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Foot data={data} />
      </div>
    )
  },
}

export default SportsPage
