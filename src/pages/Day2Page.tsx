import { DAY2_EVENTS, DAY2_EVENT_KINDS, kindFor } from '../templates/day2/events'
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
    if (!link) return setResultsMessage('Paste a Limitless tournament link (play.limitlesstcg.com/tournament/…) or a Pokédata event link (pokedata.ovh/standingsVGC/…).')
    setResultsBusy(true)
    setResultsMessage('')
    try {
      const { event, entries } = await loadResults(link)
      setResults(entries)
      if (event && !day2.event.trim()) setDay2({ event })
      setResultsMessage(`Loaded ${entries.length} players${link.source === 'pokedata' ? ` (${link.division})` : ''}. Search for a name, or pick from the top of the standings.`)
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
      if (!(await dialog.confirm(`${entry.name} is already in your list. Add them again?`, 'Add again'))) return
    }
    const player: Player = { ...newPlayer(), name: entry.name, record: entry.record, team: entry.team }
    setState((s) => ({ ...s, day2: { ...s.day2, players: [...s.day2.players, player], selected: player.uid } }))
    const notes = [`Added ${player.name}${entry.record ? ` (${entry.record})` : ''}.`]
    if (!entry.hasTeam) notes.push('Their team list isn’t public; add the team by hand.')
    if (entry.unmatched.length) notes.push(`Couldn’t match: ${entry.unmatched.join(', ')}.`)
    setResultsMessage(notes.join(' '))
    setResultsQuery('')
  }

  const loadRoster = async () => {
    const id = rk9Id(day2.rk9)
    if (!id) return setMessage('Paste an RK9 tournament link, e.g. https://rk9.gg/tournament/LO002-…')
    setBusy('roster')
    setMessage('')
    try {
      const { players } = await fetchRoster(id)
      setRoster(players)
      setRosterId(id)
      setMessage(`Loaded ${players.length} players. Search for a name below.`)
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
    if (!id) return setMessage('Load the roster again, then add the player.')
    const name = fullName(entry)
    if (day2.players.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) {
      if (!(await dialog.confirm(`${name} is already in your list. Add them again?`, 'Add again'))) return
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
      const notes = [`Added ${player.name}${record ? ` (${record})` : ''}.`]
      if (!entry.teamUrl) notes.push('Their team list isn’t public yet; add the team by hand.')
      if (!record) notes.push('Couldn’t find their record in the pairings; type it in.')
      if (teamResult.unmatched.length) notes.push(`Couldn’t match: ${teamResult.unmatched.join(', ')}.`)
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Import from a results link</h2>
          <p className="text-sm text-slate-600">
            Paste a <strong>Limitless</strong> tournament link or a <strong>Pokédata</strong> event link (Regionals, Internationals, Worlds), then pick a player. Their record and team come from the standings.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Limitless or Pokédata link" className="min-w-0 flex-1">
              <Input placeholder="https://pokedata.ovh/standingsVGC/…  or  https://play.limitlesstcg.com/tournament/…" value={resultsUrl} onChange={(e) => setResultsUrl(e.target.value)} />
            </Field>
            <Button variant="primary" disabled={resultsBusy} onClick={loadFromLink}>{resultsBusy ? 'Loading…' : 'Load standings'}</Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              <Input placeholder="Search a player name… (or pick from the top 8)" value={resultsQuery} onChange={(e) => setResultsQuery(e.target.value)} />
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {resultMatches.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold text-slate-900">{r.name}</span>
                      <span className="text-slate-500"> · {r.placing ? `#${r.placing}` : 'dropped'} · {r.record}{r.hasTeam ? '' : ' · no team list'}</span>
                    </span>
                    <Button onClick={() => addResult(r)}>Add</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resultsMessage && <p className="text-sm text-slate-700">{resultsMessage}</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Import from RK9</h2>
          <p className="text-sm text-slate-600">
            Paste the event’s RK9 link, load the roster, then search for each player. Their record comes from the pairings and their team from their public team list.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="RK9 tournament link" className="min-w-0 flex-1">
              <Input placeholder="https://rk9.gg/tournament/…" value={day2.rk9} onChange={(e) => setDay2({ rk9: e.target.value })} />
            </Field>
            <Button variant="primary" disabled={busy === 'roster'} onClick={loadRoster}>{busy === 'roster' ? 'Loading…' : 'Load roster'}</Button>
          </div>
          {roster.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Search a player or trainer name…" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Select className="w-32" value={division} onChange={(e) => setDivision(e.target.value)} aria-label="Division">
                  <option>Masters</option>
                  <option>Seniors</option>
                  <option>Juniors</option>
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
                      <Button disabled={!!busy} onClick={() => add(p)}>{busy === fullName(p) ? 'Adding…' : 'Add'}</Button>
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
            <span className="mb-1 block text-sm font-medium text-slate-700">Event type</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Event type">
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
                  <span className="w-full">{DAY2_EVENTS[k].label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Sets the logo (Regionals, Play! Pokémon, Internationals, Special Events or Worlds) and the starting background colour.</p>
          </div>
          <Field label="Event (top bar)">
            <Input placeholder={DAY2_EVENTS[kind].example} value={day2.event} onChange={(e) => setDay2({ event: e.target.value })} />
          </Field>
          <Field label="Caption bar on the photo (optional)">
            <Input placeholder="Leave empty for no caption bar" value={day2.caption} onChange={(e) => setDay2({ caption: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="d2-hue" className="text-sm font-medium text-slate-700">Background colour</label>
              <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setDay2({ hue: undefined })}>
                Reset to {DAY2_EVENTS[kind].label} colour
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
            <p className="mt-1 text-xs text-slate-500">Sets the Event Results background; the Mosaic versions can use two colours below.</p>
          </div>
          {state.templates.day2.includes('mosaic') && (
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Mosaic gradient colours</span>
                <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setDay2({ colors: undefined })}>
                  Use the background colour above
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
                      {k === 'main' ? 'Start (top left)' : 'End (bottom right)'}
                    </label>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">The wall fades from the first colour to the second. Only the Mosaic versions use these.</p>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Players</h2>
          <span className="text-sm text-slate-500">One graphic per player</span>
        </div>
        {day2.players.map((p, i) => (
          <PlayerEditor
            key={p.uid}
            player={p}
            label={`#${i + 1}`}
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
          + Add player by hand
        </Button>
      </div>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        {day2.players.length > 1 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Player to preview">
            {day2.players.map((p) => (
              <button
                key={p.uid}
                type="button"
                role="radio"
                aria-checked={p.uid === selected?.uid}
                onClick={() => setDay2({ selected: p.uid })}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${p.uid === selected?.uid ? 'border-[#b3121b] bg-[#b3121b] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {p.name || 'Unnamed'}
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
            <p className="text-sm text-slate-600">Add a player to see their graphic.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
