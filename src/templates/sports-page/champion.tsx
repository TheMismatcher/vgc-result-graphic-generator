// Sports Page Champion layouts.
// Champion: an "extra edition" front page. A stacked two-line headline, the winning team as the lead
// picture (printed over a red and black halftone screen) with a caption, and a sidebar with the stamp,
// the facts and the team's lineup card (Pokémon and held items).
// Champion + Photo: the winner's photo printed in halftone with the stamp slapped over its corner and a
// caption under it, the team beside it in the Top Cut's ruled grid, and the facts as a strip.

import type { StandingsData, StandingsTemplate } from '../types'
import { FitText, MonSprite, PlayerPhoto, useFontsReady } from '../shared/parts'
import { getItem, getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { Foot, Grain, Headline, Mast, deckSize, deckText, headlineText } from './parts'
import './sports-page.css'
import './champion.css'
import { gt } from '../../i18n'

/** Record / Field / Follow / Earned, as label + value pairs (only the ones there is data for). */
function Facts({ data, className, followWidth = 200 }: { data: StandingsData; className: string; followWidth?: number }) {
  const first = data.players[0]
  return (
    <dl className={className}>
      {first?.record && (
        <div>
          <dt>{gt('gfx.sportsPage.record')}</dt>
          <dd>{first.record}</dd>
        </div>
      )}
      {data.playerCount > 0 && (
        <div>
          <dt>{gt('gfx.sportsPage.field')}</dt>
          <dd>{data.tournament.showDivisions ? data.divisionsLine || gt('gfx.sportsPage.fieldPlayers', { count: data.playerCount }) : gt('gfx.sportsPage.fieldPlayers', { count: data.playerCount })}</dd>
        </div>
      )}
      {first?.social && (
        <div className="sp-f-follow">
          <dt>{gt('gfx.sportsPage.follow')}</dt>
          <dd>
            <FitText text={first.social} max={22} width={followWidth} min={13} weight={700} italic={false} uppercase={false} />
          </dd>
        </div>
      )}
      {data.cp && (
        <div>
          <dt>{gt('gfx.sportsPage.earned')}</dt>
          <dd>{gt('gfx.common.cpEarned', { cp: data.cp(1) })}</dd>
        </div>
      )}
    </dl>
  )
}

const caption = (data: StandingsData) =>
  gt('gfx.sportsPage.teamCaption', {
    winner: data.players[0]?.name || gt('gfx.common.playerName'),
    tournament: data.tournament.name || gt('gfx.sportsPage.tournament'),
  })

export const SportsChampion: StandingsTemplate = {
  id: 'sports-page-champion',
  name: 'Champion (Sports Page)',
  description: 'An extra-edition front page for the winner: a two-line headline, their team as the lead picture and a lineup card.',
  kind: 'standings',
  width: 1080,
  height: 1080,
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    useFontsReady()
    const first = data.players[0]
    const deck = deckText(data)
    const team = first?.team ?? []
    return (
      <div className="sp sp-ch" style={{ width: 1080, height: 1080 }}>
        <Grain width={1080} height={1080} />
        <Mast data={data} />

        <div className="sp-head sp-head-stack">
          <Headline text={headlineText(data)} max={240} stack />
        </div>
        <p className="sp-deck" style={{ fontSize: deckSize(deck) }}>{deck}</p>

        <section className="sp-front">
          <figure className="sp-pic">
            <div className="sp-pic-frame">
              <div className="sp-screen sp-screen-spot" />
              <div className="sp-screen sp-screen-ink" />
              <div className="sp-pic-team">
                {team.map((m, i) => (
                  <MonSprite key={i} mon={m} size={176} showTera={data.format.tera} />
                ))}
              </div>
            </div>
            <figcaption>{caption(data)}</figcaption>
          </figure>

          <aside className="sp-ch-side">
            <div className="sp-stamp sp-stamp-ch">{gt('gfx.common.champion')}</div>
            <Facts data={data} className="sp-facts" />
            <div className="sp-lineup">
              <div className="sp-lineup-head">{gt('gfx.sportsPage.lineup')}</div>
              <ol>
                {team.map((m, i) => (
                  <li key={i}>
                    <span className="sp-lu-mon">{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</span>
                    <span className="sp-lu-item">{getItem(m.item)?.name ?? ''}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>

        <Foot data={data} />
      </div>
    )
  },
}

export const SportsChampionPhoto: StandingsTemplate = {
  id: 'sports-page-champion-photo',
  name: 'Champion + Photo (Sports Page)',
  description: 'The winner’s photo printed in halftone with a caption, their team beside it (add the photo on the player’s card).',
  kind: 'standings',
  width: 1080,
  height: 1080,
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    useFontsReady()
    const first = data.players[0]
    const deck = deckText(data)
    return (
      <div className="sp sp-ch sp-chp" style={{ width: 1080, height: 1080 }}>
        <Grain width={1080} height={1080} />
        <Mast data={data} />

        <div className="sp-head">
          <Headline text={headlineText(data)} />
        </div>
        <p className="sp-deck" style={{ fontSize: deckSize(deck) }}>{deck}</p>

        <section className="sp-front">
          <figure className="sp-portrait">
            <div className="sp-portrait-frame">
              <div className="sp-portrait-img">
                {first && <PlayerPhoto player={first} />}
                <div className="sp-screen sp-screen-photo" />
              </div>
              <div className="sp-stamp sp-stamp-ch sp-stamp-photo">{gt('gfx.common.champion')}</div>
            </div>
            <figcaption>{caption(data)}</figcaption>
          </figure>

          <div className="sp-chp-right">
            <div className="sp-team sp-team-2">
              {(first?.team ?? []).map((m, i) => (
                <figure key={i}>
                  <MonSprite mon={m} size={112} showTera={data.format.tera} />
                  <figcaption>{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</figcaption>
                </figure>
              ))}
            </div>
            <Facts data={data} className="sp-facts sp-facts-strip" followWidth={150} />
          </div>
        </section>

        <Foot data={data} />
      </div>
    )
  },
}
