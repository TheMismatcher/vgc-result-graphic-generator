// Upload a team list (PDF, screenshot, or photo of the paper form), review what was read, then use it.

import { useState } from 'react'
import type { Mon } from '../types'
import { ITEMS, POKEMON, getPokemon, sprites } from '../data/dex'
import { readTeamSheet, type SheetMon, type TeamSheet } from '../lib/teamSheet'
import { Combobox, type Option } from './Combobox'
import { Button } from './ui'

const POKEMON_OPTIONS: Option[] = POKEMON.map((p) => ({ id: p.id, label: p.name, icon: sprites.icon(p.id) }))
const ITEM_OPTIONS: Option[] = ITEMS.map((i) => ({ id: i.id, label: i.name, icon: sprites.item(i.id) || undefined }))

export function TeamSheetImport({ onDone, onCancel }: { onDone: (team: Mon[], playerName: string) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState<TeamSheet | null>(null)

  const scan = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setSheet(null)
    try {
      setSheet(await readTeamSheet(file, setBusy))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const rows = sheet?.mons
  const update = (i: number, patch: Partial<SheetMon>) =>
    setSheet((s) => s && { ...s, mons: s.mons.map((r, j) => (j === i ? { ...r, ...patch, confident: true, note: undefined } : r)) })
  const unsure = rows ? unsureCount(rows) : 0

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm text-slate-700">
        Upload the player’s <strong>Pokémon Video Game Team List</strong>: the PDF, a screenshot of it, or a photo of the paper sheet (printed or handwritten). Regionals / International team sheets (the page with every language) work too. It’s read in your browser and not uploaded anywhere.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#b3121b] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f0e15] focus-within:ring-2 focus-within:ring-blue-300">
          {sheet ? 'Choose another team list' : 'Choose team list'}
          <input type="file" accept="image/*,.heic,.heif,application/pdf,.pdf" className="sr-only" disabled={!!busy} onChange={(e) => { scan(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        {busy && <span className="text-sm text-slate-600" role="status">{busy}</span>}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {sheet && rows && (
        <>
          <p className="text-sm text-slate-700">
            {sheet.player && <>Player name on the sheet: <strong>{sheet.player}</strong>. </>}
            {unsure ? `Check the ${unsure} marked “?” below, then use the team.` : sheet.exact ? 'Read all six from the PDF.' : 'Read all six. Check them over, then use the team.'}
          </p>
          <SheetReview mons={rows} onChange={update} />
          <Button variant="primary" onClick={() => onDone(toTeam(rows), sheet.player)}>Use this team</Button>
        </>
      )}
    </div>
  )
}

export const unsureCount = (mons: SheetMon[]) => mons.filter((r) => !r.confident || !r.pokemon).length

/** The six slots read from a team list, each correctable, with what was written and why it's unsure. */
export function SheetReview({ mons, onChange }: { mons: SheetMon[]; onChange: (i: number, patch: Partial<SheetMon>) => void }) {
  return (
    <ul className="space-y-2">
      {mons.map((r, i) => (
        <li key={i} className={`rounded-lg border bg-white p-2 ${r.confident && r.pokemon ? 'border-slate-200' : 'border-amber-400'}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">
              #{i + 1} Written: “{r.written || '?'}”{r.itemWritten && ` @ “${r.itemWritten}”`}
            </span>
            {(!r.confident || !r.pokemon) && <span className="shrink-0 font-semibold text-amber-700">? check</span>}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Combobox options={POKEMON_OPTIONS} value={r.pokemon} placeholder="Pokémon" pixelated onChange={(id) => onChange(i, { pokemon: id })} />
            <Combobox options={ITEM_OPTIONS} value={r.item} placeholder="Item" onChange={(id) => onChange(i, { item: id })} />
          </div>
          {r.note && <div className="mt-1 text-xs font-medium text-amber-700">{r.note}</div>}
          {r.alternatives.length > 0 && (!r.confident || !r.pokemon) && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              Or:
              {r.alternatives.map((id) => (
                <button key={id} type="button" className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-100" onClick={() => onChange(i, { pokemon: id })}>
                  {getPokemon(id)?.name ?? id}
                </button>
              ))}
            </div>
          )}
          {(r.ability || r.moves.length > 0) && (
            <div className="mt-1 text-xs text-slate-500">Checked against: {[r.ability, ...r.moves].filter(Boolean).join(', ')}</div>
          )}
        </li>
      ))}
    </ul>
  )
}

export const toTeam = (mons: SheetMon[]): Mon[] => mons.map((r) => ({ pokemon: r.pokemon, item: r.item, tera: '' }))
