// More game/location styles: Battle Tower, Mt. Coronet (Spear Pillar), Gen 3 (Hoenn GBA menus),
// a Pokédex, a holo trading card for the champion, and a Ghost (Halloween) seasonal look.
// Inspired by the games' looks; no game art is used.

import type { StandingsTemplate } from '../types'
import { CpBadge, FitText, Logo, MonSprite } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { getItem, getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { LocationHead, LocationRows, seededRand } from './index'
import './more.css'

const base = { kind: 'standings' as const, width: 1080, height: 1350, maxPlayers: 8 }

/** Battle Tower / Battle Frontier: navy and gold, spotlight beams over the arena floor. */
export const BattleTower: StandingsTemplate = {
  ...base,
  id: 'loc-battle-tower',
  name: 'Top Cut (Battle Tower)',
  description: 'Battle Tower / Battle Frontier: navy and gold with spotlights over the arena.',
  Component: ({ data }) => (
    <div className="dmv bt" style={{ width: 1080, height: 1350 }}>
      <svg className="bt-scene" width="1080" height="1350" aria-hidden>
        <defs>
          <linearGradient id="bt-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[[-120, 520], [260, 760], [820, 300], [1200, 560]].map(([top, bottom], i) => (
          <polygon key={i} points={`${top - 40},0 ${top + 40},0 ${bottom + 260},1350 ${bottom - 260},1350`} fill="url(#bt-beam)" />
        ))}
        {/* Arena floor lines */}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={540} y1={980} x2={-700 + i * 225} y2={1350} stroke="#e8b84a" strokeOpacity="0.18" strokeWidth="2" />
        ))}
      </svg>
      <LocationHead data={data} cls="bt" kicker="" />
      <LocationRows data={data} cls="bt" />
    </div>
  ),
}

/** Mt. Coronet / Spear Pillar: ancient stone pillars under a cosmic sky. */
export const MtCoronet: StandingsTemplate = {
  ...base,
  id: 'loc-mt-coronet',
  name: 'Top Cut (Mt. Coronet)',
  description: 'Spear Pillar atop Mt. Coronet: stone ruins and pillars under a cosmic purple sky.',
  Component: ({ data }) => {
    const rand = seededRand(`coronet|${data.tournament.name}`)
    const stars = Array.from({ length: 120 }, () => ({ x: rand() * 1080, y: rand() * 1350, r: 0.8 + rand() * 2.4, o: 0.4 + rand() * 0.6 }))
    return (
      <div className="dmv mc" style={{ width: 1080, height: 1350 }}>
        <svg className="mc-scene" width="1080" height="1350" aria-hidden>
          <defs>
            <radialGradient id="mc-rift" cx="0.5" cy="0.12" r="0.7">
              <stop offset="0" stopColor="#ff9be8" stopOpacity="0.55" />
              <stop offset="0.35" stopColor="#7b4bd8" stopOpacity="0.35" />
              <stop offset="1" stopColor="#120a26" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="mc-stone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8f8a9e" />
              <stop offset="0.5" stopColor="#c9c4d4" />
              <stop offset="1" stopColor="#7c7790" />
            </linearGradient>
          </defs>
          <rect width="1080" height="1350" fill="url(#mc-rift)" />
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
          ))}
          {/* Pillars: a capital, a shaft and a base each, at both edges. */}
          {[14, 980].map((x) => (
            <g key={x} opacity="0.85">
              <rect x={x - 8} y={250} width={102} height={34} rx={4} fill="url(#mc-stone)" />
              <rect x={x + 8} y={284} width={70} height={980} fill="url(#mc-stone)" />
              <rect x={x - 8} y={1260} width={102} height={40} rx={4} fill="url(#mc-stone)" />
            </g>
          ))}
          <path d="M0 1300 L1080 1300 L1080 1350 L0 1350 Z" fill="#6d6880" />
        </svg>
        <LocationHead data={data} cls="mc" kicker="" />
        <LocationRows data={data} cls="mc" />
      </div>
    )
  },
}

/** Gen 3 (Ruby/Sapphire/Emerald): bright GBA menu boxes on Hoenn turquoise stripes. */
export const Hoenn: StandingsTemplate = {
  ...base,
  id: 'era-hoenn',
  name: 'Top Cut (Hoenn Gen 3)',
  description: 'Ruby/Sapphire/Emerald GBA menus: turquoise stripes, chunky bordered boxes, pixel headings.',
  Component: ({ data }) => <HoennBody data={data} />,
}

function HoennBody({ data }: { data: Parameters<StandingsTemplate['Component']>[0]['data'] }) {
  return (
    <div className="dmv h3" style={{ width: 1080, height: 1350 }}>
      <LocationHead data={data} cls="h3" kicker="" />
      <LocationRows data={data} cls="h3" />
    </div>
  )
}

