// Live preview of the selected template, the template picker, and the download button.

import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { LookGroup, StandingsLayout, Template } from '../templates/types'
import { STANDINGS_LAYOUTS } from '../templates/registry'
import { copyPng, downloadPng, renderPngFile, slugify, canUseShareSheet } from '../lib/exportImage'
import { brandVars, useBrand } from '../brand'
import { useDisplay } from '../lib/display'
import { BackdropContext, DEFAULT_OPACITY, isBackdropTemplate, opacityVars, readBackdrop, startDrag, useBackdrop } from '../lib/backdrop'
import type { BackdropPhoto, Player } from '../types'
import { PhotoFrameContext, photoFrame } from '../templates/shared/parts'
import { useDialog } from './Dialog'
import { Button, Card } from './ui'

/** Shows a fixed-size graphic scaled down to fit its container. */
export function Scaled({ width, height, maxWidth, children, nodeRef }: { width: number; height: number; maxWidth?: number; children: ReactNode; nodeRef?: React.Ref<HTMLDivElement> }) {
  const vars = { ...brandVars(useBrand()), ...opacityVars(useBackdrop().opacity) }
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth, maxWidth ?? Infinity) / width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, maxWidth])
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
}: {
  templates: T[]
  selectedId: string
  onSelect: (id: string) => void
  render: (t: T) => ReactNode
  filenameBase: string
  allowCP?: boolean // show the "Show CP earned" option (standings graphics only)
  showTemplates?: boolean //show on all but standings by default
  photos?: { players: Player[]; onChange: (uid: string, patch: Partial<Player>) => void } // drag / zoom player photos in the preview
}) {
  const template = templates.find((t) => t.id === selectedId) ?? templates[0]
  const node = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<{ file: File; url: string } | null>(null) // phone: rendered image waiting to be saved
  const { showMegas, setShowMegas, showCP, setShowCP, cpEvent, setCpEvent, setLook } = useDisplay()
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
    const same = (t: T) => (Object.keys(template.look!) as LookGroup[]).every((k) => k === g || t.look![k] === template.look![k])
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
    const s0 = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * f.zoom
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
        x: overX > 0.5 ? clamp(f.x - ((ev.clientX - startX) / k) * (100 / overX)) : f.x,
        y: overY > 0.5 ? clamp(f.y - ((ev.clientY - startY) / k) * (100 / overY)) : f.y,
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
      dialog.notify(`Couldn't copy the image: ${e instanceof Error ? e.message : e}\n\nUse Download PNG instead.`)
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
      dialog.notify(`Couldn't create the image: ${e instanceof Error ? e.message : e}`)
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
      dialog.notify(`Couldn't open the share sheet: ${e instanceof Error ? e.message : e}\n\nPress and hold the image instead, then tap Save to Photos.`)
    }
  }

  return (
    <Card className="space-y-4">
      {saved && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4" onClick={closeSaved}>
          <img src={saved.url} alt="Your graphic" className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-lg" onClick={(e) => e.stopPropagation()} />
          <p className="text-center text-sm text-white/80">Tap Save Image in the share menu, or press and hold the image and tap Save to Photos.</p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button onClick={closeSaved}>Close</Button>
            <Button variant="primary" onClick={share}>Save to Photos</Button>
          </div>
        </div>,
        document.body,
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Preview</h2>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={copy}>{copied ? 'Copied!' : 'Copy image'}</Button>
          <Button variant="primary" disabled={busy} onClick={download}>{busy ? 'Creating…' : 'Download PNG'}</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-[#b3121b]" checked={showMegas} onChange={(e) => setShowMegas(e.target.checked)} />
          Show Mega forms
        </label>
        {allowCP && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[#b3121b]" checked={showCP} onChange={(e) => setShowCP(e.target.checked)} />
            Show CP earned
          </label>
        )}
        {allowCP && showCP && (
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm" role="radiogroup" aria-label="Event type for CP">
            {(['cup', 'challenge'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={cpEvent === k}
                onClick={() => setCpEvent(k)}
                className={`px-3 py-1 font-semibold ${cpEvent === k ? 'bg-[#b3121b] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {k === 'cup' ? 'League Cup' : 'League Challenge'}
              </button>
            ))}
          </div>
        )}
      </div>
      {allowCP && showCP && (
        <p className="-mt-2 text-xs text-slate-500">Official 2027 CP table. Placings below the attendance kicker earn 0 and show no CP; attendance uses the Masters count (or the total if Masters is blank).</p>
      )}

      {switches.map(({ g, options }) => (
        <div key={g} className="flex items-center gap-3 text-sm text-slate-700">
          <span className="w-24">{LOOK_LABELS[g]}</span>
          <div className="flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label={LOOK_LABELS[g]}>
            {options.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={template.look![g] === v}
                onClick={() => flip(g, v)}
                className={`px-3 py-1 font-semibold ${template.look![g] === v ? 'bg-[#b3121b] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {OPTION_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {custom && <BackdropControls glass={template.look?.panels !== 'solid'} />}

      {photoPlayer && (
        <div className="space-y-1 rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{photoPlayer.name || 'Player'}’s photo</span>
            <label className="flex min-w-48 flex-1 items-center gap-2">
              Zoom
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
            <Button className="py-1" onClick={() => photos!.onChange(photoPlayer.uid, { photoX: undefined, photoY: 30, photoZoom: undefined })}>Reset</Button>
          </div>
          <p className="text-xs text-slate-500">Drag a photo in the preview to move it in its frame; click another photo to zoom that one.</p>
        </div>
      )}

      <div
        className={`rounded-xl bg-slate-100 p-2 ${custom && backdrop ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''} ${photos ? '[&_img[data-photo]]:cursor-grab [&_img[data-photo]]:touch-none' : ''}`}
        onPointerDown={drag}
      >
        <BackdropContext.Provider value={{ ...backdropCtx, backdrop: dragging ?? backdrop }}>
        <PhotoFrameContext.Provider value={photoLive}>
          <Scaled width={template.width} height={template.height} nodeRef={node}>
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Template</h3>
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

/** The Preview's switches for styles that come several ways. */
const LOOK_LABELS: Record<LookGroup, string> = { panels: 'Panels', card: 'Card', champion: 'Champion on', map: 'Map' }
const OPTION_LABELS: Record<string, string> = {
  hall: 'Hall of Origin',
  sky: 'Cutscene Sky',
  solid: 'Solid',
  glass: 'Glass',
  classic: 'Classic',
  modern: 'Modern',
  // Route 119 (north to south), then Sinnoh Snow
  waterfall: 'Waterfall',
  bridge: 'Bridge',
  route120: 'Route 120',
  route217: 'Route 217',
  acuity: 'Lake Acuity',
  snowpoint: 'Snowpoint',
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
      dialog.notify(`Couldn't use that photo: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-xs font-semibold uppercase tracking-wide text-slate-500">Background photo</h3>
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-200">
          {busy ? 'Loading…' : backdrop ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {backdrop && <Button onClick={() => setBackdrop({ ...backdrop, x: 0.5, y: 0.5, zoom: 1 })}>Reset position</Button>}
        {backdrop && <Button variant="danger" onClick={() => setBackdrop(null)}>Remove</Button>}
      </div>
      {backdrop ? (
        <>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <span className="w-14">Zoom</span>
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
          <p className="text-xs text-slate-500">Drag the preview to move the photo. Panel and number colours come from the Branding tab.</p>
        </>
      ) : (
        <p className="text-xs text-slate-500">Upload any photo for the background; you can drag it into place. Panel and number colours come from the Branding tab.</p>
      )}
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <span className="w-14">Opacity</span>
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
          Default
        </button>
      </label>
    </div>
  )
}

/**
 * Standings picker: choose a layout, then a style (the look). Every layout can be picked: if the
 * current style doesn't have it yet, the first style that does is used. Style cards preview each
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
  return (
    <div className="space-y-4">
      {layouts && <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">1. Layout</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Layout">
          {STANDINGS_LAYOUTS.map(({ id, label }) => {
            const t = find(current.style!, id) ?? templates.find((x) => x.layout === id)
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={current.layout === id}
                disabled={!t}
                onClick={() => t && onSelect(t.id)}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                  current.layout === id ? 'border-[#b3121b] bg-red-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">{current.description}</p>
      </div>}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{layouts ? '2. Style' : 'Style'}</h3>
          {retiredCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
              Show retired styles ({retiredCount})
            </label>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {styles.map((style) => {
            // Show the style in the chosen layout; styles without it show (and open as) their fallback layout.
            const own = find(style, current.layout)
            const target = prefer(own ?? fallback(style))
            const t = target
            const count = inStyle(style).length
            return (
              <button
                key={style}
                type="button"
                title={own ? undefined : `${style} isn't made for this layout yet, so it opens as ${STANDINGS_LAYOUTS.find((l) => l.id === target.layout)?.label ?? 'its own layout'}`}
                onClick={() => onSelect(target.id)}
                className={`rounded-xl border-2 p-1.5 text-left transition ${style === currentStyle ? 'border-[#b3121b] bg-red-50' : own ? 'border-slate-200 hover:border-slate-400' : 'border-dashed border-slate-300 hover:border-slate-500'}`}
              >
                <div className="picker-thumb pointer-events-none mb-1.5 overflow-hidden rounded-md" aria-hidden>
                  <Scaled width={t.width} height={t.height}>{render(t)}</Scaled>
                </div>
                <div className="text-xs font-semibold leading-tight text-slate-900">{style}</div>
                {layouts && <div className="text-[11px] text-slate-500">{own ? (count === 1 ? '1 layout' : `${count} layouts`) : `Opens as ${STANDINGS_LAYOUTS.find((l) => l.id === target.layout)?.label ?? 'its own layout'}`}</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
