// Emerald's overworld weather, applied to a map crop at the game's own resolution (before the 2x upscale),
// following pret/pokeemerald src/field_weather.c and field_weather_effect.c:
// - rain: the background palettes go through colour map 3 (darkenedContrastColorMaps[2]: every 5-bit channel
//   loses 3/16), then the rain sprites are drawn over it, undarkened (the weather sprite palette uses the plain
//   contrast map, which leaves colours alone at that index). Normal rain keeps 10 drops on a 240x160 screen; each
//   lands on an 8px tile, falls 18 frames at (-6.5, +13) px per frame, then splashes (frames 3, 2, 2 long).
// - drought (Groudon's harsh sunlight): every background colour is looked up in sDroughtWeatherColors
//   (graphics/weather/drought/colors_N.bin, 4096 GBA colours indexed by the top 4 bits of each channel).
import { RAIN_FALL, RAIN_SPLASH } from './rain-sprites'
import droughtUrl from './emerald-drought-4.bin?url'
import { DIAMOND_DUST, DIAMOND_DUST_PAL, HEAVY_SNOW, SNOW_PAL } from './platinum-weather-sprites'

// Emerald (Hoenn maps): rain, drought. Platinum (Sinnoh maps): heavy snow, diamond dust.
export type Weather = 'rain' | 'drought' | 'snow' | 'diamond-dust' | 'snow-strong' | 'diamond-dust-strong'

// graphics/weather/fog.pal (the weather sprites' palette); index 0 is transparent.
const FOG_PAL = [
  [0, 0, 0], [172, 230, 255], [115, 205, 255], [74, 180, 255], [148, 148, 148], [197, 197, 197], [213, 213, 213], [222, 222, 222],
  [164, 164, 164], [255, 0, 255], [255, 0, 255], [255, 0, 255], [180, 180, 180], [230, 230, 230], [246, 246, 246], [255, 255, 255],
]

// BuildColorMaps(), darkened-contrast map, colour map index 3.
const RAIN_DARK = Array.from({ length: 32 }, (_, v) => {
  const delta = Math.floor((v << 8) / 16)
  return ((v << 8) - 3 * delta) >> 8
})

let drought: Promise<Uint16Array> | null = null
const droughtTable = () => (drought ??= fetch(droughtUrl).then((r) => r.arrayBuffer()).then((b) => new Uint16Array(b)))

/** The map's pixels are 5-bit GBA channels stored as v * 8. */
export async function applyWeather(g: CanvasRenderingContext2D, w: number, h: number, weather: Weather, seed: string) {
  if (weather === 'snow' || weather === 'diamond-dust') return platinumWeather(g, w, h, weather, seed, false)
  if (weather === 'snow-strong' || weather === 'diamond-dust-strong') return platinumWeather(g, w, h, weather === 'snow-strong' ? 'snow' : 'diamond-dust', seed, true)
  const img = g.getImageData(0, 0, w, h)
  const px = img.data
  if (weather === 'drought') {
    const lut = await droughtTable()
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i] >> 3, gr = px[i + 1] >> 3, b = px[i + 2] >> 3
      const c = lut[((b & 0x1e) << 7) | ((gr & 0x1e) << 3) | ((r & 0x1e) >> 1)]
      px[i] = (c & 31) << 3
      px[i + 1] = ((c >> 5) & 31) << 3
      px[i + 2] = ((c >> 10) & 31) << 3
    }
    g.putImageData(img, 0, 0)
    return
  }
  for (let i = 0; i < px.length; i += 4) {
    px[i] = RAIN_DARK[px[i] >> 3] << 3
    px[i + 1] = RAIN_DARK[px[i + 1] >> 3] << 3
    px[i + 2] = RAIN_DARK[px[i + 2] >> 3] << 3
  }
  // One still frame of the rain: each drop somewhere in its 25-frame cycle (17 falling, then 3 + 2 + 2 of splash).
  const rnd = random(seed)
  const drops = Math.round((w * h * 10) / (240 * 160))
  const draw = (frame: string[], cx: number, cy: number) => {
    // Sprite x/y is the 16x32 sprite's centre.
    const x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 16
    frame.forEach((row, y) => {
      for (let x = 0; x < 16; x++) {
        const k = parseInt(row[x], 16)
        if (!k) continue
        const X = x0 + x, Y = y0 + y
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue
        const o = (Y * w + X) * 4
        ;[px[o], px[o + 1], px[o + 2]] = FOG_PAL[k]
      }
    })
  }
  for (let n = 0; n < drops; n++) {
    // Where the sprite is in this frame (anywhere on screen, as in the game), and how far through its cycle.
    const x = rnd() * (w + 16) - 8
    const y = rnd() * (h + 32) - 16
    const t = Math.floor(rnd() * 24)
    // Splashes sit on the ground's 8px tile grid.
    if (t < 17) draw(RAIN_FALL, x, y)
    else draw(RAIN_SPLASH[t < 20 ? 0 : t < 22 ? 1 : 2], Math.round(x / 8) * 8, Math.round(y / 8) * 8)
  }
  g.putImageData(img, 0, 0)
}

