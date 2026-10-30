// Templates styled after specific Pokémon games/regions (inspired by their look, no game art used):
// - Kanto Game Boy: Gen 1 Red/Blue on the original Game Boy's four greens, pixel font, text boxes.
// - Paldea: Scarlet/Violet's orange/purple split with dark angled UI panels and yellow highlights.
// - Unova: Black/White's stark black-and-white contrast with bold diagonal bands.

import '@fontsource/press-start-2p/400.css'
import type { StandingsTemplate } from '../types'
import { CpBadge, FitText, Logo, MonSprite } from '../shared/parts'
import { eventFacts, ordinal } from '../shared/format'
import { sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import './eras.css'

const facts = (d: Parameters<StandingsTemplate['Component']>[0]['data']) => eventFacts(d).filter((f) => f !== d.formatLabel)

export const KantoGameBoy: StandingsTemplate = {
  id: 'era-kanto-gameboy',
  name: 'Top Cut (Kanto Game Boy)',
  description: 'Gen 1 Red/Blue on the original Game Boy: four greens, pixel font, text boxes and pixel sprites.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    return (
      <div className="dmv gb" style={{ width: 1080, height: 1350 }}>
        <div className="gb-box gb-head">
          <FitText className="gb-title" text={data.tournament.name || 'Tournament'} max={44} width={940} min={20} weight={400} italic={false} family="'Press Start 2P'" />
          <div className="gb-facts">{facts(data).join(' / ').toUpperCase()}</div>
          {data.formatLabel && <div className="gb-facts dim">{data.formatLabel.toUpperCase()}</div>}
        </div>

        <div className="gb-box gb-list">
          {data.players.map((p, i) => (
            <div key={p.uid} className="gb-row">
              <span className="gb-cursor">{i === 0 ? '▶' : ''}</span>
              <span className="gb-place">{ordinal(i + 1).toUpperCase()}</span>
              <div className="gb-player">
                <FitText className="gb-name" text={p.name || 'Player'} max={24} width={360} min={12} weight={400} italic={false} family="'Press Start 2P'" />
                <div className="gb-rec">
                  {p.record && `W/L ${p.record}`}
                  {data.cp && <CpBadge points={data.cp(i + 1)} className="gb-cp" />}
                </div>
              </div>
              <div className="gb-team">
                {p.team.map((m, j) =>
                  m.pokemon ? <img key={j} className="gb-mon" src={sprites.icon(displayPokemon(m, showMegas))} alt="" /> : <span key={j} className="gb-mon" />,
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="gb-box gb-foot">
          <span>{data.players[0]?.name ? `${data.players[0].name.toUpperCase()} is the CHAMPION!` : 'A new CHAMPION!'}</span>
          <span className="gb-blink">▼</span>
        </div>
      </div>
    )
  },
}

export const Paldea: StandingsTemplate = {
  id: 'era-paldea',
  name: 'Top Cut (Paldea)',
  description: 'Scarlet & Violet look: orange/purple split, dark angled panels and yellow highlights.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className="dmv pd" style={{ width: 1080, height: 1350 }}>
      <div className="pd-bg" />
      <div className="pd-grid" />
      <header className="pd-head">
        <Logo size={150} style={{ border: '6px solid #15151f' }} />
        <div className="pd-head-text">
          <div className="pd-kicker">Results</div>
          <FitText className="pd-title" text={data.tournament.name || 'Tournament'} max={66} width={760} min={30} weight={900} italic />
          <div className="pd-facts">{facts(data).join('  ·  ')}</div>
        </div>
      </header>
      <main className="pd-rows">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`pd-row ${i === 0 ? 'first' : ''}`}>
            <div className="pd-place">
              <span>{ordinal(i + 1)}</span>
            </div>
            <div className="pd-player">
              <FitText className="pd-name" text={p.name || 'Player'} max={34} width={300} min={16} weight={900} italic />
              <div className="pd-sub">
                {[p.record, p.social].filter(Boolean).join('  ·  ')}
                {data.cp && <CpBadge points={data.cp(i + 1)} className="pd-cp" />}
              </div>
            </div>
            <div className="pd-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={80} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </main>
      {data.formatLabel && <footer className="pd-foot">{data.formatLabel}</footer>}
    </div>
  ),
}

export const Unova: StandingsTemplate = {
  id: 'era-unova',
  name: 'Top Cut (Unova)',
  description: 'Black & White look: stark black-and-white contrast with bold diagonal bands.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className="dmv uv" style={{ width: 1080, height: 1350 }}>
      <div className="uv-band a" />
      <div className="uv-band b" />
      <header className="uv-head">
        <FitText className="uv-title" text={data.tournament.name || 'Tournament'} max={74} width={780} min={30} weight={900} italic={false} />
        <div className="uv-facts">{facts(data).join('   /   ')}</div>
        {data.formatLabel && <div className="uv-format">{data.formatLabel}</div>}
        <Logo size={140} style={{ position: 'absolute', right: 0, top: 0, border: '6px solid #fff', background: '#000' }} />
      </header>
      <main className="uv-rows">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`uv-row ${i % 2 ? 'dark' : 'light'}`}>
            <div className="uv-place">{i + 1}</div>
            <div className="uv-player">
              <FitText className="uv-name" text={p.name || 'Player'} max={34} width={320} min={16} weight={900} italic={false} />
              <div className="uv-sub">
                {[p.record, p.social].filter(Boolean).join('   ')}
                {data.cp && <CpBadge points={data.cp(i + 1)} className="uv-cp" />}
              </div>
            </div>
            <div className="uv-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={82} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
}

// ---------- Locations ----------

/** Seeded random numbers, so the scenery is the same every time for the same event. */
export function seededRand(text: string) {
  let a = 0
  for (const ch of text) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Data = Parameters<StandingsTemplate['Component']>[0]['data']

/** The shared results list for the location templates; each location styles it with its own CSS. */
export function LocationRows({ data, cls }: { data: Data; cls: string }) {
  return (
    <main className={`${cls}-rows`}>
      {data.players.map((p, i) => (
        <div key={p.uid} className={`${cls}-row ${i === 0 ? 'first' : ''}`}>
          <div className={`${cls}-place`}>{ordinal(i + 1)}</div>
          <div className={`${cls}-player`}>
            <FitText className={`${cls}-name`} text={p.name || 'Player'} max={32} width={300} min={16} weight={900} italic={false} />
            <div className={`${cls}-sub`}>
              {[p.record, p.social].filter(Boolean).join('  ·  ')}
              {data.cp && <CpBadge points={data.cp(i + 1)} className={`${cls}-cp`} />}
            </div>
          </div>
          <div className={`${cls}-team`}>
            {p.team.map((m, j) => (
              <MonSprite key={j} mon={m} size={78} showTera={data.format.tera} />
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

export function LocationHead({ data, cls, kicker }: { data: Data; cls: string; kicker: string }) {
  return (
    <header className={`${cls}-head`}>
      <Logo size={130} />
      <div className={`${cls}-head-text`}>
        <div className={`${cls}-kicker`}>{kicker}</div>
        <FitText className={`${cls}-title`} text={data.tournament.name || 'Tournament'} max={58} width={700} min={26} weight={900} italic={false} />
        <FitText className={`${cls}-facts`} text={eventFacts(data).join('  •  ')} max={20} width={700} min={12} weight={800} italic={false} />
      </div>
    </header>
  )
}

/** Glimwood Tangle (Sword & Shield): a dark forest lit by glowing mushrooms. */
export const Glimwood: StandingsTemplate = {
  id: 'loc-glimwood',
  name: 'Top Cut (Glimwood Tangle)',
  description: 'The glowing mushroom forest from Sword & Shield: deep night colours and bioluminescent mushrooms.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const rand = seededRand(`glim|${data.tournament.name}`)
    const glows = Array.from({ length: 70 }, () => ({ x: rand() * 1080, y: rand() * 1350, r: 3 + rand() * 9, c: rand() < 0.5 ? 'gw-dot-a' : 'gw-dot-b' }))
    // Mushrooms along the left and right edges and the bottom.
    const shrooms = Array.from({ length: 16 }, (_, i) => {
      const side = i % 3
      const x = side === 0 ? 10 + rand() * 40 : side === 1 ? 1030 + rand() * 40 - 40 : 80 + rand() * 920
      const y = side === 2 ? 1280 + rand() * 50 : 300 + rand() * 1000
      return { x, y, s: 0.6 + rand() * 0.9, pink: rand() < 0.45 }
    })
    return (
      <div className="dmv gw" style={{ width: 1080, height: 1350 }}>
        <svg className="gw-scene" width="1080" height="1350" aria-hidden>
          <defs>
            <radialGradient id="gw-a"><stop offset="0" stopColor="#7ff7ff" /><stop offset="1" stopColor="#7ff7ff" stopOpacity="0" /></radialGradient>
            <radialGradient id="gw-b"><stop offset="0" stopColor="#ff8cf0" /><stop offset="1" stopColor="#ff8cf0" stopOpacity="0" /></radialGradient>
            <radialGradient id="gw-halo-a"><stop offset="0" stopColor="#47e6ff" stopOpacity="0.55" /><stop offset="1" stopColor="#47e6ff" stopOpacity="0" /></radialGradient>
            <radialGradient id="gw-halo-b"><stop offset="0" stopColor="#ff5ad7" stopOpacity="0.5" /><stop offset="1" stopColor="#ff5ad7" stopOpacity="0" /></radialGradient>
          </defs>
          {glows.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={`url(#${g.c === 'gw-dot-a' ? 'gw-a' : 'gw-b'})`} />
          ))}
          {shrooms.map((m, i) => (
            <g key={i} transform={`translate(${m.x} ${m.y}) scale(${m.s})`}>
              <circle cx="0" cy="-40" r="90" fill={`url(#${m.pink ? 'gw-halo-b' : 'gw-halo-a'})`} />
              <path d="M-9 0 C-7 -30 -6 -46 -4 -58 L4 -58 C6 -46 7 -30 9 0 Z" fill="#cbd8ff" opacity="0.85" />
              <path d="M-42 -54 C-40 -86 40 -86 42 -54 C30 -50 -30 -50 -42 -54 Z" fill={m.pink ? '#ff6fe0' : '#56f0ff'} />
              <circle cx="-16" cy="-70" r="5" fill="#fff" opacity="0.8" />
              <circle cx="12" cy="-74" r="4" fill="#fff" opacity="0.7" />
            </g>
          ))}
        </svg>
        <LocationHead data={data} cls="gw" kicker="Glimwood Tangle" />
        <LocationRows data={data} cls="gw" />
      </div>
    )
  },
}

/** Route 201 (Sinnoh): sky, tall grass and a wooden route sign. */
export const Route201: StandingsTemplate = {
  id: 'loc-route-201',
  name: 'Top Cut (Route 201)',
  description: 'Sinnoh’s Route 201: bright sky, tall grass and a wooden route sign for the header.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className="dmv rt" style={{ width: 1080, height: 1350 }}>
      <svg className="rt-scene" width="1080" height="1350" aria-hidden>
        <defs>
          <linearGradient id="rt-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fb8f2" />
            <stop offset="1" stopColor="#bfe6ff" />
          </linearGradient>
          {/* A tall-grass tuft, tiled across the ground. */}
          <pattern id="rt-grass" width="60" height="44" patternUnits="userSpaceOnUse">
            <rect width="60" height="44" fill="#58b848" />
            <path d="M6 40 L12 14 L18 40 M16 40 L24 6 L32 40 M28 40 L36 16 L44 40 M40 40 L48 10 L56 40" stroke="#2f8a2c" strokeWidth="4" fill="#3fa23a" strokeLinejoin="round" />
          </pattern>
        </defs>
        <rect width="1080" height="1350" fill="url(#rt-sky)" />
        <ellipse cx="190" cy="120" rx="120" ry="34" fill="#fff" opacity="0.85" />
        <ellipse cx="880" cy="80" rx="150" ry="38" fill="#fff" opacity="0.8" />
        <path d="M0 300 C200 270 400 320 600 290 C800 260 950 300 1080 280 L1080 1350 L0 1350 Z" fill="url(#rt-grass)" />
        <path d="M0 300 C200 270 400 320 600 290 C800 260 950 300 1080 280" stroke="#2f8a2c" strokeWidth="8" fill="none" />
      </svg>
      <div className="rt-post l" />
      <div className="rt-post r" />
      <LocationHead data={data} cls="rt" kicker="Route 201" />
      <LocationRows data={data} cls="rt" />
    </div>
  ),
}

/** Snowpoint City / Routes 216–217 (Sinnoh): falling snow, icy blues and frosted panels. */
export const Snowpoint: StandingsTemplate = {
  id: 'loc-snowpoint',
  name: 'Top Cut (Snowpoint)',
  description: 'Sinnoh’s snowy north (Snowpoint City, Routes 216–217): falling snow, icy blues and frosted panels.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const rand = seededRand(`snow|${data.tournament.name}`)
    const flakes = Array.from({ length: 140 }, () => ({ x: rand() * 1080, y: rand() * 1350, r: 2 + rand() * 6, o: 0.4 + rand() * 0.6 }))
    return (
      <div className="dmv sp2" style={{ width: 1080, height: 1350 }}>
        <svg className="sp2-scene" width="1080" height="1350" aria-hidden>
          <defs>
            <linearGradient id="sp2-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7fb2dc" />
              <stop offset="0.6" stopColor="#c9e4f7" />
              <stop offset="1" stopColor="#eef7ff" />
            </linearGradient>
          </defs>
          <rect width="1080" height="1350" fill="url(#sp2-sky)" />
          {/* Pine silhouettes */}
          {[60, 170, 900, 1010].map((x, i) => (
            <path key={i} d={`M${x} ${200 + (i % 2) * 40} l-70 150 h40 l-55 110 h40 l-50 100 h190 l-50 -100 h40 l-55 -110 h40 Z`} fill="#4f7fa8" opacity="0.45" />
          ))}
          <path d="M0 1240 C160 1200 320 1260 520 1225 C720 1190 880 1250 1080 1215 L1080 1350 L0 1350 Z" fill="#fff" />
          {flakes.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#fff" opacity={f.o} />
          ))}
        </svg>
        <LocationHead data={data} cls="sp2" kicker="Snowpoint City" />
        <LocationRows data={data} cls="sp2" />
      </div>
    )
  },
}
