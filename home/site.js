// Shared by the mismatched.gg pages (index.html, credits/index.html): the page text (catalog strings, language,
// ?ids review mode) and the tile wall. Load it after the page's <script id="i18n-en"> strings block.
// Plain script, not a module: t() and drawWall() are globals the page's own script uses.

// ---------- Text (same catalog, language setting and ?ids review mode as the generator) ----------
// Only English for now; other languages will load i18n/<lang>.json written by `npm run i18n:home`.
const LANGS = ['en']
const lang = (() => { try { const v = localStorage.getItem('dmv-ui-lang'); return LANGS.includes(v) ? v : 'en' } catch { return 'en' } })()
const STRINGS = JSON.parse(document.getElementById('i18n-en').textContent)
const showIds = (() => { try { return new URLSearchParams(location.search).has('ids') || localStorage.getItem('dmv-i18n-ids') === '1' } catch { return false } })()
const plural = new Intl.PluralRules(lang)
/** A catalog string with {placeholders} and {count, plural, one {…} other {…}} filled in. */
function t(key, vars = {}) {
  let text = STRINGS[key] ?? key
  text = text.replace(/\{(\w+),\s*plural,((?:\s*(?:=\d+|\w+)\s*\{[^{}]*\})+)\s*\}/g, (_, name, body) => {
    const n = Number(vars[name]), options = {}
    for (const [, k, v] of body.matchAll(/(=\d+|\w+)\s*\{([^{}]*)\}/g)) options[k] = v
    return (options[`=${n}`] ?? options[plural.select(n)] ?? options.other ?? '').replace(/#/g, n.toLocaleString(lang))
  })
  text = text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
  return showIds ? `${text} [${key}]` : text
}
// The English is already in the page; only another language or ?ids needs the page rewritten.
if (lang !== 'en' || showIds) {
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)))
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => (el.alt = t(el.dataset.i18nAlt)))
  document.querySelectorAll('[data-i18n-content]').forEach((el) => (el.content = t(el.dataset.i18nContent)))
}
document.documentElement.lang = lang

// ---------- The tile wall ----------
// The wall's Pokémon: a fixed list (outlines in wall.svg, traced by `npm run home:wall` from the HOME renders
// in sprites/, copied from the generator's public/sprites/home).
const MONS = ['incineroar', 'rillaboom', 'flutter-mane', 'amoonguss', 'urshifu-rapid-strike', 'kingambit', 'dragonite', 'gholdengo',
  'pikachu', 'charizard-mega-y', 'garchomp', 'landorus-therian', 'calyrex-shadow', 'miraidon', 'koraidon', 'farigiraf', 'whimsicott',
  'sneasler', 'dragapult', 'gengar-mega', 'sinistcha', 'archaludon', 'pelipper', 'basculegion-male', 'indeedee-female',
  'ursaluna-bloodmoon', 'raging-bolt', 'iron-hands', 'chi-yu', 'kyogre', 'groudon-primal', 'rayquaza-mega', 'gallade', 'hatterene',
  'gardevoir', 'tyranitar', 'smeargle', 'salamence', 'milotic', 'cresselia']
const SEED = 'mismatched.gg' // fixes the tile layout and the order of the Pokémon

/** Small seeded random generator (same as the generator's Mosaic), so the wall never changes. */
function seeded(text) {
  let a = 0
  for (const ch of text) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mosaic Squares packing: staggered 2×2 tiles first, then 1×1 tiles fill every gap. */
function layout(cols, rows) {
  const rand = seeded(SEED)
  const used = Array.from({ length: rows }, () => Array(cols).fill(false))
  const free = (x, y) => x + 2 <= cols && y + 2 <= rows && !used[y][x] && !used[y][x + 1] && !used[y + 1][x] && !used[y + 1][x + 1]
  const big = []
  const bigCount = Math.round((18 * cols * rows) / 180) // the graphic's density: 18 big tiles on 12 × 15
  for (let tries = 0; tries < 600 * Math.max(1, bigCount / 18) && big.length < bigCount; tries++) {
    const x = Math.floor(rand() * (cols - 1)), y = Math.floor(rand() * (rows - 1))
    if (!free(x, y)) continue
    if (big.some((b) => (b.y === y && Math.abs(b.x - x) <= 3) || (b.x === x && Math.abs(b.y - y) <= 3))) continue
    used[y][x] = used[y][x + 1] = used[y + 1][x] = used[y + 1][x + 1] = true
    big.push({ x, y, s: 2 })
  }
  const tiles = [...big]
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!used[y][x]) tiles.push({ x, y, s: 1 })
  return tiles.sort((a, b) => a.y - b.y || a.x - b.x)
}

const RED = '#b3121b', BLUE = '#6b9cf6' // the page gradient (--red, --blue)
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const mix = (a, b, t) => { const [x, y] = [hex(a), hex(b)]; return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})` }

// Pokémon order shuffled once by the seed, then repeated.
const MON_ORDER = (() => { const rand = seeded(SEED + '|mons'); return MONS.map((m) => [rand(), m]).sort((a, b) => a[0] - b[0]).map(([, m]) => m) })()

let wallKey = ''
/** Builds the wall in #wall, but only when its grid changes: rows come in blocks of 8 (spares hide below the page),
 *  and the grid is centred by CSS, so scrolling, small height changes and most resizes leave it alone. */
// eslint-disable-next-line no-unused-vars -- called by each page's own script
function drawWall() {
  const W = document.documentElement.clientWidth
  const H = document.body.scrollHeight
  const cell = W <= 700 ? 74 : 90, gap = 8
  const cols = Math.ceil(W / cell), rows = Math.ceil((Math.ceil(H / cell) + 1) / 8) * 8
  const key = `${cell}|${cols}|${rows}`
  if (key === wallKey) return
  wallKey = key
  // Centred on the page; part tiles fall evenly off both edges.
  const left = Math.round(W / 2 - (cols * cell) / 2) // where the grid starts on the page, for the tints
  document.getElementById('wall').innerHTML = `<div class="wall-grid" style="margin-left:${-(cols * cell) / 2}px">` + layout(cols, rows).map((t, i) => {
    const size = t.s * cell - gap
    const x = t.x * cell + gap / 2, y = t.y * cell + gap / 2
    // The tint is the page gradient's colour at the tile's centre (the gradient runs corner to corner).
    const color = mix(RED, BLUE, Math.min(1, Math.max(0, (left + x + size / 2 + y + size / 2) / (W + H))))
    return `<div class="tile" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;color:${color}">` +
      `<svg viewBox="0 0 240 240"><use href="/wall.svg#${MON_ORDER[i % MON_ORDER.length]}"/></svg></div>`
  }).join('') + '</div>'
}
