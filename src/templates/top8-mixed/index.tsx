import { Facts } from '../shared/Facts'
import type { Theme } from '../themes/theme'
import type { CSSProperties } from 'react'
import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, CpBadge } from '../shared/parts'
import { cardColor, ordinal } from '../shared/format'
import { LoudBackground } from '../shared/LoudBackground'
import './top8-mixed.css'
import { gt } from '../../i18n'

// Two looks: alternating blue/red cards, or white cards. 1st place is gold in both. `loud`: the Comic Book background.
export const makeTop8Mixed = (white: boolean, theme?: Theme, loud = false): StandingsTemplate => ({
  id: theme ? `${theme.id}-top8-mixed` : loud ? 'dmv-top8-mixed-loud' : white ? 'dmv-top8-mixed-white' : 'dmv-top8-mixed',
  name: theme ? `Top 8 + Top 4 Photos (${theme.style})` : loud ? 'Top 8 + Top 4 Photos (Comic Book)' : white ? 'Top 8 Mixed (White)' : 'Top 8 Mixed',
  description: 'Photo cards for the top 4, compact rows for 5th–8th.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    const top4 = data.players.slice(0, 4)
    const rest = data.players.slice(4)
    // 5-7 players: the height four rows would use is shared out, so the top 4 cards and the remaining rows
    // both grow and nothing is left empty at the bottom (8: 2 x 330 cards + 4 x 94 rows, as before).
    const k = rest.length
    const rowH = k >= 4 ? 94 : k === 3 ? 118 : k === 2 ? 136 : 150
    const topH = k ? Math.floor((1106 - (k * rowH + (k - 1) * 10 + 20) - 20) / 2) : 330
    const tall = topH >= 380
    const vars = { width: 1080, height: 1350, '--m8-top-h': `${topH}px`, '--m8-row-h': `${rowH}px` } as CSSProperties
    return (
      <div className={`dmv m8 ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={vars}>
        {theme ? <theme.Background data={data} width={1080} height={1350} /> : loud ? (
          <LoudBackground top="red" bottom="blue" split={[30, 10]} burst={[130, 120]} />
        ) : (
          <>
            <div className="m8-bg" />
            <div className="dmv-halftone" />
          </>
        )}

        <header className="m8-header">
          <Logo size={160} />
          <div className="m8-heading">
            <div className="m8-tag">{gt('gfx.common.topN', { count: Math.max(data.players.length, 1) })}</div>
            <FitText className="dmv-title" text={data.tournament.name || gt('gfx.common.tournament')} max={62} width={800} />
            <Facts data={data} className="m8-facts" split={theme?.splitFacts} />
          </div>
        </header>

        <main className="m8-top4">
          {top4.map((p, i) => (
            <div key={p.uid} className={`m8-card dmv-panel ${white ? (i === 0 ? 'first' : '') : cardColor(i)}`}>
              <div className="m8-photo">
                <PlayerPhoto player={p} />
                <div className="m8-place">{ordinal(i + 1)}</div>
                {data.cp && <CpBadge points={data.cp(i + 1)} className="photo-cp" />}
              </div>
              <div className="m8-info">
                <FitText className="m8-name" text={p.name || gt('gfx.common.player')} max={30} width={196} min={16} />
                <div className="m8-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
                <div className={`m8-team ${tall ? 'tall' : ''}`}>
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={tall ? 84 : topH > 340 ? 64 : 62} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </main>

        {rest.length > 0 && (
          <section className="m8-rest">
            {rest.map((p, i) => (
              <div key={p.uid} className={`m8-row dmv-panel ${i % 2 ? 'red' : 'blue'}`}>
                <div className="m8-row-place">
                  {ordinal(i + 5)}
                  {data.cp && <CpBadge points={data.cp(i + 5)} className="tc-cp" />}
                </div>
                <div className="m8-row-player">
                  <FitText className="dmv-title" text={p.name || gt('gfx.common.player')} max={rowH > 94 ? 36 : 30} width={300} min={18} />
                  <div className="m8-row-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
                </div>
                <div className="m8-row-team">
                  {p.team.map((m, j) => (
                    <MonSprite key={j} mon={m} size={rowH >= 136 ? 86 : rowH > 94 ? 78 : 70} showTera={data.format.tera} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    )
  },
})

const Top8Mixed = makeTop8Mixed(false)
export default Top8Mixed
export const Top8MixedWhite = makeTop8Mixed(true)
export const Top8MixedLoud = makeTop8Mixed(false, undefined, true)
