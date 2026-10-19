import { useState } from 'react'
import type { AppState, BrandSettings } from '../types'
import { DMV_BRAND, defaultBrandSettings } from '../brand'
import { STANDINGS_TEMPLATES } from '../templates/registry'
import { standingsData } from '../lib/event'
import { resizeLogo } from '../lib/photo'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input } from '../components/ui'
import { useDialog } from '../components/Dialog'

const COLOR_FIELDS: { key: keyof BrandSettings['colors']; label: string; hint: string }[] = [
  { key: 'main', label: 'Main color', hint: 'Banners, 2nd-color cards' },
  { key: 'second', label: 'Second color', hint: 'Backgrounds, name plates' },
  { key: 'highlight', label: 'Highlight', hint: '1st place, tags, winner banner (keep it light)' },
]

export function BrandingPage({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const brand = state.brand
  const [busy, setBusy] = useState(false)
  const dialog = useDialog()
  const set = (patch: Partial<BrandSettings>) => setState((s) => ({ ...s, brand: { ...s.brand, ...patch } }))
  const custom = brand.preset === 'custom'

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      set({ logo: await resizeLogo(file) })
    } catch (e) {
      dialog.notify(e instanceof Error ? e.message : "Couldn't read that image.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Branding</h2>
          <p className="text-sm text-slate-600">Choose whose look the graphics use. This applies to every template.</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Branding">
            {(['dmv', 'custom'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={brand.preset === p}
                onClick={() => set({ preset: p })}
                className={`rounded-xl border-2 p-3 text-left transition ${brand.preset === p ? 'border-[#b3121b] bg-red-50' : 'border-slate-200 hover:border-slate-400'}`}
              >
                <div className="font-semibold text-slate-900">{p === 'dmv' ? DMV_BRAND.name : 'Custom'}</div>
                <div className="text-xs text-slate-500">{p === 'dmv' ? 'Built-in logo and colors' : 'Your own name, logo, and colors'}</div>
              </button>
            ))}
          </div>
        </Card>

        {custom && (
          <Card className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input placeholder="e.g. Richmond VGC" value={brand.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Tagline (optional)">
                <Input placeholder="e.g. Weekly Locals" value={brand.tagline} onChange={(e) => set({ tagline: e.target.value })} />
              </Field>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Logo</span>
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No logo</span>}
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
                  {busy ? 'Loading…' : brand.logo ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {brand.logo && <Button variant="danger" onClick={() => set({ logo: '' })}>Remove</Button>}
              </div>
              <p className="mt-1 text-xs text-slate-500">Square images work best; it's shown in a circle. Transparent PNGs keep their transparency.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {COLOR_FIELDS.map((c) => (
                <label key={c.key} className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm">
                    <input
                      type="color"
                      value={brand.colors[c.key]}
                      onChange={(e) => set({ colors: { ...brand.colors, [c.key]: e.target.value } })}
                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-sm text-slate-700">{brand.colors[c.key]}</span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{c.hint}</span>
                </label>
              ))}
            </div>

            <Button variant="ghost" onClick={() => set({ colors: defaultBrandSettings().colors })}>Reset colors</Button>
          </Card>
        )}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        <Preview
          templates={STANDINGS_TEMPLATES}
          selectedId={state.templates.standings}
          onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, standings: id } }))}
          filenameBase={state.tournament.name}
          render={(t) => <t.Component data={standingsData(state, t.maxPlayers)} />}
          allowCP
        />
      </div>
    </div>
  )
}
