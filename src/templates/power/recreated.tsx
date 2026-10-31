// Tera Raid Den and Dynamax Cloud: the power looks recreated from the games rather than from screenshots.
// - Tera Raid Den: Scarlet/Violet's Tera Raid crystal cave; the winner's team is Terastallized into Stellar
//   crystal, everyone else's Pokémon get a prism rim. (The prism den is the one in the picker; the plain den is retired.)
// - Dynamax Cloud: the red Dynamax storm cloud over a dark arena; the winner's team is Dynamaxed (red
//   aura and tint), everyone else's Pokémon get a red energy rim.
// The Pokémon looks come from shared/monEffect (canvas-drawn so they export).

import type { ComponentType } from 'react'
import type { StandingsData, StandingsLayout, StandingsTemplate } from '../types'
import { makeBracket } from '../bracket'
import { makeChampion } from '../champion'
import { makeTop4Photos } from '../top4-photos'
import { makeTop8Mixed } from '../top8-mixed'
import { makeTop8Photos } from '../top8-photos'
import type { Theme } from '../themes/theme'
import type { SideTheme } from '../themes/side'
import { LocationHead, LocationRows, seededRand } from '../eras'
import { MonFx, type FxKind } from '../shared/monEffect'
import type { Mon } from '../../types'
import { sprites } from '../../data/dex'
import '../places/places.css'
import '../themes/places.css'
import './recreated.css'

type Bg = { seed: string; width: number; height: number; ghosts?: string[]; prism?: boolean }

/** The Dynamax storm: a ceiling of churning red cloud (fractal noise tinted crimson/magenta), glowing from within. */
export function DynaStorm({ seed, width, height }: Bg) {
  const rand = seededRand(`dyna-storm|${seed}`)
  const glow = Array.from({ length: 7 }, () => ({ x: rand() * width, y: rand() * height * 0.45, r: (120 + rand() * 200) * (width / 1080) }))
  const id = `ds${Math.floor(rand() * 1e6)}`
  return (
    <div className="ds-bg">
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <defs>
          <filter id={`${id}-cloud`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={`${0.0032 * (1080 / width)} ${0.007 * (1080 / width)}`} numOctaves="5" seed={Math.floor(rand() * 100)} />
            {/* Noise → cloud: red/magenta colour, alpha from the noise so the cloud has holes and edges. */}
            <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.03  0 0 0 0 0.2  4 0 0 0 -1.6" />
          </filter>
          <filter id={`${id}-lit`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={`${0.006 * (1080 / width)} ${0.012 * (1080 / width)}`} numOctaves="4" seed={Math.floor(rand() * 100) + 7} />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.3  0 0 0 0 0.5  4.5 0 0 0 -2.75" />
          </filter>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width={width} height={height} fill={`url(#${id}-fade)`} />
          </mask>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="#ff4f86" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff4f86" stopOpacity="0" />
          </radialGradient>
        </defs>
        {glow.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={`url(#${id}-glow)`} />
        ))}
        <g mask={`url(#${id}-mask)`}>
          <rect width={width} height={height} filter={`url(#${id}-cloud)`} />
          <rect width={width} height={height} filter={`url(#${id}-lit)`} />
        </g>
      </svg>
      <div className="ds-floor" />
    </div>
  )
}

/** The Tera Raid den (SV): a cave of big faceted crystal panels with the raid Pokémon reflected in them, hexagonal
 *  crystal pillars on the horizon, and a black floor shot through with rainbow light streaks from the centre.
 *  `prism` works the Stellar Tera prism through it: rainbow-edged and rainbow-tinted facets, prism glints on the
 *  walls, prism-topped pillars and a prism ring round the centre platform. */
