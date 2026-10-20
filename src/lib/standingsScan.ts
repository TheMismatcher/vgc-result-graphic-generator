// Read standings from a photo or screenshot of a TOM standings page ("Standings - Round X/Y",
// columns Standing / Name / Flight / Drop Round / Match Record / …). For events where a picture
// is all that gets posted. Runs in the browser with tesseract.js; nothing is uploaded.
//
// Photos are tilted and taken at an angle, so: straighten the image, find the column headers,
// read the Name column and the Match Record column separately, then pair them row by row.

export interface ScannedStanding {
  place: number
  name: string
  record: string // "W-L-T" style used elsewhere in the app, e.g. "6-2-0"
  check: boolean // looks doubtful: worth a look in the review list
}

export interface StandingsScan {
  tournament: string // from "Tournament: …", or ''
  rows: ScannedStanding[]
}

type Worker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>
interface Line { text: string; y: number; x0: number; words: Word[] }
interface Word { text: string; x0: number; x1: number; y0: number; y1: number }

// ---------- Image prep ----------

async function loadCanvas(file: File) {
  const bmp = await createImageBitmap(file)
  const scale = 2000 / Math.max(bmp.width, bmp.height) // a consistent starting size (up or down)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c
}

/** Find how far the text is tilted (degrees): the angle where rows of dark pixels line up best. */
function skewAngle(src: HTMLCanvasElement) {
  const w = 600, h = Math.round((src.height * w) / src.width)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const dark: [number, number][] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 < 110) dark.push([x, y])
    }
  let best = 0, bestScore = -1
  for (let a = -8; a <= 8; a += 0.25) {
    const t = (a * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t)
    const rows = new Float64Array(h * 2)
    for (const [x, y] of dark) {
      const yy = Math.round(-x * sin + y * cos + h / 2)
      if (yy >= 0 && yy < rows.length) rows[yy]++
    }
    let score = 0
    for (const v of rows) score += v * v
    if (score > bestScore) {
      bestScore = score
      best = a
    }
  }
  return best
}

function straighten(src: HTMLCanvasElement) {
  const angle = skewAngle(src)
  if (Math.abs(angle) < 0.25) return src
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((-angle * Math.PI) / 180)
  ctx.drawImage(src, -c.width / 2, -c.height / 2)
  return c
}

function resize(src: HTMLCanvasElement, factor: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * factor)
  c.height = Math.round(src.height * factor)
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c
}

function crop(src: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) {
  x0 = Math.max(0, Math.round(x0))
  y0 = Math.max(0, Math.round(y0))
  x1 = Math.min(src.width, Math.round(x1))
  y1 = Math.min(src.height, Math.round(y1))
  const c = document.createElement('canvas')
  c.width = Math.max(1, x1 - x0)
  c.height = Math.max(1, y1 - y0)
  c.getContext('2d')!.drawImage(src, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
  return c
}

/**
 * Erase table borders: dark runs much longer than a letter, across or down. Screenshots have
 * solid black grid lines round every cell, which stop OCR reading the text inside them.
 */
function removeRules(src: HTMLCanvasElement, textHeight: number) {
  const { width: w, height: h } = src
  const ctx = src.getContext('2d')!
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const lum = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = (px[i * 4] * 3 + px[i * 4 + 1] * 6 + px[i * 4 + 2]) / 10
  const paper = median(Array.from({ length: 2000 }, (_, i) => lum[Math.floor((i * w * h) / 2000)]))
  const dark = (i: number) => lum[i] < paper * 0.55
  const minRun = Math.round(textHeight * 3)
  const erase = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; ) {
      let e = x
      while (e < w && dark(y * w + e)) e++
      if (e - x >= minRun) for (let dy = -1; dy <= 1; dy++) if (y + dy >= 0 && y + dy < h) erase.fill(1, (y + dy) * w + x, (y + dy) * w + e)
      x = e + 1
    }
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; ) {
      let e = y
      while (e < h && dark(e * w + x)) e++
      if (e - y >= minRun) for (let yy = y; yy < e; yy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < w) erase[yy * w + x + dx] = 1
      y = e + 1
    }
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  for (let i = 0; i < w * h; i++) if (erase[i]) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255
  out.getContext('2d')!.putImageData(img, 0, 0)
  return out
}

// ---------- OCR helpers ----------

