// Style names and template descriptions shown in the style picker. The registry's own `style` and
// `description` strings stay as they are (style names double as ids); what visitors see is looked up
// here, so the reviewed and translated wording lives in the catalog. Missing entries fall back to the
// registry's English, so a new style shows up right away (and `npm run i18n:sync` adds it for review).

import { tDynamic } from '.'

/** Same 32-bit FNV-1a as scripts/i18n/templates.mjs: the key of a description is a hash of its registry English. */
export function textHash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export const styleSlug = (style: string) =>
  style
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const styleKey = (style: string) => `style.${styleSlug(style)}`
export const descriptionKey = (description: string) => `desc.${textHash(description)}`

/** A style's name as shown on its picker card. */
export const styleName = (style: string) => tDynamic(styleKey(style), style)

/** A template's description as shown under the layout buttons. */
export const templateDescription = (t: { description: string }) => tDynamic(descriptionKey(t.description), t.description)