function random(seed: string) {
  let s = 0
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Platinum (pret/pokeplatinum src/overlay005/ov5_021D5EB8.c). Both weathers turn on the 3D fog (Heavy Snow:
// GX_RGB(24, 24, 24); Hailing / diamond dust: GX_RGB(26, 26, 26)). The overworld camera looks down at an angle, so
// the fog is thickest at the top of the screen: approximated here as a top-to-bottom fade on the flat map rip.
// Then the 8x8 sprites at the game's own size (one still frame, counts per 256x192 screen):
// - Heavy Snow: 4 flake sizes; a flake's size follows its fall speed (bigger = nearer = faster), ~40 on screen.
// - Diamond dust: short-lived twinkles in 4 tints; mostly the small diamond (frames 0-3), with the bigger
//   tumbling-crystal frames (up to 19) along the band the game picks (y from 50 - x/3 down across the screen).
// Stronger (an alternative, not the game): 2.5x as many, biased to the big frames, and every other one drawn at 2x
// (nearer to the camera) so they read on the white maps in a still image.
function platinumWeather(g: CanvasRenderingContext2D, w: number, h: number, weather: 'snow' | 'diamond-dust', seed: string, strong: boolean) {
  const dust = weather === 'diamond-dust'
  const fog = dust ? 208 : 192
  const fade = g.createLinearGradient(0, 0, 0, h)
  fade.addColorStop(0, `rgba(${fog}, ${fog}, ${fog}, ${dust ? 0.35 : 0.5})`)
  fade.addColorStop(0.6, `rgba(${fog}, ${fog}, ${fog}, ${dust ? 0.12 : 0.22})`)
  fade.addColorStop(1, `rgba(${fog}, ${fog}, ${fog}, ${dust ? 0.05 : 0.12})`)
  g.fillStyle = fade
  g.fillRect(0, 0, w, h)
  const img = g.getImageData(0, 0, w, h)
  const px = img.data
  const rnd = random(seed)
  let n2 = 0
  const tile = (t: string, pal: number[][], x0: number, y0: number) => {
    const k = strong && n2++ % 2 ? 2 : 1
    for (let i = 0; i < 64; i++) {
      if (t[i] === '.') continue
      for (let dy = 0; dy < k; dy++)
        for (let dx = 0; dx < k; dx++) {
          const X = Math.round(x0) + (i % 8) * k + dx, Y = Math.round(y0) + Math.floor(i / 8) * k + dy
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue
          const o = (Y * w + X) * 4
          ;[px[o], px[o + 1], px[o + 2]] = pal[parseInt(t[i], 16)]
        }
    }
  }
  const per = ((w * h) / (256 * 192)) * (strong ? 2.5 : 1)
  const big = (frames: number) => (strong ? frames - 1 - Math.floor(rnd() * rnd() * frames) : Math.floor(rnd() * frames))
  if (dust) {
    for (let n = Math.round(per * 22); n > 0; n--) {
      const x = rnd() * (w + 8) - 8, y = rnd() * (h + 8) - 8
      // The band, measured in screens so it repeats across a map bigger than the DS screen.
      const sx = x % 256, sy = y % 192
      const inBand = sy >= 50 - sx / 3 && sy <= 50 - sx / 3 + rnd() * (206 - sx / 3)
      tile(DIAMOND_DUST[(inBand || strong) && rnd() < 0.6 ? Math.floor(rnd() * 20) : Math.floor(rnd() * 4)], DIAMOND_DUST_PAL, x, y)
    }
  } else {
    for (let n = Math.round(per * 40); n > 0; n--) tile(HEAVY_SNOW[big(4)], SNOW_PAL, rnd() * (w + 8) - 8, rnd() * (h + 8) - 8)
  }
  g.putImageData(img, 0, 0)
}
