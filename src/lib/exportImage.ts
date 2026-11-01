import { toBlob } from 'html-to-image'

const options = (width: number, height: number) => ({
  width,
  height,
  pixelRatio: 1,
  cacheBust: true,
  style: { transform: 'none' }, // the on-screen preview is scaled down; export at full size
})

// Safari (and every iPhone browser, which all use Safari's engine) draws the page before its big images
// (map backgrounds, the logo) have loaded, so the first renders come out without them. There we render
// again until the image stops growing — each pass has more of the images loaded.
const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent)

async function renderBlob(node: HTMLElement, width: number, height: number) {
  await document.fonts.ready
  let blob = await toBlob(node, options(width, height))
  if (isWebKit) {
    for (let pass = 0; pass < 5; pass++) {
      const next = await toBlob(node, options(width, height))
      if (!next) break
      const grew = !blob || next.size > blob.size * 1.01
      if (!blob || next.size >= blob.size) blob = next
      if (!grew && pass > 0) break
    }
  }
  if (!blob) throw new Error('Image was empty.')
  return blob
}

/** Render a template's DOM node to a PNG and download it. */
export async function downloadPng(node: HTMLElement, width: number, height: number, filename: string) {
  const url = URL.createObjectURL(await renderBlob(node, width, height))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Render a template's DOM node to a PNG file (for the phone share sheet). */
export async function renderPngFile(node: HTMLElement, width: number, height: number, filename: string) {
  return new File([await renderBlob(node, width, height)], filename, { type: 'image/png' })
}

/**
 * Phones (iPhone especially) save link downloads to Files, not Photos. There the image goes
 * through the share sheet instead, whose "Save Image" puts it in Photos.
 */
export function canUseShareSheet() {
  if (typeof navigator.canShare !== 'function' || !window.matchMedia('(pointer: coarse)').matches) return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/** Render a template's DOM node to a PNG and put it on the clipboard (paste into Discord, X, etc.). */
export async function copyPng(node: HTMLElement, width: number, height: number) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser can’t copy images. Use Download PNG instead.')
  }
  // Safari needs the ClipboardItem created right away (during the click), with the image as a promise.
  const blob = renderBlob(node, width, height)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'graphic'
