import { eventFacts } from './format'
import { FitText } from './parts'
import type { EventInfo } from '../types'

/** The facts under a title. `split` (map / Glass styles) puts them on two lines: event, date and players, then the
 * format on its own, instead of one long squeezed line. With `fit`, each line shrinks to `fit.width` like FitText. */
export function Facts({ data, className, sep = '  ·  ', split, fit }: { data: EventInfo; className: string; sep?: string; split?: boolean; fit?: { max: number; min: number; width: number; weight?: number } }) {
  const lines = split ? [eventFacts(data).filter((f) => f !== data.formatLabel).join(sep), data.formatLabel ?? ''].filter(Boolean) : [eventFacts(data).join(sep)]
  return (
    <>
      {lines.map((text, i) =>
        fit ? (
          <FitText key={i} className={`${className}${i ? ' facts-second' : ''}`} text={text} max={fit.max} width={fit.width} min={fit.min} weight={fit.weight ?? 800} italic={false} />
        ) : (
          <div key={i} className={`${className}${i ? ' facts-second' : ''}`}>
            {text}
          </div>
        ),
      )}
    </>
  )
}
