import { toBlob, toPng } from 'html-to-image'

const options = (width: number, height: number) => ({
  width,
  height,
  pixelRatio: 1,
  cacheBust: true,
  style: { transform: 'none' }, // the on-screen preview is scaled down; export at full size
})

/** Render a template's DOM node to a PNG and download it. */
export async function downloadPng(node: HTMLElement, width: number, height: number, filename: string) {
  await document.fonts.ready
  const dataUrl = await toPng(node, options(width, height))
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

/** Render a template's DOM node to a PNG and put it on the clipboard (paste into Discord, X, etc.). */
export async function copyPng(node: HTMLElement, width: number, height: number) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser can’t copy images. Use Download PNG instead.')
  }
  // Safari needs the ClipboardItem created right away (during the click), with the image as a promise.
  const blob = document.fonts.ready.then(async () => {
    const b = await toBlob(node, options(width, height))
    if (!b) throw new Error('Image was empty.')
    return b
  })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'graphic'
