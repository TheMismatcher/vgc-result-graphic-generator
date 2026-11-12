import { DAY2_EVENTS, DAY2_EVENT_KINDS, day2ExampleKey, day2LabelKey, kindFor } from '../templates/day2/events'
import { mosaicDefaults } from '../templates/day2/mosaic'
import { useMemo, useState } from 'react'
import type { AppState, Day2, Player } from '../types'
import { DAY2_TEMPLATES } from '../templates/registry'
import { eventInfo } from '../lib/event'
import { newPlayer } from '../lib/state'
import { loadResults, parseResultsLink, type ResultEntry } from '../lib/results'
import { fetchRecord, fetchRoster, fetchTeam, fullName, rk9Id, type RosterEntry } from '../lib/rk9'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input, Select } from '../components/ui'
import { useDialog } from '../components/Dialog'
import { rich } from '../components/rich'
import { t } from '../i18n'

export function Day2Page({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const day2 = state.day2
  const kind = kindFor(day2.kind)
  const format = eventInfo(state.tournament).format
  const setDay2 = (patch: Partial<Day2>) => setState((s) => ({ ...s, day2: { ...s.day2, ...patch } }))
  const setPlayers = (fn: (ps: Player[]) => Player[]) => setState((s) => ({ ...s, day2: { ...s.day2, players: fn(s.day2.players) } }))

  // RK9 roster, loaded on demand (kept in memory only; it's large).
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [rosterId, setRosterId] = useState('') // the tournament the roster was loaded from
  const [division, setDivision] = useState('Masters')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const dialog = useDialog()

  // Results link (Limitless or Pokédata): the whole standings load at once, then players are added from the list.
  const [resultsUrl, setResultsUrl] = useState('')
  const [results, setResults] = useState<ResultEntry[]>([])
  const [resultsQuery, setResultsQuery] = useState('')
  const [resultsMessage, setResultsMessage] = useState('')
  const [resultsBusy, setResultsBusy] = useState(false)

  const loadFromLink = async () => {
    const link = parseResultsLink(resultsUrl)
    if (!link) return setResultsMessage(t('ui.day2.pasteLink'))
    setResultsBusy(true)
    setResultsMessage('')
    try {
      const { event, entries } = await loadResults(link)
      setResults(entries)
      if (event && !day2.event.trim()) setDay2({ event })
      setResultsMessage(link.source === 'pokedata' ? t('ui.day2.loadedResultsDivision', { count: entries.length, division: link.division }) : t('ui.day2.loadedResults', { count: entries.length }))
    } catch (e) {
      setResults([])
      setResultsMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setResultsBusy(false)
    }
  }

  const resultMatches = useMemo(() => {
    const q = resultsQuery.trim().toLowerCase()
    return (q.length < 2 ? results.slice(0, 8) : results.filter((r) => r.name.toLowerCase().includes(q))).slice(0, 12)
  }, [results, resultsQuery])

  const addResult = async (entry: ResultEntry) => {
    if (day2.players.some((p) => p.name.trim().toLowerCase() === entry.name.toLowerCase())) {
      if (!(await dialog.confirm(t('ui.day2.alreadyInList', { name: entry.name }), t('ui.day2.addAgain')))) return
    }
    const player: Player = { ...newPlayer(), name: entry.name, record: entry.record, team: entry.team }
    setState((s) => ({ ...s, day2: { ...s.day2, players: [...s.day2.players, player], selected: player.uid } }))
    const notes = [entry.record ? t('ui.day2.added', { name: player.name, record: entry.record }) : t('ui.day2.addedNoRecord', { name: player.name })]
    if (!entry.hasTeam) notes.push(t('ui.day2.teamNotPublic'))
    if (entry.unmatched.length) notes.push(t('ui.day2.unmatched', { names: entry.unmatched.join(', ') }))
    setResultsMessage(notes.join(' '))
    setResultsQuery('')
  }

  const loadRoster = async () => {
    const id = rk9Id(day2.rk9)
    if (!id) return setMessage(t('ui.day2.pasteRk9'))
    setBusy('roster')
    setMessage('')
    try {
      const { players } = await fetchRoster(id)
      setRoster(players)
      setRosterId(id)
      setMessage(t('ui.day2.loadedRoster', { count: players.length }))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return roster
      .filter((p) => p.division === division && `${fullName(p)} ${p.trainer}`.toLowerCase().includes(q))
      .slice(0, 12)
  }, [roster, query, division])

  const add = async (entry: RosterEntry) => {
    // Use the tournament the roster came from, even if the link box was edited or cleared since.
    const id = rosterId
    if (!id) return setMessage(t('ui.day2.reloadRoster'))
    const name = fullName(entry)
    if (day2.players.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) {
      if (!(await dialog.confirm(t('ui.day2.alreadyInList', { name }), t('ui.day2.addAgain')))) return
    }
    setBusy(fullName(entry))
    setMessage('')
    try {
      const [teamResult, record] = await Promise.all([
        entry.teamUrl ? fetchTeam(entry.teamUrl) : Promise.resolve({ team: newPlayer().team, unmatched: [] as string[] }),
        fetchRecord(id, entry).catch(() => ''),
      ])
      const player: Player = { ...newPlayer(), name: fullName(entry), record, team: teamResult.team }
      setState((s) => ({ ...s, day2: { ...s.day2, players: [...s.day2.players, player], selected: player.uid } }))
      const notes = [record ? t('ui.day2.added', { name: player.name, record }) : t('ui.day2.addedNoRecord', { name: player.name })]
      if (!entry.teamUrl) notes.push(t('ui.day2.teamNotPublicYet'))
      if (!record) notes.push(t('ui.day2.noRecord'))
      if (teamResult.unmatched.length) notes.push(t('ui.day2.unmatched', { names: teamResult.unmatched.join(', ') }))
      setMessage(notes.join(' '))
      setQuery('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const selected = day2.players.find((p) => p.uid === day2.selected) ?? day2.players[0]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.day2.resultsHeading')}</h2>
          <p className="text-sm text-slate-600">
            {rich(t('ui.day2.resultsIntro'))}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('ui.day2.resultsLinkLabel')} className="min-w-0 flex-1">
              <Input placeholder={t('ui.day2.resultsLinkPlaceholder')} value={resultsUrl} onChange={(e) => setResultsUrl(e.target.value)} />
            </Field>
            <Button variant="primary" disabled={resultsBusy} onClick={loadFromLink}>{resultsBusy ? t('ui.common.loading') : t('ui.day2.loadStandings')}</Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              <Input placeholder={t('ui.day2.searchResults')} value={resultsQuery} onChange={(e) => setResultsQuery(e.target.value)} />
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {resultMatches.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold text-slate-900">{r.name}</span>
                      <span className="text-slate-500">{t(r.hasTeam ? 'ui.day2.resultMeta' : 'ui.day2.resultMetaNoTeam', { place: r.placing ? t('ui.day2.placing', { n: r.placing }) : t('ui.day2.dropped'), record: r.record })}</span>
                    </span>
                    <Button onClick={() => addResult(r)}>{t('ui.day2.add')}</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resultsMessage && <p className="text-sm text-slate-700">{resultsMessage}</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.day2.rk9Heading')}</h2>
          <p className="text-sm text-slate-600">
            {t('ui.day2.rk9Intro')}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('ui.day2.rk9LinkLabel')} className="min-w-0 flex-1">
              <Input placeholder={t('ui.day2.rk9LinkPlaceholder')} value={day2.rk9} onChange={(e) => setDay2({ rk9: e.target.value })} />
            </Field>
            <Button variant="primary" disabled={busy === 'roster'} onClick={loadRoster}>{busy === 'roster' ? t('ui.common.loading') : t('ui.day2.loadRoster')}</Button>
          </div>
          {roster.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder={t('ui.day2.searchRoster')} value={query} onChange={(e) => setQuery(e.target.value)} />
                <Select className="w-32" value={division} onChange={(e) => setDivision(e.target.value)} aria-label={t('ui.day2.divisionLabel')}>
                  <option value="Masters">{t('ui.day2.division.masters')}</option>
                  <option value="Seniors">{t('ui.day2.division.seniors')}</option>
                  <option value="Juniors">{t('ui.day2.division.juniors')}</option>
                </Select>
              </div>
              {matches.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {matches.map((p) => (
                    <li key={`${fullName(p)}-${p.teamUrl}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        <span className="font-semibold text-slate-900">{fullName(p)}</span>
                        <span className="text-slate-500"> · {p.trainer} · {p.country}</span>
                      </span>
                      <Button disabled={!!busy} onClick={() => add(p)}>{busy === fullName(p) ? t('ui.day2.adding') : t('ui.day2.add')}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {message && <p className="text-sm text-slate-700">{message}</p>}
        </Card>

        <Card className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('ui.day2.eventType')}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label={t('ui.day2.eventType')}>
              {DAY2_EVENT_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setDay2({ kind: k, hue: undefined, colors: undefined })}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-center text-xs font-semibold leading-tight transition sm:text-sm ${kind === k ? 'border-[#b3121b] bg-red-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
                >
                  <img src={DAY2_EVENTS[k].logo} alt="" className="h-9 w-9 shrink-0 object-contain" />
                  <span className="w-full">{t(day2LabelKey(k))}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('ui.day2.eventTypeHint')}</p>
          </div>
          <Field label={t('ui.day2.eventTopBar')}>
            <Input placeholder={t(day2ExampleKey(kind))} value={day2.event} onChange={(e) => setDay2({ event: e.target.value })} />
          </Field>
          <Field label={t('ui.day2.captionLabel')}>
            <Input placeholder={t('ui.day2.captionPlaceholder')} value={day2.caption} onChange={(e) => setDay2({ caption: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="d2-hue" className="text-sm font-medium text-slate-700">{t('ui.day2.backgroundColor')}</label>
              <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setDay2({ hue: undefined })}>
                {t('ui.day2.resetColor', { event: t(day2LabelKey(kind)) })}
              </button>
            </div>
            <input
              id="d2-hue"
              type="range"
              min={0}
              max={359}
              value={day2.hue ?? DAY2_EVENTS[kind].hue}
              onChange={(e) => setDay2({ hue: Number(e.target.value) })}
              className="h-3 w-full cursor-pointer appearance-none rounded-full"
              style={{ background: 'linear-gradient(to right, hsl(0 50% 50%), hsl(60 50% 50%), hsl(120 50% 50%), hsl(180 50% 50%), hsl(240 50% 50%), hsl(300 50% 50%), hsl(359 50% 50%))' }}
            />
            <p className="mt-1 text-xs text-slate-500">{t('ui.day2.backgroundHint')}</p>
          </div>
          {state.templates.day2.includes('mosaic') && (
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('ui.day2.mosaicColors')}</span>
                <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setDay2({ colors: undefined })}>
                  {t('ui.day2.useBackground')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['main', 'second'] as const).map((k) => {
                  const fallback = { main: mosaicDefaults(day2.hue ?? DAY2_EVENTS[kind].hue).main, second: mosaicDefaults(day2.hue ?? DAY2_EVENTS[kind].hue).second }
                  const value = day2.colors?.[k] ?? fallback[k]
                  return (
                    <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setDay2({ colors: { ...(day2.colors ?? fallback), [k]: e.target.value } })}
                        className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                      />
                      {k === 'main' ? t('ui.day2.gradientStart') : t('ui.day2.gradientEnd')}
                    </label>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('ui.day2.gradientHint')}</p>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.day2.playersHeading')}</h2>
          <span className="text-sm text-slate-500">{t('ui.day2.onePerPlayer')}</span>
        </div>
        {day2.players.map((p, i) => (
          <PlayerEditor
            key={p.uid}
            player={p}
            label={t('ui.day2.playerBadge', { n: i + 1 })}
            format={format}
            defaultOpen={false}
            isFirst={i === 0}
            isLast={i === day2.players.length - 1}
            onChange={(np) => setPlayers((ps) => ps.map((x) => (x.uid === p.uid ? np : x)))}
            onMove={(dir) =>
              setPlayers((ps) => {
                const next = ps.slice()
                ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
                return next
              })
            }
            onRemove={() => setPlayers((ps) => ps.filter((x) => x.uid !== p.uid))}
          />
        ))}
        <Button
          className="w-full py-3"
          onClick={() => {
            const player = newPlayer()
            setState((s) => ({ ...s, day2: { ...s.day2, players: [...s.day2.players, player], selected: player.uid } }))
          }}
        >
          {t('ui.day2.addByHand')}
        </Button>
      </div>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        {day2.players.length > 1 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ui.day2.previewPlayer')}>
            {day2.players.map((p) => (
              <button
                key={p.uid}
                type="button"
                role="radio"
                aria-checked={p.uid === selected?.uid}
                onClick={() => setDay2({ selected: p.uid })}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${p.uid === selected?.uid ? 'border-[#b3121b] bg-[#b3121b] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {p.name || t('ui.day2.unnamed')}
              </button>
            ))}
          </div>
        )}
        {selected ? (
          <Preview
            templates={DAY2_TEMPLATES}
            selectedId={state.templates.day2}
            onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, day2: id } }))}
            filenameBase={`${day2.event} ${selected.name}`}
            render={(t) => <t.Component data={{ event: day2.event, caption: day2.caption, player: selected, format, hue: day2.hue, colors: day2.colors, kind }} />}
          />
        ) : (
          <Card>
            <p className="text-sm text-slate-600">{t('ui.day2.addPlayerHint')}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
