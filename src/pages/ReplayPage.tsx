import { useState } from 'react'
import type { AppState, Match, Player } from '../types'
import { MATCH_TEMPLATES } from '../templates/registry'
import { eventInfo } from '../lib/event'
import { newPlayer } from '../lib/state'
import { fetchReplay, findSetGames, replayId, summarize, type ReplayGame } from '../lib/replay'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui'

export function ReplayPage({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const event = eventInfo(state.tournament)
  const { match } = state
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const setMatch = (patch: Partial<Match>) => setState((s) => ({ ...s, match: { ...s.match, ...patch } }))
  const setPlayer = (i: 0 | 1, p: Player) =>
    setState((s) => ({ ...s, match: { ...s.match, players: (i === 0 ? [p, s.match.players[1]] : [s.match.players[0], p]) as [Player, Player] } }))

  const load = async () => {
    const ids = [...new Set(match.links.split(/\s+/).map(replayId).filter((id): id is string => Boolean(id)))]
    if (!ids.length) return setError('Paste a replay link, e.g. https://replay.pokemonshowdown.com/gen9…-123456')
    setBusy(true)
    setError('')
    try {
      setStatus('Loading replay…')
      let games: ReplayGame[] = await Promise.all(ids.map(fetchReplay))
      if (ids.length === 1 && games[0].setId) {
        setStatus('Looking for the other games in this set…')
        games = await findSetGames(games[0])
      }
      games.sort((a, b) => (a.game ?? 0) - (b.game ?? 0))
      const sum = summarize(games)
      setMatch({
        games: games.map((g) => ({ id: g.id, game: g.game, winner: g.winner })),
        players: [0, 1].map((i) => ({ ...newPlayer(), name: sum.names[i], team: sum.teams[i] })) as [Player, Player],
        score: sum.score,
        winner: sum.winner,
        bestOf: sum.bestOf,
        gamesPlayed: sum.gamesPlayed,
      })

      const notes = [`Loaded ${games.length} game${games.length === 1 ? '' : 's'}.`]
      const { bestOf, gamesPlayed, fromScoreboard } = sum
      if (bestOf > 1) {
        const result = `${sum.names[0]} ${sum.score[0]}–${sum.score[1]} ${sum.names[1]}`
        const finished = Math.max(...sum.score) >= Math.ceil(bestOf / 2)
        if (finished) {
          notes.push(`Best-of-${bestOf} set: ${result} in ${gamesPlayed} games${fromScoreboard && games.length < gamesPlayed ? ' (set score read from the last game, so earlier games aren’t needed)' : ''}.`)
        } else {
          notes.push(`Best-of-${bestOf} set so far: ${result} after ${gamesPlayed} game${gamesPlayed === 1 ? '' : 's'}. Paste the final game to get the finished result.`)
        }
      }
      if (!games.some((g) => g.hasTeamSheets)) notes.push("This replay doesn't include team sheets, so items weren't filled in. Add them below.")
      const unmatched = [...new Set(games.flatMap((g) => g.unmatched))]
      if (unmatched.length) notes.push(`Couldn't match: ${unmatched.join(', ')}. Pick those by hand.`)
      setStatus(notes.join(' '))
    } catch (e) {
      setStatus('')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const addToStandings = (p: Player) => {
    setState((s) => ({
      ...s,
      players: [...s.players.filter((x) => x.name || x.team.some((m) => m.pokemon)), { ...p, uid: crypto.randomUUID() }],
    }))
    setStatus(`Added ${p.name || 'player'} to the Standings tab.`)
  }

  const score = (v: number | '') => (v === '' ? 0 : v)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Showdown replay</h2>
          <p className="text-sm text-slate-600">
            Paste a replay link. For a best-of-3, paste the <strong>last game of the set</strong> (Game 2 or 3): it has the final record, so the earlier games aren’t needed. An earlier game only gives the score up to that point.
          </p>
          <Textarea
            rows={3}
            placeholder="https://replay.pokemonshowdown.com/gen9championsvgc2026regmcbo3-…"
            value={match.links}
            onChange={(e) => setMatch({ links: e.target.value })}
          />
          <Button variant="primary" disabled={busy} onClick={load}>{busy ? 'Loading…' : 'Load replay'}</Button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {status && <p className="text-sm text-slate-700">{status}</p>}
          {match.games.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {match.games.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <a className="font-semibold text-blue-700 hover:underline" href={`https://replay.pokemonshowdown.com/${g.id}`} target="_blank" rel="noreferrer">
                    {g.game ? `Game ${g.game}` : 'Game'}
                  </a>
                  <span className="text-slate-600">{g.winner ? `${g.winner} won` : 'Tie'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Result</h2>
          <p className="text-sm text-slate-500">Filled in from the replay; change anything. Tournament name and format come from the Standings tab.</p>
          <Field label="Round (optional)">
            <Input placeholder="e.g. Top 8, Winners Finals" value={match.round} onChange={(e) => setMatch({ round: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {([0, 1] as const).map((i) => (
              <Field key={i} label={`${match.players[i].name || `Player ${i + 1}`} wins`}>
                <Input
                  type="number"
                  min={0}
                  value={match.score[i]}
                  onChange={(e) => {
                    const next = [...match.score] as Match['score']
                    next[i] = e.target.value === '' ? '' : Number(e.target.value)
                    setMatch({ score: next })
                  }}
                />
              </Field>
            ))}
            <Field label="Winner">
              <Select value={match.winner ?? ''} onChange={(e) => setMatch({ winner: e.target.value === '' ? null : (Number(e.target.value) as 0 | 1) })}>
                <option value="">None</option>
                <option value={0}>{match.players[0].name || 'Player 1'}</option>
                <option value={1}>{match.players[1].name || 'Player 2'}</option>
              </Select>
            </Field>
          </div>
        </Card>

        {([0, 1] as const).map((i) => (
          <div key={match.players[i].uid} className="space-y-2">
            <PlayerEditor
              player={match.players[i]}
              label={`P${i + 1}`}
              format={event.format}
              defaultOpen={false}
              onChange={(p) => setPlayer(i, p)}
            />
            <Button variant="ghost" className="text-sm" onClick={() => addToStandings(match.players[i])}>
              + Add {match.players[i].name || `Player ${i + 1}`} to Standings
            </Button>
          </div>
        ))}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        <Preview
          templates={MATCH_TEMPLATES}
          selectedId={state.templates.match}
          onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, match: id } }))}
          filenameBase={`${match.players[0].name} vs ${match.players[1].name}`}
          render={(t) => (
            <t.Component
              data={{
                ...event,
                players: match.players,
                score: [score(match.score[0]), score(match.score[1])],
                winner: match.winner,
                round: match.round,
                bestOf: match.bestOf ?? 1,
                gamesPlayed: match.gamesPlayed ?? 0,
              }}
            />
          )}
        />
      </div>
    </div>
  )
}