async function ocr(worker: Worker, image: HTMLCanvasElement, yOffset = 0, xOffset = 0) {
  const { data } = await worker.recognize(image, {}, { blocks: true })
  const lines: Line[] = []
  const words: Word[] = []
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs)
      for (const l of p.lines) {
        const text = l.text.trim()
        const lineWords = l.words.map((w) => ({ text: w.text, x0: w.bbox.x0 + xOffset, x1: w.bbox.x1 + xOffset, y0: w.bbox.y0 + yOffset, y1: w.bbox.y1 + yOffset }))
        words.push(...lineWords)
        if (text) lines.push({ text, y: (l.bbox.y0 + l.bbox.y1) / 2 + yOffset, x0: l.bbox.x0 + xOffset, words: lineWords })
      }
  return { lines, words, text: data.text }
}

// ---------- Parsing ----------

/**
 * "6/2/0 (9)" -> "6-2-0". Fixes common misreads: a table border read as a leading "1"
 * ("16/2/0"), a missing slash ("32/0"), letters for digits. Returns '' if unreadable.
 */
export function parseRecord(raw: string, maxGames: number, usePoints = false): { record: string; check: boolean; alt?: string } {
  const read = readRecord(raw, maxGames)
  // Match points (3 per win, 1 per tie) are often printed next to the record: they confirm a
  // read, or recover the record when only the "/L/T" part was readable ("la/0/0 (12)").
  // Only for tables where the points do follow that rule (not every event's do).
  const points = raw.match(/\((\d{1,2})\)/)?.[1]
  if (!usePoints || points === undefined) return read
  const [l, t] = read.record ? read.record.split('-').slice(1).map(Number) : (raw.split('(')[0].match(/\/\s*(\d)\s*\/\s*(\d)/)?.slice(1).map(Number) ?? [])
  if (l === undefined) return read
  const w = (Number(points) - t) / 3
  if (!Number.isInteger(w) || w < 0 || w + l + t > maxGames) return read
  const fixed = `${w}-${l}-${t}`
  if (fixed === read.record) return { record: fixed, check: false }
  // A read that disagrees with the points: keep it but flag it (top cut wins don't add points),
  // and offer the points' version for the neighbouring rows to decide between.
  // (Only for a read we already had to patch up: a clean "6/0/0" with 12 points is a top cut run.)
  if (read.record) return read.check ? { ...read, alt: fixed } : { ...read, check: true }
  return { record: fixed, check: true }
}

function readRecord(raw: string, maxGames: number): { record: string; check: boolean } {
  const core = raw.replace(/[Oo]/g, '0').split('(')[0].replace(/[^0-9/]/g, '')
  if (!/^\d+\/\d+\/\d+$/.test(core)) {
    const fixed = slashesFromSevens(core, maxGames)
    if (fixed) return { record: fixed, check: true }
  }
  const s = raw.replace(/[Oo]/g, '0').split('(')[0].split(')')[0] // letter O for zero; drop the match points "(9)"
  const parts = s.replace(/[^0-9/]/g, '').split('/').filter((p) => p !== '')
  if (!parts.length) return { record: '', check: true }

  let digits: number[]
  let check = false
  if (parts.length >= 3) {
    let w = parts[0]
    // L and T are single digits; anything extra is noise (e.g. the points glued on: "3/3/09").
    const l = parts[1][0], t = parts[2][0]
    // A table border ("16/2/0") or the Drop Round number ("41/3/0") glued onto the wins.
    while (w.length > 1 && Number(w) > maxGames) {
      w = w.slice(1)
      check = true
    }
    digits = [Number(w), Number(l), Number(t)]
  } else {
    // A slash went missing ("32/0", "132/0", "1/403"): rebuild from the digits.
    let d = parts.join('')
    if (d.length === 4 && d.startsWith('1') && parts[0] !== '1') d = d.slice(1) // border read as "1"
    digits = d.slice(0, 3).split('').map(Number)
    check = true
  }
  if (digits.length !== 3 || digits.some((n) => Number.isNaN(n)) || digits.reduce((a, b) => a + b, 0) > maxGames) return { record: '', check: true }
  return { record: digits.join('-'), check }
}

/**
 * Small or blurry text can turn a "/" into a "7" ("57270" for 5/2/0). Losses and ties are single
 * digits, so try reading 7s as slashes (and a table border as a leading "1") until the record
 * has the W/L/T shape; the fewest changes wins.
 */
