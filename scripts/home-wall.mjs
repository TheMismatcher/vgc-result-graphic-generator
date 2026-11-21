// npm run home:wall — traces the home page's wall Pokémon (the HOME renders in home/sprites/) into one
// vector file, home/wall.svg: a <path id="<name>"> per Pokémon, its outline in a 240 × 240 box.
//
// The page draws each tile's Pokémon with <use href="wall.svg#<name>">, filled with the tile's tint. The old
// way (a CSS mask per tile with the PNG) cost Safari / iPhone about 50 MB, and any bitmap version still costs
// ~20 B per image pixel there; outlines cost almost nothing and stay sharp at every tile size.
//
// Plain Node (zlib) only: reads 8-bit RGBA PNGs, traces the alpha at 50% (marching squares), simplifies.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const HOME = fileURLToPath(new URL('../home/', import.meta.url))
const ISO = 128 // trace the alpha at 50%
const TOLERANCE = 0.3 // px (of 240): how far the simplified outline may stray

function readPng(buf) {
  let pos = 8, width, height, idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('expected 8-bit RGBA, non-interlaced')
    }
    if (type === 'IDAT') idat.push(data)
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat)), bpp = 4, stride = width * bpp
  const px = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1
        : (() => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c })()
      px[y * stride + x] = (row[x] + pred) & 255
    }
  }
  return { width, height, px }
}

/** Outline loops of the shape where alpha >= ISO (marching squares, edge points interpolated). Grid node (x, y)
 *  is the pixel centre (x + .5, y + .5). Segments run with the inside on one side, so shared edge points link up. */
function trace(width, height, px) {
  const v = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : px[(y * width + x) * 4 + 3])
  const lerp = (a, b) => (ISO - a) / (b - a)
  const next = new Map(), pts = new Map()
  for (let y = -1; y < height; y++) for (let x = -1; x < width; x++) {
    // Clockwise around the cell: corners and the edges between them (edge key, point on it).
    const c = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([cx, cy]) => ({ cx, cy, val: v(cx, cy) }))
    const cross = []
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4], ain = a.val >= ISO, bin = b.val >= ISO
      if (ain === bin) continue
      const t = lerp(a.val, b.val)
      const key = a.cy === b.cy ? `h${Math.min(a.cx, b.cx)},${a.cy}` : `v${a.cx},${Math.min(a.cy, b.cy)}`
      pts.set(key, [a.cx + (b.cx - a.cx) * t + 0.5, a.cy + (b.cy - a.cy) * t + 0.5])
      cross.push({ key, leaving: ain })
    }
    if (!cross.length) continue
    // Each segment runs from an entering crossing to a leaving one. Saddles: the cell centre decides
    // whether the inside corners join (pair each leaving crossing with the next entering one) or not.
    const centreIn = (c[0].val + c[1].val + c[2].val + c[3].val) / 4 >= ISO
    for (let k = 0; k < cross.length; k++) {
      const a = cross[k], b = cross[(k + 1) % cross.length]
      if (cross.length === 2) { if (!a.leaving) next.set(a.key, b.key); continue }
      if (centreIn ? a.leaving : !a.leaving) centreIn ? next.set(b.key, a.key) : next.set(a.key, b.key)
    }
  }
  const loops = []
  for (const start of next.keys()) {
    if (!next.has(start)) continue
    const loop = []
    let k = start
    while (next.has(k)) { loop.push(pts.get(k)); const n = next.get(k); next.delete(k); k = n }
    if (loop.length > 2) loops.push(loop)
  }
  return loops
}

/** Douglas–Peucker on a closed loop (split at the point farthest from the first). */
function simplify(loop) {
  const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / l }
  const dp = (pts) => {
    let best = 0, at = 0
    for (let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if (d > best) { best = d; at = i } }
    return best <= TOLERANCE ? [pts[0], pts[pts.length - 1]] : [...dp(pts.slice(0, at + 1)).slice(0, -1), ...dp(pts.slice(at))]
  }
  let far = 0, fd = 0
  loop.forEach((p, i) => { const d = Math.hypot(p[0] - loop[0][0], p[1] - loop[0][1]); if (d > fd) { fd = d; far = i } })
  return [...dp(loop.slice(0, far + 1)).slice(0, -1), ...dp([...loop.slice(far), loop[0]]).slice(0, -1)]
}
const area = (loop) => Math.abs(loop.reduce((s, p, i) => { const q = loop[(i + 1) % loop.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0) / 2)
const num = (n) => String(Math.round(n * 10) / 10)

const paths = []
for (const file of readdirSync(HOME + 'sprites').filter((f) => f.endsWith('.png')).sort()) {
  const { width, height, px } = readPng(readFileSync(HOME + 'sprites/' + file))
  if (width !== 240 || height !== 240) throw new Error(`${file}: expected 240 × 240`)
  const d = trace(width, height, px).filter((l) => area(l) >= 1.5).map(simplify)
    .map((l) => 'M' + l.map((p) => num(p[0]) + ' ' + num(p[1])).join('L') + 'Z').join('')
  paths.push(`<path id="${file.slice(0, -4)}" fill-rule="evenodd" d="${d}"/>`) // on each path: a <use> elsewhere doesn't inherit from this file's root
}
writeFileSync(HOME + 'wall.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">\n<!-- Made by npm run home:wall from sprites/; don't edit by hand. -->\n${paths.join('\n')}\n</svg>\n`)
console.log(`home/wall.svg: ${paths.length} Pokémon, ${Math.round(Buffer.byteLength(paths.join('')) / 1024)} KB`)
