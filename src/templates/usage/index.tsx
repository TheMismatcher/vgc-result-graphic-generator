import { Fragment } from 'react'
import type { UsageTemplate } from '../types'
import { FitText, Logo } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { getPokemon, sprites } from '../../data/dex'
import './usage.css'

const Usage: UsageTemplate = {
  id: 'dmv-usage',
  name: 'Usage Stats',
  description: 'Portrait grid of the 12 most-used Pokémon.',
  kind: 'usage',
  width: 1080,
  height: 1350,
  maxEntries: 12,
  Component: ({ data }) => (
    <div className="dmv us" style={{ width: 1080, height: 1350 }}>
      <div className="us-bg" />
      <div className="dmv-halftone" />

      <header className="us-header">
        <Logo size={170} />
        <div className="us-heading">
          <div className="dmv-title" style={{ fontSize: 84 }}>Top Usage</div>
          <FitText className="us-event" text={data.tournament.name} max={34} width={790} />
          <div className="us-facts">
            {[...eventFacts(data), data.totalTeams ? `${data.totalTeams} teams counted` : ''].filter(Boolean).map((f, i) => (
              <Fragment key={f}>{i > 0 && ' · '}<span style={{ whiteSpace: 'nowrap' }}>{f}</span></Fragment>
            ))}
          </div>
        </div>
      </header>

      <main className="us-grid">
        {data.entries.map((e, i) => (
          <div key={e.pokemon} className="us-card dmv-panel">
            <div className="us-rank">#{i + 1}</div>
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
}

export default Usage
