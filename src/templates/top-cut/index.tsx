import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge } from '../shared/parts'
import { LoudBackground } from '../shared/LoudBackground'
import { eventFacts, ordinal } from '../shared/format'
import './top-cut.css'

// Header variants: a "clean" single line of text, or a slanted caption banner (dark or white).
const HEADER_NAMES = { clean: 'Clean Header', banner: 'Banner Header', 'banner-white': 'White Banner Header' }
// `loud` swaps the plain background for the comic-book look from the DMV artwork: sunburst,
// speed lines, halftone that fades in, and a jagged black split between the colours.
const makeTopCut = (header: 'clean' | 'banner' | 'banner-white', loud = false): StandingsTemplate => ({
  id: `dmv-top-cut-${header}${loud ? '-loud' : ''}`,
  name: loud ? 'Top Cut (Comic Book)' : `Top Cut (${HEADER_NAMES[header]})`,
  description: 'Portrait list of the top 8 with full teams.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => {
    // Four players or fewer: taller rows, bigger names, and the team as a 3 x 2 grid of larger Pokémon.
    const few = data.players.length <= 4
    return (
    <div className={`dmv tc ${loud ? 'loud' : ''} ${few ? 'few' : ''}`} style={{ width: 1080, height: 1350 }}>
      {loud ? (
        <LoudBackground top="blue" bottom="red" split={[32, 12]} burst={[140, 125]} />
      ) : (
        <>
          <div className="tc-bg" />
          <div className="dmv-halftone" />
        </>
      )}

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
          ) : (
            <>
              <div className="tc-rule" />
              {/* Type · date · players, wrapping between facts when too long; the (long) format name under it.
                  Every fact has a dot in front, and the dot that starts each line is clipped off (see CSS). */}
              <div className="tc-facts-line">
                <div className="tc-facts-wrap">
                  {eventFacts(data)
                    .filter((f) => f !== data.formatLabel)
                    .map((f) => (
                      <div key={f} className="tc-facts-line-item">
                        <span className="tc-dot">•</span>
                        {f}
                      </div>
                    ))}
                </div>
              </div>
              {data.formatLabel && <div className="tc-format">{data.formatLabel}</div>}
            </>
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
              <FitText className="dmv-title" text={p.name || 'Player'} max={few ? 60 : 40} width={few ? 440 : 290} min={22} />
              <div className="tc-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
            </div>
            <div className="tc-team">
              {p.team.map((m, j) => (
                <MonSprite key={j} mon={m} size={few ? 120 : 86} showTera={data.format.tera} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
    )
  },
})

export const TopCutClean = makeTopCut('clean')
export const TopCutBannerWhite = makeTopCut('banner-white')
export const TopCutLoud = makeTopCut('clean', true)