function slashesFromSevens(core: string, maxGames: number): string {
  let best = { record: '', cost: Infinity }
  for (const drop of [0, 1]) {
    if (drop && core[0] !== '1') continue
    const s = core.slice(drop)
    const sevens = [...s].flatMap((c, i) => (c === '7' ? [i] : []))
    if (sevens.length > 5) continue
    for (let mask = 0; mask < 1 << sevens.length; mask++) {
      const chars = [...s]
      let cost = drop * 2
      sevens.forEach((i, b) => {
        if (!(mask & (1 << b))) return
        chars[i] = '/'
        cost++
      })
      const m = chars.join('').match(/^(\d{1,2})\/(\d)\/(\d)$/)
      if (!m || cost >= best.cost) continue
      const [w, l, t] = m.slice(1).map(Number)
      if (w + l + t > maxGames || w + l + t === 0) continue
      best = { record: `${w}-${l}-${t}`, cost }
    }
  }
  return best.record
}

/** Strip placing numbers, table borders, and flight-column junk from a name line. */
export function cleanName(raw: string): { place: number | null; name: string; check: boolean } {
  const tokens = raw
    .replace(/[[\]|{}~_“”"()]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9'’.-]+$/g, '').replace(/^[lI1](?=[A-ZÀ-Þ][a-zà-ÿ])/, '')) // "lAlexander" → "Alexander"
    .filter(Boolean)
  // The placing number comes first (OCR may garble it: "l18", "117").
  const placeToken = tokens.find((t) => /\d/.test(t))
  const place = placeToken ? Number(placeToken.replace(/[^0-9]/g, '')) || null : null

  const isNameWord = (w: string) => /^[A-ZÀ-Þ][a-zà-ÿ'’.-]+$/.test(w) || /^[A-ZÀ-Þ][a-zà-ÿ]+[A-ZÀ-Þ][a-zà-ÿ]+$/.test(w) // "McGinley"
  const particle = (w: string) => /^(de|da|del|van|von|der|la|le|di|du)$/.test(w)
  const capitalize = (w: string) => w[0].toUpperCase() + w.slice(1)
  let fixed = false // we changed what OCR read, so flag the row for a look
  const name: string[] = []
  for (const raw of tokens) {
    if (/\d/.test(raw)) continue
    // Two words glued together ("BenCrouch"), but not "McGinley", "DeShawn", "MacLeod".
    const glued = raw.match(/^([A-ZÀ-Þ][a-zà-ÿ]{2,})([A-ZÀ-Þ][a-zà-ÿ]{2,})$/)
    const parts = glued && !/^(Mac|Van|Von|Del|Dela)$/.test(glued[1]) ? (fixed = true, [glued[1], glued[2]]) : [raw]
    for (const t of parts) {
      if (isNameWord(t) || (name.length && particle(t))) name.push(t)
      // A surname given as an initial ("Constanza C"); not "I", which is usually a table border.
      else if (name.length && /^[A-HJ-Z]\.?$/.test(t)) name.push(t)
      // A lowercase word is a name typed or read in lowercase ("keith rycek", "aren moy"):
      // 4+ letters anywhere, or 3+ letters as the surname right after a first name.
      else if (/^[a-zà-ÿ]{4,}$/.test(t) || (name.length === 1 && /^[a-zà-ÿ]{3}$/.test(t))) {
        name.push(capitalize(t))
        fixed = true
      } else if (name.length) break // junk after the name
    }
    if (name.length && !isNameWord(name[name.length - 1]) && !particle(name[name.length - 1])) break
  }
  // A garbled placing number read as letters ("Lo Joey McGinley") or flight-column marks
  // after the name ("John Owen Jai"): short words at the edges of a 3+ word name.
  if (name.length >= 3 && name[0].length <= 2) name.shift()
  while (name.length > 2 && name[name.length - 1].length <= 3) name.pop()
  // Stray punctuation at the end of words ("Crouch."), but keep initials like "J.".
  const tidy = name.map((w) => (w.length > 2 ? w.replace(/[.'’-]+$/, '') : w))
  return { place, name: tidy.join(' '), check: name.length < 2 || fixed }
}

interface Grid {
  gap: number
  at: (k: number) => number // y of row k
  rows: (Line | undefined)[] // OCR line for each row, or undefined where it was skipped
  firstPlace: number // placing of row 0
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0

/** Least-squares fit y = first + gap·k. */
function fitRows(points: { k: number; y: number }[]) {
  const n = points.length
  const mk = points.reduce((s, p) => s + p.k, 0) / n, my = points.reduce((s, p) => s + p.y, 0) / n
  const den = points.reduce((s, p) => s + (p.k - mk) ** 2, 0)
  const gap = den ? points.reduce((s, p) => s + (p.k - mk) * (p.y - my), 0) / den : 0
  return { first: my - gap * mk, gap }
}

/**
 * Fit evenly spaced rows to OCR lines (row k sits at about first + k·gap). When placing numbers
 * are known (the names column), they pin rows down; otherwise rows come from the spacing alone.
 * Lines far below the table (the page footer) are left out; missing rows become gaps to re-read.
 */
function rowGrid(lines: Line[], placeOf?: (l: Line) => number | null, known?: { first: number; gap: number }): Grid {
  const sorted = [...lines].sort((a, b) => a.y - b.y)
  const diffs = sorted.slice(1).map((l, i) => l.y - sorted[i].y)
  const typical = median(diffs)
  let gap = known?.gap ?? (median(diffs.filter((d) => d > typical * 0.6)) || 40) // ignore lines read half a row apart
  let first = sorted[0]?.y ?? 0
  let firstPlace = 1

  // 1. Placing numbers that agree with each other (a line through y vs placing) anchor the grid.
  const anchors = placeOf ? sorted.map((l) => ({ l, p: placeOf(l) })).filter((a): a is { l: Line; p: number } => !!a.p && a.p < 1000) : []
  let anchored = new Map<Line, number>()
  if (anchors.length >= 3) {
    let best: { l: Line; p: number }[] = []
    for (const a of anchors)
      for (const b of anchors) {
        if (b.p <= a.p) continue
        const g = (b.l.y - a.l.y) / (b.p - a.p)
        if (g < gap * 0.6 || g > gap * 1.6) continue
        const inliers = anchors.filter((c) => Math.abs(c.l.y - (a.l.y + (c.p - a.p) * g)) < g * 0.35)
        if (inliers.length > best.length) best = inliers
      }
    // The placings must agree with where row 1 is (just under the header), or they're misreads
    // that happen to line up with each other.
    const fit = best.length >= 3 ? fitRows(best.map((a) => ({ k: a.p - 1, y: a.l.y }))) : null
    if (fit && known && Math.abs(fit.first - known.first) > known.gap * 0.7) best = []
    if (best.length >= 3) {
      firstPlace = Math.min(...best.map((a) => a.p))
      ;({ first, gap } = fitRows(best.map((a) => ({ k: a.p - firstPlace, y: a.l.y }))))
      anchored = new Map(best.map((a) => [a.l, a.p - firstPlace]))
      // Rows above the first readable placing (e.g. a "1" OCR read as letters) extend the grid upward.
      const above = Math.min(firstPlace - 1, Math.round(Math.max(0, ...sorted.map((l) => (first - l.y) / gap).filter((r) => r < firstPlace - 0.5))))
      if (above > 0) {
        first -= above * gap
        firstPlace -= above
        anchored = new Map([...anchored].map(([l, k]) => [l, k + above]))
      }
    }
  }
  if (!anchored.size && known) {
    // 2a. Row 1 position known (just below the column header): fix the rows, refine the offset.
    // Walk down from row 1 a row at a time, so spacing that shrinks down the page (photos taken
    // at an angle) doesn't add up to a whole row by the bottom.
    gap = known.gap
    const chain: { k: number; y: number }[] = []
    for (const l of sorted) {
      const prev = chain[chain.length - 1]
      const k = prev ? prev.k + Math.round((l.y - prev.y) / gap) : Math.round((l.y - known.first) / gap)
      if (k < 0 || (prev && k === prev.k)) continue
      if (!prev && Math.abs(l.y - (known.first + k * gap)) > gap * 0.45) continue
      if (prev && k - prev.k > 6) break // a long way below: the page footer
      chain.push({ k, y: l.y })
    }
    ;({ first, gap } = chain.length >= 3 ? fitRows(chain) : { first: chain.length ? chain[0].y - chain[0].k * gap : known.first, gap })
  } else if (!anchored.size) {
    // 2b. No usable placings: walk down the page by spacing, then refine.
    const chain: { k: number; y: number }[] = []
    for (const l of sorted) {
      const prev = chain[chain.length - 1]
      if (!prev) chain.push({ k: 0, y: l.y })
      else {
        const steps = Math.round((l.y - prev.y) / gap)
        if (steps > 3) break
        if (steps >= 1) chain.push({ k: prev.k + steps, y: l.y })
      }
    }
    ;({ first, gap } = chain.length >= 2 ? fitRows(chain) : { first, gap })
  }

  // 3. Place every line on its row; anchored lines first, then the rest by closeness. A line that
  //    lands on a taken row moves to the free neighbour (OCR positions can be off by half a row).
  const rows: (Line | undefined)[] = []
  for (const [l, k] of anchored) rows[k] = l
  // The table ends where the lines stop being a row apart (the page footer sits far below).
  const positions = sorted.map((l) => (l.y - first) / gap).filter((p) => p > -0.6)
  let maxK = Math.round(positions[0] ?? 0)
  for (let i = 1; i < positions.length && positions[i] - positions[i - 1] <= 6.5; i++) maxK = Math.round(positions[i])
  maxK = Math.max(maxK, rows.length - 1)
  const rest = sorted
    .filter((l) => !anchored.has(l))
    .map((l) => ({ l, pos: (l.y - first) / gap }))
    .filter(({ pos }) => pos > -0.6)
    .sort((a, b) => Math.abs(a.pos - Math.round(a.pos)) - Math.abs(b.pos - Math.round(b.pos)))
  for (const { l, pos } of rest) {
    const k = Math.round(pos)
    if (k > maxK) continue // well below the table: the footer
    const target = [k, pos > k ? k + 1 : k - 1].find((t) => t >= 0 && t <= maxK && !rows[t])
    if (target !== undefined) rows[target] = l
  }
  // Rows run to the last line that belongs to the table.
  let end = rows.length - 1
  while (end > 0 && !rows[end]) end--
  return { gap, at: (k) => first + k * gap, rows: Array.from({ length: end + 1 }, (_, k) => rows[k]), firstPlace }
}

// ---------- Main ----------

export async function scanStandingsImage(file: File, onProgress?: (msg: string) => void): Promise<StandingsScan> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.')
  onProgress?.('Straightening the photo…')
  let image = straighten(await loadCanvas(file))

  onProgress?.('Loading text recognition (first time takes a moment)…')
  const T = await import('tesseract.js')
  const worker = await T.createWorker('eng')
  try {
    onProgress?.('Finding the standings table…')
    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.AUTO })
    let page = await ocr(worker, image)
    // Text reads best around 30px tall. Photos vary (full-size phone shots, shrunk chat images),
    // so measure the text and resize to suit, then read again.
    const heights = page.words.filter((w) => /[A-Za-z0-9]{3,}/.test(w.text)).map((w) => w.y1 - w.y0)
    const textHeight = median(heights)
    let lineHeight = textHeight || 30
    if (textHeight && (textHeight < 22 || textHeight > 40)) {
      const factor = Math.min(30 / textHeight, 4000 / Math.max(image.width, image.height))
      image = resize(image, factor)
      lineHeight = textHeight * factor
      page = await ocr(worker, image)
    }
    // No "Record" header: grid lines in a screenshot may be hiding it. Erase them and look again.
    const hasRecord = (p: typeof page) => p.words.some((w) => w.text.replace(/[^A-Za-z]/g, '').toLowerCase() === 'record')
    if (!hasRecord(page)) {
      const erased = removeRules(image, lineHeight)
      const again = await ocr(worker, erased)
      if (hasRecord(again)) [image, page] = [erased, again]
    }
    const pageLines = page.text.split('\n').map((l) => l.trim()).filter(Boolean)
    // "Tournament: …"; if OCR lost the label, the line after "Standings - Round x/y" holds the name.
    const roundLine = pageLines.findIndex((l) => /Round\s*\d+\s*\/\s*\d+/i.test(l))
    const tournament =
      page.text.match(/Tournament\W+(.+)/i)?.[1]?.trim() ??
      pageLines.slice(roundLine + 1, roundLine + 3).find((l) => /[A-Za-z]{5,}/.test(l) && !/division|^all$/i.test(l)) ??
      ''
    const rounds = Number(page.text.match(/Round\s*\d+\s*\/\s*(\d+)/i)?.[1] ?? 0)
    const maxGames = rounds ? rounds + 4 : 20 // Swiss rounds plus room for top cut

    // Headers: only "Record" is required. The rest are used when the photo lets OCR read them
    // (they're often garbled), and only from the header row, not e.g. "Round" in the page title.
    const clean = (t: string) => t.replace(/[^A-Za-z]/g, '').toLowerCase()
    // Several divisions on one page (e.g. Senior above Masters): use the Masters table.
    const divisionWords = page.words.filter((w) => /^(junior|juniors|senior|seniors|masters|standings)$/.test(clean(w.text)))
    const masters = divisionWords.find((w) => clean(w.text) === 'masters')
    let records = page.words.filter((w) => clean(w.text) === 'record')
    if (masters && !records.some((w) => w.y0 > masters.y1)) {
      // The Masters table's headers didn't read with the whole page: read just the part below.
      const below = await ocr(worker, crop(image, 0, masters.y1, image.width, image.height), masters.y1)
      page = { ...page, words: [...page.words, ...below.words], lines: [...page.lines, ...below.lines] }
      records = page.words.filter((w) => clean(w.text) === 'record')
    }
    const record = (masters && records.find((w) => w.y0 > masters.y1)) || records[0]
    if (!record) throw new Error('Couldn’t find the standings table. Use a photo of a TOM “Standings” page with the column headers visible.')
    const cy = (w: Word) => (w.y0 + w.y1) / 2
    const rowH = record.y1 - record.y0
    const header = (re: RegExp) => page.words.find((w) => re.test(clean(w.text)) && Math.abs(cy(w) - cy(record)) < rowH * 4)
    const standing = header(/^standi/)
    const name = header(/^name$/)
    const flight = header(/^flight/)
    const drop = header(/^(drop|round)$/)
    const points = header(/^points$/) ?? page.words.find((w) => clean(w.text) === 'match' && w.x0 > record.x1 && Math.abs(cy(w) - cy(record)) < rowH * 4)

    // Column strips, widened a little to allow for photos taken at an angle.
    const headerBottom = Math.max(record.y1, standing?.y1 ?? 0, name?.y1 ?? 0)
    const top = headerBottom + 4
    // The table ends where the next division (or the next page's title) starts.
    const bottom = Math.min(image.height, ...divisionWords.filter((w) => w.y0 > headerBottom).map((w) => w.y0 - 4))
    const recordWidth = record.x1 - record.x0
    // Whole table rows as the page read saw them ("1 Clive LePage 1 3/0/0 (9) 9 …"): a backup
    // for rows the column reads miss, and where the table starts when its headers are unreadable.
    const recordAt = /\d\s*\/\s*\d\s*\/\s*\d/
    const pageRows = page.lines
      .filter((l) => l.y > headerBottom && l.y < bottom && recordAt.test(l.text))
      .map((l) => {
        const at = l.text.search(recordAt)
        return { ...cleanName(l.text.slice(0, at)), x0: l.x0, y: l.y, record: parseRecord(l.text.slice(at), maxGames) }
      })
    // (Only rows read whole, name included: OCR sometimes splits a row into separate pieces.)
    const wholeRows = pageRows.filter((r) => r.place && r.name.includes(' '))
    const tableLeft = wholeRows.length >= 2 ? Math.max(0, median(wholeRows.map((r) => r.x0)) - rowH) : 0
    const nameLeft = standing ? standing.x0 - 45 : name ? name.x0 - (name.x1 - name.x0) * 3 : tableLeft
    const nameRight = flight ? flight.x0 + 10 : drop ? drop.x0 : record.x0 - recordWidth
    const recLeft = record.x0 - recordWidth
    const recRight = points ? points.x0 + 10 : record.x1 + recordWidth * 0.6

    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK })
    const readColumns = async () => {
      onProgress?.('Reading names…')
      const names = (await ocr(worker, crop(image, nameLeft, top, nameRight, bottom), top, nameLeft)).lines.filter((l) => cleanName(l.text).name)
      onProgress?.('Reading records…')
      const recs = (await ocr(worker, crop(image, recLeft, top, recRight, bottom), top, recLeft)).lines.filter((l) => /\d\s*\/\s*\d/.test(l.text) || /\d{3}/.test(l.text))
      return [names, recs]
    }
    let [nameLines, recLines] = await readColumns()
    // Hardly anything read: probably a screenshot with solid grid lines. Erase them and retry.
    // (Only then: in photos the lines are faint, and erasing can take bits of text with them.)
    if (nameLines.length < 3 || recLines.length < 3) {
      image = removeRules(image, lineHeight)
      ;[nameLines, recLines] = await readColumns()
    }

    // Rows are evenly spaced. Find each column's row grid, so a line OCR skipped shows up as a
    // gap (and gets re-read on its own) and the footer under the table is left out. Names and
    // records are then paired by row number, which also copes with photos taken at an angle.
    // Row 1 sits about 2.2 rows below the centre of the "Standing"/"Name" header (its own side
    // of the page, since rows slope in photos taken at an angle).
    // Row spacing from both columns: the smallest common step between lines read (lines OCR
    // skipped make bigger steps, two or three rows at a time).
    const steps = [nameLines, recLines].flatMap((ls) => ls.slice(1).map((l, i) => l.y - ls[i].y)).filter((d) => d > rowH * 0.8).sort((a, b) => a - b)
    const small = steps[Math.floor(steps.length / 4)]
    const typicalGap = (small && median(steps.filter((d) => d > small * 0.7 && d < small * 1.4))) || rowH * 1.6
    const nameHeader = standing ?? name
    // Without a readable Standing/Name header, the "Record" header marks row 1 for names too.
    const nameKnown = nameHeader ? { first: cy(nameHeader) + typicalGap * 2.2, gap: typicalGap } : { first: record.y1 + typicalGap * 1.3, gap: typicalGap }
    const nameGrid = rowGrid(nameLines, (l) => cleanName(l.text).place, nameKnown)
    // Records: row 1 sits just below the "Match Record" header (about 1.3 rows down), so a skipped
    // first record can't shift the rest. Row spacing comes from the names column (same rows).
    const recGrid = rowGrid(recLines, undefined, { first: record.y1 + nameGrid.gap * 1.3, gap: nameGrid.gap })
    // Every real row has a record: the table ends at the last one (footer text below is ignored).
    const lastRecord = recGrid.rows.reduce((last, r, k) => (r && parseRecord(r.text, maxGames).record ? k : last), -1)
    const offset = nameGrid.firstPlace - 1 // names row 0 is this many rows down the table
    const count = Math.max(0, Math.min(nameGrid.rows.length + offset, lastRecord + 2)) - offset
    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_LINE })
    /** Read one row on its own, as-is and enlarged (each helps different photos). */
    const rereads = async (grid: Grid, k: number, x0: number, x1: number) => {
      const y = grid.at(k)
      const cell = crop(image, x0, y - grid.gap * 0.6, x1, y + grid.gap * 0.6)
      const out: string[] = []
      for (const img of [cell, resize(cell, Math.max(1.5, 64 / cell.height))]) out.push((await ocr(worker, img)).text.trim())
      return out
    }
    const reread = async (grid: Grid, k: number, x0: number, x1: number) => (await rereads(grid, k, x0, x1)).find(Boolean) ?? ''
    // Names start right of the placing numbers. Anything further left is the placing column or
    // the page edge, which OCR sometimes reads as letters ("Doe Andre Santamaria").
    const placeEnds = nameLines.flatMap((l) => l.words.slice(0, 3).find((w) => /^\W*\d{1,3}\W*$/.test(w.text))?.x1 ?? [])
    const textLeft = placeEnds.length >= 3 ? median(placeEnds) : nameLeft
    const nameText = (l: Line) => l.words.filter((w) => w.x0 >= textLeft).map((w) => w.text).join(' ')
    onProgress?.('Double-checking skipped rows…')
    const names: { text: string }[] = []
    const recTexts: string[] = []
    for (let k = 0; k < count; k++) {
      const line = nameGrid.rows[k]
      names.push({ text: line ? nameText(line) : await reread(nameGrid, k, textLeft, nameRight) })
      const rk = k + offset // the same table row in the records column
      recTexts.push(recGrid.rows[rk]?.text ?? (await reread(recGrid, rk, recLeft, recRight)))
    }
    // The last rows may have been skipped by both column reads: keep reading row by row while
    // there's still a name and a record below.
    for (let k = names.length, end = k + 5; k < end && recGrid.at(k + offset) + recGrid.gap < bottom; ) {
      const rec = await reread(recGrid, k + offset, recLeft, recRight)
      if (!parseRecord(rec, maxGames).record) break
      const nm = await reread(nameGrid, k, textLeft, nameRight)
      if (!cleanName(nm).name) break
      names.push({ text: nm })
      recTexts.push(rec)
      k++
    }
    // Do this table's "(points)" equal 3 per win + 1 per tie? Then they can check the records.
    const pointsFit = recTexts.map((t) => {
      const r = readRecord(t, maxGames)
      const p = t.match(/\((\d{1,2})\)/)?.[1]
      if (!r.record || p === undefined) return undefined
      const [w, , tie] = r.record.split('-').map(Number)
      return w * 3 + tie === Number(p)
    }).filter((x) => x !== undefined)
    // (Top cut wins add no points, so those rows won't fit; the rest of the table will.)
    const usePoints = pointsFit.filter(Boolean).length >= Math.max(3, pointsFit.length * 0.4)
    const recs = recTexts.map((t) => parseRecord(t, maxGames, usePoints))
    // A record that was read but garbled gets single-line re-reads too.
    for (let k = 0; k < recs.length; k++) {
      if (recs[k].record) continue
      for (const t of await rereads(recGrid, k + offset, recLeft, recRight)) {
        const again = parseRecord(t, maxGames, usePoints)
        if (again.record) {
          recs[k] = { ...again, check: true }
          break
        }
      }
    }
    // Read and points disagree: standings are in order, so keep whichever win count fits
    // between the rows above and below (a lost digit turns "4/2/0" into "7-2-0").
    const wins = (r: string | undefined) => (r ? Number(r.split('-')[0]) : NaN)
    recs.forEach((r, k) => {
      if (!r.alt) return
      const near = [wins(recs[k - 1]?.record), wins(recs[k + 1]?.record)].filter((w) => !Number.isNaN(w))
      if (!near.length) return
      const gapTo = (rec: string) => Math.max(...near.map((w) => Math.abs(wins(rec) - w)))
      if (gapTo(r.alt) < gapTo(r.record)) recs[k] = { record: r.alt, check: true }
    })
    const parsedNames = names.map((n) => cleanName(n.text))
    // A doubtful name gets a second, single-line read of just its row; keep whichever is cleaner.
    for (let k = 0; k < parsedNames.length; k++) {
      if (!parsedNames[k].check) continue
      for (const t of await rereads(nameGrid, k, textLeft, nameRight)) {
        const again = cleanName(t)
        if (!again.check && again.name) {
          parsedNames[k] = { ...again, place: parsedNames[k].place ?? again.place }
          break
        }
      }
    }

    // Placings: the names grid already knows which placing row 0 is (from the numbers that read cleanly).
    const start = nameGrid.firstPlace

    const rows: ScannedStanding[] = parsedNames.map((n, i) => ({
      place: Math.max(1, start) + i,
      name: n.name,
      record: recs[i]?.record ?? '',
      check: n.check || !recs[i]?.record || Boolean(recs[i]?.check),
    }))
    // An unreadable record between two identical ones is almost certainly the same.
    rows.forEach((row, i) => {
      if (!row.record && rows[i - 1]?.record && rows[i - 1].record === rows[i + 1]?.record) row.record = rows[i - 1].record
    })
    // Fill gaps from the page read's whole rows: matched by position on the page, and only when
    // its placing number (if read) agrees.
    for (const pr of pageRows) {
      const k = Math.round((pr.y - nameGrid.at(0)) / nameGrid.gap)
      const place = Math.max(1, start) + k
      // (A table border can add a leading "1" to the placing: "11" for 1.)
      const placeOk = pr.place === null || String(pr.place).endsWith(String(place))
      if (k < 0 || !placeOk || Math.abs(pr.y - nameGrid.at(k)) > nameGrid.gap * 0.4) continue
      const row = rows[k]
      if (!row) {
        if (k === rows.length && pr.name) rows.push({ place, name: pr.name, record: pr.record.record, check: true })
        continue
      }
      const nameWeak = !row.name || (parsedNames[k].check && !pr.check && pr.name.includes(' '))
      if (nameWeak && pr.name) row.name = pr.name
      if (!row.record && pr.record.record) row.record = pr.record.record
    }
    // Footer text read as one more row (no name, or a scrap of one with no record): not a player.
    const junk = (r: ScannedStanding) => !r.name || (!r.record && (r.check || !r.name.includes(' ')))
    while (rows.length && junk(rows[rows.length - 1])) rows.pop()
    if (!rows.length) throw new Error('Couldn’t read any players. Try a sharper, straighter photo.')
    return { tournament, rows }
  } finally {
    await worker.terminate()
  }
}
