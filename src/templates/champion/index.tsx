import type { Theme } from '../themes/theme'
import type { StandingsTemplate } from '../types'
import { FitText, Logo, MonSprite, CpBadge, PlayerPhoto } from '../shared/parts'
import { eventFacts } from '../shared/format'
import { getPokemon, getItem } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import { LoudBackground } from '../shared/LoudBackground'
import './champion.css'

// `photo`: Champion + Photo — the winner's photo as a tall portrait on the left, name and team (2 x 3) beside it.
export const makeChampion = (loud = false, theme?: Theme, photo = false): StandingsTemplate => ({
  id: (theme ? `${theme.id}-champion` : loud ? 'dmv-champion-loud' : 'dmv-champion') + (photo ? '-photo' : ''),
  name: (theme ? `Champion (${theme.style})` : loud ? 'Champion (Comic Book)' : 'Champion').replace('Champion', photo ? 'Champion + Photo' : 'Champion'),
  description: photo ? 'The winner’s photo beside their name and team (add it on the player’s card).' : 'Square spotlight on the winner and their team.',
  kind: 'standings',
  width: 1080,
  height: 1080,
  maxPlayers: 1,
  Component: ({ data }) => {
    const { showMegas } = useDisplay()
    const winner = data.players[0]
    const name = winner?.name || 'Player'
    return (
      <div className={`dmv ch ${photo ? 'ch-withphoto' : ''} ${loud ? 'loud' : ''} ${theme ? `themed ${theme.className}` : ''}`} style={{ width: 1080, height: 1080 }}>
        {theme ? <theme.Background data={data} width={1080} height={1080} /> : loud ? (
          <LoudBackground top="blue" bottom="yellow" split={[78, 22]} burst={[860, 330]} burstBelow />
        ) : (
          <>
            <div className="ch-bg" />
            <div className="dmv-halftone" />
          </>
        )}

        <div className="ch-banner">
          <div className="dmv-title ch-label">Champion</div>
        </div>
        <Logo size={170} style={{ position: 'absolute', top: 36, right: 40 }} />

        {photo && winner && (
          <div className="ch-photo dmv-panel">
            <PlayerPhoto player={winner} />
          </div>
        )}

        <div className="ch-name">
          <FitText className="dmv-title" text={name} max={photo ? 84 : 104} width={photo ? 550 : 780} />
          <div className="ch-subrow">
            <div className="ch-sub">{[winner?.record, winner?.social].filter(Boolean).join('  ·  ')}</div>
            {data.cp && <CpBadge points={data.cp(1)} className="ch-cp" />}
          </div>
        </div>

        <div className="ch-team">
          {(winner?.team ?? []).map((m, i) => (
            <div key={i} className="ch-card dmv-panel">
              <MonSprite mon={m} size={photo ? 112 : 190} showTera={data.format.tera} />
              <div className="ch-mon-name">{getPokemon(displayPokemon(m, showMegas))?.name ?? ''}</div>
              <div className="ch-item-name">{getItem(m.item)?.name ?? ''}</div>
            </div>
          ))}
        </div>

        <footer className="ch-footer">
          <span className="ch-event">{data.tournament.name}</span>
          <span>{eventFacts(data).join('  ·  ')}</span>
        </footer>
      </div>
    )
  },
})

const Champion = makeChampion()
export default Champion
export const ChampionLoud = makeChampion(true)
export const ChampionPhoto = makeChampion(false, undefined, true)
export const ChampionLoudPhoto = makeChampion(true, undefined, true)
