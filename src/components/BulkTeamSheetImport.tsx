// Import many team lists at once (photos, screenshots, PDFs, or one PDF with a page per player),
// match each to a player by the name on the sheet, review, then fill in all the teams.

import { useState } from 'react'
import type { Player } from '../types'
import { getPokemon, sprites } from '../data/dex'
import { newPlayer } from '../lib/state'
import { playerNameMatch, readTeamSheets, type SheetMon, type TeamSheet } from '../lib/teamSheet'
import { SheetReview, toTeam, unsureCount } from './TeamSheetImport'
import { Button, Select } from './ui'

const NEW = '__new__'
const SKIP = ''

interface Entry {
  id: string
  source: string // file name (+ page)
  sheet: TeamSheet
  target: string // player uid, NEW, or SKIP
  open: boolean
}

/** Best unclaimed player for each sheet, best matches first. */
function assign(entries: Entry[], players: Player[], keepTargets = false): Entry[] {
  const taken = new Set(keepTargets ? entries.map((e) => e.target).filter((t) => t && t !== NEW) : [])
  const pairs: { e: number; uid: string; score: number }[] = []
  entries.forEach((en, e) => {
    if (keepTargets && en.target) return
    for (const p of players) {
      const score = playerNameMatch(en.sheet.player, p.name)
      if (score >= 0.6) pairs.push({ e, uid: p.uid, score })
    }
  })
  pairs.sort((a, b) => b.score - a.score)
  const out = entries.map((en) => ({ ...en, target: keepTargets ? en.target : SKIP }))
  const done = new Set<number>()
  for (const { e, uid } of pairs) {
    if (done.has(e) || taken.has(uid)) continue
    out[e].target = uid
    done.add(e)
    taken.add(uid)
  }
  // No match: add as a new player when the name was read exactly (a PDF); a name read from a
  // picture may be garbled (handwriting), so let the user choose.
  for (const [e, en] of out.entries()) if (!done.has(e) && !en.target && en.sheet.player && en.sheet.exact) en.target = NEW
  return out
}

