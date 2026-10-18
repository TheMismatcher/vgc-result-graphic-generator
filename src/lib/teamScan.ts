// Read a team from a Pokémon Champions team screenshot ("Moves & More" screen).
//
// 1. Find the six purple team cards (works for phone, Switch, and Switch 2 screenshots: any size
//    or shape, since cards are located by color rather than fixed pixel positions).
// 2. Read the nickname, ability, item, and four moves on each card with text recognition (OCR).
// 3. Work out the species (players nickname their Pokémon): Mega Stone, ability, and learnable
//    moves narrow it down, using public/data/team-scan.json (built by `npm run data`).
//
// Everything runs in the browser; the screenshot is never uploaded.

import { ITEMS, getItem, resolvePokemon, sprites } from '../data/dex'
import { asset } from '../brand'

export interface ScannedMon {
  nickname: string
  ability: string // best match from the ability list ("" if unreadable)
  item: string // item id
  moves: string[] // best matches
  pokemon: string // PokeAPI id ("" if unsure)
  alternatives: string[] // other likely species (PokeAPI ids)
  confident: boolean
}

interface ScanData {
  moves: string[]
  abilities: string[]
  species: [name: string, abilities: number[], types: string[], moves: number[], fullyEvolved: 0 | 1, bst: number][]
}

let scanData: Promise<ScanData> | null = null
const loadScanData = () => (scanData ??= fetch(asset('data/team-scan.json')).then((r) => r.json()))

// ---------- 1. Find the cards ----------

interface Box { x: number; y: number; w: number; h: number }

/** Card purple: a blue-violet, fairly saturated, mid-to-light. Background is cream/yellow. */
function isCardPurple(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max < 90 || max - min < 40 || b !== max) return false
  const hue = ((r - g) / (max - min) + 4) * 60 // blue-max branch of the hue formula
  return hue >= 225 && hue <= 275
}

/** Contiguous runs where `values[i] >= threshold`, as [start, end) pairs, ignoring tiny gaps. */
function runs(values: number[], threshold: number, maxGap: number): [number, number][] {
  const out: [number, number][] = []
  let start = -1, gap = 0
  values.forEach((v, i) => {
    if (v >= threshold) {
      if (start < 0) start = i
      gap = 0
    } else if (start >= 0 && ++gap > maxGap) {
      out.push([start, i - gap + 1])
      start = -1
      gap = 0
    }
  })
  if (start >= 0) out.push([start, values.length - gap])
  return out
}

export function findCards(canvas: HTMLCanvasElement): Box[] {
  // Analyse a small copy for speed.
  const scale = Math.min(1, 600 / canvas.width)
  const w = Math.round(canvas.width * scale), h = Math.round(canvas.height * scale)
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const ctx = small.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(canvas, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const purple = (x: number, y: number) => {
    const i = (y * w + x) * 4
    return isCardPurple(px[i], px[i + 1], px[i + 2])
  }

  // Rows that are mostly purple across the card area → the three card rows (taller than the
  // "Team" bar and the tab switcher, which are also purple).
  const rowCounts = Array.from({ length: h }, (_, y) => {
    let n = 0
    for (let x = 0; x < w; x++) if (purple(x, y)) n++
    return n / w
  })
  let bands = runs(rowCounts, 0.25, 2)
  const tallest = Math.max(0, ...bands.map(([a, b]) => b - a))
  bands = bands.filter(([a, b]) => b - a >= tallest * 0.6)
  if (bands.length < 3) return []
  bands = bands.slice(-3) // the cards are the bottom three bands

  // Within each row, find where the two cards start. Parts of a card (the lighter moves area)
  // can read as less purple, so card widths come from the widest card found: all six match.
  const rows = bands.map(([top, bottom]) => {
    const colCounts = Array.from({ length: w }, (_, x) => {
      let n = 0
      for (let y = top; y < bottom; y++) if (purple(x, y)) n++
      return n / (bottom - top)
    })
    return { top, bottom, cols: runs(colCounts, 0.35, 3).filter(([a, b]) => b - a > w * 0.1) }
  })
  const cardW = Math.max(0, ...rows.flatMap((r) => r.cols.map(([a, b]) => b - a)))
  // Left edges of the two columns: the leftmost segment start, and the first start past one card width.
  const starts = rows.flatMap((r) => r.cols.map(([a]) => a)).sort((a, b) => a - b)
  const leftX = starts[0]
  const rightX = starts.find((x) => x > leftX + cardW * 0.9)
  if (leftX === undefined || rightX === undefined) return []

  // Reading order: left card then right card, row by row.
  return rows.flatMap(({ top, bottom }) =>
    [leftX, rightX].map((x) => ({ x: x / scale, y: top / scale, w: cardW / scale, h: (bottom - top) / scale })),
  )
}

// ---------- 2. Read the text ----------

// Where each line sits inside a card, as fractions of the card's width and height
// (measured on the Moves & More screen).
const FIELDS = {
  nickname: [0.1, 0.0, 0.42, 0.24],
  ability: [0.1, 0.25, 0.6, 0.5],
  item: [0.1, 0.5, 0.6, 0.76],
  move1: [0.655, 0.0, 0.97, 0.25],
  move2: [0.655, 0.25, 0.97, 0.5],
  move3: [0.655, 0.5, 0.97, 0.74],
  move4: [0.655, 0.74, 0.97, 0.99],
} as const

/** Cut one text line out of the screenshot as black text on white, enlarged for OCR. */
function lineImage(source: HTMLCanvasElement, card: Box, [x0, y0, x1, y1]: readonly number[]) {
  const sx = card.x + card.w * x0, sy = card.y + card.h * y0
  const sw = card.w * (x1 - x0), sh = card.h * (y1 - y0)
  const scale = 72 / sh // ~72px tall lines read best
  const out = document.createElement('canvas')
  out.width = Math.round(sw * scale)
  out.height = Math.round(sh * scale)
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height)
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // The card text is near-white; everything else (purple card, coloured icons) becomes white.
    const light = Math.min(d[i], d[i + 1], d[i + 2])
    const v = light > 185 ? 0 : 255
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return out
}

