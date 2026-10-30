import type { Theme } from '../themes/theme'
import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, PlayerPhoto, CpBadge } from '../shared/parts'
import { eventFacts, ordinal } from '../shared/format'
import { LoudBackground } from '../shared/LoudBackground'
import './top4-photos.css'

export const makeTop4Photos = (loud = false, theme?: Theme): StandingsTemplate => ({
  id: theme ? `${theme.id}-top4-photos` : loud ? 'dmv-top4-photos-loud' : 'dmv-top4-photos',
  name: theme ? `Top 4 Photos (${theme.style})` : loud ? 'Top 4 Photos (Comic Book)' : 'Top 4 Photos',
  description: 'Square grid with big player photos and teams.',
  kind: 'standings',
  width: 1080,
  height: 1080,
  maxPlayers: 4,
  Component: ({ data }) => (
    <div className={`dmv p4 ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: 1080, height: 1080 }}>
      {theme ? <theme.Background data={data} width={1080} height={1080} /> : loud ? (
        <LoudBackground top="blue" bottom="red" split={[58, 30]} burst={[115, 110]} />
      ) : (
        <>
          <div className="p4-bg" />
          <div className="dmv-halftone" />
        </>
      )}

      <header className="p4-header">
        <Logo size={150} />
        <div className="p4-heading">
          <div className="p4-tag">Top {Math.max(data.players.length, 1)}</div>
          <FitText className="dmv-title" text={data.tournament.name || 'Tournament'} max={58} width={810} />
          <div className="p4-facts">{eventFacts(data).join('  ·  ')}</div>
        </div>
      </header>

      <main className="p4-grid">
        {data.players.map((p, i) => (
          <div key={p.uid} className={`p4-card dmv-panel ${i === 0 ? 'first' : ''}`}>
            <div className="p4-photo">
              <PlayerPhoto player={p} />
              <div className="p4-place">{ordinal(i + 1)}</div>
                {data.cp && <CpBadge points={data.cp(i + 1)} className="photo-cp" />}
              <div className="p4-plate">
                <FitText className="p4-name" text={p.name || 'Player'} max={32} width={360} min={18} />
              </div>
            </div>
            <div className="p4-bottom">
              <div className="p4-sub">{[p.record, p.social].filter(Boolean).join('  ·  ')}</div>
              <div className="p4-team">
                {p.team.map((m, j) => (
                  <MonSprite key={j} mon={m} size={66} showTera={data.format.tera} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
})

const Top4Photos = makeTop4Photos()
export default Top4Photos
export const Top4PhotosLoud = makeTop4Photos(true)
