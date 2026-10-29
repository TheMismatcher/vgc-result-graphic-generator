// Brands people make on the Branding tab (name, tagline, logo, colors), kept in this browser so
// they can switch between them. Stored apart from the tournament, so "Start over", "Load sample"
// and opening a tournament file never touch them. A brands file moves them to another device.

import { useEffect, useRef, useState } from 'react'
import type { BrandSettings } from '../types'

export interface SavedBrand {
  id: string
  name: string
  tagline: string
  logo: string // PNG data URL, or ''
  colors: BrandSettings['colors']
}

const KEY = 'dmv-generator-brands'
const FILE_TYPE = 'vgc-graphics-brands'

function load(): SavedBrand[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list.filter(isBrand) : []
  } catch {
    return []
  }
}

function isBrand(b: unknown): b is SavedBrand {
  const x = b as SavedBrand
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && !!x.colors && typeof x.colors.main === 'string'
}

/** The saved brands, kept in sync with this browser's storage. `onSaveFailed` runs if storage is full. */
export function useSavedBrands(onSaveFailed?: () => void) {
  const [brands, setBrands] = useState<SavedBrand[]>(load)
  const onFail = useRef(onSaveFailed)
  useEffect(() => {
    onFail.current = onSaveFailed
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(brands))
    } catch {
      onFail.current?.()
    }
  }, [brands])
  return [brands, setBrands] as const
}

export const brandFromSettings = (s: BrandSettings, id: string = crypto.randomUUID()): SavedBrand => ({
  id,
  name: s.name,
  tagline: s.tagline,
  logo: s.logo,
  colors: { ...s.colors },
})

/** Download the brands as a file (to back up, move to another device, or share). */
export function saveBrandsFile(brands: SavedBrand[]) {
  const blob = new Blob([JSON.stringify({ type: FILE_TYPE, version: 1, brands }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = brands.length === 1 ? `${brands[0].name || 'brand'}.brand.json` : 'brands.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Read a brands file. Imported brands get new ids so they never replace ones already here. */
export async function openBrandsFile(file: File): Promise<SavedBrand[]> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error("That file isn't a brands file.")
  }
  const d = data as { type?: string; brands?: unknown[] }
  if (d?.type !== FILE_TYPE || !Array.isArray(d.brands)) throw new Error("That file isn't a brands file (save one with “Export brands”).")
  const brands = d.brands.filter(isBrand).map((b) => ({ ...b, id: crypto.randomUUID(), tagline: b.tagline ?? '', logo: b.logo ?? '' }))
  if (!brands.length) throw new Error('No brands found in that file.')
  return brands
}
