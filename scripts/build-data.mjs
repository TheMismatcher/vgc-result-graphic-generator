// Builds the Pokémon / item lists from PokeAPI and downloads their sprites.
//
//   npm run data            -> rebuild lists + download any sprites not yet on disk
//   npm run data -- --force -> re-download every sprite
//
// Outputs:
//   src/data/pokemon.json, src/data/items.json
//   public/sprites/pokemon/<id>.png  (small 96px sprite, used in the pickers)
//   public/sprites/home/<id>.png     (HOME 3D render, used on graphics)
//   public/sprites/items/<id>.png     (small pixel icon, fallback)
//   public/sprites/items-hd/<id>.png  (smooth 160px bag icon, preferred)
//
// Re-run whenever PokeAPI adds new Pokémon (e.g. a new DLC).

import { mkdir, writeFile, access, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
const ENGLISH = '9'
const HOME_SIZE = 240 // px; HOME renders are 512px, this keeps the repo small
const FORCE = process.argv.includes('--force')

// Held-item categories worth offering in the item picker.
const ITEM_CATEGORIES = new Set([
  'medicine', 'in-a-pinch', 'picky-healing', 'type-protection', 'held-items', 'choice',
  'bad-held-items', 'plates', 'species-specific', 'type-enhancement',
  'scarves', 'jewels', 'mega-stones', 'memories',
])

// Forms nobody brings to a tournament.
const SKIP_POKEMON = /-(totem|starter)(-|$)|^pikachu-(rock-star|belle|pop-star|phd|libre|cosplay)$/

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

const titleCase = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

function fallbackName(identifier, speciesName, speciesIdentifier) {
  const rest = identifier.startsWith(speciesIdentifier) ? identifier.slice(speciesIdentifier.length + 1) : identifier
  if (!rest) return speciesName
  if (/(^|-)mega(-|$)/.test(rest)) {
    const extra = rest.replace(/(^|-)mega(-|$)/, '$1').replace(/^-|-$/g, '')
    return `Mega ${speciesName}${extra ? ' ' + titleCase(extra) : ''}`
  }
  return `${speciesName} (${titleCase(rest)})`
}

async function exists(file) {
  try { await access(file); return true } catch { return false }
}

async function download(url, dest, headers = {}) {
  if (!FORCE && (await exists(dest))) return true
  const res = await fetch(url, { headers })
  if (!res.ok) return false
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  return true
}

async function pool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }))
  return results
}

async function buildPokemon() {
  console.log('Fetching Pokémon data…')
  const [pokemon, species, speciesNames, forms, formNames] = await Promise.all([
    csv('pokemon'), csv('pokemon_species'), csv('pokemon_species_names'), csv('pokemon_forms'), csv('pokemon_form_names'),
  ])
  const speciesById = new Map(species.map((s) => [s.id, s]))
  const speciesName = new Map(speciesNames.filter((n) => n.local_language_id === ENGLISH).map((n) => [n.pokemon_species_id, n.name]))
  const defaultFormByPokemon = new Map(forms.filter((f) => f.is_default === '1').map((f) => [f.pokemon_id, f.id]))
  const formName = new Map(formNames.filter((n) => n.local_language_id === ENGLISH && n.pokemon_name).map((n) => [n.pokemon_form_id, n.pokemon_name]))
  // The game's own form label ("Heat Rotom", "Alolan Form", "Paldean Form (Combat Breed)"); used to
  // match forms written that way, e.g. on RK9 team lists ("Rotom [Heat Rotom]").
  const formLabel = new Map(formNames.filter((n) => n.local_language_id === ENGLISH && n.form_name).map((n) => [n.pokemon_form_id, n.form_name]))

  const list = pokemon
    .filter((p) => !SKIP_POKEMON.test(p.identifier))
    .map((p) => {
      const sp = speciesById.get(p.species_id)
      const base = speciesName.get(p.species_id) ?? titleCase(sp.identifier)
      const official = formName.get(defaultFormByPokemon.get(p.id))
      // Default forms read better as the plain species ("Sinistcha", not "Unremarkable Form Sinistcha").
      const name = p.is_default === '1' && (!official || / Form /.test(` ${official} `)) ? base : (official ?? fallbackName(p.identifier, base, sp.identifier))
      const form = p.is_default === '1' ? undefined : formLabel.get(defaultFormByPokemon.get(p.id))
      return { id: p.identifier, name, species: base, dex: Number(p.species_id), isDefault: p.is_default === '1', speciesId: sp.identifier, ...(form && { form }) }
    })

  // Make duplicate names unique, e.g. male/female Mega Meowstic.
  const seen = new Map()
  for (const p of list) seen.set(p.name, (seen.get(p.name) ?? 0) + 1)
  for (const p of list) {
    if (seen.get(p.name) > 1) {
      const rest = p.id.slice(p.speciesId.length + 1).split('-').filter((w) => w !== 'mega').join('-')
      if (rest) p.name = `${p.name} (${titleCase(rest)})`
    }
    delete p.speciesId
  }

  const dirs = ['pokemon', 'home'].map((d) => path.join(ROOT, 'public/sprites', d))
  await Promise.all(dirs.map((d) => mkdir(d, { recursive: true })))
  const numericId = new Map(pokemon.map((p) => [p.identifier, p.id]))

  console.log(`Downloading sprites for ${list.length} Pokémon (existing files are skipped)…`)
  let done = 0
  const found = await pool(list, 24, async (p) => {
    const n = numericId.get(p.id)
    const small = await download(`${SPRITES}/pokemon/${n}.png`, path.join(dirs[0], `${p.id}.png`))
    const home =
      (await download(`${SPRITES}/pokemon/other/home/${n}.png`, path.join(dirs[1], `${p.id}.png`))) ||
      (await download(`${SPRITES}/pokemon/other/official-artwork/${n}.png`, path.join(dirs[1], `${p.id}.png`)))
    if (++done % 200 === 0) console.log(`  ${done}/${list.length}`)
    return small || home
  })

  const kept = list.filter((_, i) => found[i])
  const missing = list.filter((_, i) => !found[i]).map((p) => p.id)
  if (missing.length) console.log(`No sprite on PokeAPI for: ${missing.join(', ')}`)
  return kept
}