/** A Pokédex: the red device, with each player listed as an entry. */
export const Pokedex: StandingsTemplate = {
  ...base,
  id: 'era-pokedex',
  name: 'Top Cut (Pokédex)',
  description: 'The classic red Pokédex, with each top-cut player listed as a numbered entry.',
  Component: ({ data }) => {
    // Four players or fewer: taller rows, bigger names, and the team as a 3 x 2 grid of larger Pokémon.
    const few = data.players.length <= 4
    return (
    <div className={`dmv dx ${few ? 'few' : ''}`} style={{ width: 1080, height: 1350 }}>
      <div className="dx-top">
        <div className="dx-lens" />
        <div className="dx-led r" />
        <div className="dx-led y" />
        <div className="dx-led g" />
        <div className="dx-top-text">
          <FitText className="dx-title" text={data.tournament.name || 'Tournament'} max={46} width={700} min={22} weight={900} italic={false} />
          <FitText className="dx-facts" text={eventFacts(data).join('  •  ')} max={18} width={700} min={11} weight={700} italic={false} />
        </div>
      </div>
      <div className="dx-screen">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`dx-entry ${i === 0 ? 'first' : ''}`}>
            <div className="dx-no">No.{String(i + 1).padStart(3, '0')}</div>
            <div className="dx-player">
              <FitText className="dx-name" text={p.name || 'Player'} max={few ? 42 : 30} width={few ? 360 : 290} min={14} weight={900} italic={false} />
              <div className="dx-sub">
                {[p.record, p.social].filter(Boolean).join('  ·  ')}
                {data.cp && <CpBadge points={data.cp(i + 1)} className="dx-cp" />}
              </div>
            </div>
            <div className="dx-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={few ? 94 : 70} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="dx-bottom">
        <span className="dx-btn" />
        <span className="dx-pad" />
        <Logo size={70} style={{ border: '4px solid #6e1015' }} />
      </div>
    </div>
    )
  },
}

