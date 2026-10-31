// Champion as a real Pokémon TCG card, two eras, each laid out from an official card scan
// (Bulbagarden archives) at the same proportions (63 x 88 mm, 924 x 1290 here):
// - Classic: Base Set (1999) Pikachu 58/102: yellow border, textured type frame, bevelled art window,
//   gold species strip, attacks with energy costs, weakness / resistance / retreat cost, flavour box.
// - Modern: Scarlet & Violet (2023) Sprigatito 013/198: silver border, BASIC tab, HP + type at top right,
//   silver-framed art, silver info strip, attacks, weakness / resistance / retreat bar, regulation mark.
// The champion is the card: their ace's type picks the energy (and frame colour), the team are the attacks
// (energy cost = each Pokémon's types, the held item in the damage column). Energy symbols are the official
// TCG ones (cards/energy/*.png); types come from src/data/types.json (built by `npm run data`).

import type { CSSProperties } from 'react'
import type { Mon } from '../../types'
import type { StandingsData, StandingsTemplate } from '../types'
import { FitText, PlayerPhoto } from '../shared/parts'
import { getItem, getPokemon, sprites } from '../../data/dex'
import { displayPokemon, useDisplay } from '../../lib/display'
import TYPES from '../../data/types.json'
import colorless from './energy/colorless.png'
import darkness from './energy/darkness.png'
import dragon from './energy/dragon.png'
import fairy from './energy/fairy.png'
import fighting from './energy/fighting.png'
import fire from './energy/fire.png'
import grass from './energy/grass.png'
import lightning from './energy/lightning.png'
import metal from './energy/metal.png'
import psychic from './energy/psychic.png'
import water from './energy/water.png'
import '@fontsource/cabin/500.css'
import '@fontsource/cabin/700.css'
import '@fontsource/cabin/700-italic.css'
import './cards.css'

type Energy = 'grass' | 'fire' | 'water' | 'lightning' | 'psychic' | 'fighting' | 'darkness' | 'metal' | 'dragon' | 'fairy' | 'colorless'
type Era = 'classic' | 'modern'

const ICON: Record<Energy, string> = { grass, fire, water, lightning, psychic, fighting, darkness, metal, dragon, fairy, colorless }

// Game type → TCG energy. Base Set had seven energies: Poison / Bug were Grass, Ghost Psychic, Dragon and
// Fairy Colorless (Dark / Steel came in Neo). Scarlet & Violet: Poison is Darkness, Fairy Psychic, Dragon its own.
const SHARED: Record<string, Energy> = {
  Normal: 'colorless', Flying: 'colorless', Fire: 'fire', Water: 'water', Ice: 'water', Electric: 'lightning',
  Grass: 'grass', Bug: 'grass', Fighting: 'fighting', Ground: 'fighting', Rock: 'fighting', Psychic: 'psychic',
  Ghost: 'psychic', Dark: 'darkness', Steel: 'metal',
}
const ERA_TYPES: Record<Era, Record<string, Energy>> = {
  classic: { ...SHARED, Poison: 'grass', Dragon: 'colorless', Fairy: 'colorless' },
  modern: { ...SHARED, Poison: 'darkness', Dragon: 'dragon', Fairy: 'psychic' },
}
// Each energy's usual weakness (and resistance) on cards of that era.
const WEAKNESS: Record<Era, Partial<Record<Energy, Energy>>> = {
  classic: { grass: 'fire', fire: 'water', water: 'lightning', lightning: 'fighting', psychic: 'psychic', fighting: 'psychic', colorless: 'fighting', darkness: 'fighting', metal: 'fire' },
  modern: { grass: 'fire', fire: 'water', water: 'lightning', lightning: 'fighting', psychic: 'darkness', fighting: 'psychic', darkness: 'grass', metal: 'fire', colorless: 'fighting' },
}
const RESISTANCE: Record<Era, Partial<Record<Energy, Energy>>> = {
  classic: { colorless: 'psychic', darkness: 'psychic', metal: 'grass' },
  modern: { metal: 'grass' },
}

const typesOf = (id: string) => (TYPES as Record<string, string[]>)[id] ?? []
/** A Pokémon's energies (duplicates folded: Ice/Water is one Water). */
const energiesOf = (id: string, era: Era) => [...new Set(typesOf(id).map((t) => ERA_TYPES[era][t] ?? 'colorless'))]
/** The card's own energy: the ace's first coloured one (Fire/Flying is Fire), else Colorless. */
const cardEnergy = (id: string, era: Era): Energy => energiesOf(id, era).find((e) => e !== 'colorless') ?? 'colorless'

