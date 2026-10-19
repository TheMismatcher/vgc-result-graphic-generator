// Small building blocks reused across templates.

import { useEffect, useState, type CSSProperties } from 'react'
import type { Mon, Player } from '../../types'
import { getItem, getPokemon, sprites } from '../../data/dex'
import { teraType } from '../../data/options'
import { useBrand } from '../../brand'
import { displayPokemon, useDisplay } from '../../lib/display'
import './brand.css'

/** A Pokémon render with its held item (and Tera type when the format uses it). */
export function MonSprite({ mon, size, showTera, style }: { mon: Mon; size: number; showTera?: boolean; style?: CSSProperties }) {
  const { showMegas } = useDisplay()
  if (!mon.pokemon) return <div className="dmv-mon" style={{ width: size, height: size, ...style }} />
  const pokemon = displayPokemon(mon, showMegas)
  const item = mon.item ? sprites.item(mon.item) : ''
  const tera = showTera ? teraType(mon.tera) : undefined
  return (
    <div className="dmv-mon" style={{ width: size, height: size, ...style }}>
      <img className="render" src={sprites.render(pokemon)} alt={getPokemon(pokemon)?.name ?? ''} />
      {item && <img className={`item ${sprites.itemIsPixel(mon.item) ? 'pixel' : ''}`} src={item} alt={getItem(mon.item)?.name ?? ''} />}
      {tera && <div className="tera" style={{ background: tera.color }} title={tera.name} />}
    </div>
  )
}

/** A player's photo cropped to fill its box, or their initials if no photo was uploaded. */
export function PlayerPhoto({ player, className = '', style }: { player: Player; className?: string; style?: CSSProperties }) {
  if (player.photo) {
    return (
      <img
        className={`dmv-photo ${className}`}
        src={player.photo}
        alt={player.name}
        style={{ objectPosition: `50% ${player.photoY ?? 30}%`, ...style }}
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
  className?: string
  style?: CSSProperties
}) {
  useFontsReady()
  const measured = textWidth(uppercase ? text.toUpperCase() : text, `${italic ? 'italic ' : ''}${weight} ${max}px Montserrat`) * 1.08 // room for the outline
  const size = measured > width ? Math.max(min, Math.floor((max * width) / measured)) : max
  return (
    <div className={className} style={{ fontSize: size, whiteSpace: 'nowrap', ...style }}>
      {text}
    </div>
  )
}
