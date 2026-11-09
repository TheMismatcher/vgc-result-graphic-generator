// Small building blocks reused across templates.

import { createContext, useContext, useEffect, useState, type CSSProperties, type JSX } from 'react'
import type { Mon, Player } from '../../types'
import { getItem, getPokemon, sprites } from '../../data/dex'
import { teraType } from '../../data/options'
import { useBrand } from '../../brand'
import { displayPokemon, useDisplay } from '../../lib/display'
import { useFxSrc } from './monEffect'
import './brand.css'

/** Which Pokémon pictures a layout draws: HOME 3D renders (default) or the pixel sprites. */
export type SpriteKind = 'render' | 'pixel'
const SpriteKindContext = createContext<SpriteKind>('render')
export const useSpriteKind = () => useContext(SpriteKindContext)

/** The same template drawn with pixel sprites (a "Sprites: Pixel" version of a style). */
export function withPixelSprites<T extends { id: string; name: string; Component: (props: { data: never }) => JSX.Element }>(t: T): T {
  const Inner = t.Component as (props: object) => JSX.Element
  const Component = (props: object) => (
    <SpriteKindContext.Provider value="pixel">
      <Inner {...props} />
    </SpriteKindContext.Provider>
  )
  return { ...t, id: `${t.id}-pixel`, name: `${t.name} · Pixel Sprites`, Component }
}

// Pixel sprites: trimmed to the Pokémon (the 96px sheets have wide empty margins) and scaled up on a canvas
// with nearest-neighbour, at the size they're shown, so the preview and the PNG both get crisp square pixels.
const pixelCache = new Map<string, Promise<string>>()
function pixelSrc(src: string, size: number) {
  const key = `${src}@${size}`
  let p = pixelCache.get(key)
  if (!p) {
    p = new Promise<string>((resolve) => {
      const img = new Image()
      img.onerror = () => resolve(src)
      img.onload = () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        const read = document.createElement('canvas')
        read.width = w
        read.height = h
        const rg = read.getContext('2d')!
        rg.drawImage(img, 0, 0)
        const a = rg.getImageData(0, 0, w, h).data
        let x0 = w, y0 = h, x1 = -1, y1 = -1
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (a[(y * w + x) * 4 + 3] > 16) {
              if (x < x0) x0 = x
              if (x > x1) x1 = x
              if (y < y0) y0 = y
              if (y > y1) y1 = y
            }
        if (x1 < 0) return resolve(src)
        const bw = x1 - x0 + 1
        const bh = y1 - y0 + 1
        const fit = size / Math.max(bw, bh)
        const k = fit >= 2 && Math.floor(fit) / fit > 0.85 ? Math.floor(fit) : fit // whole-number scale when it costs little
        const out = document.createElement('canvas')
        out.width = size
        out.height = size
        const g = out.getContext('2d')!
        g.imageSmoothingEnabled = false
        const dw = Math.round(bw * k)
        const dh = Math.round(bh * k)
        g.drawImage(read, x0, y0, bw, bh, Math.round((size - dw) / 2), size - dh, dw, dh) // feet on the floor
        resolve(out.toDataURL())
      }
      img.src = src
    })
    pixelCache.set(key, p)
  }
  return p
}

/** The picture for a Pokémon id at `size` px in the current sprite kind ('' while a pixel sprite is being prepared). */
export function usePokemonSrc(id: string, size: number) {
  const kind = useSpriteKind()
  const icon = id && kind === 'pixel' ? sprites.icon(id) : ''
  const key = icon ? `${icon}@${size}` : ''
  const [px, setPx] = useState<{ key: string; url: string } | null>(null)
  useEffect(() => {
    if (!key) return
    let live = true
    pixelSrc(icon, Math.round(size)).then((url) => live && setPx({ key, url }))
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!id) return ''
  if (kind === 'render') return sprites.render(id)
  return px?.key === key ? px.url : ''
}

/** A Pokémon render with its held item (and Tera type when the format uses it). */
export function MonSprite({ mon, size, showTera, style }: { mon: Mon; size: number; showTera?: boolean; style?: CSSProperties }) {
  const { showMegas } = useDisplay()
  const pixel = useSpriteKind() === 'pixel'
  const pokemon = mon.pokemon ? displayPokemon(mon, showMegas) : ''
  const src = useFxSrc(usePokemonSrc(pokemon, size), mon) // Terastal / Dynamax look when a layout asks
  if (!mon.pokemon) return <div className="dmv-mon" style={{ width: size, height: size, ...style }} />
  const item = mon.item ? (pixel && sprites.itemPixel(mon.item)) || sprites.item(mon.item) : ''
  const pixelItem = pixel ? !!sprites.itemPixel(mon.item) : sprites.itemIsPixel(mon.item)
  const tera = showTera ? teraType(mon.tera) : undefined
  return (
    <div className={`dmv-mon${pixel ? ' pixel' : ''}`} style={{ width: size, height: size, ...style }}>
      {src ? <img className="render" src={src} alt={getPokemon(pokemon)?.name ?? ''} /> : <span className="render" />}
      {item && <img className={`item ${pixelItem ? 'pixel' : ''}`} src={item} alt={getItem(mon.item)?.name ?? ''} />}
      {tera && <div className="tera" style={{ background: tera.color }} title={tera.name} />}
    </div>
  )
}

/** A player's framing: where the photo sits in its box (x, y in %) and how far it's zoomed. */
export const photoFrame = (p: Player) => ({ x: p.photoX ?? 50, y: p.photoY ?? 30, zoom: p.photoZoom ?? 1 })

/** Live framing while a photo is being dragged on the Preview (saved to the player when the drag ends). */
export const PhotoFrameContext = createContext<{ uid: string; x: number; y: number } | null>(null)

/**
 * Style for a photo <img> that fills its box: object-position does the framing; zoom scales about that
 * same point (so the edges stay reachable) and clip-path trims the scaled image back to the box.
 */
export function photoStyle(x: number, y: number, zoom: number): CSSProperties {
  if (zoom <= 1) return { objectPosition: `${x}% ${y}%` }
  const k = 1 - 1 / zoom
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
    clipPath: `inset(${y * k}% ${(100 - x) * k}% ${(100 - y) * k}% ${x * k}%)`,
  }
}