async function buildItems() {
  console.log('Fetching item data…')
  const [items, categories, names] = await Promise.all([csv('items'), csv('item_categories'), csv('item_names')])
  const wanted = new Set(categories.filter((c) => ITEM_CATEGORIES.has(c.identifier)).map((c) => c.id))
  const english = new Map(names.filter((n) => n.local_language_id === ENGLISH).map((n) => [n.item_id, n.name]))
  const seenIds = new Set()
  const list = items
    .filter((i) => wanted.has(i.category_id) && !seenIds.has(i.identifier) && seenIds.add(i.identifier))
    .map((i) => ({ id: i.identifier, name: english.get(i.id) ?? titleCase(i.identifier) }))

  const dir = path.join(ROOT, 'public/sprites/items')
  await mkdir(dir, { recursive: true })
  const found = await pool(list, 24, (i) => download(`${SPRITES}/items/${i.id}.png`, path.join(dir, `${i.id}.png`)))
  const fromShowdown = await showdownItemIcons(list.filter((_, i) => !found[i]).map((i) => i.id), dir)
  const hd = await hdItemIcons(list)
  const megas = await megaStones()
  const result = list.map((item, i) => {
    const mega = megas.get(item.id.replace(/-/g, ''))
    return { ...item, hasSprite: found[i] || fromShowdown.has(item.id), hd: hd.has(item.id), ...(mega && { mega }) }
  })
  const missing = result.filter((i) => !i.hasSprite && !i.hd).map((i) => i.id)
  if (fromShowdown.size) console.log(`Used Showdown icons for ${fromShowdown.size} newer items.`)
  console.log(`Smooth HD icons for ${hd.size}/${list.length} items; the rest use pixel icons.`)
  if (missing.length) console.log(`No item sprite anywhere for: ${missing.join(', ')}`)
  return result
}

