import { useState } from 'react'
import type { AppState, Player, TeamBattle, TeamSet, TeamSide } from '../types'
import { TEAM_BATTLE_TEMPLATES } from '../templates/registry'
import { eventInfo } from '../lib/event'
import { newTeamSet } from '../lib/state'
import { resizeLogo } from '../lib/photo'
import { loadSet, swapSides, teamBattleData, teamScore } from '../lib/teamBattle'
import { replayId } from '../lib/replay'
import { sprites } from '../data/dex'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui'
import { useDialog } from '../components/Dialog'
import { rich } from '../components/rich'
import { t } from '../i18n'

type SetFn = (fn: (s: AppState) => AppState) => void

export function TeamBattlePage({ state, setState }: { state: AppState; setState: SetFn }) {
  const battle = state.teamBattle
  const format = eventInfo(state.tournament).format
  const dialog = useDialog()
  const setBattle = (fn: (b: TeamBattle) => TeamBattle) => setState((s) => ({ ...s, teamBattle: fn(s.teamBattle) }))
  const setTeam = (i: 0 | 1, patch: Partial<TeamSide>) =>
    setBattle((b) => ({ ...b, teams: b.teams.map((t, j) => (j === i ? { ...t, ...patch } : t)) as TeamBattle['teams'] }))
  const setSet = (uid: string, fn: (s: TeamSet) => TeamSet) => setBattle((b) => ({ ...b, sets: b.sets.map((s) => (s.uid === uid ? fn(s) : s)) }))

  const [bulk, setBulk] = useState('')
  const [busy, setBusy] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})

  /** Names already placed on each team, so later sets put players on the right side. */
  const known = (sets: TeamSet[], side: 0 | 1) => sets.map((s) => s.players[side].name).filter(Boolean)

  const loadOne = async (set: TeamSet, link: string, current: TeamBattle): Promise<TeamSet> => {
    try {
      const others = current.sets.filter((s) => s.uid !== set.uid)
      const result = await loadSet(set, link, known(others, 0), known(others, 1))
      setNotes((n) => ({ ...n, [set.uid]: result.notes.join(' ') }))
      return result.set
    } catch (e) {
      setNotes((n) => ({ ...n, [set.uid]: e instanceof Error ? e.message : String(e) }))
      return { ...set, link }
    }
  }

  const loadAll = async () => {
    const links = bulk.split(/\s+/).filter((l) => replayId(l))
    if (!links.length) return dialog.notify(t('ui.teamBattle.pasteLinks'))
    setBusy('all')
    let current = battle
    const sets = [...current.sets]
    while (sets.length < links.length) sets.push(newTeamSet())
    current = { ...current, sets }
    for (let i = 0; i < links.length; i++) {
      const loaded = await loadOne(current.sets[i], links[i], current)
      current = { ...current, sets: current.sets.map((s, j) => (j === i ? loaded : s)) }
    }
    setBattle(() => current)
    setBusy('')
  }

  const loadSingle = async (set: TeamSet) => {
    if (!replayId(set.link)) return setNotes((n) => ({ ...n, [set.uid]: t('ui.teamBattle.pasteLinkFirst') }))
    setBusy(set.uid)
    const loaded = await loadOne(set, set.link, battle)
    setSet(set.uid, () => loaded)
    setBusy('')
  }

  const [a, b] = battle.teams
  const score = teamScore(battle)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ui.teamBattle.league')}>
            <Input placeholder={t('ui.teamBattle.leaguePlaceholder')} value={battle.league} onChange={(e) => setBattle((x) => ({ ...x, league: e.target.value }))} />
          </Field>
          <Field label={t('ui.teamBattle.week')}>
            <Input placeholder={t('ui.teamBattle.weekPlaceholder')} value={battle.week} onChange={(e) => setBattle((x) => ({ ...x, week: e.target.value }))} />
          </Field>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((i) => (
            <TeamCard key={i} label={i === 0 ? t('ui.teamBattle.yourTeam') : t('ui.teamBattle.opponent')} team={battle.teams[i]} onChange={(patch) => setTeam(i, patch)} />
          ))}
        </div>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.teamBattle.setsHeading')}</h2>
          <p className="text-sm text-slate-600">
            {rich(t('ui.teamBattle.setsIntro'))}
          </p>
          <Textarea rows={4} placeholder={t('ui.teamBattle.bulkPlaceholder')} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <Button variant="primary" disabled={!!busy} onClick={loadAll}>{busy === 'all' ? t('ui.teamBattle.loadingSets') : t('ui.teamBattle.loadAll')}</Button>
          <p className="text-sm font-semibold text-slate-800">
            {t('ui.teamBattle.overall', { name1: a.name || t('ui.teamBattle.teamA'), score1: score[0], score2: score[1], name2: b.name || t('ui.teamBattle.teamB') })}
          </p>
        </Card>

        {battle.sets.map((s, i) => (
          <SetCard
            key={s.uid}
            index={i}
            set={s}
            format={format}
            busy={busy === s.uid}
            note={notes[s.uid] ?? ''}
            onChange={(fn) => setSet(s.uid, fn)}
            onLoad={() => loadSingle(s)}
            onRemove={async () => {
              if (await dialog.confirm(t('ui.teamBattle.removeSetConfirm', { n: i + 1 }), t('ui.common.remove'))) setBattle((x) => ({ ...x, sets: x.sets.filter((y) => y.uid !== s.uid) }))
            }}
          />
        ))}
        <Button className="w-full py-3" onClick={() => setBattle((x) => ({ ...x, sets: [...x.sets, newTeamSet()] }))}>{t('ui.teamBattle.addSet')}</Button>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        <Preview
          templates={TEAM_BATTLE_TEMPLATES}
          selectedId={state.templates.teamBattle}
          onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, teamBattle: id } }))}
          filenameBase={`${battle.league} ${battle.week} ${a.name} vs ${b.name}`}
          render={(t) => <t.Component data={teamBattleData(battle, format)} />}
        />
      </div>
    </div>
  )
}

