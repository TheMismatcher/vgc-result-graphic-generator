import { useState } from 'react'
import type { Format, Mon, Player } from '../types'
import { ITEMS, POKEMON, getPokemon, sprites } from '../data/dex'
import { TERA_TYPES } from '../data/options'
import { importTeam } from '../lib/pokepaste'
import { resizePhoto } from '../lib/photo'
import { Combobox, type Option } from './Combobox'
import { Button, Input, Select, Textarea } from './ui'
import { useDialog } from './Dialog'

const POKEMON_OPTIONS: Option[] = POKEMON.map((p) => ({ id: p.id, label: p.name, icon: sprites.icon(p.id) }))
const ITEM_OPTIONS: Option[] = ITEMS.map((i) => ({ id: i.id, label: i.name, icon: sprites.item(i.id) || undefined }))

export function PlayerEditor({
  player,
  label,
  format,
  onChange,
  onMove,
  onRemove,
  isFirst,
  isLast,
  defaultOpen = true,
}: {
  player: Player
  label: string // badge text, e.g. "1st" or "P1"
  format: Format
  onChange: (p: Player) => void
  onMove?: (dir: -1 | 1) => void // omit to hide the reorder buttons
  onRemove?: () => void // omit to hide the delete button
  isFirst?: boolean
  isLast?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const dialog = useDialog()
  const [showImport, setShowImport] = useState(false)
  const set = <K extends keyof Player>(key: K, v: Player[K]) => onChange({ ...player, [key]: v })
  const setMon = (i: number, mon: Partial<Mon>) => set('team', player.team.map((m, j) => (j === i ? { ...m, ...mon } : m)))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-black italic text-white">{label}</span>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="truncate font-semibold text-slate-900">{player.name || 'New player'}</span>
          <span className="hidden shrink-0 sm:flex">
            {player.team.filter((m) => m.pokemon).map((m, i) => (
              <img key={i} src={sprites.icon(m.pokemon)} alt={getPokemon(m.pokemon)?.name} className="h-8 w-8" />
            ))}
          </span>
        </button>
        {onMove && (
          <>
            <Button variant="ghost" aria-label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>↑</Button>
            <Button variant="ghost" aria-label="Move down" disabled={isLast} onClick={() => onMove(1)}>↓</Button>
          </>
        )}
        {onRemove && (
          <Button
            variant="danger"
            aria-label={`Remove ${player.name || 'player'}`}
            title="Remove player"
            onClick={async () => {
              if (await dialog.confirm(`Remove ${player.name || 'this player'}?`, 'Remove')) onRemove()
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
          </Button>
        )}
        <Button variant="ghost" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</Button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Player name" value={player.name} onChange={(e) => set('name', e.target.value)} />
            <Input placeholder="Record (e.g. 6-1-0)" value={player.record} onChange={(e) => set('record', e.target.value)} />
            <Input placeholder="Social (e.g. @handle)" value={player.social} onChange={(e) => set('social', e.target.value)} />
          </div>

          <PhotoField player={player} onChange={onChange} />

          {showImport ? (
            <TeamImport onDone={(team) => { set('team', team); setShowImport(false) }} onCancel={() => setShowImport(false)} />
          ) : (
            <Button onClick={() => setShowImport(true)}>Import from Pokepaste</Button>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {player.team.map((mon, i) => (
              <div key={i} className="space-y-1.5 rounded-xl bg-slate-50 p-2">
                <Combobox options={POKEMON_OPTIONS} value={mon.pokemon} placeholder={`Pokémon ${i + 1}`} onChange={(id) => setMon(i, { pokemon: id })} pixelated />
                <div className="flex gap-1.5">
                  {format.items && (
                    <div className="min-w-0 flex-1">
                      <Combobox options={ITEM_OPTIONS} value={mon.item} placeholder="Item" onChange={(id) => setMon(i, { item: id })} />
                    </div>
                  )}
                  {format.tera && (
                    <Select className="w-28 py-1.5" value={mon.tera} onChange={(e) => setMon(i, { tera: e.target.value })} aria-label="Tera type">
                      <option value="">Tera</option>
                      {TERA_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}

/** Upload a player photo (for photo templates) and adjust how it's framed. */
function PhotoField({ player, onChange }: { player: Player; onChange: (p: Player) => void }) {
  const [busy, setBusy] = useState(false)
  const dialog = useDialog()
  const y = player.photoY ?? 30

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange({ ...player, photo: await resizePhoto(file), photoY: 30 })
    } catch (e) {
      dialog.notify(e instanceof Error ? e.message : "Couldn't read that image.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
        {player.photo ? (
          <img src={player.photo} alt="" className="h-full w-full object-cover" style={{ objectPosition: `50% ${y}%` }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400" aria-hidden>👤</div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
            {busy ? 'Loading…' : player.photo ? 'Change photo' : 'Add photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {player.photo && (
            <Button variant="danger" className="py-1.5" onClick={() => onChange({ ...player, photo: undefined, photoY: undefined })}>Remove</Button>
          )}
          {!player.photo && <span className="text-xs text-slate-500">Used by the photo templates</span>}
        </div>
        {player.photo && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Framing
            <input type="range" min={0} max={100} value={y} className="w-full accent-[#b3121b]" onChange={(e) => onChange({ ...player, photoY: Number(e.target.value) })} />
          </label>
        )}
      </div>
    </div>
  )
}

function TeamImport({ onDone, onCancel }: { onDone: (team: Mon[]) => void; onCancel: () => void }) {
  const dialog = useDialog()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const { team, unmatched } = await importTeam(text)
      if (unmatched.length) dialog.notify(`Imported, but couldn't match: ${unmatched.join(', ')}. Pick those by hand.`)
      onDone(team)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <Textarea rows={4} autoFocus placeholder="https://pokepast.es/… or paste a Showdown team export" value={text} onChange={(e) => setText(e.target.value)} />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" disabled={busy} onClick={run}>{busy ? 'Importing…' : 'Import team'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
