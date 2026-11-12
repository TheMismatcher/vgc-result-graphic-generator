import { useEffect, useState } from 'react'
import type { AppState, BrandSettings } from '../types'
import { BUILT_IN_BRANDS, DMV_BRAND, defaultBrandSettings } from '../brand'
import { brandFromSettings, openBrandsFile, saveBrandsFile, useSavedBrands, type SavedBrand } from '../lib/brands'
import { STANDINGS_TEMPLATES } from '../templates/registry'
import { standingsData } from '../lib/event'
import { resizeLogo } from '../lib/photo'
import { Preview } from '../components/Preview'
import { Button, Card, Field, Input } from '../components/ui'
import { useDialog } from '../components/Dialog'
import { t, type UiKey } from '../i18n'

// Keys, not text: t() runs at render time so the text follows the language.
const COLOR_FIELDS: { key: keyof BrandSettings['colors']; label: UiKey; hint: UiKey }[] = [
  { key: 'main', label: 'ui.branding.color.main', hint: 'ui.branding.color.mainHint' },
  { key: 'second', label: 'ui.branding.color.second', hint: 'ui.branding.color.secondHint' },
  { key: 'highlight', label: 'ui.branding.color.highlight', hint: 'ui.branding.color.highlightHint' },
]

export function BrandingPage({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const brand = state.brand
  const [busy, setBusy] = useState(false)
  const dialog = useDialog()
  const [saved, setSaved] = useSavedBrands(() => dialog.notify(t('ui.branding.storageFull')))
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
    const b: SavedBrand = { ...brandFromSettings({ ...defaultBrandSettings(), preset: 'custom' }), name: t('ui.branding.newBrandName') }
    setSaved((list) => [...list, b])
    select(b)
  }
  const duplicate = () => {
    if (!current) return
    const b = { ...current, id: crypto.randomUUID(), name: t('ui.branding.copyName', { name: current.name }) }
    setSaved((list) => [...list, b])
    select(b)
  }
  const remove = async () => {
    if (!current) return
    if (!(await dialog.confirm(t('ui.branding.deleteConfirm', { name: current.name || t('ui.branding.untitled'), builtIn: DMV_BRAND.name }), t('ui.common.delete')))) return
    setSaved((list) => list.filter((b) => b.id !== current.id))
    setState((s) => ({ ...s, brand: defaultBrandSettings() }))
  }
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const brands = await openBrandsFile(file)
      setSaved((list) => [...list, ...brands])
      select(brands[0])
      dialog.notify(brands.length === 1 ? t('ui.branding.addedOne', { name: brands[0].name }) : t('ui.branding.addedMany', { count: brands.length }))
    } catch (e) {
      dialog.notify(e instanceof Error ? e.message : t('ui.branding.readFileError'))
    }
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      set({ logo: await resizeLogo(file) })
    } catch (e) {
      dialog.notify(e instanceof Error ? e.message : t('ui.branding.readImageError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('ui.branding.title')}</h2>
          <p className="text-sm text-slate-600">{t('ui.branding.intro')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('ui.branding.title')}>
            {BUILT_IN_BRANDS.map(({ id, brand: b }) => (
              <BrandCard
                key={id}
                active={brand.preset === id}
                onClick={() => setState((s) => ({ ...s, brand: { ...s.brand, preset: id } }))}
                title={b.name}
                subtitle={t('ui.branding.builtIn')}
                logo={b.logo}
                colors={b.colors}
              />
            ))}
            {saved.map((b) => (
              <BrandCard key={b.id} active={custom && brand.savedId === b.id} onClick={() => select(b)} title={b.name || t('ui.branding.untitled')} subtitle={b.tagline || t('ui.branding.yourBrand')} logo={b.logo} colors={b.colors} />
            ))}
            <button
              type="button"
              onClick={newBrand}
              className="flex min-h-[72px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
            >
              {t('ui.branding.newBrandButton')}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {t('ui.branding.savedHint')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => saveBrandsFile(saved)} disabled={!saved.length}>
              {t('ui.branding.exportAll')}
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-200">
              {t('ui.branding.import')}
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </div>
        </Card>

        {custom && (
          <Card className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ui.branding.name')}>
                <Input placeholder={t('ui.branding.namePlaceholder')} value={brand.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label={t('ui.branding.tagline')}>
                <Input placeholder={t('ui.branding.taglinePlaceholder')} value={brand.tagline} onChange={(e) => set({ tagline: e.target.value })} />
              </Field>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.branding.logo')}</span>
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">{t('ui.branding.noLogo')}</span>}
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
                  {busy ? t('ui.common.loading') : brand.logo ? t('ui.branding.changeLogo') : t('ui.branding.uploadLogo')}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {brand.logo && <Button variant="danger" onClick={() => set({ logo: '' })}>{t('ui.common.remove')}</Button>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('ui.branding.logoHint')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {COLOR_FIELDS.map((c) => (
                <div key={c.key}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t(c.label)}</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-200">
                    <input
                      type="color"
                      aria-label={t('ui.branding.colorPicker', { color: t(c.label) })}
                      value={brand.colors[c.key]}
                      onChange={(e) => set({ colors: { ...brand.colors, [c.key]: e.target.value } })}
                      className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <HexInput label={t(c.label)} value={brand.colors[c.key]} onChange={(hex) => set({ colors: { ...brand.colors, [c.key]: hex } })} />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{t(c.hint)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={() => set({ colors: defaultBrandSettings().colors })}>{t('ui.branding.resetColors')}</Button>
              {current && (
                <>
                  <Button variant="ghost" onClick={duplicate}>{t('ui.branding.duplicate')}</Button>
                  <Button variant="ghost" onClick={() => saveBrandsFile([current])}>{t('ui.branding.exportOne')}</Button>
                  <Button variant="danger" onClick={remove}>{t('ui.branding.delete')}</Button>
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
      aria-label={t('ui.branding.colorHex', { color: label })}
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