// ---------- 3. Match and identify ----------

function distance(a: string, b: string) {
  const m = a.length, n = b.length
  const row = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[n]
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Closest name in `list` to the OCR text, or "" when nothing is close enough. */
function closest(text: string, list: string[]): string {
  const k = key(text)
  if (k.length < 3) return ''
  let best = '', bestScore = Infinity
  for (const name of list) {
    const d = distance(k, key(name)) / Math.max(k.length, key(name).length)
    if (d < bestScore) {
      bestScore = d
      best = name
    }
  }
  return bestScore <= 0.34 ? best : ''
}

const ITEM_NAMES = ITEMS.map((i) => i.name)
const itemIdByName = new Map(ITEMS.map((i) => [i.name, i.id]))

/** Text-based candidates, best first. `base` is the evidence score; `tie` only breaks ties. */
function candidates(data: ScanData, nickname: string, ability: string, itemId: string, moves: string[]) {
  const abilityIdx = ability ? data.abilities.indexOf(ability) : -1
  const moveIdx = moves.map((m) => data.moves.indexOf(m)).filter((i) => i >= 0)
  // A Mega Stone names its Pokémon outright (e.g. Raichunite Y → Raichu).
  const megaFor = new Set((getItem(itemId)?.mega ?? []).map(([from]) => key(from)))
  const nickSpecies = resolvePokemon(nickname) // un-nicknamed Pokémon show their species name

  const scored = data.species.map(([name, abilities, , learn, fullyEvolved, bst]) => {
    let score = 0
    if (abilityIdx >= 0) score += abilities.includes(abilityIdx) ? 4 : -8
    const learnSet = new Set(learn)
    for (const m of moveIdx) score += learnSet.has(m) ? 1.5 : -3
    if (megaFor.size) score += megaFor.has(key(name)) ? 12 : -12
    if (nickSpecies && resolvePokemon(name) === nickSpecies) score += 6
    const tie = fullyEvolved * 0.8 + bst / 1000 // tournament Pokémon are usually fully evolved
    return { id: resolvePokemon(name), base: score, tie, fullyEvolved }
  })
  const strongEvidence = abilityIdx >= 0 || megaFor.size > 0
  return { list: scored.filter((s) => s.id).sort((a, b) => b.base + b.tie - (a.base + a.tie)), strongEvidence }
}

// ---------- Picture checks: gender icon and the Pokémon sprite ----------

/** Average colour of a small square inside a card (fractions of the card). */
function sample(source: HTMLCanvasElement, card: Box, fx: number, fy: number, size = 0.025) {
  const ctx = source.getContext('2d', { willReadFrequently: true })!
  const s = Math.max(2, Math.round(card.w * size))
  const d = ctx.getImageData(Math.round(card.x + card.w * fx - s / 2), Math.round(card.y + card.h * fy - s / 2), s, s).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
  const n = d.length / 4
  return [r / n, g / n, b / n]
}

/** The first badge after the nickname is the gender icon when the Pokémon has a gender: blue ♂ or red ♀. */
function genderIcon(source: HTMLCanvasElement, card: Box): 'male' | 'female' | null {
  const [r, g, b] = sample(source, card, 0.438, 0.13)
  if (b > r + 40 && b > g + 20) return 'male'
  if (r > b + 40 && r > g + 40) return 'female'
  return null
}

const COLOR_BINS = 4
/** Colour histogram of the "interesting" pixels: skips transparent, card purple, and cream background. */
function histogram(data: Uint8ClampedArray) {
  const h = new Float32Array(COLOR_BINS ** 3)
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 128 || isCardPurple(r, g, b)) continue
    if (r > 200 && g > 180 && b < 210 && r - b > 25) continue // cream/yellow screen background
    const q = (v: number) => Math.min(COLOR_BINS - 1, Math.floor((v / 256) * COLOR_BINS))
    h[q(r) * COLOR_BINS * COLOR_BINS + q(g) * COLOR_BINS + q(b)]++
    n++
  }
  if (n) for (let i = 0; i < h.length; i++) h[i] /= n
  return h
}

