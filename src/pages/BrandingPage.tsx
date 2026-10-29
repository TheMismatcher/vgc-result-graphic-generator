import { useEffect, useState } from 'react'
import type { AppState, BrandSettings } from '../types'
import { DMV_BRAND, defaultBrandSettings } from '../brand'
import { brandFromSettings, openBrandsFile, saveBrandsFile, useSavedBrands, type SavedBrand } from '../lib/brands'
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
  const [saved, setSaved] = useSavedBrands(() => dialog.notify("Couldn't save your brands in this browser (storage is full). Try a smaller logo, or export your brands to a file."))
  const custom = brand.preset === 'custom'
  const current = saved.find((b) => b.id === brand.savedId)

  // Edits change what's on screen and, for a saved brand, the saved copy too.
  const set = (patch: Partial<BrandSettings>) => {
    setState((s) => ({ ...s, brand: { ...s.brand, ...patch } }))
    if (brand.savedId) setSaved((list) => list.map((b) => (b.id === brand.savedId ? { ...b, ...brandFromSettings({ ...brand, ...patch }, b.id) } : b)))
  }
  const select = (b: SavedBrand) => setState((s) => ({ ...s, brand: { preset: 'custom', savedId: b.id, name: b.name, tagline: b.tagline, logo: b.logo, colors: { ...b.colors } } }))

  // A custom brand made before brands could be saved: keep it by saving it once.
  useEffect(() => {
    if (custom && !brand.savedId && (brand.name || brand.logo)) {
      const b = brandFromSettings(brand)
      setSaved((list) => [...list, b])
      setState((s) => ({ ...s, brand: { ...s.brand, savedId: b.id } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const newBrand = () => {
    const b: SavedBrand = { ...brandFromSettings({ ...defaultBrandSettings(), preset: 'custom' }), name: 'New brand' }
    setSaved((list) => [...list, b])
    select(b)
  }
  const duplicate = () => {
    if (!current) return
    const b = { ...current, id: crypto.randomUUID(), name: `${current.name} (copy)` }
    setSaved((list) => [...list, b])
    select(b)
  }
  const remove = async () => {
    if (!current) return
    if (!(await dialog.confirm(`Delete the brand "${current.name || 'Untitled'}" from this browser? Graphics switch back to ${DMV_BRAND.name}.`, 'Delete'))) return
    setSaved((list) => list.filter((b) => b.id !== current.id))
    setState((s) => ({ ...s, brand: defaultBrandSettings() }))
  }
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const brands = await openBrandsFile(file)
      setSaved((list) => [...list, ...brands])
      select(brands[0])
      dialog.notify(brands.length === 1 ? `Added "${brands[0].name}".` : `Added ${brands.length} brands.`)
    } catch (e) {
      dialog.notify(e instanceof Error ? e.message : "Couldn't read that file.")
    }
  }

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Branding">
            <BrandCard
              active={!custom}
              onClick={() => setState((s) => ({ ...s, brand: { ...s.brand, preset: 'dmv' } }))}
              title={DMV_BRAND.name}
              subtitle="Built-in"
              logo={DMV_BRAND.logo}
              colors={DMV_BRAND.colors}
            />
            {saved.map((b) => (
              <BrandCard key={b.id} active={custom && brand.savedId === b.id} onClick={() => select(b)} title={b.name || 'Untitled'} subtitle={b.tagline || 'Your brand'} logo={b.logo} colors={b.colors} />
            ))}
            <button
              type="button"
              onClick={newBrand}
              className="flex min-h-[72px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
            >
              + New brand
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Your brands are saved in this browser and stay when you start over or load the sample. To use them on another device or share one, export them to a file.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => saveBrandsFile(saved)} disabled={!saved.length}>
              Export brands
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-200">
              Import brands
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
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
                <div key={c.key}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-200">
                    <input
                      type="color"
                      aria-label={`${c.label} picker`}
                      value={brand.colors[c.key]}
                      onChange={(e) => set({ colors: { ...brand.colors, [c.key]: e.target.value } })}
                      className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <HexInput label={c.label} value={brand.colors[c.key]} onChange={(hex) => set({ colors: { ...brand.colors, [c.key]: hex } })} />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{c.hint}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={() => set({ colors: defaultBrandSettings().colors })}>Reset colors</Button>
              {current && (
                <>
                  <Button variant="ghost" onClick={duplicate}>Duplicate</Button>
                  <Button variant="ghost" onClick={() => saveBrandsFile([current])}>Export this brand</Button>
                  <Button variant="danger" onClick={remove}>Delete brand</Button>
                </>
              )}
            </div>
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

function BrandCard({ active, onClick, title, subtitle, logo, colors }: { active: boolean; onClick: () => void; title: string; subtitle: string; logo: string; colors: BrandSettings['colors'] }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-[72px] items-center gap-3 rounded-xl border-2 p-3 text-left transition ${active ? 'border-[#b3121b] bg-red-50' : 'border-slate-200 hover:border-slate-400'}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
        {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <span className="h-full w-full" style={{ background: colors.main }} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 flex items-center gap-1">
          {[colors.main, colors.second, colors.highlight].map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ background: c }} />
          ))}
          <span className="ml-1 truncate text-xs text-slate-500">{subtitle}</span>
        </span>
      </span>
    </button>
  )
}

/** "#B3121B", "b3121b", "#f00" → "#b3121b" / "#ff0000"; anything else → null. */
function parseHex(text: string) {
  const t = text.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(t)) return `#${t}`
  if (/^[0-9a-f]{3}$/.test(t)) return `#${[...t].map((ch) => ch + ch).join('')}`
  return null
}

/** A hex code you can type or paste. Applies as soon as it's a valid color; resets if left invalid. */
function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const shown = editing ? draft : value
  return (
    <input
      type="text"
      aria-label={`${label} hex code`}
      spellCheck={false}
      maxLength={7}
      value={shown}
      onFocus={() => {
        setDraft(value)
        setEditing(true)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        const hex = parseHex(e.target.value)
        if (hex && hex !== value) onChange(hex)
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`w-full min-w-0 border-0 bg-transparent font-mono text-sm outline-none ${editing && !parseHex(draft) ? 'text-red-600' : 'text-slate-700'}`}
    />
  )
}