// Which Pokémon each Mega Stone evolves, from Showdown's item data:
// "garchompitez" -> [["Garchomp", "Garchomp-Mega-Z"]]. Names are resolved to ids in the app.
async function megaStones() {
  const res = await fetch('https://play.pokemonshowdown.com/data/items.js')
  if (!res.ok) return new Map()
  const js = await res.text()
  const map = new Map()
  for (const m of js.matchAll(/[{,](\w+):\{name:"[^"]*",spritenum:\d+,megaStone:\{([^}]*)\}/g)) {
    map.set(m[1], [...m[2].matchAll(/"?([A-Za-z0-9-]+)"?:"([^"]+)"/g)].map((p) => [p[1], p[2]]))
  }
  return map
}

// Smooth 160px bag icons. Bulbagarden's archive has the full modern set (Scarlet/Violet
// and Legends: Z-A, incl. Champions Mega Stones); PokeAPI has some as a backup.
// Thanks to Bulbagarden (archives.bulbagarden.net) for hosting these.
const WIKI = 'https://archives.bulbagarden.net/w/api.php'
const UA = { 'User-Agent': 'dmv-generator/1.0 (fan tournament graphics tool; one-time icon download)' }

async function hdItemIcons(list) {
  const dir = path.join(ROOT, 'public/sprites/items-hd')
  await mkdir(dir, { recursive: true })
  const done = new Set()
  const todo = []
  for (const item of list) {
    if (!FORCE && (await exists(path.join(dir, `${item.id}.png`)))) done.add(item.id)
    else todo.push(item)
  }
  if (!todo.length) return done
  console.log(`Looking up HD icons for ${todo.length} items on Bulbagarden…`)

  // File names look like "Bag Choice Scarf SV Sprite.png"; prefer the newest game (ZA).
  const fileFor = (name, game) => `File:Bag ${name.replace(/’/g, "'")} ${game} Sprite.png`
  const titles = todo.flatMap((i) => [fileFor(i.name, 'ZA'), fileFor(i.name, 'SV')])
  const urls = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const params = new URLSearchParams({ action: 'query', titles: titles.slice(i, i + 50).join('|'), prop: 'imageinfo', iiprop: 'url', format: 'json', formatversion: '2' })
    const res = await fetch(`${WIKI}?${params}`, { headers: UA })
    if (!res.ok) { console.log(`  Bulbagarden lookup failed (${res.status}); skipping the rest.`); break }
    const data = await res.json()
    const normalized = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]))
    for (const page of data.query.pages) {
      if (page.imageinfo?.[0]?.url) urls.set(normalized.get(page.title) ?? page.title, page.imageinfo[0].url)
    }
  }

  await pool(todo, 4, async (item) => {
    const dest = path.join(dir, `${item.id}.png`)
    const url = urls.get(fileFor(item.name, 'ZA')) ?? urls.get(fileFor(item.name, 'SV'))
    const ok =
      (url && (await download(url, dest, UA))) ||
      (await download(`${SPRITES}/items/gen9/${item.id}.png`, dest)) ||
      (await download(`${SPRITES}/items/gen8/${item.id}.png`, dest))
    if (ok) done.add(item.id)
  })
  return done
}

// PokeAPI lacks icons for newer items (Gen 9, Champions Mega Stones), so cut
// them out of Pokémon Showdown's 24px item icon sheet instead.
async function showdownItemIcons(ids, dir) {
  const done = new Set()
  if (!ids.length || process.platform !== 'darwin') return done
  const todo = FORCE ? ids : (await Promise.all(ids.map(async (id) => ((await exists(path.join(dir, `${id}.png`))) ? (done.add(id), null) : id)))).filter(Boolean)
  if (!todo.length) return done
  const js = await (await fetch('https://play.pokemonshowdown.com/data/items.js')).text()
  const spritenum = new Map([...js.matchAll(/[{,](\w+):\{name:"[^"]*",spritenum:(\d+)/g)].map((m) => [m[1], Number(m[2])]))
  const sheet = path.join(os.tmpdir(), 'showdown-itemicons-sheet.png')
  if (!(await download('https://play.pokemonshowdown.com/sprites/itemicons-sheet.png', sheet))) return done
  for (const id of todo) {
    const n = spritenum.get(id.replace(/-/g, ''))
    if (n === undefined) continue
    const x = (n % 16) * 24, y = Math.floor(n / 16) * 24
    execFileSync('sips', ['-c', '24', '24', '--cropOffset', String(y), String(x), sheet, '--out', path.join(dir, `${id}.png`)], { stdio: 'ignore' })
    done.add(id)
  }
  return done
}

function resizeHomeRenders() {
  if (process.platform !== 'darwin') return console.log('Skipping HOME render resize (needs macOS `sips`).')
  console.log(`Resizing HOME renders to ${HOME_SIZE}px…`)
  const dir = path.join(ROOT, 'public/sprites/home')
  return readdir(dir).then((files) => {
    const pngs = files.filter((f) => f.endsWith('.png')).map((f) => path.join(dir, f))
    for (let i = 0; i < pngs.length; i += 200) {
      execFileSync('sips', ['-Z', String(HOME_SIZE), ...pngs.slice(i, i + 200)], { stdio: 'ignore' })
    }
  })
}

const pokemon = await buildPokemon()
const items = await buildItems()
await resizeHomeRenders()
await mkdir(path.join(ROOT, 'src/data'), { recursive: true })
await writeFile(path.join(ROOT, 'src/data/pokemon.json'), JSON.stringify(pokemon))
await writeFile(path.join(ROOT, 'src/data/items.json'), JSON.stringify(items))
console.log(`Done: ${pokemon.length} Pokémon, ${items.length} items.`)
