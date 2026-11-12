// Shared helpers for the string-catalog scripts (scripts/i18n/*.mjs).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const EN = path.join(ROOT, 'src/i18n/en.json')
export const TEMPLATES_EN = path.join(ROOT, 'src/i18n/templates.en.json')
export const NOTES = path.join(ROOT, 'src/i18n/notes.json')
export const OUT = path.join(ROOT, 'scripts/i18n/out')

export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))

/** Write a flat catalog, keeping key order, with a blank line between groups (first two key parts). */
export function writeCatalog(file, obj) {
  const keys = Object.keys(obj)
  const group = (k) => k.split('.').slice(0, /^(style|desc)\./.test(k) ? 1 : 2).join('.')
  const lines = keys.map((k, i) => {
    const gap = i > 0 && group(keys[i - 1]) !== group(k) ? '\n' : ''
    return `${gap}  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])}${i < keys.length - 1 ? ',' : ''}`
  })
  fs.writeFileSync(file, keys.length ? `{\n${lines.join('\n')}\n}\n` : '{}\n')
}

export const TABS = {
  STANDINGS_TEMPLATES: 'Standings',
  USAGE_TEMPLATES: 'Usage',
  MATCH_TEMPLATES: 'Replay',
  TEAM_BATTLE_TEMPLATES: 'Team Battle',
  DAY2_TEMPLATES: 'Event Results',
}

/**
 * Load the template registry (through Vite, so TSX/CSS/image imports work) and collect the text the
 * style picker shows: every style name (a card's name is `variantOf ?? style`) and every Standings
 * description (shown under the layout buttons; the other tabs don't show descriptions).
 */
export async function templateText() {
  const { createServer } = await import('vite')
  const server = await createServer({ root: ROOT, configFile: path.join(ROOT, 'vite.config.ts'), server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  try {
    const reg = await server.ssrLoadModule('/src/templates/registry.ts')
    const { styleKey, descriptionKey } = await server.ssrLoadModule('/src/i18n/templates.ts')
    const styles = new Map() // key -> { english, tabs: Map(tab -> allRetired) }
    const descs = new Map() // key -> { english, uses: Set('Style · Layout'), live: boolean }
    const layoutLabel = Object.fromEntries(reg.STANDINGS_LAYOUTS.map((l) => [l.id, l.label]))
    for (const [list, tab] of Object.entries(TABS)) {
      for (const t of reg[list]) {
        const card = t.variantOf ?? t.style
        const sk = styleKey(card)
        if (!styles.has(sk)) styles.set(sk, { english: card, tabs: new Map() })
        const s = styles.get(sk)
        if (s.english !== card) throw new Error(`Two style names share the key ${sk}: "${s.english}" and "${card}"`)
        s.tabs.set(tab, (s.tabs.get(tab) ?? true) && !!t.retired)
        if (tab !== 'Standings') continue
        const dk = descriptionKey(t.description)
        if (!descs.has(dk)) descs.set(dk, { english: t.description, uses: new Set(), live: false })
        const d = descs.get(dk)
        const versionOf = t.variantOf && t.style !== t.variantOf ? ` (${t.style})` : ''
        d.uses.add(`${card}${versionOf} · ${layoutLabel[t.layout] ?? t.layout}${t.retired ? ' [retired]' : ''}`)
        d.live ||= !t.retired
      }
    }
    return { styles, descs }
  } finally {
    await server.close()
  }
}
