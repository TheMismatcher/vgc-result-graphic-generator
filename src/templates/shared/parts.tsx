// Small building blocks reused across templates.

import { createContext, useContext, useEffect, useState, type CSSProperties } from 'react'
import type { Mon, Player } from '../../types'
import { getItem, getPokemon, sprites } from '../../data/dex'
import { teraType } from '../../data/options'
import { useBrand } from '../../brand'
import { displayPokemon, useDisplay } from '../../lib/display'
import { useFxSrc } from './monEffect'
import './brand.css'

/** A Pokémon render with its held item (and Tera type when the format uses it). */
export function MonSprite({ mon, size, showTera, style }: { mon: Mon; size: number; showTera?: boolean; style?: CSSProperties }) {
  const { showMegas } = useDisplay()
  const pokemon = mon.pokemon ? displayPokemon(mon, showMegas) : ''
  const src = useFxSrc(pokemon ? sprites.render(pokemon) : '', mon) // Terastal / Dynamax look when a layout asks
  if (!mon.pokemon) return <div className="dmv-mon" style={{ width: size, height: size, ...style }} />
  const item = mon.item ? sprites.item(mon.item) : ''
  const tera = showTera ? teraType(mon.tera) : undefined
  return (
    <div className="dmv-mon" style={{ width: size, height: size, ...style }}>
      <img className="render" src={src} alt={getPokemon(pokemon)?.name ?? ''} />
      {item && <img className={`item ${sprites.itemIsPixel(mon.item) ? 'pixel' : ''}`} src={item} alt={getItem(mon.item)?.name ?? ''} />}
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
