// Generates src/templates/power/tera-crystal.svg: the Tera crystal look from the Pokémon effect
// (shared/monEffect.tsx teraCrystal) as a flat texture for Tera Raid Den's winner (border and place badge).
// A jittered triangle mesh in soft iridescent hues that drift across the crystal, thin white facet edges
// and a glassy white sweep, over a pale pearl base. Run: node scripts/tera-crystal.cjs

const fs = require('fs')
const path = require('path')

const W = 480
const H = 480
const CELL = 44

// Seeded random numbers so the texture is the same every time it's generated.
let seed = 7
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const cols = Math.ceil(W / CELL) + 2
const rows = Math.ceil(H / CELL) + 2
const pts = Array.from({ length: rows }, (_, y) =>
  Array.from({ length: cols }, (_, x) => [(x - 0.5) * CELL + (rand() - 0.5) * CELL * 0.7, (y - 0.5) * CELL + (rand() - 0.5) * CELL * 0.7]),
)

const facets = []
for (let y = 0; y < rows - 1; y++)
  for (let x = 0; x < cols - 1; x++)
    for (const tri of [
      [pts[y][x], pts[y][x + 1], pts[y + 1][x]],
      [pts[y][x + 1], pts[y + 1][x + 1], pts[y + 1][x]],
    ]) {
      // Hue drifts diagonally across the crystal, each facet nudged a little: a prism, not a colour wheel.
      const hue = (((tri[0][0] + tri[0][1]) / (W + H)) * 300 + 180 + rand() * 40) % 360
      const light = 64 + rand() * 18
      const alpha = (0.55 + rand() * 0.35).toFixed(2)
      const d = tri.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
      facets.push(`<polygon points="${d}" fill="hsl(${hue.toFixed(0)},90%,${light.toFixed(0)}%)" fill-opacity="${alpha}" stroke="#fff" stroke-opacity="0.75" stroke-width="1.2"/>`)
    }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
<defs>
<linearGradient id="pearl" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#f4f0ff"/><stop offset="0.5" stop-color="#eefaff"/><stop offset="1" stop-color="#fff4f8"/>
</linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/>
<stop offset="0.6" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.75" stop-color="#fff" stop-opacity="0"/>
<stop offset="1" stop-color="#fff" stop-opacity="0.2"/>
</linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#pearl)"/>
${facets.join('\n')}
<rect width="${W}" height="${H}" fill="url(#shine)"/>
</svg>
`

const out = path.join(__dirname, '../src/templates/power/tera-crystal.svg')
fs.writeFileSync(out, svg)
console.log('wrote', out, `${(svg.length / 1024).toFixed(0)} KB`)
