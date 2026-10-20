import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge } from '../shared/parts'
import { eventFacts, ordinal } from '../shared/format'
import './top-cut.css'

// The bubble versions are kept to compare against the default (no bubbles) look. The "clean"
// header swaps the white event pills for a single line of text.
const HEADER_NAMES = { clean: 'Clean Header', banner: 'Banner Header', 'banner-white': 'White Banner Header' }
const makeTopCut = (itemBubbles?: 'white' | 'dark', header: 'pills' | 'clean' | 'banner' | 'banner-white' = 'pills'): StandingsTemplate => ({
  id: header !== 'pills' ? `dmv-top-cut-${header}` : itemBubbles ? `dmv-top-cut-${itemBubbles === 'white' ? 'bubbles' : 'dark-bubbles'}` : 'dmv-top-cut',
  name: header !== 'pills' ? `Top Cut (${HEADER_NAMES[header]})` : itemBubbles ? `Top Cut (${itemBubbles === 'white' ? '' : 'Dark '}Item Bubbles)` : 'Top Cut',
  description: 'Portrait list of the top 8 with full teams.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className="dmv tc" style={{ width: 1080, height: 1350 }}>
      <div className="tc-bg" />
      <div className="dmv-halftone" />

      <header className="tc-header">
        <Logo size={190} />
        <div className="tc-heading">
          <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={72} width={760} />
          {header === 'banner' || header === 'banner-white' ? (
            <>
              {/* A slanted caption bar, broadcast style (dark or white). */}
              <div className={`tc-banner ${header === 'banner-white' ? 'white' : ''}`}>
                <div className="tc-banner-text">
                  {eventFacts(data)
                    .filter((f) => f !== data.formatLabel)
                    .map((f, i) => (
                      <span key={f}>
                        {i > 0 && <span className="tc-slash">/</span>}
                        {f}
                      </span>
                    ))}
                </div>
              </div>
              {data.formatLabel && <div className="tc-format banner">{data.formatLabel}</div>}
            </>
          ) : header === 'clean' ? (
            <>
              <div className="tc-rule" />
              {/* Type · date · players on one line, the (long) format name under it. */}
              <div className="tc-facts-line">
                {eventFacts(data)
                  .filter((f) => f !== data.formatLabel)
                  .map((f, i) => (
                    <div className="tc-facts-line-item">
                      <span key={f}>
                        {i > 0 && <span className="tc-dot">•</span>}
                        {f}
                      </span>
                    </div>
                  ))}
              </div>
              {data.formatLabel && <div className="tc-format">{data.formatLabel}</div>}
            </>
          ) : (
            <div className="tc-facts">
              {eventFacts(data).map((f) => (
                <span key={f} className="dmv-pill">{f}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="tc-rows">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`tc-row dmv-panel ${i === 0 ? 'first' : i % 2 ? 'blue' : 'red'}`}>
            <div className="tc-place">
              {ordinal(i + 1)}
              {data.cp && <CpBadge points={data.cp(i + 1)} className="tc-cp" />}
            </div>
            <div className="tc-player">
              <FitText className="dmv-title" text={p.name || 'Player'} max={40} width={290} min={22} />
              <div className="tc-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
            </div>
            <div className="tc-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={86} showTera={data.format.tera} itemBubble={itemBubbles} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
})

const TopCut = makeTopCut()
export default TopCut
export const TopCutBubbles = makeTopCut('white')
export const TopCutDarkBubbles = makeTopCut('dark')
export const TopCutClean = makeTopCut(undefined, 'clean')
export const TopCutBanner = makeTopCut(undefined, 'banner')
export const TopCutBannerWhite = makeTopCut(undefined, 'banner-white')
