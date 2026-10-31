// Terastal Prism and Dynamax Cloud: the power looks recreated from the games rather than from screenshots.
// - Terastal Prism: Scarlet/Violet's Tera battle starfield (dark sky full of coloured sparks, stage beams);
//   the winner's team is Terastallized into Stellar crystal, everyone else's Pokémon get a prism rim.
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
import '../places/places.css'
import '../themes/places.css'
import './recreated.css'

type Bg = { seed: string; width: number; height: number }

/** Tera battle starfield: deep navy, hundreds of coloured sparks, two pale stage beams from below. */
export function TeraStarfield({ seed, width, height }: Bg) {
  const rand = seededRand(`tera-field|${seed}`)
  const cols = ['#ffffff', '#ffd27a', '#ff8fb6', '#8fd8ff', '#b79bff', '#9dffb0', '#fff38f']
  const sparks = Array.from({ length: 420 }, () => ({ x: rand() * width, y: rand() * height, r: 0.8 + rand() * rand() * 4.5, c: cols[Math.floor(rand() * cols.length)], o: 0.35 + rand() * 0.65 }))
  const glints = Array.from({ length: 14 }, () => ({ x: rand() * width, y: rand() * height * 0.8, s: 8 + rand() * 16 }))
  return (
    <div className="tp-bg">
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <defs>
          <linearGradient id="tp-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#bfe4ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#bfe4ff" stopOpacity="0" />
          </linearGradient>
          <filter id="tp-soft">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <g filter="url(#tp-soft)">
          <polygon points={`${width * 0.02},${height} ${width * 0.3},${height} ${width * 0.62},${height * 0.25} ${width * 0.5},${height * 0.22}`} fill="url(#tp-beam)" />
          <polygon points={`${width * 0.7},${height} ${width * 0.98},${height} ${width * 0.5},${height * 0.22} ${width * 0.38},${height * 0.25}`} fill="url(#tp-beam)" />
        </g>
        {sparks.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />
        ))}
        {glints.map((g, i) => (
          <path key={i} d={`M0 ${-g.s} L${g.s * 0.18} ${-g.s * 0.18} L${g.s} 0 L${g.s * 0.18} ${g.s * 0.18} L0 ${g.s} L${-g.s * 0.18} ${g.s * 0.18} L${-g.s} 0 L${-g.s * 0.18} ${-g.s * 0.18} Z`} transform={`translate(${g.x} ${g.y})`} fill="#fff" opacity="0.85" />
        ))}
      </svg>
    </div>
  )
}

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

const W = 1080
const H = 1350

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
        <Back seed={data.tournament.name} width={W} height={H} />
        <div className="pl-shade" />
        <LocationHead data={data} cls="pl" kicker="" />
        <LocationRows data={data} cls="pl" />
      </div>
    </MonFx>
  ),
})

export const TerastalPrism = topCut('fx-terastal-prism', 'Top Cut (Terastal Prism)', 'The Tera battle starfield; the winner’s team Terastallized into Stellar crystal, everyone else rimmed in prism light.', 'pl-tprism', 'tera', TeraStarfield)
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
    Background: ({ data, width, height }: { data: StandingsData; width: number; height: number }) => <Back seed={data.tournament.name} width={width} height={height} />,
  }
  return [
    [withFx(makeTop8Photos(false, false, theme), kind), 'top8photos'],
    [withFx(makeTop8Mixed(false, theme), kind), 'top8mixed'],
    [withFx(makeTop4Photos(false, theme), kind), 'top4photos'],
    [withFx(makeChampion(false, theme), kind), 'champion'],
    [withFx(makeBracket(false, theme), kind), 'bracket'],
  ]
}

export const TerastalPrismLayouts = layouts('fx-terastal-prism', 'Terastal Prism', 'pl-tprism', 'tera', TeraStarfield)
export const DynamaxCloudLayouts = layouts('fx-dynamax-cloud', 'Dynamax Cloud', 'pl-dcloud', 'dyna', DynaStorm)

/** Usage / Replay / Team Battle backgrounds + class (the Pokémon look is added in the registry). */
export const FX_SIDE_THEMES: (SideTheme & { fx: FxKind })[] = [
  { id: 'fx-terastal-prism', style: 'Terastal Prism', className: 'theme-place pl-tprism', fx: 'tera', Wall: ({ seed, width, height }) => <TeraStarfield seed={seed} width={width} height={height} /> },
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
