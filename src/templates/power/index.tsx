// "Power" styles inspired by battle mechanics (inspired-by looks only; every effect is drawn with
// CSS and inline SVG, no game art):
// - Terastal: faceted prismatic crystals, glassy cards with cut corners, a jewel crown over the header.
// - Mega Evolution: an original helix-in-a-circle symbol, prismatic energy rays, glowing borders.
// - Dynamax: a red cloud vortex, hexagon energy, red pillars and a giant silhouette of the winner's ace.
// Each has a Top Cut here; themes.tsx applies the same backgrounds to the other layouts.

import '@fontsource/anton/400.css'
import type { CSSProperties, ReactNode } from 'react'
import type { StandingsData, StandingsTemplate } from '../types'
import { CpBadge, FitText, Logo, MonSprite } from '../shared/parts'
import { eventFacts, ordinal } from '../shared/format'
import { teraType } from '../../data/options'
import { sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { seededRand } from '../eras'
import { Silhouette } from '../mosaic'
import './power.css'
import './terastal.css'
import './mega.css'
import './dynamax.css'

type BgProps = { data: StandingsData; width: number; height: number }

const cssVar = (name: string, value: string | undefined) => (value ? ({ [name]: value } as CSSProperties) : {})

// ---------- Terastal ----------

/** The champion's Tera type colour (first one set on their team), when the format uses Tera. */
export function teraAccent(data: StandingsData) {
  if (!data.format.tera) return undefined
  return data.players[0]?.team.map((m) => teraType(m.tera)).find(Boolean)?.color
}

// Facet gradients: [left face, right face] per crystal colour. Index 2 follows the brand / Tera colour.
const TZ_FACETS: [string, string][][] = [
  [['#7ff3ff', '#3b56d9'], ['#e6fdff', '#6fb8ff']],
  [['#ff9be0', '#7a3bd9'], ['#fff0fb', '#ffb36b']],
  [['var(--tz-accent)', '#241a6b'], ['#ffffff', 'var(--tz-accent)']],
]

function TeraDefs() {
  return (
    <defs>
      {TZ_FACETS.map((pair, v) =>
        pair.map(([a, b], side) => (
          <linearGradient key={`${v}-${side}`} id={`tz-f${v}${side}`} x1="0" y1="0" x2={side ? '1' : '0'} y2="1">
            <stop offset="0" style={{ stopColor: a }} />
            <stop offset="1" style={{ stopColor: b }} />
          </linearGradient>
        )),
      )}
      <linearGradient id="tz-gold-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff7c9" />
        <stop offset="1" stopColor="#e3a52b" />
      </linearGradient>
      <linearGradient id="tz-gold-r" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#ffcf5a" />
      </linearGradient>
      <radialGradient id="tz-glow">
        <stop offset="0" stopColor="#bdf6ff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#bdf6ff" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

/** One crystal shard, base at (x, y), pointing up before rotation. */
function Shard({ x, y, h, w, rot, v, o = 0.92 }: { x: number; y: number; h: number; w: number; rot: number; v: number; o?: number }) {
  const s = -h * 0.7 // where the sides turn into the tip
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
      <polygon points={`${-w},0 ${-w},${s} 0,${-h} 0,0`} fill={`url(#tz-f${v}0)`} />
      <polygon points={`0,0 0,${-h} ${w},${s} ${w},0`} fill={`url(#tz-f${v}1)`} />
      <polygon points={`${-w * 0.62},${-h * 0.08} ${-w * 0.62},${s * 0.95} ${-w * 0.12},${-h * 0.9} ${-w * 0.3},${s * 0.9}`} fill="#fff" opacity="0.3" />
      <polyline points={`${-w},0 ${-w},${s} 0,${-h} ${w},${s} ${w},0`} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinejoin="round" />
      <line x1="0" y1="0" x2="0" y2={-h} stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
    </g>
  )
}

const sparkle = (s: number) => `M0 ${-s} L${s * 0.2} ${-s * 0.2} L${s} 0 L${s * 0.2} ${s * 0.2} L0 ${s} L${-s * 0.2} ${s * 0.2} L${-s} 0 L${-s * 0.2} ${-s * 0.2} Z`

export function TeraBackground({ data, width, height }: BgProps) {
  const rand = seededRand(`tera|${data.tournament.name}`)
  const k = Math.min(width, height) / 1080
  // Crystal clusters growing in from the corners (top ones smaller, behind the header).
  const clusters = [
    { x: -20, y: height + 20, rot: 38, n: 9, size: 1 },
    { x: width + 20, y: height + 20, rot: -38, n: 9, size: 1 },
    { x: -10, y: -10, rot: 140, n: 5, size: 0.62 },
    { x: width + 10, y: -10, rot: -140, n: 5, size: 0.62 },
  ]
  const shards = clusters.flatMap((c) =>
    Array.from({ length: c.n }, () => {
      const h = (150 + rand() * 260) * c.size * k
      return { x: c.x + (rand() - 0.5) * 160 * k, y: c.y + (rand() - 0.5) * 60 * k, h, w: h * (0.16 + rand() * 0.1), rot: c.rot + (rand() - 0.5) * 80, v: Math.floor(rand() * 3) }
    }).sort((a, b) => b.h - a.h),
  )
  const sparkles = Array.from({ length: 46 }, () => ({ x: rand() * width, y: rand() * height, s: 4 + rand() * 12, o: 0.35 + rand() * 0.6 }))
  // A big faint brilliant-cut gem behind the content.
  const cx = width / 2
  const cy = height * 0.56
  const R = Math.min(width, height) * 0.46
  const ring = (r: number, off = 0) => Array.from({ length: 8 }, (_, i) => [cx + r * Math.cos(((i + off) * Math.PI) / 4), cy + r * Math.sin(((i + off) * Math.PI) / 4)])
  const outer = ring(R, 0.5)
  const inner = ring(R * 0.55, 0.5)
  return (
    <div className="tz-bg" style={cssVar('--tz-accent', teraAccent(data))}>
      <svg className="pw-scene" width={width} height={height} aria-hidden>
        <TeraDefs />
        <g stroke="#dfe9ff" strokeOpacity="0.1" strokeWidth="3" fill="none">
          <polygon points={outer.map((p) => p.join(',')).join(' ')} fill="#cfe0ff" fillOpacity="0.04" />
          <polygon points={inner.map((p) => p.join(',')).join(' ')} />
          {outer.map((p, i) => (
            <g key={i}>
              <line x1={p[0]} y1={p[1]} x2={inner[i][0]} y2={inner[i][1]} />
              <line x1={p[0]} y1={p[1]} x2={inner[(i + 1) % 8][0]} y2={inner[(i + 1) % 8][1]} />
            </g>
          ))}
        </g>
        {shards.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r={s.h * 0.9} fill="url(#tz-glow)" opacity="0.35" />
            <Shard {...s} />
          </g>
        ))}
        {sparkles.map((s, i) => (
          <path key={i} d={sparkle(s.s)} transform={`translate(${s.x} ${s.y})`} fill="#fff" opacity={s.o} />
        ))}
      </svg>
    </div>
  )
}

