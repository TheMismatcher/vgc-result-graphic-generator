// Custom Glass: the user's own photo behind the graphic. Uploaded and positioned from the Preview
// (drag to move, slider to zoom); the same framing is used by every layout and side graphic.

import { createContext, useContext, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { BackdropPhoto } from '../types'

/** Template ids that draw the backdrop (Top Cut, theme layouts and side graphics all share this prefix). */
export const isBackdropTemplate = (id: string) => id.startsWith('custom-glass')

export type PanelOpacity = { glass: number; solid: number }
export const DEFAULT_OPACITY: PanelOpacity = { glass: 0.68, solid: 0.94 }

export const BackdropContext = createContext<{
  backdrop: BackdropPhoto | null
  setBackdrop: (b: BackdropPhoto | null) => void
  opacity: PanelOpacity // the Opacity slider, one value per Panels setting
  setOpacity: (o: PanelOpacity) => void
}>({
  backdrop: null,
  setBackdrop: () => {},
  opacity: DEFAULT_OPACITY,
  setOpacity: () => {},
})
export const useBackdrop = () => useContext(BackdropContext)

/** CSS variables for the panels' opacity (read by .pl-custom and .pl-custom.light). */
export const opacityVars = (o: PanelOpacity) =>
  ({ '--custom-glass': `${Math.round(o.glass * 100)}%`, '--custom-solid': `${Math.round(o.solid * 100)}%` }) as CSSProperties

/** Where the photo sits in a width x height frame: it always covers the frame, `zoom` enlarges it from there. */
function fit(b: BackdropPhoto, width: number, height: number) {
  const s = Math.max(width / b.w, height / b.h) * b.zoom
  const dw = b.w * s
  const dh = b.h * s
  return { dw, dh, left: (width - dw) * b.x, top: (height - dh) * b.y }
}

/** The photo (or, before one is uploaded, a gradient in the brand colours). */
export function BackdropImage({ width, height }: { width: number; height: number }) {
  const { backdrop } = useBackdrop()
  if (!backdrop) return <div className="pl-custom-empty" style={{ position: 'absolute', inset: 0 }} />
  const { dw, dh, left, top } = fit(backdrop, width, height)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={backdrop.src} alt="" draggable={false} style={{ position: 'absolute', left, top, width: dw, height: dh, maxWidth: 'none' }} />
    </div>
  )
}

/** Photos: JPEG, 1800px on the longest side (room to zoom in on a 1080px graphic). */
export async function readBackdrop(file: File): Promise<BackdropPhoto> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return { src: canvas.toDataURL('image/jpeg', 0.82), w: canvas.width, h: canvas.height, x: 0.5, y: 0.5, zoom: 1 }
}

/**
 * Pointer handler for dragging the photo on a preview of a `width` x `height` graphic. `el` is the
 * scaled graphic, so screen pixels are converted back to graphic pixels. `move` gets each new position
 * (shown live), `done` the last one (saved once, not on every pointer move).
 */
export function startDrag(
  e: ReactPointerEvent,
  el: HTMLElement,
  b: BackdropPhoto,
  width: number,
  height: number,
  move: (b: BackdropPhoto) => void,
  done: (b: BackdropPhoto) => void,
) {
  if (e.button !== 0) return
  e.preventDefault()
  const scale = el.getBoundingClientRect().width / width
  const { dw, dh } = fit(b, width, height)
  const startX = e.clientX
  const startY = e.clientY
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  let last = b
  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / scale
    const dy = (ev.clientY - startY) / scale
    last = {
      ...b,
      x: dw > width ? clamp(b.x - dx / (dw - width)) : b.x,
      y: dh > height ? clamp(b.y - dy / (dh - height)) : b.y,
    }
    move(last)
  }
  const up = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    done(last)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}
