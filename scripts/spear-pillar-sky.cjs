// Recreate the Spear Pillar cutscene sky (Diamond & Pearl, Bulbapedia "Spear Pillar cutscene DP.png") as a
// pixel texture: black sky filled with slanted streaks ("/" lean, ~1px left per 5px down) in the frame's own
// colours: columns of 4-5px streaks 20-38px long that taper to points, 3-5px black between columns. Native DS pixels,
// written pre-scaled (nearest neighbour) so the export stays crisp.
// usage: node scripts/spear-pillar-sky.cjs src/templates/places/spear-pillar-sky-dp.png 360 360 3
const fs = require('fs')
const zlib = require('zlib')
const [out, NW = '360', NH = '360', S = '3'] = process.argv.slice(2)
const W = +NW, H = +NH, SC = +S

let seed = 20061 // deterministic
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = (a) => a[Math.floor(rnd() * a.length)]

const RED = ['a81010', 'a81010', 'a81010', 'a81818', 'a80810', 'a80808', 'a81018', 'a82020', 'a80000']
const BLUE = ['382060', '382060', '382060', '201060', '301860', '281060', '180860', '181060', '281860', '100860']
const GREEN = ['185810', '185810', '185810', '285818', '385820', '305818', '105808', '205810']
const EDGE = { r: ['901818', 'a01818'], b: ['181060', '100860'], g: ['105808', '085808'] }
const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]

const px = new Uint8Array(W * H * 3) // black
const set = (x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 3
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]
}

// Columns in sheared space: u = x + floor(y / LEAN).
const LEAN = 5
const span = W + Math.ceil(H / LEAN) + 12
const order = ['g', 'b', 'r'] // roughly cycling green, blue, red across columns, irregular
let u = -6
let col = 0
while (u < span) {
  const width = rnd() < 0.6 ? 4 : 5
  let v = -Math.floor(rnd() * 38) // stagger columns
  let k = Math.floor(rnd() * 3)
  while (v < H) {
    const len = 22 + Math.floor(rnd() * 22)
    // mostly the column's cycle, sometimes a different colour; blue most common (22/18/15 share)
    const r = rnd()
    const kind = r < 0.55 ? order[(col + k) % 3] : r < 0.75 ? 'b' : r < 0.9 ? 'r' : 'g'
    const main = hex(pick(kind === 'r' ? RED : kind === 'b' ? BLUE : GREEN))
    const edge = hex(pick(EDGE[kind]))
    for (let dy = 0; dy < len; dy++) {
      const y = v + dy
      // tapered tips: the visible width grows from 1px over the first/last ~6 rows
      const d = Math.min(dy, len - 1 - dy)
      const w = Math.max(1, Math.min(width, Math.ceil((width * (d + 1)) / 6)))
      const left = Math.floor((width - w) / 2)
      for (let dx = left; dx < left + w; dx++) {
        const x = u + dx - Math.floor(y / LEAN)
        set(x, y, dx === left + w - 1 && w > 2 && rnd() < 0.5 ? edge : main)
      }
    }
    v += len + 1 + Math.floor(rnd() * 5)
    k++
  }
  u += width + 3 + Math.floor(rnd() * 3)
  col++
}

// PNG (RGB, scaled)
const OW = W * SC, OH = H * SC
const raw = Buffer.alloc(OH * (OW * 3 + 1))
for (let y = 0; y < OH; y++) {
  const row = y * (OW * 3 + 1)
  for (let x = 0; x < OW; x++) {
    const i = (Math.floor(y / SC) * W + Math.floor(x / SC)) * 3
    raw[row + 1 + x * 3] = px[i]; raw[row + 2 + x * 3] = px[i + 1]; raw[row + 3 + x * 3] = px[i + 2]
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 2
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]))
console.log(out, OW, OH, fs.statSync(out).size)