export function TeraDen({ seed, width, height, ghosts = [], prism = false }: Bg) {
  const rand = seededRand(`tera-den|${seed}`)
  const k = width / 1080
  const hz = height * 0.46 // horizon: where the wall meets the floor
  const id = `td${Math.floor(rand() * 1e6)}`
  // Wall: a jittered triangle mesh, each facet shaded by its tilt (light from the upper right) plus noise.
  const cell = 150 * k
  const cols = Math.ceil(width / cell) + 2
  const rows = Math.ceil(hz / cell) + 2
  const pts = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => [(x - 0.5) * cell + (rand() - 0.5) * cell * 0.9, (y - 0.5) * cell + (rand() - 0.5) * cell * 0.9]))
  const facets: { d: string; fill: string }[] = []
  for (let y = 0; y < rows - 1; y++)
    for (let x = 0; x < cols - 1; x++)
      for (const t of [[pts[y][x], pts[y][x + 1], pts[y + 1][x]], [pts[y][x + 1], pts[y + 1][x + 1], pts[y + 1][x]]]) {
        const nx = (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) - (t[1][0] - t[0][0]) * (t[2][1] - t[0][1])
        const tilt = Math.sin(nx * 0.0001 + rand() * 6)
        const l = 16 + tilt * 8 + rand() * 14 + (rand() < 0.08 ? 22 : 0)
        facets.push({ d: `M${t[0]}L${t[1]}L${t[2]}Z`, fill: `hsl(${192 + rand() * 14},${26 + rand() * 14}%,${l}%)` })
      }
  // Floor streaks: chromatic light rays fanning from the vanishing point, each split into red/green/blue.
  const vx = width * 0.5
  const vy = hz + 6 * k
  const streaks = Array.from({ length: 150 }, () => {
    const a = Math.PI * (0.03 + rand() * 0.94)
    const r0 = (40 + rand() * 500) * k
    return { a, r0, r1: r0 + (120 + rand() * rand() * 900) * k, w: (1 + rand() * rand() * 7) * k, o: 0.25 + rand() * 0.6, white: rand() < 0.25 }
  })
  const ray = (a: number, r: number) => `${vx + Math.cos(a) * r * 1.6},${vy + Math.sin(a) * r * 0.6}`
  const sparks = Array.from({ length: 70 }, () => ({ x: rand() * width, y: hz + rand() * (height - hz), r: (0.8 + rand() * 2.5) * k }))
  // Hexagonal crystal pillars along the horizon (left and right of the centre platform).
  const pillars = [0.05, 0.17, 0.3, 0.44, 0.58, 0.72, 0.85, 0.96].map((x, i) => ({ x: x * width + (rand() - 0.5) * 30 * k, w: (70 + rand() * 60) * k, h: (40 + rand() * 70) * k, y: hz - (i % 3) * 10 * k }))
  // Prism extras use their own random stream so the plain den stays the same for a given event.
  const pr = seededRand(`tera-den-prism|${seed}`)
  const hue = (x: number, y: number) => ((x / width) * 300 + (y / height) * 120 + 330) % 360
  const tints = prism ? facets.map(() => (pr() < 0.5 ? 0.2 + pr() * 0.3 : 0)) : []
  const glints = prism ? Array.from({ length: 9 }, () => ({ x: pr() * width, y: pr() * hz * 0.9, s: (14 + pr() * 26) * k })) : []
  const star = (g: { x: number; y: number; s: number }) => `M0 ${-g.s} L${g.s * 0.12} ${-g.s * 0.12} L${g.s} 0 L${g.s * 0.12} ${g.s * 0.12} L0 ${g.s} L${-g.s * 0.12} ${g.s * 0.12} L${-g.s} 0 L${-g.s * 0.12} ${-g.s * 0.12} Z`
  const hex = (cx: number, cy: number, w: number, d: number) => `M${cx - w / 2},${cy} L${cx - w / 4},${cy - d} L${cx + w / 4},${cy - d} L${cx + w / 2},${cy} L${cx + w / 4},${cy + d} L${cx - w / 4},${cy + d} Z`
  return (
    <div className="td-bg">
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <defs>
          <radialGradient id={`${id}-spot`} cx="0.62" cy="0.18" r="0.55">
            <stop offset="0" stopColor="#c8fbff" stopOpacity="0.55" />
            <stop offset="0.4" stopColor="#58c8e0" stopOpacity="0.18" />
            <stop offset="1" stopColor="#58c8e0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-wallfade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.45" />
            <stop offset="0.75" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`${id}-side`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b52b8" />
            <stop offset="1" stopColor="#0d1d4f" />
          </linearGradient>
          <linearGradient id={`${id}-prism`} x1="0" y1="0" x2="1" y2="0">
            {['#ff6b9a', '#ffb347', '#fff36b', '#7dff8a', '#5fe3ff', '#7d8bff', '#d57dff'].map((c, i) => (
              <stop key={c} offset={i / 6} stopColor={c} />
            ))}
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#ffd6f0" stopOpacity="0.35" />
            <stop offset="1" stopColor="#8fd8ff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-wall`}>
            <rect width={width} height={hz} />
          </clipPath>
          <filter id={`${id}-blur`}>
            <feGaussianBlur stdDeviation={2 * k} />
          </filter>
          <filter id={`${id}-ghost`}>
            <feGaussianBlur stdDeviation={3 * k} />
            <feColorMatrix type="matrix" values="0.35 0.35 0.35 0 0.05  0.4 0.4 0.4 0 0.12  0.42 0.42 0.42 0 0.16  0 0 0 0.3 0" />
          </filter>
        </defs>
        <rect width={width} height={height} fill="#040507" />
        <g clipPath={`url(#${id}-wall)`}>
          {facets.map((f, i) => (
            <path key={i} d={f.d} fill={f.fill} stroke="rgba(160,220,230,0.18)" strokeWidth={1.2 * k} />
          ))}
          {/* Prism: some facets catch a rainbow tint, and every facet edge splits into colour. */}
          {prism &&
            facets.map((f, i) => {
              const [x, y] = f.d.slice(1).split('L')[0].split(',').map(Number)
              const h = hue(x, y)
              return <path key={`p${i}`} d={f.d} fill={tints[i] ? `hsla(${h},95%,62%,${tints[i]})` : 'none'} stroke={`hsla(${h},100%,74%,0.75)`} strokeWidth={2.2 * k} style={{ mixBlendMode: 'screen' }} />
            })}
          {/* The raid Pokémon reflected in the crystal, big and faint, like the den's walls do. */}
          {ghosts.slice(0, 2).map((g, i) => (
            <image key={g} href={g} x={i ? width * 0.58 : -width * 0.06} y={-hz * 0.12} width={width * 0.5} height={width * 0.5} filter={`url(#${id}-ghost)`} />
          ))}
          <rect width={width} height={hz} fill={`url(#${id}-spot)`} />
          <rect width={width} height={hz} fill={`url(#${id}-wallfade)`} />
          {/* Prism light shafts falling across the crystal from the top. */}
          {prism &&
            [0.18, 0.55, 0.82].map((x, i) => (
              <polygon key={`b${i}`} points={`${width * x - 40 * k},0 ${width * x + 40 * k},0 ${width * x + 160 * k},${hz} ${width * x + 20 * k},${hz}`} fill={`url(#${id}-prism)`} opacity="0.22" filter={`url(#${id}-blur)`} style={{ mixBlendMode: 'screen' }} />
            ))}
          {glints.map((g, i) => (
            <g key={`g${i}`} transform={`translate(${g.x} ${g.y})`}>
              <circle r={g.s * 2.2} fill={`url(#${id}-halo)`} opacity="0.5" />
              <path d={star(g)} fill="#fff" />
            </g>
          ))}
        </g>
        <g style={{ mixBlendMode: 'screen' }}>
          {streaks.map((s, i) =>
            s.white ? (
              <line key={i} x1={ray(s.a, s.r0).split(',')[0]} y1={ray(s.a, s.r0).split(',')[1]} x2={ray(s.a, s.r1).split(',')[0]} y2={ray(s.a, s.r1).split(',')[1]} stroke="#dff4ff" strokeWidth={s.w * 0.6} opacity={s.o * 0.7} strokeLinecap="round" />
            ) : (
              ['#ff3b3b', '#ffd23b', '#3bff7a', '#3b8bff'].map((c, j) => {
                const da = (j - 1.5) * 0.006
                const [x1, y1] = ray(s.a + da, s.r0 + j * 14 * k).split(',')
                const [x2, y2] = ray(s.a + da, s.r1 + j * 14 * k).split(',')
                return <line key={`${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={s.w} opacity={s.o * 0.55} strokeLinecap="round" filter={`url(#${id}-blur)`} />
              })
            ),
          )}
        </g>
        {sparks.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={prism ? `hsl(${hue(p.x, p.y)},100%,78%)` : '#bfe8ff'} opacity="0.7" />
        ))}
        {pillars.map((p, i) => (
          <g key={i}>
            <path d={`M${p.x - p.w / 2},${p.y - p.h} L${p.x - p.w / 2},${p.y} L${p.x - p.w / 4},${p.y + p.w * 0.12} L${p.x + p.w / 4},${p.y + p.w * 0.12} L${p.x + p.w / 2},${p.y} L${p.x + p.w / 2},${p.y - p.h} Z`} fill={`url(#${id}-side)`} />
            {[-0.25, 0.25].map((f) => (
              <line key={f} x1={p.x + p.w * f} y1={p.y - p.h + p.w * 0.12} x2={p.x + p.w * f} y2={p.y + p.w * 0.12} stroke="rgba(190,215,255,0.45)" strokeWidth={1.5 * k} />
            ))}
            {Array.from({ length: 8 }, (_, j) => (
              <circle key={j} cx={p.x + (rand() - 0.5) * p.w * 0.9} cy={p.y - p.h + rand() * p.h} r={0.9 * k} fill="#fff" opacity="0.8" />
            ))}
            <path d={hex(p.x, p.y - p.h, p.w, p.w * 0.12)} fill="#d9ebff" stroke="#fff" strokeWidth={1.2 * k} />
            {prism && <path d={hex(p.x, p.y - p.h, p.w, p.w * 0.12)} fill={`url(#${id}-prism)`} opacity="0.55" style={{ mixBlendMode: 'multiply' }} />}
          </g>
        ))}
        {/* The centre platform the raid Pokémon stands on. */}
        <path d={hex(vx, hz + 4 * k, 360 * k, 22 * k)} fill="#a9c8ff" opacity="0.85" />
        <path d={hex(vx, hz, 360 * k, 22 * k)} fill="#e4f1ff" stroke="#fff" strokeWidth={1.5 * k} />
        <ellipse cx={vx} cy={hz} rx={300 * k} ry={40 * k} fill="#9fe6ff" opacity="0.18" filter={`url(#${id}-blur)`} />
        {prism && (
          <>
            <path d={hex(vx, hz, 380 * k, 26 * k)} fill="none" stroke={`url(#${id}-prism)`} strokeWidth={5 * k} filter={`url(#${id}-blur)`} />
            <path d={hex(vx, hz, 360 * k, 22 * k)} fill="none" stroke={`url(#${id}-prism)`} strokeWidth={2.5 * k} />
          </>
        )}
      </svg>
    </div>
  )
}

