import { useState } from 'react'
import { BrandContext, resolveBrand } from './brand'
import { DisplayContext, type Display } from './lib/display'
import { cpEventFor } from './lib/cp'
import { initialState, usePersistentState } from './lib/state'
import { sampleState } from './lib/sample'
import { openTournamentFile, saveTournamentFile } from './lib/files'
import { StandingsPage } from './pages/StandingsPage'
import { UsagePage } from './pages/UsagePage'
import { ReplayPage } from './pages/ReplayPage'
import { BrandingPage } from './pages/BrandingPage'
import { Day2Page } from './pages/Day2Page'
import { TeamBattlePage } from './pages/TeamBattlePage'
import { Button } from './components/ui'
import { useDialog } from './components/Dialog'

type Tab = 'standings' | 'usage' | 'replay' | 'teamBattle' | 'day2' | 'branding'

const TABS: { id: Tab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'usage', label: 'Usage' },
  { id: 'replay', label: 'Replay' },
  { id: 'teamBattle', label: 'Team Battle' },
  { id: 'day2', label: 'Regional Results' },
  { id: 'branding', label: 'Branding' },
]

export default function App() {
  const dialog = useDialog()
  // First-time visitors start with the sample tournament so the graphics aren't empty.
  const [state, setState] = usePersistentState(sampleState, () =>
    dialog.notify("Couldn't save your work in this browser (storage is full). Everything still works, but it will be lost on refresh. Removing some player photos frees space."),
  )
  const [tab, setTab] = useState<Tab>('standings')
  const brand = resolveBrand(state.brand)
  const display: Display = {
    showMegas: state.settings.showMegas,
    setShowMegas: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showMegas: on } })),
    showCP: state.settings.showCP,
    setShowCP: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showCP: on } })),
    // CP depends on whether it's a Cup or a Challenge: that's the tournament type.
    cpEvent: cpEventFor(state.tournament.type),
    setCpEvent: (type) => setState((s) => ({ ...s, tournament: { ...s.tournament, type } })),
  }

  const reset = async (next: typeof state, message: string, label: string) => {
    if (await dialog.confirm(message, label)) setState(next)
  }

  return (
    <BrandContext.Provider value={brand}>
    <DisplayContext.Provider value={display}>
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#111]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          {brand.banner ? (
            <img src={brand.banner} alt={brand.name} className="h-14 w-auto rounded-md sm:h-16" />
          ) : (
            brand.logo && <img src={brand.logo} alt="" className="h-14 w-14 rounded-full bg-white object-cover sm:h-16 sm:w-16" />
          )}
          <div className="mr-auto">
            <h1 className="text-xl font-black italic uppercase tracking-tight text-white sm:text-2xl">Standings Generator</h1>
            <p className="text-sm text-slate-400">{[brand.name, brand.tagline].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => saveTournamentFile(state)} title="Save this tournament to a file">
              Save file
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 focus-within:ring-2 focus-within:ring-blue-300" title="Open a saved tournament file">
              Open file
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const next = await openTournamentFile(file, state)
                    if (await dialog.confirm(`Open "${next.tournament.name || file.name}"? This replaces what's on screen now.`, 'Open')) setState(next)
                  } catch (err) {
                    dialog.notify(err instanceof Error ? err.message : String(err))
                  }
                }}
              />
            </label>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...sampleState(), brand: state.brand }, 'Replace everything on every tab (standings, usage, bracket, replay, team battle, and regional results) with the sample? Branding is kept.', 'Load sample')}>
              Load sample
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...initialState(), brand: state.brand }, 'Clear the tournament, players, usage, bracket, replay, team battle, and regional results? (Branding is kept.)', 'Clear everything')}>
              Start over
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-5 py-2 text-sm font-bold uppercase tracking-wide ${tab === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'standings' && <StandingsPage state={state} setState={setState} />}
        {tab === 'usage' && <UsagePage state={state} setState={setState} />}
        {tab === 'replay' && <ReplayPage state={state} setState={setState} />}
        {tab === 'teamBattle' && <TeamBattlePage state={state} setState={setState} />}
        {tab === 'day2' && <Day2Page state={state} setState={setState} />}
        {tab === 'branding' && <BrandingPage state={state} setState={setState} />}
      </main>
    </div>
    </DisplayContext.Provider>
    </BrandContext.Provider>
  )
}