/** The Pokédex again, with the champion as a full entry: ace in the viewer, data rows, flavour text and the party. */
export const PokedexChampion: StandingsTemplate = {
  ...base,
  id: 'era-pokedex-champion',
  name: 'Champion (Pokédex)',
  description: 'The winner as a Pokédex entry: ace Pokémon in the viewer, data rows, and their team as the party.',
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const w = data.players[0]
    const team = w?.team ?? []
    const ace = team.find((m) => m.pokemon)
    const rows: [string, string][] = [
      ['REC', w?.record || '—'],
      ['SOC', w?.social || '—'],
      ['FLD', data.playerCount ? `${data.playerCount} players` : '—'],
      ['FMT', data.formatLabel || '—'],
    ]
    return (
      <div className="dmv dx dxc" style={{ width: 1080, height: 1350 }}>
        <div className="dx-top">
          <div className="dx-lens" />
          <div className="dx-led r" />
          <div className="dx-led y" />
          <div className="dx-led g" />
          <div className="dx-top-text">
            <FitText className="dx-title" text={data.tournament.name || 'Tournament'} max={46} width={700} min={22} weight={900} italic={false} />
            <FitText className="dx-facts" text={eventFacts(data).join('  •  ')} max={18} width={700} min={11} weight={700} italic={false} />
          </div>
        </div>
        <div className="dx-screen dxc-screen">
          <div className="dxc-head">
            <span className="dx-no">No.001</span>
            <span className="dxc-cat">Champion Trainer</span>
            {data.cp && <CpBadge points={data.cp(1)} className="dx-cp" />}
          </div>
          <div className="dxc-main">
            <div className="dxc-view">
              {ace && <MonSprite mon={ace} size={370} showTera={data.format.tera} />}
            </div>
            <div className="dxc-data">
              <FitText className="dxc-name" text={w?.name || 'Player'} max={54} width={420} min={22} weight={900} italic={false} />
              <div className="dxc-rows">
                {rows.map(([k, v]) => (
                  <div key={k} className="dxc-row">
                    <span className="dxc-key">{k}</span>
                    <span className="dxc-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dxc-text">
            {w?.name || 'This trainer'} took first place at {data.tournament.name || 'the tournament'}
            {data.dateLabel ? ` on ${data.dateLabel}` : ''}, finishing {w?.record || 'undefeated'} with this party.
          </div>
          <div className="dxc-party">
            {team.map((m, i) =>
              m.pokemon ? (
                <div key={i} className="dxc-mon">
                  <MonSprite mon={m} size={108} showTera={data.format.tera} />
                  <span className="dxc-mon-name">{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</span>
                  <span className="dxc-mon-item">{getItem(m.item)?.name ?? ''}</span>
                </div>
              ) : null,
            )}
          </div>
        </div>
        <div className="dx-bottom">
          <span className="dx-btn" />
          <span className="dx-pad" />
          <Logo size={70} style={{ border: '4px solid #6e1015' }} />
        </div>
      </div>
    )
  },
}

/** The champion as a holo trading card: their ace in the art window, their team as the "attacks". */
export const TradingCard: StandingsTemplate = {
  kind: 'standings',
  id: 'era-trading-card',
  name: 'Champion (Trading Card)',
  description: 'The winner as a holo trading card: ace Pokémon in the art window, their team listed like attacks.',
  width: 1080,
  height: 1350,
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const w = data.players[0]
    const team = w?.team ?? []
    const ace = team.find((m) => m.pokemon)
    return (
      <div className="dmv tcg" style={{ width: 1080, height: 1350 }}>
        <div className="tcg-card">
          <div className="tcg-top">
            <span className="tcg-stage">Champion</span>
            <FitText className="tcg-name" text={w?.name || 'Player'} max={60} width={640} min={26} weight={900} italic={false} />
            <span className="tcg-hp">
              <small>REC</small>
              {w?.record || '—'}
            </span>
          </div>
          <div className="tcg-art">
            <div className="tcg-holo" />
            {ace && <MonSprite mon={ace} size={540} showTera={data.format.tera} style={{ position: 'relative' }} />}
            {data.cp && <span className="tcg-cp">+{data.cp(1)} CP</span>}
          </div>
          <div className="tcg-info">{[data.tournament.name, data.typeLabel, data.dateLabel].filter(Boolean).join('  ·  ')}</div>
          <div className="tcg-moves">
            {team.map((m, i) =>
              m.pokemon ? (
                <div key={i} className="tcg-move">
                  <MonSprite mon={m} size={84} showTera={data.format.tera} />
                  <span className="tcg-move-name">{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</span>
                  <span className="tcg-move-item">{getItem(m.item)?.name ?? ''}</span>
                </div>
              ) : null,
            )}
          </div>
          <div className="tcg-foot">
            <span>{w?.social || data.formatLabel}</span>
            <span className="tcg-star">★</span>
            <span>{data.playerCount ? `${data.playerCount} players` : ''}</span>
          </div>
        </div>
      </div>
    )
  },
}

/** Ghost (Halloween): Lavender Town dusk, fog, will-o'-wisps and a tower silhouette. */
export const Ghost: StandingsTemplate = {
  ...base,
  id: 'season-ghost',
  name: 'Top Cut (Ghost)',
  description: 'Halloween / Ghost type: dusky purple, rolling fog, will-o’-wisps and a haunted tower.',
  Component: ({ data }) => {
    const rand = seededRand(`ghost|${data.tournament.name}`)
    const wisps = Array.from({ length: 18 }, () => ({ x: 30 + rand() * 1020, y: 260 + rand() * 1050, s: 0.6 + rand() * 0.8 }))
    return (
      <div className="dmv gh" style={{ width: 1080, height: 1350 }}>
        <svg className="gh-scene" width="1080" height="1350" aria-hidden>
          <defs>
            <radialGradient id="gh-wisp">
              <stop offset="0" stopColor="#d6f2ff" />
              <stop offset="0.4" stopColor="#7fc6ff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#7fc6ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gh-moon" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff6dc" />
              <stop offset="0.6" stopColor="#f3dfae" />
              <stop offset="1" stopColor="#f3dfae" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="880" cy="150" r="150" fill="url(#gh-moon)" opacity="0.8" />
          {/* Tower silhouette */}
          <path d="M470 1350 L470 420 L500 380 L500 300 L540 250 L580 300 L580 380 L610 420 L610 1350 Z" fill="#1b0e2c" opacity="0.7" />
          {[480, 640, 800, 960, 1120].map((y) => (
            <rect key={y} x={515} y={y} width={22} height={36} fill="#ffd77a" opacity="0.35" />
          ))}
          {[1150, 1230, 1300].map((y, i) => (
            <ellipse key={y} cx={i % 2 ? 300 : 780} cy={y} rx={700} ry={70} fill="#e9dcff" opacity={0.12 + i * 0.04} />
          ))}
          {wisps.map((w, i) => (
            <g key={i} transform={`translate(${w.x} ${w.y}) scale(${w.s})`}>
              <circle r="40" fill="url(#gh-wisp)" />
              <path d="M0 -42 C14 -26 16 -10 0 0 C-16 -10 -14 -26 0 -42 Z" fill="#bfe6ff" opacity="0.8" />
            </g>
          ))}
        </svg>
        <LocationHead data={data} cls="gh" kicker="" />
        <LocationRows data={data} cls="gh" />
      </div>
    )
  },
}
