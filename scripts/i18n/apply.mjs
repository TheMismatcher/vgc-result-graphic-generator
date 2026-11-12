// npm run i18n:apply -- <edits.json>
// Writes reviewed wording into the catalog. <edits.json> is an array of { "id": "...", "text": "..." }
// (made from the review sheet's approved rows; see src/i18n/README.md). Each id must already exist in
// src/i18n/en.json or src/i18n/templates.en.json. Prints what changed; changes nothing for unknown ids.

import fs from 'node:fs'
import { EN, TEMPLATES_EN, readJson, writeCatalog } from './lib.mjs'

const file = process.argv[2]
if (!file || !fs.existsSync(file)) {
  console.error('Usage: npm run i18n:apply -- <edits.json>')
  process.exit(1)
}
const edits = readJson(file)
const en = readJson(EN)
const tpl = readJson(TEMPLATES_EN)
const unknown = edits.filter((e) => !(e.id in en) && !(e.id in tpl))
if (unknown.length) {
  console.error(`Not in the catalog (nothing written):\n  ${unknown.map((e) => e.id).join('\n  ')}`)
  process.exit(1)
}
const vars = (s) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort().join(',')
let changed = 0
for (const { id, text } of edits) {
  const cat = id in en ? en : tpl
  if (cat[id] === text) continue
  if (vars(cat[id]) !== vars(text)) console.warn(`! ${id}: placeholders differ ({${vars(cat[id])}} -> {${vars(text)}}). Check the code passes them.`)
  console.log(`${id}\n  - ${cat[id]}\n  + ${text}`)
  cat[id] = text
  changed++
}
writeCatalog(EN, en)
writeCatalog(TEMPLATES_EN, tpl)
console.log(`${changed} string(s) updated.`)