const W = 1080
const H = 1350

/** The champion's first two Pokémon, for backgrounds that reflect them. */
const ghosts = (data: StandingsData) => (data.players[0]?.team ?? []).filter((m) => m.pokemon).slice(0, 2).map((m) => sprites.render(m.pokemon))

const topCut = (id: string, name: string, description: string, cls: string, kind: FxKind, Back: ComponentType<Bg>): StandingsTemplate => ({
  id,
  name,
  description,
  kind: 'standings',
  width: W,
  height: H,
  maxPlayers: 8,
  Component: ({ data }) => (
    <MonFx kind={kind} winner={data.players[0]?.team}>
      <div className={`dmv pl pl-art ${cls}`} style={{ width: W, height: H }}>
        <Back seed={data.tournament.name} width={W} height={H} ghosts={ghosts(data)} />
        <div className="pl-shade" />
        <LocationHead data={data} cls="pl" kicker="" />
        <LocationRows data={data} cls="pl" />
      </div>
    </MonFx>
  ),
})

export const TeraRaidDen = topCut('fx-tera-raid-den', 'Top Cut (Tera Raid Den Old)', 'The crystal cave of a Tera Raid: faceted walls reflecting the winner’s Pokémon, rainbow light across the floor; the winner’s team Terastallized.', 'pl-tprism pl-tden', 'tera', TeraDen)
const TeraDenPrism = (b: Bg) => <TeraDen {...b} prism />
export const TeraRaidDenPrism = topCut('fx-tera-raid-den-prism', 'Top Cut (Tera Raid Den)', 'The Tera Raid den with the Stellar prism worked through it: rainbow-edged crystal, prism glints and a prism-ringed platform; every panel edged in prism.', 'pl-tprism pl-tden pl-tdenprism', 'tera', TeraDenPrism)
export const DynamaxCloud = topCut('fx-dynamax-cloud', 'Top Cut (Dynamax Cloud)', 'The red Dynamax storm cloud; the winner’s team Dynamaxed with red aura, everyone else rimmed in red energy.', 'pl-dcloud', 'dyna', DynaStorm)

