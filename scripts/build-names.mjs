// Pokémon, move, ability and item names in the nine languages Pokémon events print, from
// PokeAPI's CSV dump. One small file per language so a page only loads what it needs.
//
//   npm run names   (also run by `npm run data`)
//
// Output: public/data/names/<lang>.json =
//   { pokemon: { "<English species name>": name }, moves: { "<English>": name },
//     abilities: { "<English>": name }, items: { "<item id>": name } }
// All Pokémon and items are kept (not just ones legal now), so new formats need no rebuild.
// Anything PokeAPI hasn't translated yet is left out; readers fall back to English.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const ENGLISH = '9'
// Our code -> PokeAPI language id. Japanese is the kana spelling the games and team lists use.
export const LANGUAGES = { en: '9', fr: '5', de: '6', es: '7', it: '8', ja: '1', ko: '3', 'zh-Hant': '4', 'zh-Hans': '12' }

async function csv(name) {
  const res = await fetch(`${CSV}/${name}.csv`)
  if (!res.ok) throw new Error(`Failed to fetch ${name}.csv: ${res.status}`)
  const [header, ...rows] = parseCsv(await res.text())
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** "<id column> -> English name" and per-language "<English name> -> local name" for one names CSV. */
function byEnglish(rows, idCol) {
  const english = new Map(rows.filter((r) => r.local_language_id === ENGLISH).map((r) => [r[idCol], r.name]))
  const out = Object.fromEntries(Object.keys(LANGUAGES).map((l) => [l, {}]))
  for (const r of rows) {
    const en = english.get(r[idCol])
    const lang = Object.keys(LANGUAGES).find((l) => LANGUAGES[l] === r.local_language_id)
    if (en && lang && r.name) out[lang][en] = r.name.replace(/\s+/g, ' ').trim()
  }
  return out
}

export async function buildNames() {
  console.log('Building translated names…')
  const [species, moves, abilities, items, itemNames] = await Promise.all([
    csv('pokemon_species_names'), csv('move_names'), csv('ability_names'), csv('items'), csv('item_names'),
  ])
  const pokemon = byEnglish(species, 'pokemon_species_id')
  const move = byEnglish(moves, 'move_id')
  const ability = byEnglish(abilities, 'ability_id')
  const itemId = new Map(items.map((i) => [i.id, i.identifier]))
  const item = Object.fromEntries(Object.keys(LANGUAGES).map((l) => [l, {}]))
  for (const r of itemNames) {
    const lang = Object.keys(LANGUAGES).find((l) => LANGUAGES[l] === r.local_language_id)
    const id = itemId.get(r.item_id)
    if (lang && id && r.name) item[lang][id] = r.name.replace(/\s+/g, ' ').trim()
  }
  const dir = path.join(ROOT, 'public/data/names')
  await mkdir(dir, { recursive: true })
  for (const lang of Object.keys(LANGUAGES)) {
    const data = { pokemon: pokemon[lang], moves: move[lang], abilities: ability[lang], items: item[lang] }
    await writeFile(path.join(dir, `${lang}.json`), JSON.stringify(data))
    console.log(`  ${lang}: ${Object.keys(data.pokemon).length} Pokémon, ${Object.keys(data.moves).length} moves, ${Object.keys(data.abilities).length} abilities, ${Object.keys(data.items).length} items`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildNames()