/** A player's photo cropped to fill its box, or their initials if no photo was uploaded. */
export function PlayerPhoto({ player, className = '', style }: { player: Player; className?: string; style?: CSSProperties }) {
  const live = useContext(PhotoFrameContext)
  if (player.photo) {
    const f = photoFrame(player)
    const { x, y } = live?.uid === player.uid ? live : f
    return (
      <img
        className={`dmv-photo ${className}`}
        src={player.photo}
        alt={player.name}
        data-photo={player.uid}
        style={{ ...photoStyle(x, y, f.zoom), ...style }}
      />
    )
  }
  const initials = player.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
  return (
    <div className={`dmv-photo dmv-photo-empty ${className}`} style={style}>
      <span>{initials}</span>
    </div>
  )
}

/** "+50 CP" chip for the Show CP earned versions. Hidden when the placing earns nothing. */
export function CpBadge({ points, className = '', style }: { points: number; className?: string; style?: CSSProperties }) {
  if (!points) return null
  return (
    <div className={`dmv-cp ${className}`} style={style}>
      +{points} CP
    </div>
  )
}

export function Logo({ size, style }: { size: number; style?: CSSProperties }) {
  const brand = useBrand()
  if (!brand.logo) return null
  return <img className="dmv-logo" src={brand.logo} alt={brand.name} style={{ width: size, height: size, ...style }} />
}

let measureCtx: CanvasRenderingContext2D | null | undefined

function textWidth(text: string, font: string) {
  if (measureCtx === undefined) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return 0
  measureCtx.font = font
  return measureCtx.measureText(text).width
}

/** Re-render once web fonts finish loading, so text measurements use the real font. */
function useFontsReady() {
  const [, setReady] = useState(document.fonts.status === 'loaded')
  useEffect(() => {
    document.fonts.ready.then(() => setReady(true))
  }, [])
}

/**
 * Text that shrinks to fit a fixed width (long player names, tournament titles).
 * `max` is the largest font size; it only gets smaller when the text is too wide.
 */
export function FitText({
  text,
  max,
  width,
  min = 16,
  weight = 900,
  italic = true,
  uppercase = true,
  family = 'Montserrat',
  className = '',
  style,
}: {
  text: string
  max: number
  width: number
  min?: number
  weight?: number
  italic?: boolean
  uppercase?: boolean
  family?: string // font to measure with (the element's CSS must use the same font)
  className?: string
  style?: CSSProperties
}) {
  useFontsReady()
  const measured = textWidth(uppercase ? text.toUpperCase() : text, `${italic ? 'italic ' : ''}${weight} ${max}px ${family}`) * 1.08 // room for the outline
  // Shrinks to fit; past `min` it keeps shrinking a little (to 80% of it, never below 12px), and beyond
  // that the text is cut off with an ellipsis, so a very long name never spills out of its box or
  // turns unreadably small.
  const fit = Math.floor((max * width) / measured)
  const floor = Math.max(Math.floor(min * 0.8), Math.min(min, 12))
  const size = measured > width ? Math.max(floor, fit) : max
  const tooLong = measured > width && fit < floor
  return (
    <div className={className} style={{ fontSize: size, whiteSpace: 'nowrap', ...(tooLong ? { maxWidth: width, overflow: 'hidden', textOverflow: 'ellipsis' } : null), ...style }}>
      {text}
    </div>
  )
}
