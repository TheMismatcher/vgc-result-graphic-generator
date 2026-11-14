// npm run i18n:sync
// 1. Brings src/i18n/templates.en.json in step with the template registry: adds new style names and
//    Standings descriptions (with the registry's English), keeps reviewed wording for ones that still
//    exist, and drops ones that are gone. A changed description in the registry is a new key (the key is
//    a hash of the registry's English), so it comes back for review.
// 2. Writes scripts/i18n/out/rows.json: one row per catalog string for the review sheet
//    (id, where, type, english, note, maxLength, files). Updating the sheet from it: src/i18n/README.md.

import fs from 'node:fs'
import path from 'node:path'
import { EN, NOTES, OUT, ROOT, TEMPLATES_EN, readJson, templateText, writeCatalog } from './lib.mjs'

const { styles, descs } = await templateText()
const before = readJson(TEMPLATES_EN)
const next = {}
for (const [k, s] of [...styles].sort((a, b) => a[1].english.localeCompare(b[1].english))) next[k] = before[k] ?? s.english
for (const [k, d] of descs) next[k] = before[k] ?? d.english
const added = Object.keys(next).filter((k) => !(k in before))
const removed = Object.keys(before).filter((k) => !(k in next))
writeCatalog(TEMPLATES_EN, next)
console.log(`templates.en.json: ${Object.keys(next).length} strings (${added.length} new, ${removed.length} removed).`)

// ---- review rows ----
const en = readJson(EN)
const notes = readJson(NOTES)
const noteOf = (k) => (typeof notes[k] === 'string' ? { note: notes[k] } : notes[k] ?? {})

// Where each key is used in the code (for the "Code" column and to say where it shows).
const sources = []
const walk = (p) => {
  for (const f of fs.readdirSync(p)) {
    const abs = path.join(p, f)
    if (fs.statSync(abs).isDirectory()) walk(abs)
    else if (/\.(tsx?|mjs|html)$/.test(f) && !abs.includes(`${path.sep}i18n${path.sep}`)) sources.push([path.relative(ROOT, abs), fs.readFileSync(abs, 'utf8')])
  }
}
walk(path.join(ROOT, 'src'))
walk(path.join(ROOT, 'home')) // the mismatched.gg home page uses the same catalog (scripts/i18n/home.mjs)
const filesUsing = (k) => sources.filter(([, text]) => text.includes(`'${k}'`) || text.includes(`"${k}"`)).map(([f]) => f)

// Friendly names for the second part of a key. Anything not listed is shown as written.
const AREAS = {
  common: 'Shared (many places)', app: 'Top of the page / tabs', standings: 'Standings tab', usage: 'Usage tab', replay: 'Replay tab',
  teamBattle: 'Team Battle tab', eventResults: 'Event Results tab', branding: 'Branding tab', preview: 'Preview (every tab)',
  picker: 'Style picker (every tab)', player: 'Player editor', bracket: 'Bracket editor', tournament: 'Event details form', import: 'Imports',
  dialog: 'Dialogs', limitless: 'Limitless', tdf: 'TOM file (.tdf)', pokepaste: 'Pokepaste / Showdown', teamSheet: 'Team lists', screenshot: 'Team screenshot', standingsPhoto: 'Standings photo', day2: 'Event Results tab', error: 'Error messages', results: 'Results link', rk9: 'RK9', day2Event: 'Event Results kinds', notImage: 'Image check', ocrLoading: 'Text recognition', format: 'Battle formats', type: 'Pokémon types', facts: 'Facts line under the title', eventType: 'Event types', sportsPage: 'Sports Page', home: 'Home page (mismatched.gg)',
}
const camel = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
// Graphics areas that share a name with a website area but are a different place.
const GFX_AREAS = { bracket: 'Bracket', usage: 'Usage', vsResult: 'VS Result (match)', eras: 'Era looks (Game Boy, Pokédex, trading card)', editorial: 'Editorial', teamBattle: 'Team Battle', day2: 'Event Results', comicRef: 'Comic poster', wide: 'Wide (landscape) layouts', tradingCard: 'Trading card' }
const area = (k) => {
  const [, a, b] = k.split('.')
  const name = (k.startsWith('gfx.') && GFX_AREAS[a]) || AREAS[a] || camel(a)
  return a === 'import' && b ? `${name} · ${AREAS[b] ?? camel(b)}` : name
}
const TYPE = { ui: 'Website', gfx: 'Graphic', term: 'Official term (website + graphics)' }

const rows = []
for (const [id, english] of Object.entries(en)) {
  const kind = id.split('.')[0]
  const where = kind === 'gfx' ? `Graphics · ${area(id).replace('Shared (many places)', 'all styles')}` : kind === 'term' ? `Website + graphics · ${area(id)}` : `Website · ${area(id)}`
  rows.push({ id, where, type: TYPE[kind] ?? kind, english, ...noteOf(id), files: filesUsing(id).join(', ') })
}
for (const [id, s] of styles) {
  const tabs = [...s.tabs].map(([tab, retired]) => tab + (retired ? ' [retired]' : '')).join(', ')
  rows.push({ id, where: `Style picker card · ${tabs}`, type: 'Style name', english: next[id], ...noteOf(id), registry: s.english, retired: [...s.tabs.values()].every(Boolean), files: '' })
}
for (const [id, d] of descs) {
  const uses = [...d.uses]
  rows.push({ id, where: `Standings · under the layout buttons · ${uses.slice(0, 6).join('; ')}${uses.length > 6 ? `; +${uses.length - 6} more` : ''}`, type: 'Style description', english: next[id], ...noteOf(id), registry: d.english, retired: !d.live, files: '' })
}
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 1) + '\n')
console.log(`scripts/i18n/out/rows.json: ${rows.length} rows (${rows.filter((r) => r.retired).length} only on retired styles).`)
