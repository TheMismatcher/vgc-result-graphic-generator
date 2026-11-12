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
import { rich } from './rich'
import { t } from '../i18n'

export function StandingsPhotoImport({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
  const dialog = useDialog()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ScannedStanding[] | null>(null)
  const [tournament, setTournament] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [top, setTop] = useState(8)
  const [topFrom, setTopFrom] = useState<'records' | 'attendance' | ''>('')
  const [counts, setCounts] = useState<StandingsDoc['counts']>({})

  const scan = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setRows(null)
    setWarnings([])
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const isHtml = file.type === 'text/html' || /\.html?$/i.test(file.name)
      if (isPdf || isHtml) setBusy(t('ui.import.standingsPhoto.reading'))
      const result = isPdf ? await readStandingsPdf(file) : isHtml ? await readStandingsHtml(file) : await scanStandingsImage(file, setBusy)
      // Photos only show one table; PDFs and report files list every division.
      setCounts(isPdf || isHtml ? (result as StandingsDoc).counts : { masters: result.rows.length })
      setRows(result.rows)
      const cut = suggestTopCut(result.rows.map((r) => r.record))
      setTop(Math.min(cut.top, result.rows.length))
      setTopFrom(cut.from)
      setTournament(result.tournament)
      setWarnings(('warnings' in result && result.warnings) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const update = (i: number, patch: Partial<ScannedStanding>) => setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch, check: false } : r)))

  const use = async () => {
    if (!rows) return
    if (!(await dialog.confirm(t('ui.import.standingsPhoto.confirm', { count: Math.min(top, rows.length) }), t('ui.import.standingsPhoto.use')))) return
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
        {rich(t('ui.import.standingsPhoto.intro'))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#b3121b] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8f0e15] focus-within:ring-2 focus-within:ring-blue-300">
          {rows ? t('ui.import.standingsPhoto.chooseAnother') : t('ui.import.standingsPhoto.choose')}
          <input type="file" accept="image/*,application/pdf,.pdf,.html,.htm" className="sr-only" disabled={!!busy} onChange={(e) => { scan(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {busy && <span className="text-sm text-slate-600" role="status">{busy}</span>}
      </div>
      {error && (
        <p className="text-sm text-red-700">
          {error} {t('ui.import.standingsPhoto.notStandings')}
        </p>
      )}

      {rows && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            {t('ui.import.standingsPhoto.summary', {
              count: rows.length,
              from: tournament ? t('ui.import.standingsPhoto.from', { tournament }) : '',
              plus: counts.seniors || counts.juniors ? t('ui.import.standingsPhoto.plus', { seniors: counts.seniors ?? 0, juniors: counts.juniors ?? 0 }) : '',
              check: flagged ? t('ui.import.standingsPhoto.flagged', { count: flagged }) : t('ui.import.standingsPhoto.checkNames'),
            })}
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-lg border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900">
              {warnings.map((w) => <li key={w}>{w}</li>)}
              <li>{t('ui.import.standingsPhoto.compare')}</li>
            </ul>
          )}
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">{t('ui.import.standingsPhoto.colName')}</th>
                  <th className="px-2 py-1.5">{t('ui.import.standingsPhoto.colRecord')}</th>
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
                      <input aria-label={t('ui.import.standingsPhoto.nameLabel', { place: r.place })} className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-300 focus:border-blue-500 focus:outline-none" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label={t('ui.import.standingsPhoto.recordLabel', { place: r.place })} className="w-24 rounded border border-transparent px-1 py-0.5 tabular-nums hover:border-slate-300 focus:border-blue-500 focus:outline-none" value={r.record} placeholder={t('ui.import.standingsPhoto.recordPlaceholder')} onChange={(e) => update(i, { record: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('ui.tournament.name')} className="min-w-0 flex-1">
              <Input value={tournament} onChange={(e) => setTournament(e.target.value)} />
            </Field>
            <Field label={t('ui.import.standingsPhoto.useTop')} className="w-24">
              <Input type="number" min={1} max={rows.length} value={top} onChange={(e) => { setTop(Math.max(1, Number(e.target.value) || 1)); setTopFrom('') }} />
            </Field>
            <Button variant="primary" onClick={use}>{t('ui.import.standingsPhoto.use')}</Button>
          </div>
          {topFrom && (
            <p className="text-xs text-slate-500">
              {topFrom === 'records'
                ? t('ui.import.standingsPhoto.topPlayed', { top })
                : t('ui.import.standingsPhoto.topOfficial', { top, count: rows.length })}{' '}
              {t('ui.import.standingsPhoto.changeCut')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