const similarity = (a: Float32Array, b: Float32Array) => a.reduce((sum, v, i) => sum + Math.min(v, b[i]), 0)

const renderHistograms = new Map<string, Promise<Float32Array | null>>()
function renderHistogram(id: string) {
  if (!renderHistograms.has(id)) {
    renderHistograms.set(
      id,
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = c.height = 64
          const ctx = c.getContext('2d', { willReadFrequently: true })!
          ctx.drawImage(img, 0, 0, 64, 64)
          resolve(histogram(ctx.getImageData(0, 0, 64, 64).data))
        }
        img.onerror = () => resolve(null)
        img.src = sprites.render(id)
      }),
    )
  }
  return renderHistograms.get(id)!
}

/** The Pokémon picture sits at the card's top-left corner, poking above it. */
function iconHistogram(source: HTMLCanvasElement, card: Box) {
  const ctx = source.getContext('2d', { willReadFrequently: true })!
  const x = Math.round(card.x), y = Math.round(card.y - card.h * 0.17)
  return histogram(ctx.getImageData(x, Math.max(0, y), Math.round(card.w * 0.11), Math.round(card.h * 0.44)).data)
}

const GENDERED: Record<string, [male: string, female: string]> = {
  basculegion: ['basculegion-male', 'basculegion-female'],
  indeedee: ['indeedee-male', 'indeedee-female'],
  meowstic: ['meowstic-male', 'meowstic-female'],
  oinkologne: ['oinkologne-male', 'oinkologne-female'],
}

async function identify(source: HTMLCanvasElement, card: Box, data: ScanData, nickname: string, ability: string, itemId: string, moves: string[]) {
  const { list, strongEvidence } = candidates(data, nickname, ability, itemId, moves)
  // Compare the card's sprite with the artwork of the top text candidates.
  const top = list.slice(0, 6)
  const icon = iconHistogram(source, card)
  const sims = await Promise.all(top.map(async (c) => {
    const h = await renderHistogram(c.id)
    return h ? similarity(icon, h) : 0
  }))
  const ranked = top.map((c, i) => ({ ...c, total: c.base + c.tie + sims[i] * 3 })).sort((a, b) => b.total - a.total)
  let [best] = ranked
  if (!best) return { pokemon: '', alternatives: [], confident: false }

  // Gendered forms (e.g. Basculegion): the gender icon decides.
  const species = Object.keys(GENDERED).find((k) => best.id.startsWith(k))
  let pokemonId = best.id
  if (species) {
    const gender = genderIcon(source, card)
    if (gender) pokemonId = GENDERED[species][gender === 'male' ? 0 : 1]
  }

  // Confident when the evidence (not just tie-breaks) clearly favours this species over any
  // other fully evolved one, or the sprite agrees strongly.
  const rival = ranked.find((c) => c !== best && c.fullyEvolved && c.id.split('-')[0] !== best.id.split('-')[0])
  const confident = strongEvidence && (!rival || best.base - rival.base >= 1.5)
  const alternatives = [...new Set(ranked.map((c) => c.id).filter((id) => id !== pokemonId))].slice(0, 3)
  best = { ...best, id: pokemonId }
  return { pokemon: best.id, alternatives, confident }
}

// ---------- Putting it together ----------

export async function scanTeamScreenshot(file: File, onProgress?: (msg: string) => void): Promise<ScannedMon[]> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.')
  onProgress?.('Reading the screenshot…')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()

  const cards = findCards(canvas)
  if (!cards.length) {
    throw new Error('Couldn’t find the six team cards. Use a screenshot of the “Moves & More” team screen, uncropped.')
  }

  onProgress?.('Loading text recognition (first time takes a moment)…')
  const [{ createWorker, PSM }, data] = await Promise.all([import('tesseract.js'), loadScanData()])
  const worker = await createWorker('eng')
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
  try {
    const results: ScannedMon[] = []
    for (const [i, card] of cards.entries()) {
      onProgress?.(`Reading Pokémon ${i + 1} of 6…`)
      const read = async (field: keyof typeof FIELDS) => (await worker.recognize(lineImage(canvas, card, FIELDS[field]))).data.text.trim()
      const nickname = await read('nickname')
      const ability = closest(await read('ability'), data.abilities)
      const itemName = closest(await read('item'), ITEM_NAMES)
      const moves: string[] = []
      for (const f of ['move1', 'move2', 'move3', 'move4'] as const) {
        const m = closest(await read(f), data.moves)
        if (m) moves.push(m)
      }
      const item = itemIdByName.get(itemName) ?? ''
      results.push({ nickname, ability, item, moves, ...(await identify(canvas, card, data, nickname, ability, item, moves)) })
    }
    // The Stats screen has the same cards but no abilities, items, or moves to read.
    const readable = results.reduce((n, r) => n + r.moves.length + (r.ability ? 1 : 0) + (r.item ? 1 : 0), 0)
    if (readable < 8) throw new Error('Couldn’t read moves or items. Use the “Moves & More” screen, not the Stats screen.')
    return results
  } finally {
    await worker.terminate()
  }
}