export function BulkTeamSheetImport({ players, onApply, onCancel }: { players: Player[]; onApply: (players: Player[]) => void; onCancel: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const read = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    const found: Entry[] = []
    const failed: string[] = []
    for (const [i, file] of list.entries()) {
      const prefix = list.length > 1 ? `File ${i + 1} of ${list.length} (${file.name}): ` : ''
      setBusy(prefix + 'starting…')
      try {
        const sheets = await readTeamSheets(file, (m) => setBusy(prefix + m))
        sheets.forEach((sheet, j) =>
          found.push({ id: crypto.randomUUID(), source: sheets.length > 1 ? `${file.name} · sheet ${j + 1}` : file.name, sheet, target: SKIP, open: false }),
        )
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setBusy('')
    setErrors((es) => [...es, ...failed])
    setEntries((es) => assign([...es, ...found], players, true))
  }

  const patch = (id: string, p: Partial<Entry>) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)))
  const updateMon = (id: string, i: number, p: Partial<SheetMon>) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, sheet: { ...e.sheet, mons: e.sheet.mons.map((m, j) => (j === i ? { ...m, ...p, confident: true, note: undefined } : m)) } } : e)))

  const usedBy = (uid: string, except: string) => entries.find((e) => e.id !== except && e.target === uid)
  const toApply = entries.filter((e) => e.target)
  const unsureTotal = toApply.reduce((n, e) => n + unsureCount(e.sheet.mons), 0)

  const apply = () => {
    const byUid = new Map(toApply.filter((e) => e.target !== NEW).map((e) => [e.target, e]))
    const next = players.map((p) => {
      const e = byUid.get(p.uid)
      return e ? { ...p, team: toTeam(e.sheet.mons), name: p.name || e.sheet.player } : p
    })
    for (const e of toApply.filter((e) => e.target === NEW)) next.push({ ...newPlayer(), name: e.sheet.player, team: toTeam(e.sheet.mons) })
    onApply(next)
  }

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm text-slate-700">
        Add everyone’s <strong>team lists</strong> at once: photos, scans, screenshots, or PDFs (a PDF can hold a page per player), of the paper form or of Regionals / International team sheets. Each one is matched to a player by the name on the sheet. Everything is read in your browser and not uploaded.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#b3121b] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f0e15] focus-within:ring-2 focus-within:ring-blue-300">
          {entries.length ? 'Add more team lists' : 'Choose team lists'}
          <input type="file" multiple accept="image/*,.heic,.heif,application/pdf,.pdf" className="sr-only" disabled={!!busy} onChange={(e) => { read(e.target.files); e.target.value = '' }} />
        </label>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        {busy && <span className="text-sm text-slate-600" role="status">{busy}</span>}
      </div>
      {errors.length > 0 && (
        <ul className="space-y-0.5 text-sm text-red-700">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {entries.length > 0 && (
        <>
          <ul className="space-y-2">
            {entries.map((e) => {
              const unsure = unsureCount(e.sheet.mons)
              const target = players.find((p) => p.uid === e.target)
              const replaces = target?.team.some((m) => m.pokemon)
              return (
                <li key={e.id} className={`rounded-lg border bg-white p-2 ${e.target ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{e.sheet.player ? `“${e.sheet.player}”` : 'No readable name'}</div>
                      <div className="truncate text-xs text-slate-500">{e.source}</div>
                    </div>
                    <Select aria-label="Player for this team list" className="w-auto" value={e.target} onChange={(ev) => patch(e.id, { target: ev.target.value })}>
                      <option value={SKIP}>Don’t import</option>
                      {players.map((p, i) => {
                        const other = usedBy(p.uid, e.id)
                        return (
                          <option key={p.uid} value={p.uid}>
                            {i + 1}. {p.name || 'Unnamed player'}{other ? ' (already chosen)' : ''}
                          </option>
                        )
                      })}
                      <option value={NEW}>+ Add as a new player</option>
                    </Select>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {e.sheet.mons.map((m, i) => (
                      <span key={i} className={`relative rounded-md ${!m.confident || !m.pokemon ? 'bg-amber-100 ring-1 ring-amber-400' : ''}`} title={m.pokemon ? getPokemon(m.pokemon)?.name : `Unread: “${m.written}”`}>
                        {m.pokemon ? <img src={sprites.icon(m.pokemon)} alt={getPokemon(m.pokemon)?.name} className="h-10 w-10" /> : <span className="flex h-10 w-10 items-center justify-center text-amber-700">?</span>}
                        {m.item && sprites.item(m.item) && <img src={sprites.item(m.item)} alt="" className="absolute bottom-0 right-0 h-4 w-4" />}
                      </span>
                    ))}
                    <Button variant="ghost" className="ml-auto" onClick={() => patch(e.id, { open: !e.open })}>
                      {e.open ? 'Done' : unsure ? `Check ${unsure}` : 'Edit'}
                    </Button>
                  </div>
                  {e.target && usedBy(e.target, e.id) && e.target !== NEW && <p className="mt-1 text-xs font-medium text-red-700">Another team list is also going to this player.</p>}
                  {replaces && <p className="mt-1 text-xs text-slate-500">Replaces {target?.name || 'this player'}’s current team.</p>}
                  {e.open && <div className="mt-2"><SheetReview mons={e.sheet.mons} onChange={(i, p) => updateMon(e.id, i, p)} /></div>}
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!toApply.length || !!busy} onClick={apply}>
              Use {toApply.length} team{toApply.length === 1 ? '' : 's'}
            </Button>
            {unsureTotal > 0 && <span className="text-sm text-amber-700">{unsureTotal} Pokémon marked to check</span>}
          </div>
        </>
      )}
    </div>
  )
}
