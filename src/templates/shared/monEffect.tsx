// Pokémon looks for the power styles, drawn onto each sprite on a canvas (so the PNG export gets them):
// - 'tera': the winner's team is Terastallized (Stellar: rainbow crystal facets with white facet edges and
//   a prism rim); everyone else's Pokémon get just the prism outline.
// - 'dyna': the winner's team is Dynamaxed (red energy aura and red tint, like in battle); everyone else's
//   Pokémon get a thin red energy outline.
// A layout opts in by wrapping its content in <MonFx kind winner>; MonSprite reads it.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Mon } from '../../types'

export type FxKind = 'tera' | 'dyna'
interface Fx {
  kind: FxKind
  winner: Set<Mon>
}
const FxContext = createContext<Fx | null>(null)

export function MonFx({ kind, winner, children }: { kind?: FxKind; winner?: Mon[]; children: ReactNode }) {
  if (!kind) return <>{children}</>
  return <FxContext.Provider value={{ kind, winner: new Set(winner ?? []) }}>{children}</FxContext.Provider>
}

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

/** The sprite's silhouette grown by r px, filled by `paint`, optionally blurred. */
function rim(img: HTMLImageElement, r: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void, blur = 0) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const [c, g] = canvas(w, h)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.drawImage(img, Math.cos(a) * r, Math.sin(a) * r)
  }
  g.globalCompositeOperation = 'source-in'
  paint(g, w, h)
  if (!blur) return c
  const [b, bg] = canvas(w, h)
  bg.filter = `blur(${blur}px)`
  bg.drawImage(c, 0, 0)
  return b
}

const prism = (g: CanvasRenderingContext2D, w: number, h: number) => {
  const grad = g.createConicGradient(0, w / 2, h / 2)
  ;['#ff6b9a', '#ffb347', '#fff36b', '#7dff8a', '#5fe3ff', '#7d8bff', '#d57dff', '#ff6b9a'].forEach((col, i, a) => grad.addColorStop(i / (a.length - 1), col))
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
}

/** Seeded random numbers so a Pokémon's facets are the same every render. */
function rng(text: string) {
  let a = 0
  for (const ch of text) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function teraCrystal(img: HTMLImageElement, src: string) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const s = w / 240
  const [c, g] = canvas(w, h)
  g.drawImage(rim(img, 3.5 * s, prism), 0, 0)
  g.drawImage(img, 0, 0)
  // Crystal facets: a jittered triangle mesh in Stellar rainbow colours, laid over the Pokémon with an
  // overlay blend so its own colours and details still show through, plus thin white facet edges.
  const rand = rng(src)
  const cell = 30 * s
  const cols = Math.ceil(w / cell) + 1
  const rows = Math.ceil(h / cell) + 1
  const pts = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => [x * cell + (rand() - 0.5) * cell * 0.7, y * cell + (rand() - 0.5) * cell * 0.7]))
  const [f, fg] = canvas(w, h)
  const [e, eg] = canvas(w, h)
  eg.lineWidth = 1 * s
  eg.strokeStyle = 'rgba(255,255,255,0.5)'
  for (let y = 0; y < rows - 1; y++)
    for (let x = 0; x < cols - 1; x++)
      for (const tri of [[pts[y][x], pts[y][x + 1], pts[y + 1][x]], [pts[y][x + 1], pts[y + 1][x + 1], pts[y + 1][x]]]) {
        const hue = ((tri[0][0] + tri[0][1]) / (w + h)) * 360 + rand() * 50
        fg.fillStyle = `hsla(${hue},90%,${50 + rand() * 30}%,${0.45 + rand() * 0.35})`
        for (const [ctx, paint] of [[fg, () => fg.fill()], [eg, () => eg.stroke()]] as const) {
          ctx.beginPath()
          ctx.moveTo(tri[0][0], tri[0][1])
          ctx.lineTo(tri[1][0], tri[1][1])
          ctx.lineTo(tri[2][0], tri[2][1])
          ctx.closePath()
          paint()
        }
      }
  // Glassy shine: a soft white sweep across the edges layer.
  const shine = eg.createLinearGradient(0, 0, w, h)
  shine.addColorStop(0, 'rgba(255,255,255,0.28)')
  shine.addColorStop(0.4, 'rgba(255,255,255,0)')
  shine.addColorStop(0.65, 'rgba(255,255,255,0.12)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  eg.fillStyle = shine
  eg.fillRect(0, 0, w, h)
  // Keep both layers inside the Pokémon (the prism rim stays outside).
  for (const ctx of [fg, eg]) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(img, 0, 0)
  }
  g.globalCompositeOperation = 'overlay'
  g.drawImage(f, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.drawImage(e, 0, 0)
  return c
}

function teraOutline(img: HTMLImageElement) {
  const s = img.naturalWidth / 240
  const [c, g] = canvas(img.naturalWidth, img.naturalHeight)
  g.drawImage(rim(img, 3 * s, prism), 0, 0)
  g.drawImage(img, 0, 0)
  return c
}

const red = (alpha: number) => (g: CanvasRenderingContext2D, w: number, h: number) => {
  g.fillStyle = `rgba(255, 30, 80, ${alpha})`
  g.fillRect(0, 0, w, h)
}

function dynaFull(img: HTMLImageElement) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const s = w / 240
  const [c, g] = canvas(w, h)
  g.drawImage(rim(img, 7 * s, red(1), 9 * s), 0, 0)
  g.drawImage(rim(img, 3 * s, (gg, ww, hh) => {
    gg.fillStyle = '#ff9ab5'
    gg.fillRect(0, 0, ww, hh)
  }), 0, 0)
  g.drawImage(img, 0, 0)
  // The red Dynamax tint, strongest at the feet like the energy rising off them.
  const [t, tg] = canvas(w, h)
  const grad = tg.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(255, 40, 90, 0.12)')
  grad.addColorStop(1, 'rgba(255, 20, 70, 0.45)')
  tg.fillStyle = grad
  tg.fillRect(0, 0, w, h)
  tg.globalCompositeOperation = 'destination-in'
  tg.drawImage(img, 0, 0)
  g.drawImage(t, 0, 0)
  return c
}

function dynaOutline(img: HTMLImageElement) {
  const s = img.naturalWidth / 240
  const [c, g] = canvas(img.naturalWidth, img.naturalHeight)
  g.drawImage(rim(img, 4 * s, red(0.9), 4 * s), 0, 0)
  g.drawImage(img, 0, 0)
  return c
}

const cache = new Map<string, Promise<string>>()
function processed(src: string, kind: FxKind, win: boolean) {
  const key = `${kind}|${win}|${src}`
  if (!cache.has(key))
    cache.set(
      key,
      load(src).then((img) => {
        if (!img || !img.naturalWidth) return src
        const c = kind === 'tera' ? (win ? teraCrystal(img, src) : teraOutline(img)) : win ? dynaFull(img) : dynaOutline(img)
        return c.toDataURL('image/png')
      }),
    )
  return cache.get(key)!
}

/** The src to show for this Pokémon: the plain sprite, or its effect version when a layout asked for one. */
export function useFxSrc(src: string, mon: Mon) {
  const fx = useContext(FxContext)
  const kind = fx?.kind
  const win = !!fx?.winner.has(mon)
  const [out, setOut] = useState<string | null>(null)
  useEffect(() => {
    if (!kind) return
    let live = true
    processed(src, kind, win).then((u) => live && setOut(u))
    return () => {
      live = false
    }
  }, [src, kind, win])
  return kind ? (out ?? src) : src
}
