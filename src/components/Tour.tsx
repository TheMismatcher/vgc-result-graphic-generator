// First-visit feature tour: a short walk past the parts of the page people miss (the sample data, the
// layout and style pickers, the imports, the preview options, Branding). Shows once per browser on its
// own and again from "Take the tour" in the header. Each stop highlights the elements marked
// data-tour="<target>" (several elements = one box around all of them).
//
// Nothing blocks the page while it's open: the dimming ignores the pointer and the page scrolls as usual.
// On phones the caption sits at the bottom of the screen and the page scrolls the stop into the space above it.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t, type UiKey } from '../i18n'
import { Button } from './ui'

const SEEN_KEY = 'dmv-generator:tour-seen'

export function tourSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false // storage blocked: show it; markTourSeen can't stick either, so it shows each visit
  }
}
export function markTourSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* private window / storage blocked */
  }
}

/** Sent when the tour starts, so the page can show what the tour points at (Standings, Templates panel). */
export const TOUR_START_EVENT = 'dmv-tour-start'

interface Stop {
  target?: string // data-tour value; none = a card in the middle of the screen
  title: UiKey
  body: UiKey
}

const STOPS: Stop[] = [
  { title: 'ui.tour.welcome.title', body: 'ui.tour.welcome.body' },
  { target: 'file', title: 'ui.tour.sample.title', body: 'ui.tour.sample.body' },
  { target: 'tabs', title: 'ui.tour.tabs.title', body: 'ui.tour.tabs.body' },
  { target: 'layout', title: 'ui.tour.layout.title', body: 'ui.tour.layout.body' },
  { target: 'styles', title: 'ui.tour.styles.title', body: 'ui.tour.styles.body' },
  { target: 'tab-data', title: 'ui.tour.data.title', body: 'ui.tour.data.body' },
  { target: 'options', title: 'ui.tour.options.title', body: 'ui.tour.options.body' },
  { target: 'preview', title: 'ui.tour.preview.title', body: 'ui.tour.preview.body' },
  { target: 'tab-branding', title: 'ui.tour.branding.title', body: 'ui.tour.branding.body' },
]

const PHONE = 640 // below this width the caption is a sheet at the bottom of the screen
const GAP = 12 // space between the highlight and the caption, and from the screen edges
const PAD = 6 // highlight box around the elements
const CARD_W = 340

interface Box { top: number; left: number; width: number; height: number }

