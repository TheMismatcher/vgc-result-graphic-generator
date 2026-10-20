// Standings from a photo or screenshot of a TOM standings page, for events where a picture is
// all that gets posted. Read in the browser, then reviewed before use.

import { useState } from 'react'
import type { AppState } from '../types'
import { newPlayer } from '../lib/state'
import { scanStandingsImage, type ScannedStanding } from '../lib/standingsScan'
import { readStandingsHtml, readStandingsPdf, type StandingsDoc } from '../lib/standingsDoc'
import { Button, Field, Input } from './ui'
import { useDialog } from './Dialog'
import { suggestTopCut } from '../lib/topCut'

export function StandingsPhotoImport({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
  const dialog = useDialog()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ScannedStanding[] | null>(null)
  const [tournament, setTournament] = useState('')
  const [top, setTop] = useState(8)
  const [topFrom, setTopFrom] = useState<'records' | 'attendance' | ''>('')
  const [counts, setCounts] = useState<StandingsDoc['counts']>({})

  const scan = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setRows(null)
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const isHtml = file.type === 'text/html' || /\.html?$/i.test(file.name)
      if (isPdf || isHtml) setBusy('Reading the file…')
      const result = isPdf ? await readStandingsPdf(file) : isHtml ? await readStandingsHtml(file) : await scanStandingsImage(file, setBusy)
      // Photos only show one table; PDFs and report files list every division.
      setCounts(isPdf || isHtml ? (result as StandingsDoc).counts : { masters: result.rows.length })
      setRows(result.rows)
      const cut = suggestTopCut(result.rows.map((r) => r.record))
      setTop(Math.min(cut.top, result.rows.length))
      setTopFrom(cut.from)
      setTournament(result.tournament)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const update = (i: number, patch: Partial<ScannedStanding>) => setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch, check: false } : r)))

  const use = async () => {
    if (!rows) return
    if (!(await dialog.confirm(`Replace the current standings with these ${Math.min(top, rows.length)} players?`, 'Use standings'))) return
    setState((s) => {
      // Keep teams and photos for players already entered under the same name.
      const existing = new Map(s.players.map((p) => [p.name.trim().toLowerCase(), p]))
      const players = rows.slice(0, top).map((r) => {
        const old = existing.get(r.name.trim().toLowerCase())
        return { ...(old ?? newPlayer()), name: r.name, record: r.record }
      })
      return {
        ...s,
        tournament: {
          ...s.tournament,
          ...(tournament && { name: tournament }),
          divisions: {
            ...s.tournament.divisions,
            masters: rows.length,
            ...(counts.seniors !== undefined && { seniors: counts.seniors }),
            ...(counts.juniors !== undefined && { juniors: counts.juniors }),
          },
        },
        players,
      }
    })
    setRows(null)
  }

  const flagged = rows?.filter((r) => r.check).length ?? 0

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        For events that only post a picture: upload a photo or screenshot of a TOM <strong>Standings</strong> page (column headers visible). A screenshot works best, but even a photo of the standings on a monitor should work. A <strong>PDF</strong> of the standings page (or TOM’s standings .html report) is read exactly. If several divisions are shown, Masters is used. Everything is read in your browser; check it before using. Teams aren’t on standings pages, so add those separately.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#b3121b] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f0e15] focus-within:ring-2 focus-within:ring-blue-300">
          {rows ? 'Choose another file' : 'Choose photo or PDF'}
          <input type="file" accept="image/*,application/pdf,.pdf,.html,.htm" className="sr-only" disabled={!!busy} onChange={(e) => { scan(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {busy && <span className="text-sm text-slate-600" role="status">{busy}</span>}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {rows && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Read {rows.length} players{tournament && ` from “${tournament}”`}
            {(counts.seniors || counts.juniors) && ` (plus ${counts.seniors ?? 0} Senior, ${counts.juniors ?? 0} Junior)`}. {flagged ? `${flagged} marked “?” may be misread.` : 'Check the names; anything the photo blurred may be misspelled.'}
          </p>
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Name</th>
                  <th className="px-2 py-1.5">Record</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${r.check ? 'bg-amber-50' : ''} ${i >= top ? 'opacity-50' : ''}`}>
                    <td className="px-2 py-1 tabular-nums text-slate-500">
                      {r.place}
                      {r.check && <span className="ml-1 font-semibold text-amber-700">?</span>}
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label={`Name ${r.place}`} className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-300 focus:border-blue-500 focus:outline-none" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label={`Record ${r.place}`} className="w-24 rounded border border-transparent px-1 py-0.5 tabular-nums hover:border-slate-300 focus:border-blue-500 focus:outline-none" value={r.record} placeholder="W-L-T" onChange={(e) => update(i, { record: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Tournament name" className="min-w-0 flex-1">
              <Input value={tournament} onChange={(e) => setTournament(e.target.value)} />
            </Field>
            <Field label="Use top" className="w-24">
              <Input type="number" min={1} max={rows.length} value={top} onChange={(e) => { setTop(Math.max(1, Number(e.target.value) || 1)); setTopFrom('') }} />
            </Field>
            <Button variant="primary" onClick={use}>Use standings</Button>
          </div>
          {topFrom && (
            <p className="text-xs text-slate-500">
              {topFrom === 'records'
                ? `Top ${top}: the players who played top cut games.`
                : `Top ${top}: the official top cut for ${rows.length} players (no top cut games in these standings).`}{' '}
              Change it if your event used a different cut.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
