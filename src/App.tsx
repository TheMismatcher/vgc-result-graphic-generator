import { useEffect, useState } from 'react'
import { t, type UiKey } from './i18n'
import { asset, BrandContext, resolveBrand } from './brand'
import { BackdropContext, DEFAULT_OPACITY } from './lib/backdrop'
import { DEFAULT_LOOKS, DisplayContext, type Display } from './lib/display'
import { cpEventFor } from './lib/cp'
import { initialState, isUnchanged, usePersistentState } from './lib/state'
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

const TABS: { id: Tab; label: UiKey }[] = [
  { id: 'standings', label: 'ui.app.tab.standings' },
  { id: 'usage', label: 'ui.app.tab.usage' },
  { id: 'replay', label: 'ui.app.tab.replay' },
  { id: 'teamBattle', label: 'ui.app.tab.teamBattle' },
  { id: 'day2', label: 'ui.app.tab.day2' },
  { id: 'branding', label: 'ui.app.tab.branding' },
]

export default function App() {
  const dialog = useDialog()
  useEffect(() => {
    document.title = t('ui.app.pageTitle')
  }, [])
  // First-time visitors start with the sample tournament so the graphics aren't empty.
  const [state, setState] = usePersistentState(sampleState, () =>
    dialog.notify(t('ui.app.storageFull')),
  )
  const [tab, setTab] = useState<Tab>('standings')
  const brand = resolveBrand(state.brand)
  const display: Display = {
    showMegas: state.settings.showMegas,
    setShowMegas: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showMegas: on } })),
    showCP: state.settings.showCP,
    setShowCP: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showCP: on } })),
    looks: { ...DEFAULT_LOOKS, ...state.settings.looks },
    tileShuffle: state.settings.tileShuffle ?? 0,
    shuffleTiles: () => setState((s) => ({ ...s, settings: { ...s.settings, tileShuffle: (s.settings.tileShuffle ?? 0) + 1 } })),
    setLook: (group, value) => setState((s) => ({ ...s, settings: { ...s.settings, looks: { ...s.settings.looks, [group]: value } } })),
    // CP depends on whether it's a Cup or a Challenge: that's the tournament type.
    cpEvent: cpEventFor(state.tournament.type),
    setCpEvent: (type) => setState((s) => ({ ...s, tournament: { ...s.tournament, type } })),
  }

  // Replacing everything: no questions if what's on screen is just the sample or empty; otherwise
  // offer to save it to a file first.
  const reset = async (next: typeof state, message: string) => {
    if (!isUnchanged(state, [sampleState(), initialState()])) {
      const choice = await dialog.choose(t('ui.app.ownDataPrompt', { message }), [t('ui.app.saveFirst'), t('ui.app.proceed')])
      if (choice === null) return
      if (choice === 0) saveTournamentFile(state)
    }
    setState(next)
  }

  const backdrop = {
    backdrop: state.backdrop ?? null,
    setBackdrop: (b: typeof state.backdrop) => setState((s) => ({ ...s, backdrop: b })),
    opacity: state.customPanels ?? DEFAULT_OPACITY,
    setOpacity: (o: typeof DEFAULT_OPACITY) => setState((s) => ({ ...s, customPanels: o })),
  }

  return (
    <BrandContext.Provider value={brand}>
    <BackdropContext.Provider value={backdrop}>
    <DisplayContext.Provider value={display}>
    <div className="min-h-screen bg-slate-100">
      <header id="app-header" className="bg-[#111]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          {/* The site's own header: always Mismatched, whatever brand the graphics use. i18n-ignore: brand name */}
          <a href="/" className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {/* i18n-ignore: brand name */}
            <img src={asset('brand/mismatched-logo.svg')} alt="Mismatched" className="h-9 w-auto sm:h-11" />
          </a>
          <div className="mr-auto">
            <h1 className="text-xl font-black italic uppercase tracking-tight text-white sm:text-2xl">{t('ui.app.title')}</h1>
            <p className="text-sm text-slate-400">{t('ui.app.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => saveTournamentFile(state)} title={t('ui.app.saveFileTitle')}>
              {t('ui.app.saveFile')}
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 focus-within:ring-2 focus-within:ring-blue-300" title={t('ui.app.openFileTitle')}>
              {t('ui.app.openFile')}
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
                    if (await dialog.confirm(t('ui.app.openConfirm', { name: next.tournament.name || file.name }), t('ui.app.open'))) setState(next)
                  } catch (err) {
                    dialog.notify(err instanceof Error ? err.message : String(err))
                  }
                }}
              />
            </label>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...sampleState(), brand: state.brand, backdrop: state.backdrop, customPanels: state.customPanels, templates: state.templates }, t('ui.app.loadSampleMessage'))}>
              {t('ui.app.loadSample')}
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...initialState(), brand: state.brand, backdrop: state.backdrop, customPanels: state.customPanels }, t('ui.app.startOverMessage'))}>
              {t('ui.app.startOver')}
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-bold uppercase tracking-wide sm:px-5 ${tab === tabItem.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              {t(tabItem.label)}
            </button>
          ))}
          <a
            href="/dmv-invitational"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-400 hover:text-white sm:px-5"
          >
            {/* i18n-ignore: event name */}
            DMV Invitational
          </a>
          <a
            href="https://bot.mismatched.gg"
            rel="noopener noreferrer"
            className="shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-400 hover:text-white sm:px-5"
          >
            {t('ui.app.tab.botConfig')}
          </a>
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
    </BackdropContext.Provider>
    </BrandContext.Provider>
  )
}
