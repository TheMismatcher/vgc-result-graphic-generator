import { useState } from 'react'
import type { AppState } from '../types'
import { importLimitless, limitlessId } from '../lib/limitless'
import { Button, Card, Field, Input } from './ui'
import { useDialog } from './Dialog'

export function LimitlessImport({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
  const [link, setLink] = useState('')
  const [top, setTop] = useState(8)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dialog = useDialog()

  const run = async () => {
    const id = limitlessId(link)
    if (!id) return setError('Paste a Limitless tournament link, e.g. https://play.limitlesstcg.com/tournament/…')
    if (!(await dialog.confirm('Replace the current tournament details, standings, bracket, and usage with this Limitless tournament?', 'Import'))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await importLimitless(id, top)
      setState((s) => ({ ...s, tournament: { ...s.tournament, ...result.tournament }, players: result.players, bracket: result.bracket, usage: { ...s.usage, ...result.usage, countTop: '' } }))
      const notes = [`Imported the top ${result.players.length}${result.bracket.size ? `, the top ${result.bracket.size} bracket,` : ''} and usage from all ${result.usage.totalTeams} teams.`]
      if (result.missingTeams) notes.push(`${result.missingTeams} player${result.missingTeams === 1 ? ' has' : 's have'} no public team sheet; add those teams by hand.`)
      if (result.unmatched.length) notes.push(`Couldn't match: ${result.unmatched.join(', ')}.`)
      setMessage(notes.join(' '))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">Import from Limitless</h2>
      <p className="text-sm text-slate-600">Pulls the tournament name, date, format, player count, final standings, records, teams, top cut bracket, and usage stats for the whole field.</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Tournament link" className="min-w-0 flex-1">
          <Input placeholder="https://play.limitlesstcg.com/tournament/…" value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label="Top" className="w-20">
          <Input type="number" min={1} max={64} value={top} onChange={(e) => setTop(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
        <Button variant="primary" disabled={busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</Button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </Card>
  )
}
