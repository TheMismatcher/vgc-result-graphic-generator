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
import { markTourSeen, Tour, tourSeen, TOUR_START_EVENT } from './components/Tour'

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
  // Feature tour: opens by itself on someone's first visit (once per browser), and from "Take the tour".
  const [touring, setTouring] = useState(false)
  const startTour = () => {
    setTab('standings')
    window.dispatchEvent(new Event(TOUR_START_EVENT))
    markTourSeen()
    setTouring(true)
  }
  useEffect(() => {
    if (tourSeen()) return
    const id = setTimeout(startTour, 600) // after the page has settled, so the first stops measure right
    return () => clearTimeout(id)
  }, [])
  const brand = resolveBrand(state.brand)
  const display: Display = {
    showMegas: state.settings.showMegas,
    setShowMegas: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showMegas: on } })),
    showCP: state.settings.showCP,
    setShowCP: (on) => setState((s) => ({ ...s, settings: { ...s.settings, showCP: on } })),
    looks: { ...DEFAULT_LOOKS, ...state.settings.looks },
    tileShuffle: state.settings.tileShuffle ?? 0,
    shuffleTiles: () => setState((s) => ({ ...s, settings: { ...s.settings, tileShuffle: (s.settings.tileShuffle ?? 0) + 1 } })),
    mosaicSolid: state.settings.mosaicSolid ?? false,
    setMosaicSolid: (on) => setState((s) => ({ ...s, settings: { ...s.settings, mosaicSolid: on } })),
    condenseStyles: state.settings.condenseStyles ?? false,
    setCondenseStyles: (on) => setState((s) => ({ ...s, settings: { ...s.settings, condenseStyles: on } })),
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
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => saveTournamentFile(state)} title={t('ui.app.saveFileTitle')} data-tour="file">
              {t('ui.app.saveFile')}
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 focus-within:ring-2 focus-within:ring-blue-300" title={t('ui.app.openFileTitle')} data-tour="file">
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
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...sampleState(), brand: state.brand, backdrop: state.backdrop, customPanels: state.customPanels, templates: state.templates }, t('ui.app.loadSampleMessage'))} data-tour="file">
              {t('ui.app.loadSample')}
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => reset({ ...initialState(), brand: state.brand, backdrop: state.backdrop, customPanels: state.customPanels }, t('ui.app.startOverMessage'))} data-tour="file">
              {t('ui.app.startOver')}
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={startTour}>
              {t('ui.tour.open')}
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              data-tour={tabItem.id === 'branding' ? 'tab-branding' : 'tabs'}
              onClick={() => setTab(tabItem.id)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-bold uppercase tracking-wide sm:px-5 ${tab === tabItem.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              {t(tabItem.label)}
            </button>
          ))}
          <a
            href="https://x.com/TheMismatcher"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1.5 ml-auto inline-flex shrink-0 items-center gap-2 self-center whitespace-nowrap rounded-lg border border-white/25 px-3 py-1.5 text-sm font-bold text-slate-200 hover:bg-white hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
            {t('ui.app.follow')}
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
      <Tour open={touring} onClose={() => setTouring(false)} />

      {/* Ko-fi: the home page's support panel (same text, ui.home.kofi.*), drawn as one of this page's white cards. */}
      <section className="mx-auto mb-6 max-w-7xl px-4">
        {/* Phones: cup beside the title, text and button full width below (as on the home page). */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3 sm:px-5">
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#29abe0] sm:h-12 sm:w-12">
            <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M10 11.2c-.9-1-2.6-.4-2.6 1 0 1.3 2.6 3 2.6 3s2.6-1.7 2.6-3c0-1.4-1.7-2-2.6-1z" fill="#fff" stroke="none" /></svg>
          </div>
          <div className="contents sm:block sm:min-w-0 sm:flex-[1_1_320px]">
            <h2 className="text-lg font-bold text-slate-900">{t('ui.home.kofi.title')}</h2>
            <p className="col-span-2 text-sm text-slate-600 sm:mt-0.5">{t('ui.home.kofi.text')}</p>
          </div>
          <a
            href="https://ko-fi.com/mismatchedvgc"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 mt-1 inline-flex items-center gap-2 justify-self-start sm:mt-0 rounded-lg bg-[#29abe0] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#1f93c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
          >
            {t('ui.home.kofi.go')} <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      {/* The Credits page: who made the site, and what we collect (its Privacy section). */}
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-center">
        <a
          href="/credits/#privacy"
          className="inline-block rounded-full bg-[#111] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3121b]"
        >
          {t('ui.app.footer.credits')}
        </a>
      </footer>
    </div>
    </DisplayContext.Provider>
    </BackdropContext.Provider>
    </BrandContext.Provider>
  )
}
