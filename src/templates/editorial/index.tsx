// "Editorial": a sports-magazine direction, the opposite of the comic-book DMV look. Upright type,
// big numerals, thin rules and lots of space; the brand colours are used as accents only.
// Two moods: Paper (warm off-white) and Night (deep navy).

import type { StandingsTemplate } from '../types'
import { CpBadge, FitText, Logo, MonSprite } from '../shared/parts'
import { getItem, getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { useBrand } from '../../brand'
import './editorial.css'

type Mood = 'paper' | 'night'
const MOOD_NAMES: Record<Mood, string> = { paper: 'Paper', night: 'Night' }

const two = (n: number) => String(n).padStart(2, '0')

/** "League Cup · October 17, 2026 · 22 Players" without the (long) format name. */
const factsLine = (d: { typeLabel: string; dateLabel: string; playerCount: number }) =>
  [d.typeLabel, d.dateLabel, d.playerCount ? `${d.playerCount} Players` : ''].filter(Boolean)

const makeTopCut = (mood: Mood): StandingsTemplate => ({
  id: `editorial-top-cut-${mood}`,
  name: `Top Cut (Editorial ${MOOD_NAMES[mood]})`,
  description: 'Magazine-style results page: big numerals, thin rules, the winner on a dark band.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const brand = useBrand()
    const [first, ...rest] = data.players
    // Four players or fewer: taller rows, bigger names, and the team as a 3 x 2 grid of larger Pokémon.
    const few = data.players.length <= 4
    return (
      <div className={`dmv ed ed-${mood} ${few ? 'few' : ''}`} style={{ width: 1080, height: 1350 }}>
        <header className="ed-head">
          <div className="ed-kicker-row">
            <div className="ed-kicker">Final Standings</div>
            <Logo size={92} style={{ border: 'none' }} />
          </div>
          <FitText className="ed-title" text={data.tournament.name || 'Tournament'} max={92} width={1000} weight={900} italic={false} />
          <div className="ed-facts">
            {factsLine(data).map((f, i) => (
              <span key={f}>
                {i > 0 && <span className="ed-sep">/</span>}
                {f}
              </span>
            ))}
          </div>
          {data.formatLabel && <div className="ed-format">{data.formatLabel}</div>}
          <div className="ed-rule" />
        </header>

        {first && (
          <section className="ed-winner">
            <div className="ed-winner-num">01</div>
            <div className="ed-winner-body">
              <div className="ed-winner-label">
                Champion
                {data.cp && <CpBadge points={data.cp(1)} className="ed-cp" />}
              </div>
              <FitText className="ed-winner-name" text={first.name || 'Player'} max={60} width={560} min={28} weight={900} italic={false} />
              <div className="ed-sub">{[first.record, first.social].filter(Boolean).join('   ·   ')}</div>
            </div>
            <div className="ed-winner-team">
              {first.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={few ? 104 : 92} showTera={data.format.tera} />
              ))}
            </div>
          </section>
        )}

        <main className="ed-rows">
          {rest.map((p, i) => (
            <div key={p.uid} className="ed-row">
              <div className="ed-num">{two(i + 2)}</div>
              <div className="ed-player">
                <FitText className="ed-name" text={p.name || 'Player'} max={few ? 48 : 36} width={few ? 400 : 330} min={20} weight={800} italic={false} />
                <div className="ed-sub">
                  {[p.record, p.social].filter(Boolean).join('   ·   ')}
                  {data.cp && <CpBadge points={data.cp(i + 2)} className="ed-cp small" />}
                </div>
              </div>
              <div className="ed-team">
                {p.team.map((m, j) => (
                  <MonSprite key={j} mon={m} size={few ? 96 : 74} showTera={data.format.tera} />
                ))}
              </div>
            </div>
          ))}
        </main>

        <footer className="ed-foot">
          <span>{brand.name}</span>
          <span>{brand.tagline}</span>
        </footer>
      </div>
    )
  },
})

const makeChampion = (mood: Mood): StandingsTemplate => ({
  id: `editorial-champion-${mood}`,
  name: `Champion (Editorial ${MOOD_NAMES[mood]})`,
  description: 'Square cover for the winner: a tall colour band, their name large, and the team as a spec sheet.',
  kind: 'standings',
  width: 1080,
  height: 1080,
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const winner = data.players[0]
    return (
      <div className={`dmv ed edc ed-${mood}`} style={{ width: 1080, height: 1080 }}>
        <aside className="edc-band">
          <Logo size={150} style={{ border: 'none' }} />
          <div className="edc-vertical">Champion</div>
        </aside>

        <div className="edc-main">
          <div className="ed-kicker">{[data.typeLabel, data.dateLabel].filter(Boolean).join('  ·  ')}</div>
          <FitText className="edc-event" text={data.tournament.name || 'Tournament'} max={40} width={700} min={20} weight={800} italic={false} />
          <div className="ed-rule thin" />
          <FitText className="edc-name" text={winner?.name || 'Player'} max={104} width={720} min={40} weight={900} italic={false} />
          <div className="edc-sub">
            <span>{[winner?.record, winner?.social].filter(Boolean).join('   ·   ')}</span>
            {data.cp && <CpBadge points={data.cp(1)} className="ed-cp" />}
          </div>

          <div className="edc-team">
            {(winner?.team ?? []).map((m, i) => (
              <div key={i} className="edc-cell">
                <MonSprite mon={m} size={164} showTera={data.format.tera} />
                <FitText className="edc-mon" text={getPokemon(displayPokemon(m, showMegas))?.name ?? ''} max={21} width={215} min={14} weight={800} italic={false} />
                <div className="edc-item">{getItem(m.item)?.name ?? ''}</div>
              </div>
            ))}
          </div>

          <div className="edc-format">{[data.playerCount ? `${data.playerCount} Players` : '', data.formatLabel].filter(Boolean).join('   ·   ')}</div>
        </div>
      </div>
    )
  },
})

export const EditorialTopCutPaper = makeTopCut('paper')
export const EditorialTopCutNight = makeTopCut('night')
export const EditorialChampionPaper = makeChampion('paper')
export const EditorialChampionNight = makeChampion('night')
