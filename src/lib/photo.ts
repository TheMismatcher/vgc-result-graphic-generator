// Shrink uploaded images so they stay small enough to keep in browser storage.

async function resize(file: File, maxSize: number, type: 'image/jpeg' | 'image/png', quality?: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL(type, quality)
}

/** Player photos: JPEG, 720px on the longest side; plenty for a card on a 1080px graphic. */
export const resizePhoto = (file: File) => resize(file, 720, 'image/jpeg', 0.85)

/** Logos: PNG (keeps transparency), 400px. */
export const resizeLogo = (file: File) => resize(file, 400, 'image/png')
