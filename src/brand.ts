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

/** Shift a hex color's lightness by `delta` percentage points (HSL), keeping its hue and saturation. */
function shiftLightness(hex: string, delta: number) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [16, 8, 0].map((s) => ((n >> s) & 255) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  const l2 = Math.min(1, Math.max(0, l + delta / 100))
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s
  const p = 2 * l2 - q
  const hue = (t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return `#${[hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}

// The DMV artwork's own light/deep shades, used exactly when the DMV colors are in use.
const DMV_SHADES = { redLight: '#e0242e', blueLight: '#8fb6ff', yellowLight: '#fff2b0', yellowDeep: '#f2a900' }

/** CSS variables the templates read (see templates/shared/brand.css). */
export function brandVars(b: Brand): CSSProperties {
  const c = b.colors
  const dmv = c.main === DMV_BRAND.colors.main && c.second === DMV_BRAND.colors.second && c.highlight === DMV_BRAND.colors.highlight
  return {
    '--brand-red': c.main,
    '--brand-red-dark': darken(c.main, 0.3),
    '--brand-red-light': dmv ? DMV_SHADES.redLight : shiftLightness(c.main, 12),
    '--brand-blue': c.second,
    '--brand-blue-dark': darken(c.second, 0.55),
    '--brand-blue-light': dmv ? DMV_SHADES.blueLight : shiftLightness(c.second, 9),
    '--brand-yellow': c.highlight,
    '--brand-yellow-light': dmv ? DMV_SHADES.yellowLight : shiftLightness(c.highlight, 20),
    '--brand-yellow-deep': dmv ? DMV_SHADES.yellowDeep : shiftLightness(c.highlight, -18),
  } as CSSProperties
}

export const BrandContext = createContext<Brand>(DMV_BRAND)
export const useBrand = () => useContext(BrandContext)
