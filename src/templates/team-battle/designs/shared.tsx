import { FitText, textWidth, useFontsReady } from '../../shared/parts'

/** A team name that stays big: one line while it fits at `twoAt` px or more, otherwise two balanced lines (by word). */
export function TeamName({ text, max, width, twoAt, className, italic = false }: { text: string; max: number; width: number; twoAt: number; className: string; italic?: boolean }) {
  useFontsReady()
  const font = (px: number) => `${italic ? 'italic ' : ''}900 ${px}px Montserrat`
  const oneLine = (max * width) / (textWidth(text.toUpperCase(), font(max)) * 1.08 || 1)
  const words = text.split(/\s+/).filter(Boolean)
  if (oneLine >= twoAt || words.length < 2) return <FitText className={className} text={text} max={max} width={width} min={Math.min(twoAt, 20)} italic={italic} />
  // Split where the longer line is shortest.
  let best = 1
  let bestW = Infinity
  for (let i = 1; i < words.length; i++) {
    const w = Math.max(textWidth(words.slice(0, i).join(' ').toUpperCase(), font(max)), textWidth(words.slice(i).join(' ').toUpperCase(), font(max)))
    if (w < bestW) [best, bestW] = [i, w]
  }
  const size = Math.min(max * 0.8, (max * width) / (bestW * 1.08 || 1))
  return (
    <div className={`${className} two`} style={{ fontSize: size }}>
      <div>{words.slice(0, best).join(' ')}</div>
      <div>{words.slice(best).join(' ')}</div>
    </div>
  )
}