const Icon = ({ e, size, style }: { e: Energy; size: number; style?: CSSProperties }) => <img className="tc-energy" src={ICON[e]} width={size} height={size} alt={e} style={style} />

const pad = (n: number, len: number) => String(n).padStart(len, '0')
/** Copyright year: the event's year, else this year. */
const yearOf = (data: StandingsData) => /\d{4}/.exec(data.dateLabel)?.[0] ?? String(new Date().getFullYear())

interface CardInfo {
  name: string
  record: string
  social: string
  team: { mon: Mon; id: string; name: string; item: string; itemSrc: string }[]
  ace?: { id: string; name: string }
  energy: Energy
  weak?: Energy
  resist?: Energy
  players: number
  facts: string
}

function useCard(data: StandingsData, era: Era): CardInfo {
  const { showMegas } = useDisplay()
  const w = data.players[0]
  const team = (w?.team ?? [])
    .filter((m) => m.pokemon)
    .map((m) => {
      const id = displayPokemon(m, showMegas)
      return { mon: m, id, name: getPokemon(id)?.name ?? '', item: getItem(m.item)?.name ?? '', itemSrc: m.item ? sprites.item(m.item) : '' }
    })
  const ace = team[0]
  const energy = ace ? cardEnergy(ace.id, era) : 'colorless'
  return {
    name: w?.name || 'Player',
    record: w?.record || '',
    social: w?.social || '',
    team,
    ace: ace && { id: ace.id, name: ace.name },
    energy,
    weak: WEAKNESS[era][energy],
    resist: RESISTANCE[era][energy],
    players: data.playerCount,
    facts: [data.tournament.name, data.typeLabel, data.dateLabel].filter(Boolean).join(' · '),
  }
}

const W = 1080
const H = 1350

