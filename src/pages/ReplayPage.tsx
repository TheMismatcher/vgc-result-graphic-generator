import { useState } from 'react'
import type { AppState, Match, Player } from '../types'
import { MATCH_TEMPLATES } from '../templates/registry'
import { eventInfo } from '../lib/event'
import { newPlayer } from '../lib/state'
import { fetchReplay, findSetGames, replayId, summarize, type ReplayGame } from '../lib/replay'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui'
import { rich } from '../components/rich'
import { t } from '../i18n'

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
    if (!ids.length) return setError(t('ui.replay.pasteLink'))
    setBusy(true)
    setError('')
    try {
      setStatus(t('ui.replay.loading'))
      let games: ReplayGame[] = await Promise.all(ids.map(fetchReplay))
      if (ids.length === 1 && games[0].setId) {
        setStatus(t('ui.replay.lookingForGames'))
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

      const notes = [t('ui.replay.loaded', { count: games.length })]
      const { bestOf, gamesPlayed, fromScoreboard } = sum
      if (bestOf > 1) {
        const result = t('ui.replay.resultLine', { name1: sum.names[0], score1: sum.score[0], score2: sum.score[1], name2: sum.names[1] })
        const finished = Math.max(...sum.score) >= Math.ceil(bestOf / 2)
        if (finished) {
          notes.push(t(fromScoreboard && games.length < gamesPlayed ? 'ui.replay.setDoneFromScoreboard' : 'ui.replay.setDone', { bestOf, result, games: gamesPlayed }))
        } else {
          notes.push(t('ui.replay.setSoFar', { bestOf, result, games: gamesPlayed }))
        }
      }
      if (!games.some((g) => g.hasTeamSheets)) notes.push(t('ui.replay.noTeamSheets'))
      const unmatched = [...new Set(games.flatMap((g) => g.unmatched))]
      if (unmatched.length) notes.push(t('ui.replay.unmatched', { names: unmatched.join(', ') }))
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
    setStatus(p.name ? t('ui.replay.added', { name: p.name }) : t('ui.replay.addedUnnamed'))
  }

  const score = (v: number | '') => (v === '' ? 0 : v)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.replay.heading')}</h2>
          <p className="text-sm text-slate-600">
            {rich(t('ui.replay.intro'))}
          </p>
          <Textarea
            rows={3}
            placeholder={t('ui.replay.linkPlaceholder')}
            value={match.links}
            onChange={(e) => setMatch({ links: e.target.value })}
          />
          <Button variant="primary" disabled={busy} onClick={load}>{busy ? t('ui.common.loading') : t('ui.replay.loadReplay')}</Button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {status && <p className="text-sm text-slate-700">{status}</p>}
          {match.games.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {match.games.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <a className="font-semibold text-blue-700 hover:underline" href={`https://replay.pokemonshowdown.com/${g.id}`} target="_blank" rel="noreferrer">
                    {g.game ? t('ui.replay.gameN', { n: g.game }) : t('ui.replay.game')}
                  </a>
                  <span className="text-slate-600">{g.winner ? t('ui.replay.winnerWon', { name: g.winner }) : t('ui.replay.tie')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.replay.resultHeading')}</h2>
          <p className="text-sm text-slate-500">{t('ui.replay.resultHint')}</p>
          <Field label={t('ui.replay.roundLabel')}>
            <Input placeholder={t('ui.replay.roundPlaceholder')} value={match.round} onChange={(e) => setMatch({ round: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {([0, 1] as const).map((i) => (
              <Field key={i} label={t('ui.replay.winsLabel', { name: match.players[i].name || t('ui.replay.playerN', { n: i + 1 }) })}>
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
            <Field label={t('ui.replay.winner')}>
              <Select value={match.winner ?? ''} onChange={(e) => setMatch({ winner: e.target.value === '' ? null : (Number(e.target.value) as 0 | 1) })}>
                <option value="">{t('ui.replay.winnerNone')}</option>
                <option value={0}>{match.players[0].name || t('ui.replay.playerN', { n: 1 })}</option>
                <option value={1}>{match.players[1].name || t('ui.replay.playerN', { n: 2 })}</option>
              </Select>
            </Field>
          </div>
        </Card>

        {([0, 1] as const).map((i) => (
          <div key={match.players[i].uid} className="space-y-2">
            <PlayerEditor
              player={match.players[i]}
              label={t('ui.replay.playerBadge', { n: i + 1 })}
              format={event.format}
              defaultOpen={false}
              onChange={(p) => setPlayer(i, p)}
            />
            <Button variant="ghost" className="text-sm" onClick={() => addToStandings(match.players[i])}>
              {t('ui.replay.addToStandings', { name: match.players[i].name || t('ui.replay.playerN', { n: i + 1 }) })}
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
