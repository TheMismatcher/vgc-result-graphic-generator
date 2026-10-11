import type { AppState, Bracket } from '../types'
import { BRACKET_SIZES, bracketFromStandings, bracketRounds, emptyBracket, setBracketWinner, type BracketSize } from '../lib/bracket'
import { Button, Card, Select } from './ui'

const ROUND_NAMES: Record<number, string> = { 8: 'Quarterfinals', 4: 'Semifinals', 2: 'Final' }

/** Set up the top cut bracket (for the Bracket template): seed from standings, pick winners. */
export function BracketEditor({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const b = state.bracket
  const set = (bracket: Bracket) => setState((s) => ({ ...s, bracket }))
  const { rounds, champion } = bracketRounds(b)
  const names = state.players.map((p) => p.name).filter(Boolean)

  const setSlot = (i: number, name: string) => set({ ...b, slots: b.slots.map((n, j) => (j === i ? name : n)), winners: bracketFromStandings([], b.size as BracketSize).winners })

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Top cut bracket</h2>
        <div className="flex gap-2">
          <Select
            className="w-32"
            aria-label="Bracket size"
            value={b.size}
            onChange={(e) => {
              const size = Number(e.target.value)
              set(size ? bracketFromStandings(state.players, size as BracketSize) : emptyBracket())
            }}
          >
            <option value={0}>No bracket</option>
            {BRACKET_SIZES.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </Select>
          {b.size > 0 && (
            <Button onClick={() => set(bracketFromStandings(state.players, b.size as BracketSize))} title="Re-seed from the current standings order">
              Re-seed
            </Button>
          )}
        </div>
      </div>
      {!b.size ? (
        <p className="text-sm text-slate-500">Used by the Bracket template. Pick a size to seed it from the standings (1 vs 8, 4 vs 5…), or import from Limitless to fill it in with results.</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">Click a player to mark them as the winner of that match.</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}>
            {rounds.map((matches, r) => (
              <div key={r} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ROUND_NAMES[b.size / 2 ** r] ?? `Round ${r + 1}`}</h3>
                {matches.map((m, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
                    {m.names.map((name, side) =>
                      r === 0 ? (
                        <div key={side} className={`flex items-center gap-1 ${side ? 'border-t border-slate-100' : ''} ${m.winner === side ? 'bg-amber-100' : ''}`}>
                          <select
                            aria-label={`Seed slot ${i * 2 + side + 1}`}
                            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
                            value={name}
                            onChange={(e) => setSlot(i * 2 + side, e.target.value)}
                          >
                            <option value="">—</option>
                            {[...new Set([name, ...names])].filter(Boolean).map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!name}
                            aria-label={`${name} won`}
                            aria-pressed={m.winner === side}
                            className={`px-2 text-sm ${m.winner === side ? 'text-amber-700' : 'text-slate-300 hover:text-slate-600'}`}
                            onClick={() => set(setBracketWinner(b, r, i, side as 0 | 1))}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          key={side}
                          type="button"
                          disabled={!name}
                          aria-pressed={m.winner === side}
                          onClick={() => set(setBracketWinner(b, r, i, side as 0 | 1))}
                          className={`block w-full truncate px-2 py-1.5 text-left text-sm ${side ? 'border-t border-slate-100' : ''} ${m.winner === side ? 'bg-amber-100 font-semibold' : 'hover:bg-slate-50'} ${name ? 'text-slate-800' : 'text-slate-300'}`}
                        >
                          {name || 'TBD'}
                        </button>
                      ),
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-700">Champion: <span className="font-semibold">{champion || 'TBD'}</span></p>
        </>
      )}
    </Card>
  )
}