function Classic({ data, photo }: { data: StandingsData; photo?: boolean }) {
  const c = useCard(data, 'classic')
  const cp = data.cp?.(1)
  return (
    <div className="dmv tcard tc-classic" style={{ width: W, height: H }}>
      <div className={`tc-card en-${c.energy}`}>
        <div className="tc-frame">
          <div className="tc-grain" />
          <div className="cc-stage">Champion</div>
          <FitText className="cc-name" text={c.name} max={56} width={560} min={30} weight={700} italic={false} uppercase={false} family="Cabin" />
          <div className="cc-hp">
            {c.record || '—'}
            <span> REC</span>
            <Icon e={c.energy} size={60} />
          </div>
          <div className="cc-art">
            <div className="cc-art-in">
              {photo && data.players[0] ? <PlayerPhoto player={data.players[0]} className="tc-photo" /> : c.ace && <img className="tc-ace" src={sprites.render(c.ace.id)} alt={c.ace.name} />}
              <div className="cc-holo" />
            </div>
          </div>
          <div className="cc-strip">
            Champion Pokémon. {data.typeLabel || 'Tournament'}
            {c.players ? `, Players: ${c.players}` : ''}
          </div>
          <div className="cc-moves">
            {c.team.map((m, i) => (
              <div key={i} className="cc-move">
                <div className="tc-cost">
                  {energiesOf(m.id, 'classic').map((e) => (
                    <Icon key={e} e={e} size={38} />
                  ))}
                </div>
                <div className="cc-move-text">
                  <b>{m.name}</b>
                  {m.item && <span> Holding {m.item}.</span>}
                </div>
                <img className="tc-move-mon" src={sprites.render(m.id)} alt="" />
                {m.itemSrc ? <img className="tc-move-item" src={m.itemSrc} alt="" /> : <span className="tc-move-item" />}
              </div>
            ))}
          </div>
          <div className="cc-wrr">
            <div>
              <span>weakness</span>
              {c.weak && <Icon e={c.weak} size={38} />}
            </div>
            <div>
              <span>resistance</span>
              {c.resist && <Icon e={c.resist} size={38} />}
            </div>
            <div>
              <span>retreat cost</span>
              <Icon e="colorless" size={38} />
            </div>
          </div>
          <div className="cc-flavor">
            {c.facts || 'Tournament champion'}.{data.formatLabel ? ` ${data.formatLabel}.` : ''}
            {cp ? `  +${cp} CP.` : ''}
            <span className="cc-lv">#1</span>
          </div>
          <div className="cc-foot">
            <span>{c.social ? `Illus. ${c.social}` : ''}</span>
            <span className="cc-copy">©{yearOf(data)} {data.tournament.name || 'VGC'}</span>
            <span className="cc-num">
              1/{c.players || 1} <i>★</i>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Modern({ data, photo }: { data: StandingsData; photo?: boolean }) {
  const c = useCard(data, 'modern')
  const cp = data.cp?.(1)
  const reg = /Regulation\s+([A-Z])/i.exec(data.formatLabel)?.[1]?.toUpperCase() ?? 'G'
  return (
    <div className="dmv tcard tc-modern" style={{ width: W, height: H }}>
      <div className={`tc-card en-${c.energy}`}>
        <div className="tc-frame">
          <div className="tc-grain" />
          <svg className="sv-swoosh" viewBox="0 0 870 140" preserveAspectRatio="none" aria-hidden>
            <path d="M560 0 H870 V140 H690 C640 140 640 70 590 70 H560 Z" />
          </svg>
          <div className="sv-stage">CHAMPION</div>
          <FitText className="sv-name" text={c.name} max={50} width={460} min={28} weight={700} italic={false} uppercase={false} family="Cabin" />
          <div className="sv-hp">
            <small>REC</small>
            <b>{c.record || '—'}</b>
            <Icon e={c.energy} size={60} />
          </div>
          <div className="sv-art">
            {photo && data.players[0] ? <PlayerPhoto player={data.players[0]} className="tc-photo" /> : c.ace && <img className="tc-ace" src={sprites.render(c.ace.id)} alt={c.ace.name} />}
          </div>
          <div className="sv-strip">
            <span>NO. 0001</span>
            <span>Champion of the {data.typeLabel || 'Tournament'}</span>
            {c.players > 0 && <span>Players: {c.players}</span>}
          </div>
          <div className="sv-moves">
            {c.team.map((m, i) => (
              <div key={i} className="sv-move">
                <div className="tc-cost">
                  {energiesOf(m.id, 'modern').map((e) => (
                    <Icon key={e} e={e} size={44} />
                  ))}
                </div>
                <img className="tc-move-mon" src={sprites.render(m.id)} alt="" />
                <div className="sv-move-text">
                  <b>{m.name}</b>
                  {m.item && <span>{m.item}</span>}
                </div>
                {m.itemSrc ? <img className="tc-move-item" src={m.itemSrc} alt="" /> : <span className="tc-move-item" />}
              </div>
            ))}
          </div>
          <div className="sv-wrr">
            <div className="sv-wrr-a">
              <span>weakness</span>
              {c.weak && (
                <>
                  <Icon e={c.weak} size={30} />
                  <b>×2</b>
                </>
              )}
              <i className="sv-bar" />
              <span>resistance</span>
              {c.resist && (
                <>
                  <Icon e={c.resist} size={30} />
                  <b>-30</b>
                </>
              )}
            </div>
            <div className="sv-wrr-b">
              <span>retreat</span>
              <Icon e="colorless" size={30} />
            </div>
          </div>
          <div className="sv-illus">{c.social ? `Illus. ${c.social}` : ''}</div>
          <div className="sv-set">
            <span className="sv-reg">{reg}</span>
            <span className="sv-code">DMV</span>
            <span className="sv-num">
              {pad(1, 3)}/{pad(c.players || 1, 3)} <i>★</i>
            </span>
          </div>
          <div className="sv-flavor">
            {c.facts || 'Tournament champion'}.{data.formatLabel ? ` ${data.formatLabel}.` : ''}
            {cp ? ` +${cp} CP.` : ''}
          </div>
          <div className="sv-copy">©{yearOf(data)} {data.tournament.name || 'VGC'}</div>
        </div>
      </div>
    </div>
  )
}

const base = { kind: 'standings' as const, width: W, height: H, maxPlayers: 1 }

export const TradingCardClassic: StandingsTemplate = {
  ...base,
  id: 'card-classic',
  name: 'Champion (Trading Card Classic)',
  description: 'The champion as a Base Set-era card: yellow border, ace Pokémon in the art window, the team as attacks with energy costs.',
  Component: Classic,
}

export const TradingCardModern: StandingsTemplate = {
  ...base,
  id: 'card-modern',
  name: 'Champion (Trading Card Modern)',
  description: 'The champion as a Scarlet & Violet card: silver border, HP-style record, the team as attacks, regulation mark from the format.',
  Component: Modern,
}

// Photo versions: the champion's photo fills the art window instead of their ace.
export const TradingCardClassicPhoto: StandingsTemplate = {
  ...base,
  id: 'card-classic-photo',
  name: 'Champion (Trading Card Classic Photo)',
  description: 'The Base Set-era card with the champion’s photo in the art window; the team are the attacks.',
  Component: ({ data }) => <Classic data={data} photo />,
}

export const TradingCardModernPhoto: StandingsTemplate = {
  ...base,
  id: 'card-modern-photo',
  name: 'Champion (Trading Card Modern Photo)',
  description: 'The Scarlet & Violet card with the champion’s photo in the art window; the team are the attacks.',
  Component: ({ data }) => <Modern data={data} photo />,
}
