// Live preview of the selected template, the template picker, and the download button.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { StandingsLayout, Template } from '../templates/types'
import { STANDINGS_LAYOUTS } from '../templates/registry'
import { copyPng, downloadPng, slugify } from '../lib/exportImage'
import { brandVars, useBrand } from '../brand'
import { useDisplay } from '../lib/display'
import { useDialog } from './Dialog'
import { Button, Card } from './ui'

/** Shows a fixed-size graphic scaled down to fit its container. */
function Scaled({ width, height, maxWidth, children, nodeRef }: { width: number; height: number; maxWidth?: number; children: ReactNode; nodeRef?: React.Ref<HTMLDivElement> }) {
  const vars = brandVars(useBrand())
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
}: {
  templates: T[]
  selectedId: string
  onSelect: (id: string) => void
  render: (t: T) => ReactNode
  filenameBase: string
  allowCP?: boolean // show the "Show CP earned" option (standings graphics only)
}) {
  const template = templates.find((t) => t.id === selectedId) ?? templates[0]
  const node = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const { showMegas, setShowMegas, showCP, setShowCP, cpEvent, setCpEvent } = useDisplay()
  const dialog = useDialog()

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
    try {
      await downloadPng(node.current, template.width, template.height, `${slugify(filenameBase)}-${template.id}.png`)
    } catch (e) {
      dialog.notify(`Couldn't create the image: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4">
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

      <div className="rounded-xl bg-slate-100 p-2">
        <Scaled width={template.width} height={template.height} nodeRef={node}>
          {render(template)}
        </Scaled>
      </div>

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
                <div className="pointer-events-none mb-2 overflow-hidden rounded-md" aria-hidden>
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
    </Card>
  )
}

/**
 * Standings picker: choose a layout, then a style (the look). Every layout can be picked: if the
 * current style doesn't have it yet, the first style that does is used. Style cards preview each
 * style in the chosen layout. A style that doesn't have the chosen layout can still be picked: it opens
 * in Top Cut (or its first layout). Only the template changes, never the entered data.
 */
function StylePicker<T extends Template>({ templates, current, onSelect, render }: { templates: T[]; current: T; onSelect: (id: string) => void; render: (t: T) => ReactNode }) {
  const styles = [...new Set(templates.map((t) => t.style!))]
  const inStyle = (style: string) => templates.filter((t) => t.style === style)
  const find = (style: string, layout?: StandingsLayout) => inStyle(style).find((t) => t.layout === layout)
  // What a style opens as when it doesn't have the chosen layout: Top Cut, then whatever it has.
  const fallback = (style: string) => find(style, 'topcut') ?? inStyle(style)[0]
  return (
    <div className="space-y-4">
      <div>
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
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">2. Style</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {styles.map((style) => {
            // Show the style in the chosen layout; styles without it show (and open as) their fallback layout.
            const own = find(style, current.layout)
            const target = own ?? fallback(style)
            const t = target
            const count = inStyle(style).length
            return (
              <button
                key={style}
                type="button"
                title={own ? undefined : `${style} isn't made for this layout yet, so it opens as ${STANDINGS_LAYOUTS.find((l) => l.id === target.layout)?.label ?? 'its own layout'}`}
                onClick={() => onSelect(target.id)}
                className={`rounded-xl border-2 p-1.5 text-left transition ${style === current.style ? 'border-[#b3121b] bg-red-50' : own ? 'border-slate-200 hover:border-slate-400' : 'border-dashed border-slate-300 hover:border-slate-500'}`}
              >
                <div className="pointer-events-none mb-1.5 overflow-hidden rounded-md" aria-hidden>
                  <Scaled width={t.width} height={t.height}>{render(t)}</Scaled>
                </div>
                <div className="text-xs font-semibold leading-tight text-slate-900">{style}</div>
                <div className="text-[11px] text-slate-500">{own ? (count === 1 ? '1 layout' : `${count} layouts`) : `Opens as ${STANDINGS_LAYOUTS.find((l) => l.id === target.layout)?.label ?? 'its own layout'}`}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
