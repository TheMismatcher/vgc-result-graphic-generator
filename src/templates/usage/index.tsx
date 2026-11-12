import type { UsageTemplate } from '../types'
import { FitText, Logo } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { LoudBackground } from '../shared/LoudBackground'
import { getPokemon, sprites } from '../../data/dex'
import type { SideTheme } from '../themes/side'
import './usage.css'
import { gt } from '../../i18n'

// `loud`: the Comic Book background.
export const makeUsage = (theme?: SideTheme, loud = false): UsageTemplate => ({
  id: theme ? `${theme.id}-usage` : loud ? 'dmv-usage-loud' : 'dmv-usage',
  name: theme ? `Usage Stats (${theme.style})` : loud ? 'Usage Stats (Comic Book)' : 'Usage Stats',
  description: 'Portrait grid of the 12 most-used Pokémon.',
  kind: 'usage',
  width: 1080,
  height: 1350,
  maxEntries: 12,
  Component: ({ data }) => (
    <div className={`dmv us ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: 1080, height: 1350 }}>
      {theme ? (
        <theme.Wall mons={data.entries.map((e) => e.pokemon)} seed={`usage|${data.tournament.name}`} width={1080} height={1350} />
      ) : loud ? (
        <LoudBackground top="red" bottom="blue" split={[22, 12]} burst={[130, 120]} />
      ) : (
        <>
          <div className="us-bg" />
          <div className="dmv-halftone" />
        </>
      )}

      <header className="us-header">
        <Logo size={170} />
        <div className="us-heading">
          <div className="dmv-title" style={{ fontSize: 84 }}>{gt('gfx.usage.title')}</div>
          <FitText className="us-event" text={data.tournament.name} max={34} width={790} />
          {/* Every fact has a dot in front; the dot that starts each line is clipped off (see CSS),
              so a wrapped line never starts or ends with a stray dot. */}
          <div className="us-facts">
            <div className="us-facts-wrap">
              {[...eventFacts(data), data.totalTeams ? gt('gfx.usage.teamsCounted', { count: data.totalTeams }) : ''].filter(Boolean).map((f) => (
                <span key={f} className="us-facts-item">
                  <span className="us-dot">·</span>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="us-grid">
        {data.entries.map((e, i) => (
          <div key={e.pokemon} className="us-card dmv-panel">
            <div className="us-rank">{gt('gfx.usage.rank', { n: i + 1 })}</div>
            <img className="us-render" src={sprites.render(e.pokemon)} alt="" />
            <div className="us-name">{getPokemon(e.pokemon)?.name}</div>
            <div className="us-bar">
              <div className="us-fill" style={{ width: `${Math.min(100, e.percent)}%` }} />
              <span>{e.percent}%</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  ),
})

const Usage = makeUsage()
export default Usage
export const UsageLoud = makeUsage(undefined, true)