/** Wrap a layout so its MonSprites get the look (winner = first place). */
const withFx = (t: StandingsTemplate, kind: FxKind): StandingsTemplate => ({
  ...t,
  Component: (props) => (
    <MonFx kind={kind} winner={props.data.players[0]?.team}>
      <t.Component {...props} />
    </MonFx>
  ),
})

const layouts = (id: string, style: string, cls: string, kind: FxKind, Back: ComponentType<Bg>): [StandingsTemplate, StandingsLayout][] => {
  const theme: Theme = {
    id,
    style,
    className: `theme-place ${cls}`,
    Background: ({ data, width, height }: { data: StandingsData; width: number; height: number }) => <Back seed={data.tournament.name} width={width} height={height} ghosts={ghosts(data)} />,
  }
  return [
    [withFx(makeTop8Photos(false, false, theme), kind), 'top8photos'],
    [withFx(makeTop8Mixed(false, theme), kind), 'top8mixed'],
    [withFx(makeTop4Photos(false, theme), kind), 'top4photos'],
    [withFx(makeChampion(false, theme), kind), 'champion'],
    [withFx(makeBracket(false, theme), kind), 'bracket'],
  ]
}

export const TeraRaidDenLayouts = layouts('fx-tera-raid-den', 'Tera Raid Den (Old)', 'pl-tprism pl-tden', 'tera', TeraDen)
export const TeraRaidDenPrismLayouts = layouts('fx-tera-raid-den-prism', 'Tera Raid Den', 'pl-tprism pl-tden pl-tdenprism', 'tera', TeraDenPrism)
export const DynamaxCloudLayouts = layouts('fx-dynamax-cloud', 'Dynamax Cloud', 'pl-dcloud', 'dyna', DynaStorm)