/** A crystal tiara: five faceted gems on a curved band. */
export function TeraCrown({ width = 280 }: { width?: number }) {
  const gems = [
    { x: 40, top: 40, h: 50, w: 13 },
    { x: 88, top: 20, h: 72, w: 17 },
    { x: 140, top: 2, h: 98, w: 24, gold: true },
    { x: 192, top: 20, h: 72, w: 17 },
    { x: 240, top: 40, h: 50, w: 13 },
  ]
  return (
    <svg className="tz-crown" width={width} height={(width * 112) / 280} viewBox="0 0 280 112" aria-hidden>
      <TeraDefs />
      <path d="M16 92 Q140 124 264 92" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="5" strokeLinecap="round" />
      {gems.map((g, i) => {
        const mid = g.top + g.h * 0.5
        const bottom = g.top + g.h
        const l = g.gold ? 'url(#tz-gold-l)' : `url(#tz-f${i % 2}0)`
        const r = g.gold ? 'url(#tz-gold-r)' : `url(#tz-f${i % 2}1)`
        return (
          <g key={i}>
            <polygon points={`${g.x},${g.top} ${g.x - g.w},${mid} ${g.x},${bottom}`} fill={l} />
            <polygon points={`${g.x},${g.top} ${g.x + g.w},${mid} ${g.x},${bottom}`} fill={r} />
            <polygon points={`${g.x},${g.top} ${g.x - g.w},${mid} ${g.x},${bottom} ${g.x + g.w},${mid}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <line x1={g.x - g.w} y1={mid} x2={g.x + g.w} y2={mid} stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
          </g>
        )
      })}
      <path d={sparkle(9)} transform="translate(176 10)" fill="#fff" />
    </svg>
  )
}

// ---------- Mega Evolution ----------

// The Mega Evolution mark, traced from the in-game symbol (800×800 box, centred like on the orb):
// the S-shaped twisted ribbon with its four cut-outs.
const MEGA_MARK =
  'M 436 53.1 C 431.9 54.7, 420.6 58.7, 411 61.9 C 384.1 71, 331.3 93.3, 317.5 101.5 C 316.4 102.2, 309.4 106, 302 110.1 C 282.8 120.5, 263.3 133, 243.9 147.3 C 140.9 222.9, 109.5 312.3, 154.2 402.5 C 170.6 435.5, 213.2 481.9, 263.5 521.4 C 334.9 577.6, 367.2 651.5, 359.4 741.3 C 358.4 753.4, 362.4 755.5, 376.6 750.6 C 406.7 739.9, 463.3 714.5, 483 702.6 C 498.9 693.1, 525.1 677.3, 532 673.1 C 569.4 650.3, 614.7 606.6, 635 574 C 677.7 505.2, 671.4 431.7, 617.1 365.5 C 607.1 353.3, 581.5 326.7, 569 315.5 C 483.5 239.2, 448.7 180.3, 447.8 110.5 L 447.5 88.5 451.2 74.3 C 457.8 49.5, 455 45.6, 436 53.1 M 351.1 152.5 C 305 175.7, 296.5 183.8, 309.7 192.6 C 325.7 203.1, 413.3 248, 417.9 248 C 424.7 247.9, 425.2 244.2, 419.7 232.2 C 406.2 203.1, 403.6 197, 399 183.4 C 396.2 175.2, 392.6 163.1, 391 156.6 C 385.8 135.4, 385.3 135.4, 351.1 152.5 M 239.1 232.1 C 228.1 239.4, 212.5 264, 215 270 C 219.1 279.8, 315.9 334.1, 375.5 360 C 382.1 362.9, 391.8 367.2, 397 369.5 C 402.2 371.9, 416.6 377.7, 429 382.3 C 441.4 387, 459.8 394, 470 398 C 497.1 408.6, 571.3 433, 576.6 433 C 589.1 433, 577.7 410.8, 551.5 384.5 L 538.5 371.4 522.9 365.2 C 514.3 361.8, 506.9 359, 506.5 359 C 506.1 359, 498.3 355.4, 489.1 351.1 C 480 346.8, 467.5 341.2, 461.4 338.7 C 455.2 336.2, 446.2 332.1, 441.4 329.7 C 436.5 327.2, 428 323.3, 422.5 321 C 386.1 305.6, 323.3 272.9, 285 249.5 C 253.1 230, 246.3 227.4, 239.1 232.1 M 201.9 347.1 C 199.7 351.4, 203.6 363.1, 212.8 379.8 C 220.1 392.8, 224.9 397.5, 238.6 405 C 245.2 408.5, 255.9 414.4, 262.5 418.1 C 305.9 442.3, 384.8 478.9, 453 506.5 C 479 517, 550.4 541, 564.8 544.1 C 576 546.4, 581.6 542.6, 589.3 526.9 C 598.1 509.2, 596.4 506.6, 571.2 499.6 C 563.9 497.5, 553.4 494.3, 547.7 492.4 C 542.1 490.5, 532.1 487.3, 525.5 485.4 C 502.5 478.5, 443.8 456.8, 401.9 439.7 C 377.8 429.9, 366.2 424.6, 309.5 398 C 297.5 392.4, 245.6 365.1, 231.5 357 C 209.9 344.6, 204.3 342.7, 201.9 347.1 M 380.2 549.6 C 376.8 551.9, 377.5 555.2, 383.9 567.3 C 396.4 590.9, 406.5 616.9, 413 642.7 C 418 662.3, 419 664, 425.3 664 C 434.9 664, 513.4 616.5, 518.1 607.9 C 521.6 601.2, 518.6 598.8, 497.3 591.5 C 463.3 579.8, 431.6 567.9, 411.5 559.4 C 384 547.6, 383.3 547.4, 380.2 549.6'
const MARK_BOX = { x: 89, y: 26, w: 608, h: 750 }

/**
 * The Mega Evolution symbol, redrawn in SVG from the in-game mark. `orb`: the dark mark on a glossy
 * rainbow orb in a dark ring (Key Stone / Mega Stone look). `mark`: the mark on its own, filled with
 * the rainbow (purple → pink → yellow → green → cyan → blue) and a soft glow, like the Mega
 * Evolution animation.
 */
export function MegaSymbol({ size, variant = 'orb', className = '', style }: { size: number; variant?: 'orb' | 'mark'; className?: string; style?: CSSProperties }) {
  if (variant === 'mark') {
    return (
      <svg className={`mg-symbol ${className}`} width={(size * MARK_BOX.w) / MARK_BOX.h} height={size} viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`} style={style} aria-hidden>
        <defs>
          <linearGradient id="mg-mark" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor="#9a6bff" />
            <stop offset="0.25" stopColor="#ff7ad9" />
            <stop offset="0.45" stopColor="#ffe36b" />
            <stop offset="0.65" stopColor="#7dff8e" />
            <stop offset="0.82" stopColor="#5fe8ff" />
            <stop offset="1" stopColor="#6a7dff" />
          </linearGradient>
        </defs>
        <path d={MEGA_MARK} fill="url(#mg-mark)" fillRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className={`mg-symbol ${className}`} width={size} height={size} viewBox="0 0 800 800" style={style} aria-hidden>
      <defs>
        <linearGradient id="mg-orb" x1="0.1" y1="0.05" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ff5fd0" />
          <stop offset="0.3" stopColor="#b98bff" />
          <stop offset="0.5" stopColor="#4fd9ff" />
          <stop offset="0.72" stopColor="#5cf07a" />
          <stop offset="1" stopColor="#ffe14d" />
        </linearGradient>
        <radialGradient id="mg-gloss" cx="0.5" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mg-shade" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle cx="400" cy="400" r="398" fill="#3a3a3f" />
      <circle cx="400" cy="400" r="352" fill="url(#mg-orb)" />
      <circle cx="400" cy="400" r="352" fill="url(#mg-gloss)" />
      <circle cx="400" cy="400" r="352" fill="url(#mg-shade)" />
      <g transform="translate(400 400) scale(0.86) translate(-400 -400)">
        <path d={MEGA_MARK} fill="#2d3134" fillRule="evenodd" />
      </g>
    </svg>
  )
}

// Prismatic rays: thin slices of colour around a point, cycling through the rainbow.
const MG_RAYS = Array.from({ length: 36 }, (_, i) => {
  const a = i * 10
  return `hsl(${(i * 47) % 360} 100% 68% / 0.2) ${a}deg ${a + 3}deg, transparent ${a + 3}deg ${a + 10}deg`
}).join(', ')

export function MegaBackground({ data, width, height }: BgProps) {
  const rand = seededRand(`mega|${data.tournament.name}`)
  const motes = Array.from({ length: 60 }, () => ({ x: rand() * width, y: rand() * height, r: 2 + rand() * 6, c: ['#ff7ad0', '#ffb15a', '#c48bff', '#ffffff'][Math.floor(rand() * 4)], o: 0.35 + rand() * 0.6 }))
  const sym = Math.min(width, height) * 0.98
  return (
    <div className="mg-bg">
      <div className="mg-rays" style={{ background: `conic-gradient(from 0deg at 50% 52%, ${MG_RAYS})` }} />
      <div className="mg-core" />
      <MegaSymbol size={sym} variant="mark" className="mg-watermark" style={{ left: (width - sym * 0.75) / 2, top: height * 0.52 - sym / 2 }} />
      <svg className="pw-scene" width={width} height={height} aria-hidden>
        <defs>
          <radialGradient id="mg-mote">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {motes.map((m, i) => (
          <g key={i} opacity={m.o}>
            <circle cx={m.x} cy={m.y} r={m.r * 3} fill={m.c} opacity="0.25" />
            <circle cx={m.x} cy={m.y} r={m.r} fill={m.c} />
          </g>
        ))}
      </svg>
      <div className="mg-vignette" />
    </div>
  )
}

// ---------- Dynamax ----------

export function DynamaxBackground({ data, width, height }: BgProps) {
  const { showMegas } = useDisplay()
  const rand = seededRand(`dyna|${data.tournament.name}`)
  const cx = width / 2
  const k = width / 1080
  const clouds = Array.from({ length: 46 }, () => ({ x: rand() * width, y: rand() * 250 * k - 30, r: (50 + rand() * 90) * k, c: ['#5a0a1e', '#8c0f2c', '#c4163c', '#e8335a'][Math.floor(rand() * 4)] }))
  const swirls = Array.from({ length: 13 }, (_, i) => {
    const rx = (110 + i * 46) * k
    return { rx, ry: rx * 0.3, rot: (rand() - 0.5) * 10, w: 5 + rand() * 16, c: i % 3 === 0 ? '#ff7a95' : i % 3 === 1 ? '#ff2d55' : '#b3122f', dash: `${rx * (0.6 + rand())} ${rx * (0.25 + rand() * 0.4)}`, off: rand() * rx * 3 }
  })
  const pillars = [0.04, 0.13, 0.87, 0.96].map((x, i) => ({ x: x * width, w: (i % 2 ? 46 : 84) * k }))
  const ace = data.players[0]?.team.find((m) => m.pokemon)
  const sil = Math.min(width, height) * 0.95
  return (
    <div className="dyn-bg">
      <svg className="pw-scene" width={width} height={height} aria-hidden>
        <defs>
          <pattern id="dyn-hex" width="56" height="97" patternUnits="userSpaceOnUse">
            <path d="M28 2 L54 17 L54 47 L28 62 L2 47 L2 17 Z M28 62 L28 97 M0 97 L0 79 M56 97 L56 79" fill="none" stroke="#ff3b62" strokeWidth="2" />
          </pattern>
          <linearGradient id="dyn-hex-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.6" />
          </linearGradient>
          <mask id="dyn-hex-mask">
            <rect width={width} height={height} fill="url(#dyn-hex-fade)" />
          </mask>
          <linearGradient id="dyn-pillar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff2d55" stopOpacity="0" />
            <stop offset="0.55" stopColor="#ff2d55" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffd0da" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="dyn-core">
            <stop offset="0" stopColor="#ffb3c3" />
            <stop offset="0.35" stopColor="#ff2d55" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7a0820" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dyn-flare">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.25" stopColor="#ffe1e7" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ff2d55" stopOpacity="0" />
          </radialGradient>
          <filter id="dyn-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="dyn-blur-s" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect width={width} height={height} fill="url(#dyn-hex)" mask="url(#dyn-hex-mask)" />
        {pillars.map((p, i) => (
          <rect key={i} x={p.x - p.w / 2} y={height * 0.18} width={p.w} height={height * 0.82} fill="url(#dyn-pillar)" filter="url(#dyn-blur-l)" />
        ))}
        {/* The vortex: blurred clouds, then swirling broken rings around a hot core. */}
        <g filter="url(#dyn-blur-l)">
          {clouds.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.c} opacity="0.75" />
          ))}
        </g>
        <ellipse cx={cx} cy={30 * k} rx={420 * k} ry={170 * k} fill="url(#dyn-core)" />
        <g filter="url(#dyn-blur-s)" fill="none">
          {swirls.map((s, i) => (
            <ellipse key={i} cx={cx} cy={20 * k} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot} ${cx} ${20 * k})`} stroke={s.c} strokeWidth={s.w} strokeDasharray={s.dash} strokeDashoffset={s.off} opacity="0.55" />
          ))}
        </g>
        {/* Stadium lights */}
        {[90 * k, width - 90 * k].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={height * 0.07} r={150 * k} fill="url(#dyn-flare)" opacity="0.55" />
            <ellipse cx={x} cy={height * 0.07} rx={300 * k} ry={3} fill="#fff" opacity="0.7" />
            <ellipse cx={x} cy={height * 0.07} rx={3} ry={110 * k} fill="#fff" opacity="0.45" />
          </g>
        ))}
      </svg>
      {ace && (
        <div className="dyn-giant" style={{ width: sil, height: sil, right: -sil * 0.18, bottom: -sil * 0.08 }}>
          <Silhouette src={sprites.render(displayPokemon(ace, showMegas))} color="#ff2d55" style={{ width: '100%', height: '100%', opacity: 1 }} />
        </div>
      )}
      <div className="dyn-floor" />
    </div>
  )
}

// ---------- Top Cut ----------

interface Font {
  family: string
  weight: number
}
const MONTSERRAT: Font = { family: 'Montserrat', weight: 900 }
const ANTON: Font = { family: 'Anton', weight: 400 }

/** The Top Cut list shared by the three styles. `emblem` sits in the header's right end; `above`
 * sits on top of the header (outside it, so a clipped header doesn't cut it off). */
function PowerTopCut({ data, cls, Background, emblem, above, font = MONTSERRAT, titleWidth = 760 }: { data: StandingsData; cls: string; Background: (p: BgProps) => ReactNode; emblem?: ReactNode; above?: ReactNode; font?: Font; titleWidth?: number }) {
  const fit = { weight: font.weight, family: font.family, italic: false }
  return (
    <div className={`dmv pw ${cls}`} style={{ width: 1080, height: 1350 }}>
      <Background data={data} width={1080} height={1350} />
      <header className="pw-head">
        <Logo size={130} />
        <div className="pw-head-text">
          <FitText className="pw-title" text={data.tournament.name || 'Tournament'} max={60} width={titleWidth} min={26} {...fit} />
          <FitText className="pw-facts" text={eventFacts(data).join('  •  ')} max={20} width={titleWidth} min={12} weight={800} italic={false} />
        </div>
        {emblem}
      </header>
      {above}
      <main className="pw-rows">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`pw-row ${i === 0 ? 'first' : ''}`}>
            <div className="pw-place">
              <span>{ordinal(i + 1)}</span>
            </div>
            <div className="pw-player">
              <FitText className="pw-name" text={p.name || 'Player'} max={32} width={300} min={16} {...fit} />
              <div className="pw-sub">
                {[p.record, p.social].filter(Boolean).join('  ·  ')}
                {data.cp && <CpBadge points={data.cp(i + 1)} className="pw-cp" />}
              </div>
            </div>
            <div className="pw-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={80} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

const topCut = (id: string, name: string, description: string, render: (data: StandingsData) => ReactNode): StandingsTemplate => ({
  id,
  name,
  description,
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => <>{render(data)}</>,
})

export const TerastalTopCut = topCut('power-terastal', 'Top Cut (Terastal)', 'Terastal crystal look: faceted prismatic shards, glassy cut-corner cards and a jewel crown. Tints to the champion’s Tera type when the format uses Tera.', (data) => (
  <PowerTopCut data={data} cls="pw-tera" Background={TeraBackground} above={<TeraCrown />} />
))

export const MegaTopCut = topCut('power-mega', 'Top Cut (Mega Evolution)', 'Mega Evolution energy: a helix-in-a-ring symbol, prismatic rays and purple-pink-orange glowing cards.', (data) => (
  <PowerTopCut data={data} cls="pw-mega" Background={MegaBackground} emblem={<MegaSymbol size={140} className="mg-emblem" />} titleWidth={600} />
))

export const DynamaxTopCut = topCut('power-dynamax', 'Top Cut (Dynamax)', 'Galar Dynamax: a red cloud vortex, hexagon energy, red pillars, stadium lights and a giant silhouette of the champion’s ace.', (data) => (
  <PowerTopCut data={data} cls="pw-dyna" Background={DynamaxBackground} font={ANTON} />
))