function TeamCard({ label, team, onChange }: { label: string; team: TeamSide; onChange: (patch: Partial<TeamSide>) => void }) {
  const dialog = useDialog()
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
          {team.logo ? <img src={team.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-[11px] text-slate-400">{t('ui.branding.noLogo')}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
            {team.logo ? t('ui.branding.changeLogo') : t('ui.branding.uploadLogo')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  onChange({ logo: await resizeLogo(file) })
                } catch (err) {
                  dialog.notify(err instanceof Error ? err.message : t('ui.player.readImageError'))
                }
              }}
            />
          </label>
          {team.logo && <Button variant="danger" className="py-1.5" onClick={() => onChange({ logo: '' })}>{t('ui.common.remove')}</Button>}
        </div>
      </div>
      <Input placeholder={t('ui.teamBattle.teamName')} value={team.name} onChange={(e) => onChange({ name: e.target.value })} />
      <Input placeholder={t('ui.teamBattle.recordPlaceholder')} value={team.record} onChange={(e) => onChange({ record: e.target.value })} />
    </Card>
  )
}

function SetCard({
  index,
  set,
  format,
  busy,
  note,
  onChange,
  onLoad,
  onRemove,
}: {
  index: number
  set: TeamSet
  format: ReturnType<typeof eventInfo>['format']
  busy: boolean
  note: string
  onChange: (fn: (s: TeamSet) => TeamSet) => void
  onLoad: () => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const setPlayer = (side: 0 | 1, p: Player) => onChange((s) => ({ ...s, players: (side ? [s.players[0], p] : [p, s.players[1]]) as TeamSet['players'] }))
  const setScore = (side: 0 | 1, v: string) =>
    onChange((s) => {
      const score = [...s.score] as TeamSet['score']
      score[side] = v === '' ? '' : Math.max(0, Number(v))
      return { ...s, score }
    })

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-black italic text-white">{t('ui.teamBattle.setBadge', { n: index + 1 })}</span>
        <Input className="min-w-0 flex-1" placeholder={t('ui.teamBattle.replayPlaceholder')} value={set.link} onChange={(e) => onChange((s) => ({ ...s, link: e.target.value }))} />
        <Button disabled={busy} onClick={onLoad}>{busy ? t('ui.common.loading') : t('ui.teamBattle.load')}</Button>
        <Button variant="danger" aria-label={t('ui.teamBattle.removeSetLabel', { n: index + 1 })} onClick={onRemove}>✕</Button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {([0, 1] as const).map((side) => (
          <div key={side} className={`min-w-0 ${side ? 'order-3 text-right' : 'order-1'}`}>
            <Input
              className={`py-1.5 ${side ? 'text-right' : ''} ${set.winner === side ? 'border-amber-400 bg-amber-50 font-semibold' : ''}`}
              placeholder={side ? t('ui.teamBattle.teamBPlayer') : t('ui.teamBattle.teamAPlayer')}
              value={set.players[side].name}
              onChange={(e) => setPlayer(side, { ...set.players[side], name: e.target.value })}
            />
            <div className={`mt-1 flex ${side ? 'justify-end' : ''}`}>
              {set.players[side].team.filter((m) => m.pokemon).map((m, j) => (
                <img key={j} src={sprites.icon(m.pokemon)} alt="" className="h-7 w-7" />
              ))}
            </div>
          </div>
        ))}
        <div className="order-2 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Input className="w-12 px-1 py-1.5 text-center" type="number" min={0} aria-label={t('ui.teamBattle.teamAGames')} value={set.score[0]} onChange={(e) => setScore(0, e.target.value)} />
            <span className="text-slate-400">–</span>
            <Input className="w-12 px-1 py-1.5 text-center" type="number" min={0} aria-label={t('ui.teamBattle.teamBGames')} value={set.score[1]} onChange={(e) => setScore(1, e.target.value)} />
          </div>
          <Button variant="ghost" className="px-2 py-0.5 text-xs" title={t('ui.teamBattle.swapTitle')} onClick={() => onChange(swapSides)}>{t('ui.teamBattle.swap')}</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          {t('ui.teamBattle.setWinner')}
          <Select
            className="w-44 py-1"
            value={set.winner ?? ''}
            onChange={(e) => onChange((s) => ({ ...s, winner: e.target.value === '' ? null : (Number(e.target.value) as 0 | 1) }))}
          >
            <option value="">{t('ui.teamBattle.notDecided')}</option>
            <option value={0}>{set.players[0].name || t('ui.teamBattle.teamAPlayer')}</option>
            <option value={1}>{set.players[1].name || t('ui.teamBattle.teamBPlayer')}</option>
          </Select>
        </label>
        <Button variant="ghost" className="text-sm" onClick={() => setEditing(!editing)}>{editing ? t('ui.teamBattle.doneEditing') : t('ui.teamBattle.editTeams')}</Button>
      </div>
      {note && <p className="text-sm text-amber-700">{note}</p>}
      {editing && (
        <div className="space-y-2">
          {([0, 1] as const).map((side) => (
            <PlayerEditor key={set.players[side].uid} player={set.players[side]} label={side ? t('ui.teamBattle.sideB') : t('ui.teamBattle.sideA')} format={format} onChange={(p) => setPlayer(side, p)} />
          ))}
        </div>
      )}
    </div>
  )
}
