import { useState } from 'react'
import type { AppState, UsageEntry } from '../types'
import { importLimitlessUsage, limitlessId } from '../lib/limitless'
import { USAGE_TEMPLATES } from '../templates/registry'
import { POKEMON, sprites } from '../data/dex'
import { eventInfo } from '../lib/event'
import { percent, usageFromPlayers } from '../lib/usage'
import { Combobox, type Option } from '../components/Combobox'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input } from '../components/ui'

const POKEMON_OPTIONS: Option[] = POKEMON.map((p) => ({ id: p.id, label: p.name, icon: sprites.icon(p.id) }))

export function UsagePage({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const event = eventInfo(state.tournament)
  const { entries, totalTeams, countTop } = state.usage
  const setUsage = (patch: Partial<AppState['usage']>) => setState((s) => ({ ...s, usage: { ...s.usage, ...patch } }))
  const setEntries = (fn: (e: UsageEntry[]) => UsageEntry[]) => setState((s) => ({ ...s, usage: { ...s.usage, entries: fn(s.usage.entries) } }))
  const total = Number(totalTeams) || 0

  const calculate = () => {
    const pool = state.players.slice(0, Number(countTop) || state.players.length).filter((p) => p.team.some((m) => m.pokemon))
    setUsage({ entries: usageFromPlayers(pool), totalTeams: pool.length })
  }

  const sorted = entries.filter((e) => e.pokemon).slice().sort((a, b) => b.count - a.count)

  const [link, setLink] = useState('')
  const [limitlessTop, setLimitlessTop] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const fromLimitless = async () => {
    const id = limitlessId(link)
    if (!id) return setMessage('Paste a Limitless tournament link, e.g. https://play.limitlesstcg.com/tournament/…')
    setBusy(true)
    setMessage('')
    try {
      const result = await importLimitlessUsage(id, limitlessTop || null)
      setUsage({ entries: result.entries, totalTeams: result.totalTeams })
      setMessage(`Counted ${result.totalTeams} teams.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">From Limitless</h2>
          <p className="text-sm text-slate-600">Counts every public team sheet in the tournament (or just the top N).</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Tournament link" className="min-w-0 flex-1">
              <Input placeholder="https://play.limitlesstcg.com/tournament/…" value={link} onChange={(e) => setLink(e.target.value)} />
            </Field>
            <Field label="Count top" className="w-24">
              <Input type="number" min={1} placeholder="All" value={limitlessTop} onChange={(e) => setLimitlessTop(e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
            <Button variant="primary" disabled={busy} onClick={fromLimitless}>{busy ? 'Counting…' : 'Import usage'}</Button>
          </div>
          {message && <p className="text-sm text-slate-700">{message}</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Calculate from standings</h2>
          <p className="text-sm text-slate-600">
            Counts the teams entered on the Standings tab. You have {state.players.length} player{state.players.length === 1 ? '' : 's'} entered.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Count top" className="w-32">
              <Input type="number" min={1} placeholder="All" value={countTop} onChange={(e) => setUsage({ countTop: e.target.value === '' ? '' : Number(e.target.value) })} />
            </Field>
            <Button variant="primary" onClick={calculate}>Calculate usage</Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Usage list</h2>
            <Field label="Teams counted" className="w-36">
              <Input type="number" min={0} value={totalTeams} onChange={(e) => setUsage({ totalTeams: e.target.value === '' ? '' : Number(e.target.value) })} />
            </Field>
          </div>
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Combobox options={POKEMON_OPTIONS} value={e.pokemon} placeholder="Pokémon" pixelated onChange={(id) => setEntries((es) => es.map((x, j) => (j === i ? { ...x, pokemon: id } : x)))} />
              </div>
              <Input className="w-20" type="number" min={0} aria-label="Count" value={e.count} onChange={(ev) => setEntries((es) => es.map((x, j) => (j === i ? { ...x, count: Number(ev.target.value) } : x)))} />
              <span className="w-14 text-right text-sm tabular-nums text-slate-500">{percent(e.count, total)}%</span>
              <Button variant="ghost" aria-label="Remove" onClick={() => setEntries((es) => es.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
          <Button className="w-full" onClick={() => setEntries((es) => [...es, { pokemon: '', count: 1 }])}>+ Add Pokémon</Button>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Preview
          templates={USAGE_TEMPLATES}
          selectedId={state.templates.usage}
          onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, usage: id } }))}
          filenameBase={`${state.tournament.name} usage`}
          render={(t) => (
            <t.Component
              data={{
                ...event,
                totalTeams: total,
                entries: sorted.slice(0, t.maxEntries).map((e) => ({ ...e, percent: percent(e.count, total) })),
              }}
            />
          )}
        />
      </div>
    </div>
  )
}
