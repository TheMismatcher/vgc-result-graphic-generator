// "Sports Page": the results as the front of a newspaper sports section. A real headline about
// the winner, a box-score table for the rest of the top cut, newsprint texture and the brand red
// as the spot ink (slightly off-register on the headline, like a cheap print run).

import { fillClass } from '../shared/format'
import '@fontsource/anton/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/700.css'
import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite } from '../shared/parts'
import { getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { useBrand } from '../../brand'
import './sports-page.css'
import { gt } from '../../i18n'

const lastName = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] || gt('gfx.common.player')
}

const SportsPage: StandingsTemplate = {
  id: 'sports-page',
  name: 'Top Cut (Sports Page)',
  description: 'The results as a newspaper sports page: a headline about the winner and a box score for the rest of the top cut.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const brand = useBrand()
    const { showMegas } = useDisplay()
    const [first, ...rest] = data.players
    const winner = first?.name || gt('gfx.common.playerName')
    const headline = gt('gfx.sportsPage.headline', { lastName: lastName(winner), event: data.typeLabel || gt('gfx.sportsPage.theEvent') }).toUpperCase()
    const tournament = data.tournament.name || gt('gfx.sportsPage.tournament')
    const deck = first?.record ? gt('gfx.sportsPage.deckRecord', { winner, record: first.record, tournament }) : gt('gfx.sportsPage.deck', { winner, tournament })
    // Four players or fewer: box-score rows grow to fill the page, teams as a 3 x 2 grid.
    const few = data.players.length <= 4

    return (
      <div className={`sp ${fillClass(data.players.length)}`} style={{ width: 1080, height: 1350 }}>
        <svg className="sp-grain" width="1080" height="1350" aria-hidden>
          <filter id="sp-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.09 0" />
          </filter>
          <rect width="1080" height="1350" filter="url(#sp-noise)" />
        </svg>

        <header className="sp-mast">
          <span>{gt('gfx.sportsPage.masthead', { brand: brand.name })}</span>
          <Logo size={64} style={{ border: '3px solid #1b1a17' }} />
          <span>{data.dateLabel}</span>
        </header>

        <div className="sp-head">
          <FitText className="sp-headline sp-misprint" text={headline} max={128} width={990} min={64} weight={400} italic={false} family="Anton" />
          <FitText className="sp-headline" text={headline} max={128} width={990} min={64} weight={400} italic={false} family="Anton" />
        </div>
        <p className="sp-deck">{deck}</p>

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
                  <dd>{gt('gfx.sportsPage.fieldPlayers', { count: data.playerCount })}</dd>
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

        <footer className="sp-foot">
          <span>{data.formatLabel}</span>
          <span>{brand.tagline}</span>
        </footer>
      </div>
    )
  },
}

export default SportsPage
