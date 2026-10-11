// Branding for the app and the templates. "DMV VGC" is built in; "Custom" lets any
// community use their own name, logo, and colors (set on the Branding tab).

import { createContext, useContext, type CSSProperties } from 'react'
import type { BrandSettings } from './types'

/** Resolve a file in /public so it works locally and when hosted under a sub-path. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export interface Brand {
  name: string
  tagline: string
  logo: string // image URL, or '' for no logo
  banner: string // wide header image, or '' to show the logo + name instead
  colors: { main: string; second: string; highlight: string }
}

export const DMV_BRAND: Brand = {
  name: 'DMV VGC',
  tagline: 'US Pokémon League',
  logo: asset('brand/logo.png'),
  banner: asset('brand/banner.png'),
  colors: { main: '#b3121b', second: '#6b9cf6', highlight: '#ffd34e' },
}

export const defaultBrandSettings = (): BrandSettings => ({
  preset: 'dmv',
  name: '',
  tagline: '',
  logo: '',
  colors: { ...DMV_BRAND.colors },
})

export function resolveBrand(s: BrandSettings): Brand {
  if (s.preset === 'dmv') return DMV_BRAND
  return { name: s.name || 'VGC Tournament', tagline: s.tagline, logo: s.logo, banner: '', colors: s.colors }
}

/** Mix a hex color toward black (amount 0..1). Used for the darker panel shades. */
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount))
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

/** CSS variables the templates read (see templates/shared/brand.css). */
export function brandVars(b: Brand): CSSProperties {
  return {
    '--brand-red': b.colors.main,
    '--brand-red-dark': darken(b.colors.main, 0.3),
    '--brand-blue': b.colors.second,
    '--brand-blue-dark': darken(b.colors.second, 0.55),
    '--brand-yellow': b.colors.highlight,
  } as CSSProperties
}

export const BrandContext = createContext<Brand>(DMV_BRAND)
export const useBrand = () => useContext(BrandContext)
