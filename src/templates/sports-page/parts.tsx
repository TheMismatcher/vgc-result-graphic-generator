// Pieces every Sports Page graphic is built from: newsprint grain, the ruled masthead, the off-register
// headline and the grey subheadline (deck). Each layout arranges them its own way.

import '@fontsource/anton/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/700.css'
import type { StandingsData } from '../types'
import { FitText, Logo, textWidth, useFontsReady } from '../shared/parts'
import { useBrand } from '../../brand'
import { gt } from '../../i18n'

const lastName = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] || gt('gfx.common.player')
}

/** The automatic headline and subheadline; the Preview shows them as the placeholders of the edit boxes. */
export function autoHeadline(data: StandingsData) {
  const winner = data.players[0]?.name || gt('gfx.common.playerName')
  return gt('gfx.sportsPage.headline', { lastName: lastName(winner), event: data.typeLabel || gt('gfx.sportsPage.theEvent') }).toUpperCase()
}
export function autoDeck(data: StandingsData) {
  const first = data.players[0]
  const winner = first?.name || gt('gfx.common.playerName')
  const tournament = data.tournament.name || gt('gfx.sportsPage.tournament')
  return first?.record ? gt('gfx.sportsPage.deckRecord', { winner, record: first.record, tournament }) : gt('gfx.sportsPage.deck', { winner, tournament })
}

/** The headline and subheadline to print: the user's own (Preview boxes), else the automatic ones. */
export const headlineText = (data: StandingsData) => data.tournament.headline?.trim().toUpperCase() || autoHeadline(data)
export const deckText = (data: StandingsData) => data.tournament.deck?.trim() || autoDeck(data)

// The subheadline wraps to at most two lines: a longer one (typed in the Preview) gets a smaller font
// rather than pushing the rest of the page down.
export function deckSize(deck: string, width = 992) {
  const oneLine = textWidth(deck, '600 30px Montserrat')
  const room = 2 * width * 0.9 // two lines, less some slack for where the words break
  return oneLine > room ? Math.max(20, Math.floor((30 * room) / oneLine)) : 30
}

/**
 * The headline, drawn twice: the red off-register misprint, then the ink.
 * Default (Top Cut): one line at up to `max`px; one that would drop below `min` on a single line is split
 * into two balanced lines of up to `max / 2`px, which fill the same slot.
 * `stack`: always two balanced lines of up to `max / 2`px each (a front-page "extra" headline).
 */
export function Headline({ text, max = 128, width = 990, min = 64, stack = false }: { text: string; max?: number; width?: number; min?: number; stack?: boolean }) {
  useFontsReady()
  const half = max / 2
  const measure = (s: string) => textWidth(s, '400 64px Anton') * 1.08 // as FitText measures
  const words = text.split(/\s+/)
  if (words.length < 2 || (!stack && (max * width) / ((max / 64) * measure(text)) >= min)) {
    const one = stack ? half : max
    return (
      <>
        <FitText className="sp-headline sp-misprint" text={text} max={one} width={width} min={Math.min(min, one)} weight={400} italic={false} family="Anton" />
        <FitText className="sp-headline" text={text} max={one} width={width} min={Math.min(min, one)} weight={400} italic={false} family="Anton" />
      </>
    )
  }
  // Break where the longer line is shortest.
  let lines: [string, string] = [text, '']
  let best = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const longest = Math.max(measure(a), measure(b))
    if (longest < best) {
      best = longest
      lines = [a, b]
    }
  }
  const size = Math.max(40, Math.min(half, Math.floor((64 * width) / best)))
  const line = { display: 'block', maxWidth: width, overflow: 'hidden', textOverflow: 'ellipsis' } as const
  return (
    <>
      {['sp-headline sp-misprint', 'sp-headline'].map((cls) => (
        <div key={cls} className={`${cls} sp-two`} style={{ fontSize: size, whiteSpace: 'nowrap' }}>
          <span style={line}>{lines[0]}</span>
          <span style={line}>{lines[1]}</span>
        </div>
      ))}
    </>
  )
}

/** Newsprint grain over the paper. */
export function Grain({ width, height }: { width: number; height: number }) {
  return (
    <svg className="sp-grain" width={width} height={height} aria-hidden>
      <filter id="sp-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.09 0" />
      </filter>
      <rect width={width} height={height} filter="url(#sp-noise)" />
    </svg>
  )
}

/** Masthead: double rule, section name, logo, date. (No brand name: graphics show the brand by its logo only.) */
export function Mast({ data }: { data: StandingsData }) {
  const brand = useBrand()
  return (
    <header className="sp-mast">
      <span className="sp-mast-name">{gt('gfx.sportsPage.masthead')}</span>
      {/* No logo: an empty slot the logo's height, so the masthead (and the whole page under it) doesn't move. */}
      {brand.logo ? <Logo size={64} style={{ border: '3px solid #1b1a17' }} /> : <span className="sp-mast-nologo" />}
      <span className="sp-mast-date">{data.dateLabel}</span>
    </header>
  )
}

/** Bottom rule with the format and the brand's tagline. */
export function Foot({ data }: { data: StandingsData }) {
  const brand = useBrand()
  return (
    <footer className="sp-foot">
      <span>{data.formatLabel}</span>
      <span>{brand.tagline}</span>
    </footer>
  )
}
