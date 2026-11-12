// Upload a Pokémon Champions team screenshot, review what was read, then use it as the team.

import { useState } from 'react'
import type { Mon } from '../types'
import { ITEMS, POKEMON, getPokemon, sprites } from '../data/dex'
import { scanTeamScreenshot, type ScannedMon } from '../lib/teamScan'
import { Combobox, type Option } from './Combobox'
import { Button } from './ui'
import { rich } from './rich'
import { t } from '../i18n'

const POKEMON_OPTIONS: Option[] = POKEMON.map((p) => ({ id: p.id, label: p.name, icon: sprites.icon(p.id) }))
const ITEM_OPTIONS: Option[] = ITEMS.map((i) => ({ id: i.id, label: i.name, icon: sprites.item(i.id) || undefined }))

export function ScreenshotImport({ onDone, onCancel }: { onDone: (team: Mon[]) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ScannedMon[] | null>(null)

  const scan = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setRows(null)
    try {
      setRows(await scanTeamScreenshot(file, setBusy))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const update = (i: number, patch: Partial<ScannedMon>) => setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch, confident: true } : r)))
  const unsure = rows?.filter((r) => !r.confident || !r.pokemon).length ?? 0

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm text-slate-700">
        {rich(t('ui.import.screenshot.intro'))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#b3121b] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f0e15] focus-within:ring-2 focus-within:ring-blue-300">
          {rows ? t('ui.import.screenshot.chooseAnother') : t('ui.import.screenshot.choose')}
          <input type="file" accept="image/*" className="sr-only" disabled={!!busy} onChange={(e) => { scan(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <Button variant="ghost" onClick={onCancel}>{t('ui.common.cancel')}</Button>
        {busy && <span className="text-sm text-slate-600" role="status">{busy}</span>}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {rows && (
        <>
          <p className="text-sm text-slate-700">
            {unsure ? t('ui.import.teamSheet.checkMarked', { count: unsure }) : t('ui.import.teamSheet.readAllCheck')} {t('ui.import.screenshot.nicknames')}
          </p>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className={`rounded-lg border bg-white p-2 ${r.confident && r.pokemon ? 'border-slate-200' : 'border-amber-400'}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">
                    {r.ability
                      ? t('ui.import.screenshot.nicknameAbility', { n: i + 1, nickname: r.nickname || '?', ability: r.ability })
                      : t('ui.import.screenshot.nickname', { n: i + 1, nickname: r.nickname || '?' })}
                  </span>
                  {(!r.confident || !r.pokemon) && <span className="shrink-0 font-semibold text-amber-700">{t('ui.import.teamSheet.checkFlag')}</span>}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <Combobox options={POKEMON_OPTIONS} value={r.pokemon} placeholder={t('ui.common.pokemon')} pixelated onChange={(id) => update(i, { pokemon: id })} />
                  <Combobox options={ITEM_OPTIONS} value={r.item} placeholder={t('ui.common.item')} onChange={(id) => update(i, { item: id })} />
                </div>
                {r.alternatives.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    {t('ui.import.teamSheet.alternatives')}
                    {r.alternatives.map((id) => (
                      <button key={id} type="button" className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-100" onClick={() => update(i, { pokemon: id })}>
                        {getPokemon(id)?.name ?? id}
                      </button>
                    ))}
                  </div>
                )}
                {r.moves.length > 0 && <div className="mt-1 text-xs text-slate-500">{t('ui.import.screenshot.movesRead', { moves: r.moves.join(', ') })}</div>}
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={() => onDone(rows.map((r) => ({ pokemon: r.pokemon, item: r.item, tera: '' })))}>{t('ui.import.teamSheet.useTeam')}</Button>
        </>
      )}
    </div>
  )
}
