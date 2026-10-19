import { DEFAULT_HUE } from '../templates/day2/clean'
import { useMemo, useState } from 'react'
import type { AppState, Day2, Player } from '../types'
import { DAY2_TEMPLATES } from '../templates/registry'
import { eventInfo } from '../lib/event'
import { newPlayer } from '../lib/state'
import { fetchRecord, fetchRoster, fetchTeam, fullName, rk9Id, type RosterEntry } from '../lib/rk9'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input, Select } from '../components/ui'
import { useDialog } from '../components/Dialog'

export function Day2Page({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const day2 = state.day2
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
          <Field label="Event (top bar)">
            <Input placeholder="e.g. 2027 Louisville Regionals" value={day2.event} onChange={(e) => setDay2({ event: e.target.value })} />
          </Field>
          <Field label="Caption (bar on the photo)">
            <Input placeholder="e.g. DMV TO DAY 2" value={day2.caption} onChange={(e) => setDay2({ caption: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="d2-hue" className="text-sm font-medium text-slate-700">Background colour</label>
              <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setDay2({ hue: undefined })}>
                Reset to red
              </button>
            </div>
            <input
              id="d2-hue"
              type="range"
              min={0}
              max={359}
              value={day2.hue ?? DEFAULT_HUE}
              onChange={(e) => setDay2({ hue: Number(e.target.value) })}
              className="h-3 w-full cursor-pointer appearance-none rounded-full"
              style={{ background: 'linear-gradient(to right, hsl(0 50% 50%), hsl(60 50% 50%), hsl(120 50% 50%), hsl(180 50% 50%), hsl(240 50% 50%), hsl(300 50% 50%), hsl(359 50% 50%))' }}
            />
            <p className="mt-1 text-xs text-slate-500">For the Regional Results template (the artist original keeps its colours).</p>
          </div>
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
            render={(t) => <t.Component data={{ event: day2.event, caption: day2.caption, player: selected, format, hue: day2.hue }} />}
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
