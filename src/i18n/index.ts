// Every piece of text a visitor can see comes from here, so it can be reviewed in one place and
// translated. How to add or change text: src/i18n/README.md.
//
// Two languages, set separately:
//   t()  – the website (buttons, hints, dialogs, errors, style names and descriptions in the picker)
//   gt() – the graphics (text printed on the PNGs), plus gtDate() / gtOrdinal() for dates and placings
// Both read the language at call time, so call them while rendering, never at the top level of a module.

import en from './en.json'
import templatesEn from './templates.en.json'

export type Lang = 'en' | 'es'
/** Languages people can pick. Spanish is added once the English is final and translated. */
export const LANGS: Lang[] = ['en']

export type Key = keyof typeof en
type Prefixed<P extends string> = Extract<Key, `${P}.${string}`>
/** Website text: `ui.*`, plus shared official terms (`term.*`, e.g. event types). */
export type UiKey = Prefixed<'ui'> | Prefixed<'term'>
/** Graphics text: `gfx.*`, plus shared official terms (`term.*`). */
export type GfxKey = Prefixed<'gfx'> | Prefixed<'term'>
export type Vars = Record<string, string | number>

// Style names and descriptions come from the template registry; scripts/i18n/templates.mjs keeps
// templates.en.json in step with it (keys style.<slug> and desc.<hash of the registry's English>).
const catalogs: Partial<Record<Lang, Record<string, string>>> = { en: { ...en, ...templatesEn } }
const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-ES' }

const STORE = { ui: 'dmv-ui-lang', gfx: 'dmv-gfx-lang' }
function stored(key: string): Lang | null {
  try {
    const v = globalThis.localStorage?.getItem(key)
    return v && (LANGS as string[]).includes(v) ? (v as Lang) : null
  } catch {
    return null
  }
}
let uiLang: Lang = stored(STORE.ui) ?? 'en'
let gfxLang: Lang = stored(STORE.gfx) ?? uiLang

export const getUiLang = () => uiLang
export const getGfxLang = () => gfxLang
/** Change the languages. The app must re-render afterwards (the language switch remounts it). */
export function setLanguages(next: { ui?: Lang; gfx?: Lang }) {
  if (next.ui) uiLang = next.ui
  if (next.gfx) gfxLang = next.gfx
  try {
    globalThis.localStorage?.setItem(STORE.ui, uiLang)
    globalThis.localStorage?.setItem(STORE.gfx, gfxLang)
  } catch {
    /* private window: the choice lasts until reload */
  }
}

// Review aid: open the site with ?ids (or set localStorage 'dmv-i18n-ids' to '1') and every string
// shows its sheet ID after it, so text on screen can be matched to its row in the review sheet.
const showIds = (() => {
  try {
    return typeof location !== 'undefined' && (new URLSearchParams(location.search).has('ids') || localStorage.getItem('dmv-i18n-ids') === '1')
  } catch {
    return false
  }
})()

function lookup(lang: Lang, key: string): string | undefined {
  return catalogs[lang]?.[key] ?? catalogs.en?.[key]
}

// Plural choices: {count, plural, one {# player} other {# players}} ("=0 {…}" also works). Inside a
// choice, # is the number and {other} variables still work.
const CHOICE = String.raw`\{((?:[^{}]|\{\w+\})*)\}`
const PLURAL = new RegExp(String.raw`\{(\w+),\s*plural,((?:\s*(?:=\d+|\w+)\s*` + CHOICE + String.raw`)+)\s*\}`, 'g')
const OPTION = new RegExp(String.raw`(=\d+|\w+)\s*` + CHOICE, 'g')

export function format(lang: Lang, text: string, vars?: Vars): string {
  let out = text
  if (vars) {
    out = out.replace(PLURAL, (_, name: string, body: string) => {
      const n = Number(vars[name])
      const options: Record<string, string> = {}
      for (const m of body.matchAll(OPTION)) options[m[1]] = m[2]
      const pick = options[`=${n}`] ?? options[new Intl.PluralRules(LOCALES[lang]).select(n)] ?? options.other ?? ''
      return pick.replace(/#/g, String(n))
    })
    out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
  }
  return out
}

function translate(lang: Lang, key: string, vars?: Vars, fallback?: string): string {
  const text = lookup(lang, key) ?? fallback ?? key
  const out = format(lang, text, vars)
  return showIds ? `${out} ⟨${key}⟩` : out
}

/** Website text in the site's language. */
export const t = (key: UiKey, vars?: Vars) => translate(uiLang, key, vars)
/** Graphics text in the graphics' language. */
export const gt = (key: GfxKey, vars?: Vars) => translate(gfxLang, key, vars)

/** Website text looked up by a key built at run time (style names, descriptions); falls back to `english`. */
export const tDynamic = (key: string, english: string) => translate(uiLang, key, undefined, english)

/** A date on a graphic: "October 9, 2026" / "9 de octubre de 2026". */
export function gtDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).toLocaleDateString(LOCALES[gfxLang], { month: 'long', day: 'numeric', year: 'numeric' })
}

/** A placing on a graphic: 1st, 2nd, 3rd / 1.º, 2.º. */
export function gtOrdinal(n: number) {
  if (gfxLang === 'es') return `${n}.º`
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** A number on a graphic with the language's separators (1,234 / 1.234). */
export const gtNumber = (n: number) => n.toLocaleString(LOCALES[gfxLang])
