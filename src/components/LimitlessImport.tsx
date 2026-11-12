import { useState } from 'react'
import type { AppState } from '../types'
import { importLimitless, limitlessId } from '../lib/limitless'
import { Button, Field, Input } from './ui'
import { useDialog } from './Dialog'
import { t } from '../i18n'

export function LimitlessImport({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
  const [link, setLink] = useState('')
  const [top, setTop] = useState(8)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dialog = useDialog()

  const run = async () => {
    const id = limitlessId(link)
    if (!id) return setError(t('ui.import.limitless.pasteLink'))
    if (!(await dialog.confirm(t('ui.import.limitless.confirm'), t('ui.common.import')))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await importLimitless(id, top)
      setState((s) => ({ ...s, tournament: { ...s.tournament, ...result.tournament }, players: result.players, bracket: result.bracket, usage: { ...s.usage, ...result.usage, countTop: '' } }))
      const notes = [result.bracket.size
        ? t('ui.import.limitless.doneBracket', { count: result.players.length, size: result.bracket.size, teams: result.usage.totalTeams })
        : t('ui.import.limitless.done', { count: result.players.length, teams: result.usage.totalTeams })]
      if (result.missingTeams) notes.push(t('ui.import.limitless.missingTeams', { count: result.missingTeams }))
      if (result.unmatched.length) notes.push(t('ui.import.limitless.unmatched', { names: result.unmatched.join(', ') }))
      setMessage(notes.join(' '))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{t('ui.import.limitless.intro')}</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t('ui.import.limitless.link')} className="min-w-0 flex-1">
          <Input placeholder={t('ui.import.limitless.linkPlaceholder')} value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label={t('ui.common.top')} className="w-20">
          <Input type="number" min={1} max={64} value={top} onChange={(e) => setTop(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
        <Button variant="primary" disabled={busy} onClick={run}>{busy ? t('ui.import.limitless.importing') : t('ui.common.import')}</Button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </div>
  )
}
