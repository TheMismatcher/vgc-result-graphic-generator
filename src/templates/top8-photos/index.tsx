import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, CpBadge } from '../shared/parts'
import { cardColor, eventFacts, ordinal } from '../shared/format'
import { LoudBackground } from '../shared/LoudBackground'
import './top8-photos.css'

// Two looks: alternating blue/red cards, or white cards. 1st place is gold in both.
const makeTop8Photos = (white: boolean, loud = false): StandingsTemplate => ({
  id: loud ? 'dmv-top8-photos-loud' : white ? 'dmv-top8-photos-white' : 'dmv-top8-photos',
  name: loud ? 'Top 8 Photos (Loud)' : white ? 'Top 8 Photos (White)' : 'Top 8 Photos',
  description: 'Portrait cards with each player’s photo and team.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className={`dmv p8 ${loud ? 'loud' : ''}`} style={{ width: 1080, height: 1350 }}>
      {loud ? (
        <LoudBackground top="red" bottom="blue" split={[30, 10]} burst={[130, 120]} />
      ) : (
        <>
          <div className="p8-bg" />
          <div className="dmv-halftone" />
        </>
      )}

      <header className="p8-header">
        <Logo size={170} />
        <div className="p8-heading">
          <div className="p8-tag">Top {Math.max(data.players.length, 1)}</div>
          <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={64} width={790} />
          <div className="p8-facts">{eventFacts(data).join('  ·  ')}</div>
        </div>
      </header>

      <main className="p8-grid">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`p8-card dmv-panel ${white ? (i === 0 ? 'first' : '') : cardColor(i)}`}>
            <div className="p8-photo">
              <PlayerPhoto player={p} />
              <div className="p8-place">{ordinal(i + 1)}</div>
                {data.cp && <CpBadge points={data.cp(i + 1)} className="photo-cp" />}
            </div>
            <div className="p8-info">
              <FitText className="p8-name" text={p.name || 'Player'} max={30} width={212} min={16} />
              <div className="p8-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
              <div className="p8-team">
                {p.team.map((m, j) => (
                  <MonSprite key={j} mon={m} size={64} showTera={data.format.tera} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
})

const Top8Photos = makeTop8Photos(false)
export default Top8Photos
export const Top8PhotosWhite = makeTop8Photos(true)
export const Top8PhotosLoud = makeTop8Photos(false, true)
