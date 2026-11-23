import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { eventFacts } from './format'
import { FitText, textWidth } from './parts'
import type { EventInfo } from '../types'

/** The facts under a title. `split` (map / Glass styles) puts them on two lines: event, date and players, then the
 * format on its own, instead of one long squeezed line. With `fit`, each line shrinks to `fit.width` like FitText.
 * The division breakdown (when on) takes the players' place on the first line when it fits there at full size
 * (split styles), otherwise it gets a line of its own under the first. */
export function Facts({ data, className, sep = '  ·  ', split, fit }: { data: EventInfo; className: string; sep?: string; split?: boolean; fit?: { max: number; min: number; width: number; weight?: number } }) {
  const first = split ? eventFacts(data).filter((f) => f !== data.formatLabel).join(sep) : eventFacts(data).join(sep)
  const joined = split && first && data.divisionsLine ? `${first}${sep}${data.divisionsLine}` : ''

  // Does the joined line fit? With `fit`, measure it at the full size; otherwise draw it joined, and if the
  // browser says it runs past its box, remember that (for this text, once the fonts are in) and split it.
  const [fonts, setFonts] = useState(document.fonts.status === 'loaded')
  useEffect(() => {
    document.fonts.ready.then(() => setFonts(true))
  }, [])
  const key = `${joined}|${fonts}`
  const [tooLong, setTooLong] = useState('')
  const fitsAtFullSize = fit && joined ? textWidth(joined.toUpperCase(), `${fit.weight ?? 800} ${fit.max}px Montserrat`) * 1.08 <= fit.width : true
  const together = !!joined && fitsAtFullSize && tooLong !== key
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (together && el && el.scrollWidth > el.clientWidth + 1) setTooLong(key)
  })

  // The divisions look like the facts; only the format line (split) is styled as the second line.
  const lines = [
    { text: together ? joined : first, cls: className, measure: together },
    { text: together ? '' : data.divisionsLine, cls: `${className} facts-divisions`, measure: false },
    { text: split ? data.formatLabel ?? '' : '', cls: `${className} facts-second`, measure: false },
  ]
    .filter((l) => l.text)
    // A line that ends up first (e.g. the format, when nothing else is filled in) keeps the plain style.
    .map((l, i) => (i ? l : { ...l, cls: className }))
  return (
    <>
      {lines.map(({ text, cls, measure }, i) =>
        fit ? (
          <FitText key={i} className={cls} text={text} max={fit.max} width={fit.width} min={fit.min} weight={fit.weight ?? 800} italic={false} />
        ) : (
          <div key={i} ref={measure ? ref : undefined} className={cls}>
            {text}
          </div>
        ),
      )}
    </>
  )
}
