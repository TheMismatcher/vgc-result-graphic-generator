// Event Results in Custom Glass: the Standings Custom Glass Champion + Photo carried over to one player at a big
// event. The user's photo edge to edge behind glass panels in the Branding colours (.pl-custom in places.css: the
// Opacity slider, the Light version's white panels). The caption takes the place of the CHAMPION tab, the event's
// badge sits top right, the name is white type straight on the photo, and the event name is the footer bar.

import type { Day2Data, Day2Template } from '../types'
import { FitText, MonSprite, PlayerPhoto } from '../shared/parts'
import { BackdropImage } from '../../lib/backdrop'
import { getItem, getPokemon } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { gtFormatName } from '../../data/options'
import { eventFor } from './events'
import { gt } from '../../i18n'
import '../places/places.css'
import './glass.css'

const SIZE = 1644

function Glass({ data, light }: { data: Day2Data; light: boolean }) {
  const { showMegas } = useDisplay()
  const p = data.player
  const event = eventFor(data.kind)
  const record = p.record ? (/[a-z]/i.test(p.record) ? p.record : gt('gfx.day2.recordN', { record: p.record })) : ''
  const sub = [record, p.social].filter(Boolean).join('  ·  ')
  const team = Array.from({ length: 6 }, (_, i) => p.team[i])
  return (
    <div className={`dmv d2 d2g pl-custom pl-art ${light ? 'light' : ''}`} style={{ width: SIZE, height: SIZE }}>
      <BackdropImage width={SIZE} height={SIZE} />
      <div className="pl-shade" />

      <div className="d2g-tab">
        <FitText className="d2g-title" text={data.caption.trim() || event.label} max={92} width={900} min={40} italic={false} />
      </div>
      <img className="d2g-badge" src={event.logo} alt="" />

      <div className="d2g-name">
        <FitText className="d2g-title" text={p.name || gt('gfx.common.playerName')} max={128} width={1060} min={48} italic={false} />
      </div>
      {sub && <div className="d2g-sub">{sub}</div>}

      <div className="d2g-photo">
        <PlayerPhoto player={p} />
      </div>

      <div className="d2g-team">
        {team.map((m, i) => (
          <div key={i} className={`d2g-card ${i === 0 && m?.pokemon ? 'ace' : ''}`}>
            {m?.pokemon && (
              <>
                <MonSprite mon={m} size={196} showTera={data.format.tera} />
                <div className="d2g-mon">{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</div>
                <div className="d2g-item">{getItem(m.item)?.name ?? ''}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <footer className="d2g-footer">
        <FitText className="d2g-event" text={data.event || event.title} max={46} width={1490} min={26} />
        <div className="d2g-facts">{[event.label, gtFormatName(data.format.name)].filter(Boolean).join('  ·  ')}</div>
      </footer>
    </div>
  )
}

const customGlass = (light: boolean): Day2Template => ({
  kind: 'day2',
  width: SIZE,
  height: SIZE,
  id: light ? 'custom-glass-light-day2' : 'custom-glass-day2', // 'custom-glass' prefix: the Preview offers the photo upload
  name: `Event Results (Custom Glass${light ? ' Light' : ''})`,
  description: light
    ? 'One player at a big event over your own photo: white panels edged in your branding colors, the caption as the tab, the team as tiles.'
    : 'One player at a big event over your own photo: see-through glass in your branding colors, the caption as the tab, the team as tiles.',
  style: light ? 'Custom Glass Light' : 'Custom Glass',
  look: { panels: light ? 'solid' : 'glass' },
  ...(light ? { variantOf: 'Custom Glass' } : {}),
  Component: ({ data }) => <Glass data={data} light={light} />,
})
export const Day2CustomGlass = customGlass(false)
export const Day2CustomLight = customGlass(true)