/** One box around every visible element marked with this target, in screen coordinates. */
function measure(target: string): Box | null {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour~="${target}"]`)]
  const rects = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0)
  if (!rects.length) return null
  const top = Math.min(...rects.map((r) => r.top))
  const left = Math.min(...rects.map((r) => r.left))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  const right = Math.max(...rects.map((r) => r.right))
  return { top, left, width: right - left, height: bottom - top }
}

const same = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5)

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [cardH, setCardH] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const stop = STOPS[step]
  const last = step === STOPS.length - 1
  const phone = view.w < PHONE

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  // Follow the highlighted elements while the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (!open) return
    let frame = 0
    const tick = () => {
      const next = stop.target ? measure(stop.target) : null
      setBox((prev) => (same(prev, next) ? prev : next))
      setView((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }))
      const h = card.current?.offsetHeight ?? 0
      setCardH((prev) => (prev === h ? prev : h))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [open, stop.target])

  // Bring each stop into view (above the caption sheet on phones), and move focus to the caption.
  useLayoutEffect(() => {
    if (!open) return
    primary.current?.focus({ preventScroll: true })
    if (!stop.target) return
    const id = requestAnimationFrame(() => {
      const r = measure(stop.target!)
      if (!r) return
      const sheet = window.innerWidth < PHONE ? (card.current?.offsetHeight ?? 0) + GAP : 0
      const space = window.innerHeight - sheet - 2 * GAP
      const top = r.top - PAD
      const bottom = r.top + r.height + PAD
      if (top >= GAP && bottom <= GAP + space) return // already in view
      // Centre it in the free space, or line its top up with the top of the screen when it's taller.
      const delta = r.height + 2 * PAD <= space ? top - GAP - (space - (r.height + 2 * PAD)) / 2 : top - GAP
      const first = document.querySelector<HTMLElement>(`[data-tour~="${stop.target}"]`)
      // The Preview scrolls inside its own column on wide screens; let the browser handle that one.
      if (!sheet && first && scrollParent(first)) first.scrollIntoView({ block: r.height + 2 * PAD <= space ? 'center' : 'start', behavior: 'smooth' })
      else window.scrollBy({ top: delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [open, step, stop.target])

  const next = useCallback(() => (last ? onClose() : setStep((s) => s + 1)), [last, onClose])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && !isTyping(e.target)) next()
      else if (e.key === 'ArrowLeft' && !isTyping(e.target)) back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, next, back])

  if (!open) return null

  // The highlight, kept inside the screen so it never widens the page.
  const hl = box && clip({ top: box.top - PAD, left: box.left - PAD, width: box.width + 2 * PAD, height: box.height + 2 * PAD }, view)

  // Where the caption goes: a sheet at the bottom on phones; on wider screens below the highlight,
  // above it, beside it, or (when the highlight fills the screen) in the bottom corner.
  let cardStyle: React.CSSProperties
  if (phone) cardStyle = { left: 8, right: 8, bottom: 8, maxHeight: '60vh' }
  else if (!hl) cardStyle = { width: CARD_W + 60, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  else {
    const h = cardH || 200
    const x = Math.min(Math.max(hl.left, GAP), view.w - CARD_W - GAP)
    const y = (top: number) => Math.min(Math.max(top, GAP), view.h - h - GAP)
    const bottom = hl.top + hl.height
    if (view.h - bottom >= h + 2 * GAP) cardStyle = { width: CARD_W, left: x, top: bottom + GAP }
    else if (hl.top >= h + 2 * GAP) cardStyle = { width: CARD_W, left: x, top: hl.top - GAP - h }
    else if (view.w - (hl.left + hl.width) >= CARD_W + 2 * GAP) cardStyle = { width: CARD_W, left: hl.left + hl.width + GAP, top: y(hl.top) }
    else if (hl.left >= CARD_W + 2 * GAP) cardStyle = { width: CARD_W, left: hl.left - GAP - CARD_W, top: y(hl.top) }
    else cardStyle = { width: CARD_W, right: GAP, bottom: GAP }
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" data-tour-overlay>
      {hl ? (
        <div
          className="absolute rounded-xl transition-all duration-200 ease-out"
          // A white-and-red edge (shows on the black header and on the white cards), then the dimming.
          style={{ ...hl, boxShadow: '0 0 0 2px #fff, 0 0 0 4px #b3121b, 0 0 0 200vmax rgba(15, 23, 42, 0.55)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="pointer-events-auto fixed flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
        style={{ ...cardStyle, paddingBottom: phone ? 'max(1rem, env(safe-area-inset-bottom))' : undefined }}
      >
        {/* On a short phone screen only the text scrolls; the buttons stay in view. */}
        <div className="min-h-0 overflow-y-auto">
        {step > 0 && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('ui.tour.stepCount', { n: step, total: STOPS.length - 1 })}
          </div>
        )}
        <h2 id="tour-title" className={step === 0 ? 'text-xl font-black italic uppercase tracking-tight text-slate-900' : 'text-lg font-bold text-slate-900'}>
          {t(stop.title)}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-slate-700">{t(stop.body)}</p>
        </div>
        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2">
          {step === 0 ? (
            <>
              <Button variant="ghost" className="mr-auto" onClick={onClose}>{t('ui.tour.skip')}</Button>
              <Button ref={primary} variant="primary" onClick={next}>{t('ui.tour.start')}</Button>
            </>
          ) : (
            <>
              {!last && <Button variant="ghost" className="-ml-2" onClick={onClose}>{t('ui.tour.skipTour')}</Button>}
              <div className="ml-auto flex gap-2">
                <Button onClick={back}>{t('ui.tour.back')}</Button>
                <Button ref={primary} variant="primary" onClick={next}>{last ? t('ui.tour.done') : t('ui.tour.next')}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function clip(b: Box, view: { w: number; h: number }): Box | null {
  const left = Math.max(b.left, 2)
  const top = Math.max(b.top, 2)
  const right = Math.min(b.left + b.width, view.w - 2)
  const bottom = Math.min(b.top + b.height, view.h - 2)
  if (right <= left || bottom <= top) return { top: Math.min(Math.max(b.top, 2), view.h - 4), left, width: Math.max(right - left, 2), height: 2 } // off screen: a sliver at the edge while it scrolls in
  return { top, left, width: right - left, height: bottom - top }
}

/** The nearest scrolling box (other than the page) around an element. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
