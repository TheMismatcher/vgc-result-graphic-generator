// Trading Card: the card's colour (its energy: frame colour, type up top, weakness / resistance). Auto (the
// default) follows the player's lead Pokémon; picking an energy stores it on the player (Player.cardEnergy).
import type { Player } from '../types'
import { ERA_ENERGIES, ICON, autoEnergy, chosenEnergy, type Energy, type Era } from '../templates/cards'
import { useDisplay } from '../lib/display'
import { t } from '../i18n'

const ENERGY_NAME: Record<Exclude<Energy, 'fairy'>, Parameters<typeof t>[0]> = {
  grass: 'term.energy.grass',
  fire: 'term.energy.fire',
  water: 'term.energy.water',
  lightning: 'term.energy.lightning',
  psychic: 'term.energy.psychic',
  fighting: 'term.energy.fighting',
  darkness: 'term.energy.darkness',
  metal: 'term.energy.metal',
  dragon: 'term.energy.dragon',
  colorless: 'term.energy.colorless',
}
const nameOf = (e: Energy) => t(ENERGY_NAME[e === 'fairy' ? 'psychic' : e])

/** `card`: the template's look.card ('classic' = Base Set, 'modern' = Scarlet & Violet). */
export function CardColorField({ player, card, onChange }: { player: Player; card: string; onChange: (cardEnergy: string | undefined) => void }) {
  const era: Era = card === 'modern' ? 'modern' : 'classic'
  const { showMegas } = useDisplay()
  const auto = autoEnergy(player, era, showMegas)
  const chosen = chosenEnergy(player, era)
  const pill = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold ${on ? 'border-[#b3121b] bg-[#b3121b] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.preview.cardColor')}</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('ui.preview.cardColor')}>
        <button type="button" role="radio" aria-checked={!chosen} onClick={() => onChange(undefined)} className={pill(!chosen)}>
          <img src={ICON[auto]} alt="" width={18} height={18} />
          {t('ui.preview.cardColorAuto', { type: nameOf(auto) })}
        </button>
        {ERA_ENERGIES[era].map((e) => (
          <button key={e} type="button" role="radio" aria-checked={chosen === e} title={nameOf(e)} aria-label={nameOf(e)} onClick={() => onChange(e)} className={pill(chosen === e)}>
            <img src={ICON[e]} alt="" width={18} height={18} />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{t('ui.preview.cardColorHint')}</p>
    </div>
  )
}