/** Usage / Replay / Team Battle backgrounds + class (the Pokémon look is added in the registry). */
export const FX_SIDE_THEMES: (SideTheme & { fx: FxKind })[] = [
  { id: 'fx-tera-raid-den', style: 'Tera Raid Den (Old)', className: 'theme-place pl-tprism pl-tden', fx: 'tera', Wall: ({ seed, width, height }) => <TeraDen seed={seed} width={width} height={height} /> },
  { id: 'fx-tera-raid-den-prism', style: 'Tera Raid Den', className: 'theme-place pl-tprism pl-tden pl-tdenprism', fx: 'tera', Wall: ({ seed, width, height }) => <TeraDen seed={seed} width={width} height={height} prism /> },
  { id: 'fx-dynamax-cloud', style: 'Dynamax Cloud', className: 'theme-place pl-dcloud', fx: 'dyna', Wall: ({ seed, width, height }) => <DynaStorm seed={seed} width={width} height={height} /> },
]

/** Winners on the side graphics: the Replay winner's team; every set winner's team in Team Battle. */
function sideWinners(data: unknown): Mon[] {
  const d = data as { winner?: number | null; players?: { team: Mon[] }[]; sets?: { winner: number | null; players: { team: Mon[] }[] }[] }
  if (d.sets) return d.sets.flatMap((s) => (s.winner === null ? [] : s.players[s.winner].team))
  if (d.players && typeof d.winner === 'number') return d.players[d.winner]?.team ?? []
  return []
}

/** Give a Usage / Replay / Team Battle template the Pokémon look (winners from its own data). */
// oxlint-disable-next-line no-explicit-any -- the three side template types share only { data }
export function sideFx<T extends { Component: ComponentType<any> }>(t: T, kind: FxKind): T {
  const Inner = t.Component
  return {
    ...t,
    Component: (props: { data: unknown }) => (
      <MonFx kind={kind} winner={sideWinners(props.data)}>
        <Inner {...props} />
      </MonFx>
    ),
  }
}
