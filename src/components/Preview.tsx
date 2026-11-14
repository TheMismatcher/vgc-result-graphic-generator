// Live preview of the selected template, the template picker, and the download button.

import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { LookGroup, StandingsLayout, Template } from '../templates/types'
import { eventTypeKey } from '../data/options'
import { BRAND_COLOURS, STANDINGS_LAYOUTS, type BrandColour } from '../templates/registry'
import { copyPng, downloadPng, renderPngFile, slugify, canUseShareSheet } from '../lib/exportImage'
import { brandVars, useBrand } from '../brand'
import { useDisplay } from '../lib/display'
import { BackdropContext, DEFAULT_OPACITY, isBackdropTemplate, opacityVars, readBackdrop, startDrag, useBackdrop } from '../lib/backdrop'
import type { BackdropPhoto, Player } from '../types'
import { PhotoFrameContext, photoFrame } from '../templates/shared/parts'
import { useDialog } from './Dialog'
import { Button, Card } from './ui'
import { styleName, templateDescription } from '../i18n/templates'
import { t, type UiKey } from '../i18n'

/** Shows a fixed-size graphic scaled down to fit its container. */
export function Scaled({ width, height, maxWidth, children, nodeRef, fitViewport = false,}: { width: number; height: number; maxWidth?: number; children: ReactNode; nodeRef?: React.Ref<HTMLDivElement>; fitViewport?: boolean; }) {
  const vars = { ...brandVars(useBrand()), ...opacityVars(useBackdrop().opacity) }
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const header = document.getElementById('app-header')
    const resize = () => {
      const availableWidth = Math.min(el.clientWidth, maxWidth ?? Infinity)
      const headerHeight = fitViewport ? header?.offsetHeight ?? 0 : 0
      const availableHeight = fitViewport ? Math.max(0, window.innerHeight - headerHeight - 200) : Infinity
      setScale(Math.min(availableWidth / width, availableHeight / height))
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    if (header) ro.observe(header)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [width, height, maxWidth, fitViewport])
  return (
    <div ref={box} className="w-full">
      <div style={{ width: width * scale, height: height * scale }} className="mx-auto overflow-hidden">
        <div ref={nodeRef} style={{ ...vars, width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Preview<T extends Template>({
  templates,
  selectedId,
  onSelect,
  render,
  filenameBase,
  allowCP = false,
  showTemplates=true,
  photos,
  controls,
}: {
  templates: T[]
  selectedId: string
  onSelect: (id: string) => void
  render: (t: T) => ReactNode
  filenameBase: string
  allowCP?: boolean // show the "Show CP earned" option (standings graphics only)
  showTemplates?: boolean //show on all but standings by default
  photos?: { players: Player[]; onChange: (uid: string, patch: Partial<Player>) => void } // drag / zoom player photos in the preview
  controls?: ReactNode // extra settings for the selected style (e.g. Sports Page headline), under the switches
}) {
  const template = templates.find((t) => t.id === selectedId) ?? templates[0]
  const node = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<{ file: File; url: string } | null>(null) // phone: rendered image waiting to be saved
  const { showMegas, setShowMegas, showCP, setShowCP, cpEvent, setCpEvent, setLook, shuffleTiles } = useDisplay()
  const dialog = useDialog()
  // Custom Glass: the photo is dragged on the preview; the live position stays local until the drag ends.
  const backdropCtx = useBackdrop()
  const { backdrop, setBackdrop } = backdropCtx
  const [dragging, setDragging] = useState<BackdropPhoto | null>(null)
  const custom = isBackdropTemplate(template.id)
  // Styles with switches: the other versions of this style in this layout, and the switches that tell them apart.
  const family = (t: T) => t.variantOf ?? t.style
  const kin = template.look ? templates.filter((t) => t.look && family(t) === family(template) && t.layout === template.layout) : []
  const switches = (Object.keys(template.look ?? {}) as LookGroup[])
    .map((g) => ({ g, options: Object.keys(OPTION_LABELS).filter((v) => kin.some((t) => t.look![g] === v)) }))
    .filter((s) => s.options.length > 1)
  // Flip one switch, keeping the others where they are.
  const flip = (g: LookGroup, v: string) => {
    setLook(g, v)
    const same = (t: T) => (Object.keys(template.look!) as LookGroup[]).every((k) => k === g || !(k in t.look!) || t.look![k] === template.look![k])
    const next = kin.find((t) => t.look![g] === v && same(t)) ?? kin.find((t) => t.look![g] === v)
    if (next && next.id !== template.id) onSelect(next.id)
  }
  // Player photos: drag one to move it in its frame (live, saved on release); the last one touched gets the Zoom slider.
  const [photoUid, setPhotoUid] = useState('')
  const [photoLive, setPhotoLive] = useState<{ uid: string; x: number; y: number } | null>(null)
  const photoPlayer = photos?.players.find((p) => p.uid === photoUid && p.photo)
  useLayoutEffect(() => {
    // Default to the first photo in this graphic (the winner's on Champion + Photo).
    const first = node.current?.querySelector<HTMLElement>('[data-photo]')?.dataset.photo ?? ''
    setPhotoUid((uid) => (uid && node.current?.querySelector(`[data-photo="${uid}"]`) ? uid : first))
  })
  const dragPhoto = (e: PointerEvent, img: HTMLImageElement) => {
    const player = photos?.players.find((p) => p.uid === img.dataset.photo)
    if (!photos || !player || !node.current || e.button !== 0) return
    e.preventDefault()
    setPhotoUid(player.uid)
    const f = photoFrame(player)
    // The photo covers its box, then zooms: how far it overhangs on each axis (graphic px).
    const bw = img.offsetWidth
    const bh = img.offsetHeight
    const fit = player.photoFit ? Math.min : Math.max // contain (whole photo) or cover
    const s0 = fit(bw / img.naturalWidth, bh / img.naturalHeight) * f.zoom
    const overX = img.naturalWidth * s0 - bw
    const overY = img.naturalHeight * s0 - bh
    const k = node.current.getBoundingClientRect().width / template.width
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    const startX = e.clientX
    const startY = e.clientY
    let last = { uid: player.uid, x: f.x, y: f.y }
    const onMove = (ev: globalThis.PointerEvent) => {
      last = {
        uid: player.uid,
        // overX/overY < 0: the whole photo is narrower/shorter than its box and slides within it (same formula).
        x: Math.abs(overX) > 0.5 ? clamp(f.x - ((ev.clientX - startX) / k) * (100 / overX)) : f.x,
        y: Math.abs(overY) > 0.5 ? clamp(f.y - ((ev.clientY - startY) / k) * (100 / overY)) : f.y,
      }
      setPhotoLive(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      photos.onChange(player.uid, { photoX: Math.round(last.x * 10) / 10, photoY: Math.round(last.y * 10) / 10 })
      setPhotoLive(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const drag = (e: PointerEvent) => {
    const img = photos && (e.target as HTMLElement).closest<HTMLImageElement>('img[data-photo]')
    if (img) return dragPhoto(e, img)
    if (!custom || !backdrop || !node.current) return
    startDrag(e, node.current, backdrop, template.width, template.height, setDragging, (b) => {
      setBackdrop(b)
      setDragging(null)
    })
  }

  const copy = async () => {
    if (!node.current) return
    setBusy(true)
    try {
      await copyPng(node.current, template.width, template.height)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      dialog.notify(t('ui.preview.copyError', { message: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (!node.current) return
    setBusy(true)
    const filename = `${slugify(filenameBase)}-${template.id}.png`
    try {
      if (canUseShareSheet()) {
        // Rendering outlasts the tap, and Safari only opens the share sheet straight from a tap,
        // so the finished image waits in a sheet with its own Save button.
        const file = await renderPngFile(node.current, template.width, template.height, filename)
        setSaved({ file, url: URL.createObjectURL(file) })
      } else {
        await downloadPng(node.current, template.width, template.height, filename)
      }
    } catch (e) {
      dialog.notify(t('ui.preview.createError', { message: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const closeSaved = () => {
    if (saved) URL.revokeObjectURL(saved.url)
    setSaved(null)
  }
  const share = async () => {
    if (!saved) return
    try {
      await navigator.share({ files: [saved.file] })
      closeSaved()
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return // closed the share sheet
      dialog.notify(t('ui.preview.shareError', { message: e instanceof Error ? e.message : String(e) }))
    }
  }

  return (
    <Card className="space-y-4">
      {saved && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4" onClick={closeSaved}>
          <img src={saved.url} alt={t('ui.preview.imageAlt')} className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-lg" onClick={(e) => e.stopPropagation()} />
          <p className="text-center text-sm text-white/80">{t('ui.preview.saveHint')}</p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button onClick={closeSaved}>{t('ui.common.close')}</Button>
            <Button variant="primary" onClick={share}>{t('ui.preview.saveToPhotos')}</Button>
          </div>
        </div>,
        document.body,
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{t('ui.preview.title')}</h2>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={copy}>{copied ? t('ui.preview.copied') : t('ui.preview.copyImage')}</Button>
          <Button variant="primary" disabled={busy} onClick={download}>{busy ? t('ui.preview.creating') : t('ui.preview.downloadPng')}</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-[#b3121b]" checked={showMegas} onChange={(e) => setShowMegas(e.target.checked)} />
          {t('ui.preview.showMegas')}
        </label>
        {allowCP && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[#b3121b]" checked={showCP} onChange={(e) => setShowCP(e.target.checked)} />
            {t('ui.preview.showCP')}
          </label>
        )}
        {allowCP && showCP && (
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm" role="radiogroup" aria-label={t('ui.preview.cpEventLabel')}>
            {(['cup', 'challenge'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={cpEvent === k}
                onClick={() => setCpEvent(k)}
                className={`px-3 py-1 font-semibold ${cpEvent === k ? 'bg-[#b3121b] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {t(eventTypeKey(k))}
              </button>
            ))}
          </div>
        )}
      </div>
      {template.style?.startsWith('Mosaic') && (
        <div className="-mt-1 flex items-center gap-3 text-sm text-slate-700">
          <Button onClick={shuffleTiles}>{t('ui.preview.shuffleTiles')}</Button>
          <span className="text-xs text-slate-500">{t('ui.preview.shuffleHint')}</span>
        </div>
      )}
      {allowCP && showCP && (
        <p className="-mt-2 text-xs text-slate-500">{t('ui.preview.cpNote')}</p>
      )}

      {switches.map(({ g, options }) => (
        <div key={g} className="flex items-center gap-3 text-sm text-slate-700">
          <span className="w-24">{t(LOOK_LABELS[g])}</span>
          <div className="flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label={t(LOOK_LABELS[g])}>
            {options.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={template.look![g] === v}
                onClick={() => flip(g, v)}
                className={`px-3 py-1 font-semibold ${template.look![g] === v ? 'bg-[#b3121b] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {t(OPTION_LABELS[v])}
              </button>
            ))}
          </div>
        </div>
      ))}

      {controls}

      {custom && <BackdropControls glass={template.look?.panels !== 'solid'} />}

      {photoPlayer && (
        <div className="space-y-1 rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{photoPlayer.name ? t('ui.preview.photoOf', { name: photoPlayer.name }) : t('ui.preview.photoOfUnnamed')}</span>
            <label className="flex min-w-48 flex-1 items-center gap-2">
              {t('ui.preview.zoom')}
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={photoPlayer.photoZoom ?? 1}
                onChange={(e) => photos!.onChange(photoPlayer.uid, { photoZoom: Number(e.target.value) })}
                className="flex-1 accent-[#b3121b]"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!photoPlayer.photoFit}
                onChange={(e) => photos!.onChange(photoPlayer.uid, { photoFit: e.target.checked || undefined, photoX: undefined, photoY: e.target.checked ? 50 : 30, photoZoom: undefined })}
                className="accent-[#b3121b]"
              />
              {t('ui.preview.fitWhole')}
            </label>
            <Button className="py-1" onClick={() => photos!.onChange(photoPlayer.uid, { photoX: undefined, photoY: photoPlayer.photoFit ? 50 : 30, photoZoom: undefined })}>{t('ui.preview.reset')}</Button>
          </div>
          <p className="text-xs text-slate-500">{t('ui.preview.photoHint')}</p>
        </div>
      )}

      <div
        className={`rounded-xl bg-slate-100 p-2 ${custom && backdrop ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''} ${photos ? '[&_img[data-photo]]:cursor-grab [&_img[data-photo]]:touch-none' : ''}`}
        onPointerDown={drag}
      >
        <BackdropContext.Provider value={{ ...backdropCtx, backdrop: dragging ?? backdrop }}>
        <PhotoFrameContext.Provider value={photoLive}>
          <Scaled width={template.width} height={template.height} nodeRef={node} fitViewport>
            {render(template)}
          </Scaled>
        </PhotoFrameContext.Provider>
        </BackdropContext.Provider>
      </div>

      {showTemplates &&
        <div>
          {templates.length > 1 && templates.every((t) => t.style) ? (
            <StylePicker templates={templates} current={template} onSelect={onSelect} render={render} />
          ) : templates.length > 1 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.preview.templateHeading')}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`rounded-xl border-2 p-2 text-left transition ${t.id === template.id ? 'border-[#b3121b] bg-red-50' : 'border-slate-200 hover:border-slate-400'}`}
                  >
                    <div className="picker-thumb pointer-events-none mb-2 overflow-hidden rounded-md" aria-hidden>
                      <Scaled width={t.width} height={t.height}>{render(t)}</Scaled>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.description}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{t.width}×{t.height}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      }
      </Card>
  )
}

/** Layout button names. The registry keeps the English label for the review sheet; what people see comes from here. */
const LAYOUT_NAMES: Record<StandingsLayout, UiKey> = {
  topcut: 'ui.picker.layout.topcut',
  top8photos: 'ui.picker.layout.top8photos',
  top8mixed: 'ui.picker.layout.top8mixed',
  top4photos: 'ui.picker.layout.top4photos',
  champion: 'ui.picker.layout.champion',
  championphoto: 'ui.picker.layout.championphoto',
  bracket: 'ui.picker.layout.bracket',
  widerows: 'ui.picker.layout.widerows',
  widespot: 'ui.picker.layout.widespot',
  widecols: 'ui.picker.layout.widecols',
  widecolsplain: 'ui.picker.layout.widecolsplain',
}
const layoutName = (id: StandingsLayout) => t(LAYOUT_NAMES[id])

/** The Preview's switches for styles that come several ways. */
const LOOK_LABELS: Record<LookGroup, UiKey> = {
  panels: 'ui.preview.look.panels', card: 'ui.preview.look.card', champion: 'ui.preview.look.champion', map: 'ui.preview.look.map', book: 'ui.preview.look.book',
  sprites: 'ui.preview.look.sprites', colors: 'ui.preview.look.colors', result: 'ui.preview.look.result', snowfall: 'ui.preview.look.snowfall', scene: 'ui.preview.look.scene',
}
const OPTION_LABELS: Record<string, UiKey> = {
  neutral: 'ui.preview.option.neutral',
  game: 'ui.preview.option.game',
  strong: 'ui.preview.option.strong',
  climax: 'ui.preview.option.climax',
  portal: 'ui.preview.option.portal',
  emerged: 'ui.preview.option.emerged',
  win: 'ui.preview.option.win',
  loss: 'ui.preview.option.loss',
  render: 'ui.preview.option.render',
  pixel: 'ui.preview.option.pixel',
  standard: 'ui.preview.option.standard',
  flipped: 'ui.preview.option.flipped',
  hall: 'ui.preview.option.hall',
  sky: 'ui.preview.option.sky',
  solid: 'ui.preview.option.solid',
  glass: 'ui.preview.option.glass',
  classic: 'ui.preview.option.classic',
  modern: 'ui.preview.option.modern',
  // Route 119 (north to south), then Sinnoh Snow
  waterfall: 'ui.preview.option.waterfall',
  bridge: 'ui.preview.option.bridge',
  route120: 'ui.preview.option.route120',
  route217: 'ui.preview.option.route217',
  acuity: 'ui.preview.option.acuity',
  snowpoint: 'ui.preview.option.snowpoint',
  scarlet: 'ui.preview.option.scarlet',
  violet: 'ui.preview.option.violet',
}

/** Custom Glass: upload, zoom, centre and remove the background photo. */
function BackdropControls({ glass }: { glass: boolean }) {
  const { backdrop, setBackdrop, opacity, setOpacity } = useBackdrop()
  const mode = glass ? 'glass' : 'solid'
  const dialog = useDialog()
  const [busy, setBusy] = useState(false)
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      setBackdrop(await readBackdrop(file))
    } catch (e) {
      dialog.notify(t('ui.preview.photoError', { message: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.preview.backgroundPhoto')}</h3>
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
          {busy ? t('ui.common.loading') : backdrop ? t('ui.player.changePhoto') : t('ui.preview.uploadPhoto')}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {backdrop && <Button onClick={() => setBackdrop({ ...backdrop, x: 0.5, y: 0.5, zoom: 1 })}>{t('ui.preview.resetPosition')}</Button>}
        {backdrop && <Button variant="danger" onClick={() => setBackdrop(null)}>{t('ui.common.remove')}</Button>}
      </div>
      {backdrop ? (
        <>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <span className="w-14">{t('ui.preview.zoom')}</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={backdrop.zoom}
              onChange={(e) => setBackdrop({ ...backdrop, zoom: Number(e.target.value) })}
              className="flex-1 accent-[#b3121b]"
            />
          </label>
          <p className="text-xs text-slate-500">{t('ui.preview.backdropDragHint')}</p>
        </>
      ) : (
        <p className="text-xs text-slate-500">{t('ui.preview.backdropUploadHint')}</p>
      )}
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <span className="w-14">{t('ui.preview.opacity')}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity[mode]}
          onChange={(e) => setOpacity({ ...opacity, [mode]: Number(e.target.value) })}
          className="flex-1 accent-[#b3121b]"
        />
        <span className="w-10 text-right tabular-nums text-slate-500">{Math.round(opacity[mode] * 100)}%</span>
        <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setOpacity({ ...opacity, [mode]: DEFAULT_OPACITY[mode] })}>
          {t('ui.preview.default')}
        </button>
      </label>
    </div>
  )
}

/**
 * Standings picker: choose a layout, then a style (the look). Layouts the current style doesn't have
 * are grayed out and say which style they open as (the first style that has them), like the dashed
 * style cards say which layout they open as.
 * Style cards preview each
 * style in the chosen layout. A style that doesn't have the chosen layout can still be picked: it opens
 * in Top Cut (or its first layout). Only the template changes, never the entered data.
 * Usage / Replay / Team Battle have no layouts: just the style cards.
 */
export function StylePicker<T extends Template>({ templates, current, onSelect, render }: { templates: T[]; current: T; onSelect: (id: string) => void; render: (t: T) => ReactNode }) {
  // Retired styles stay hidden unless asked for (the current one always shows, so a saved pick isn't lost).
  const [showRetired, setShowRetired] = useState(false)
  // The other half of a Light / Glass pair has no card: its card is the pair's (`variantOf`).
  const currentStyle = current.variantOf ?? current.style
  // Paired styles open (and preview) in the look last picked on the switch.
  const { looks } = useDisplay()
  const prefer = (t: T) => {
    if (!t.look) return t
    const score = (x: T) => (Object.keys(x.look!) as LookGroup[]).filter((g) => x.look![g] === looks[g]).length
    const kin = templates.filter((x) => x.look && (x.variantOf ?? x.style) === (t.variantOf ?? t.style) && x.layout === t.layout)
    return kin.reduce((best, x) => (score(x) > score(best) ? x : best), t)
  }
  const retiredCount = new Set(templates.filter((t) => t.retired && !t.variantOf).map((t) => t.style)).size
  const styles = [...new Set(templates.filter((t) => !t.variantOf && (showRetired || !t.retired || t.style === currentStyle)).map((t) => t.style!))]
  const inStyle = (style: string) => templates.filter((t) => t.style === style)
  const find = (style: string, layout?: StandingsLayout) => inStyle(style).find((t) => t.layout === layout)
  // What a style opens as when it doesn't have the chosen layout: Top Cut, then whatever it has.
  const fallback = (style: string) => find(style, 'topcut') ?? inStyle(style)[0]
  const layouts = templates.some((t) => t.layout)
  // Card marks: the style's other versions (reached with the Preview's switches) and branding colours.
  const versionCount = (style: string, layout?: StandingsLayout) => templates.filter((x) => (x.variantOf ?? x.style) === style && x.layout === layout).length
  const { colors } = useBrand()
  const brandDots = (which: BrandColour[]) => (
    <span className="flex">
      {which.map((k) => (
        <span key={k} className="-ml-0.5 h-2.5 w-2.5 rounded-full border border-white first:ml-0" style={{ background: colors[k] }} />
      ))}
    </span>
  )
  return (
    <div className="space-y-4">
      {layouts && <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.picker.layoutHeading')}</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ui.picker.layoutLabel')}>
          {STANDINGS_LAYOUTS.map(({ id }) => {
            // Same style, same version (Solid / Glass etc.): only the layout changes.
            const own = find(current.style!, id)
            // Otherwise it opens in the first style that has the layout (in the saved Solid / Glass look).
            const other = own ? undefined : templates.find((x) => x.layout === id && !x.variantOf && !x.retired)
            const layoutTemplate = own ?? (other && prefer(other))
            const opensAs = other && styleName(other.variantOf ?? other.style ?? '')
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={current.layout === id}
                disabled={!layoutTemplate}
                title={opensAs ? t('ui.picker.layoutMissingTitle', { style: styleName(currentStyle ?? ''), layout: layoutName(id), opensAs }) : undefined}
                onClick={() => layoutTemplate && onSelect(layoutTemplate.id)}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                  current.layout === id
                    ? 'border-[#b3121b] bg-red-50 text-slate-900'
                    : own
                      ? 'border-slate-200 text-slate-700 hover:border-slate-400'
                      : 'border-dashed border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-600'
                }`}
              >
                {layoutName(id)}
                {opensAs && <span className="block text-[10px] font-medium leading-tight">{t('ui.picker.opensAs', { name: opensAs })}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {templateDescription(current)}
          {STANDINGS_LAYOUTS.some(({ id }) => !find(current.style!, id)) && <>{' '}{t('ui.picker.dashedNote', { style: styleName(currentStyle ?? '') })}</>}
        </p>
      </div>}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{layouts ? t('ui.picker.styleHeadingN') : t('ui.picker.styleHeading')}</h3>
          {retiredCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
              {t('ui.picker.showRetired', { count: retiredCount })}
            </label>
          )}
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">{brandDots(['main', 'second', 'highlight'])} {t('ui.picker.brandDotsHint')}</span>
          <span className="flex items-center gap-1"><span className="rounded bg-slate-900/80 px-1 font-semibold leading-4 text-white">2</span> {t('ui.picker.versionsHint')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {styles.map((style) => {
            // Show the style in the chosen layout; styles without it show (and open as) their fallback layout.
            const own = find(style, current.layout)
            const target = prefer(own ?? fallback(style))
            const count = inStyle(style).length
            const versions = versionCount(style, target.layout)
            // With 'Show retired styles' on, retired cards stand out so they're easy to go through.
            const retired = showRetired && !!inStyle(style).some((x) => x.retired)
            return (
              <button
                key={style}
                type="button"
                title={own ? undefined : t('ui.picker.styleMissingTitle', { style: styleName(style), layout: target.layout ? layoutName(target.layout) : t('ui.picker.ownLayout') })}
                onClick={() => onSelect(target.id)}
                className={`rounded-xl border-2 p-1.5 text-left transition ${style === currentStyle ? 'border-[#b3121b] bg-red-50' : retired ? 'border-amber-400 bg-amber-50 hover:border-amber-600' : own ? 'border-slate-200 hover:border-slate-400' : 'border-dashed border-slate-300 hover:border-slate-500'}`}
              >
                <div className="picker-thumb pointer-events-none relative mb-1.5 overflow-hidden rounded-md" aria-hidden>
                  <Scaled width={target.width} height={target.height}>{render(target)}</Scaled>
                  <div className="absolute right-1 top-1 flex items-center gap-1">
                    {BRAND_COLOURS[style] && <span className="rounded-full bg-white/90 p-0.5 shadow">{brandDots(BRAND_COLOURS[style])}</span>}
                    {retired && <span className="rounded bg-amber-500 px-1 text-[10px] font-bold uppercase leading-4 text-white shadow">{t('ui.picker.retired')}</span>}
                    {versions > 1 && <span className="rounded bg-slate-900/80 px-1 text-[10px] font-semibold leading-4 text-white shadow">{versions}</span>}
                  </div>
                </div>
                <div className="text-xs font-semibold leading-tight text-slate-900">{styleName(style)}</div>
                {layouts && <div className="text-[11px] text-slate-500">{own ? t('ui.picker.layoutCount', { count }) : t('ui.picker.opensAs', { name: target.layout ? layoutName(target.layout) : t('ui.picker.ownLayout') })}</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
