// The "loud" comic-book background from the DMV artwork, shared by every Loud template:
// two colour panels split by a jagged black lightning edge, a sunburst, halftone dots and
// speed lines. Templates choose the colours, where the split runs and where the burst sits.

import { useBrand } from '../../brand'
import './loud.css'

type Colour = 'red' | 'blue' | 'yellow'

interface Props {
  /** Colour above the split and below it. */
  top: Colour
  bottom: Colour
  /** Height of the split (as % of the page) at the left and right edges. */
  split: [number, number]
  /** Sunburst centre in px from the top left (usually behind the logo or the hero). */
  burst: [number, number]
  /** Draw the sunburst over the bottom panel instead of the top one. */
  burstBelow?: boolean
  /**
   * Split left/right instead of top/bottom: `top` is then the left colour, `bottom` the right, and
   * `split` gives the split's position (as % of the width) at the top and bottom edges.
   */
  vertical?: boolean
}

/** Zig-zag polygon along the split line, `w` % thick, for the lightning edge. */
function boltPath(a: number, b: number, vertical: boolean, w = 3) {
  const steps = 8
  const at = (t: number) => a + ((b - a) * t) / 100
  const point = (t: number, off: number) => (vertical ? `${at(t) + off}% ${t}%` : `${t}% ${at(t) + off}%`)
  const one: string[] = []
  const two: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (100 * i) / steps
    const kink = i % 2 ? w * 0.45 : 0 // every other point juts out: the zig-zag
    one.push(point(t, -w / 2 + kink))
    two.unshift(point(t, w / 2 + kink))
  }
  return `polygon(${[...one, ...two].join(', ')})`
}

export function LoudBackground({ top, bottom, split, burst, burstBelow, vertical = false }: Props) {
  const [a, b] = split
  const topClip = vertical ? `polygon(0 0, ${a}% 0, ${b}% 100%, 0 100%)` : `polygon(0 0, 100% 0, 100% ${b}%, 0 ${a}%)`
  const bottomClip = vertical ? `polygon(${a}% 0, 100% 0, 100% 100%, ${b}% 100%)` : `polygon(0 ${a}%, 100% ${b}%, 100% 100%, 0 100%)`
  const at = `${burst[0]}px ${burst[1]}px`
  // Sunburst rays in the brand's highlight color, half see-through.
  const n = parseInt(useBrand().colors.highlight.slice(1), 16)
  const ray = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.5)`
  return (
    <>
      <div className={`loud-panel loud-${bottom}`} />
      <div className="loud-dots" />
      <div className="loud-speed" />
      <div className={`loud-panel loud-${top} loud-fine-dots`} style={{ clipPath: topClip }} />
      <div
        className="loud-burst"
        style={{
          clipPath: burstBelow ? bottomClip : topClip,
          background: `repeating-conic-gradient(from 0deg at ${at}, ${ray} 0deg 5deg, transparent 5deg 12deg)`,
          WebkitMaskImage: `radial-gradient(circle at ${at}, #000 0%, #000 35%, transparent 75%)`,
          maskImage: `radial-gradient(circle at ${at}, #000 0%, #000 35%, transparent 75%)`,
        }}
      />
      <div className="loud-bolt" style={{ clipPath: boltPath(a, b, vertical) }} />
    </>
  )
}
