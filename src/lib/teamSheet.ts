// Read a team from the official "Pokémon Video Game Team List" form: a filled-in PDF, a screenshot
// of one, or a phone photo of a printed or handwritten sheet. Works on every version of the form
// (second row "Tera Type", "Nature" or "Stat Alignment"; with or without the staff page's stats
// column).
//
// 1. Get the written text of each box's rows:
//    - PDF with real text (filled in on a computer): read exactly from the PDF, nothing guessed.
//    - Pictures (and scanned PDFs): find the printed row labels ("Pokémon", "Ability", "Held Item",
//      "Move 1"…) with text recognition, work out where each row is, and read the writing to the
//      right of each label, stopping at the box edge or the stats column.
// 2. Work out the species and item. The written name is the main clue; the ability, the four
//    moves and a Mega Stone confirm it, or decide it when the name is unreadable (handwriting)
//    or doesn't say the form. Same evidence as the Champions screenshot reader (teamScan.ts).
//
// Everything runs in the browser; nothing is uploaded.

import { ITEMS, getItem, getPokemon, resolvePokemon } from '../data/dex'
import { asset } from '../brand'
import { loadNames, type NameTable } from '../data/names'
import { resolveRk9Species } from './rk9'
import { GENDERED, distance, key, loadScanData, type ScanData } from './teamScan'
import { crop, enhance, ocr, removeRules, straighten, type Word, type Worker } from './standingsScan'
import { t } from '../i18n'

export interface SheetMon {
  written: string // the Pokémon row as read, for reference
  ability: string // best match from the ability list ("" if unreadable)
  item: string // item id
  itemWritten: string
  moves: string[] // best matches
  pokemon: string // PokeAPI id ("" if unsure)
  alternatives: string[]
  confident: boolean
  note?: string // why it needs checking, e.g. gender not written
}

export interface TeamSheet {
  player: string // "Player Name" as written ("" if unreadable)
  mons: SheetMon[] // always 6
  exact: boolean // read from a PDF's text, not recognised from a picture
}

/** The 8 rows of one Pokémon box: Pokémon, Nature/Tera Type/Stat Alignment, Ability, Held Item, Move 1-4. */
type Box = string[]
/**
 * A sheet's written text. `foreign` (Regionals/International sheets): the same box written in
 * other languages, rows in the same order as `boxes`, used as extra evidence.
 */
interface RawSheet { player: string; boxes: Box[]; foreign?: Partial<Record<OtsLanguage, Box[]>> }

// ---------- Matching ----------

// Letters that handwriting recognition mixes up cost half as much to swap.
const LOOKALIKE = ['aoecu', 'iltj1f', 'nmhr', 'uvw', 'gqy9', 'bh6', 's5z2', 'kx', 'pf']
const lookalike = (a: string, b: string) => LOOKALIKE.some((g) => g.includes(a) && g.includes(b))

function editCost(a: string, b: string) {
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const row = [i]
    for (let j = 1; j <= n; j++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : lookalike(a[i - 1], b[j - 1]) ? 0.5 : 1
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + sub)
    }
    prev = row
  }
  return prev[n]
}

const simKeys = (ka: string, kb: string) => (ka && kb ? 1 - editCost(ka, kb) / Math.max(ka.length, kb.length) : 0)

/**
 * How alike the writing is to a name (0-1). Stray marks either side of the writing are common
 * ("Focus Blont ] Bh"), so the best run of whole words counts.
 */
const sim = (text: string, name: string) => {
  const kb = key(name)
  const words = text.split(/\s+/).map(key).filter(Boolean)
  let top = simKeys(words.join(''), kb)
  for (let i = 0; i < words.length; i++)
    for (let j = i + 1; j <= words.length; j++) if (i || j < words.length) top = Math.max(top, simKeys(words.slice(i, j).join(''), kb) - 0.03)
  return top
}

/** Closest name in `list` with its similarity (0-1), or null when nothing is close enough. */
function best(text: string, list: string[], min = 0.6, bonus?: (name: string) => number): { name: string; score: number } | null {
  if (!readings(text).length) return null
  let name = '', score = 0, rank = 0
  for (const n of list) {
    const s = simAny(text, n), r = s + (bonus?.(n) ?? 0)
    // A tie goes to the longer name: "Garchompite Z" fits the writing at least as well as "Garchompite".
    if (r > rank || (r === rank && r > 0 && n.length > name.length)) [name, score, rank] = [n, s, r]
  }
  return score >= min ? { name, score } : null
}

const ITEM_NAMES = ITEMS.map((i) => i.name)
// Items players actually run. A rough read that's as close to one of these as to a look-alike
// nobody uses ("S4ras Berry": Sitrus or Oran?) goes to the common one.
const COMMON_ITEMS = new Set(['Sitrus Berry', 'Leftovers', 'Focus Sash', 'Life Orb', 'Choice Scarf', 'Choice Specs', 'Choice Band',
  'Assault Vest', 'Rocky Helmet', 'Safety Goggles', 'Covert Cloak', 'Clear Amulet', 'Lum Berry', 'White Herb', 'Mental Herb',
  'Booster Energy', 'Grassy Seed', 'Electric Seed', 'Psychic Seed', 'Expert Belt', 'Light Clay', 'Shell Bell', 'Eviolite', 'Mystic Water', 'Charcoal', 'Miracle Seed',
  'Black Glasses', 'Sharp Beak', 'Magnet', 'Never-Melt Ice', 'Spell Tag', 'Twisted Spoon', 'Dragon Fang', 'Soft Sand',
  'Silk Scarf', 'Metal Coat', 'Black Belt', 'Poison Barb', 'Hard Stone', 'Silver Powder', 'Fairy Feather', 'Throat Spray',
  'Weakness Policy', 'Wide Lens', 'Scope Lens', 'King\'s Rock', 'Quick Claw', 'Bright Powder', 'Muscle Band', 'Wise Glasses',
  'Chople Berry', 'Colbur Berry', 'Occa Berry', 'Passho Berry', 'Wacan Berry', 'Rindo Berry', 'Yache Berry', 'Shuca Berry',
  'Coba Berry', 'Payapa Berry', 'Tanga Berry', 'Kasib Berry', 'Haban Berry', 'Babiri Berry', 'Charti Berry', 'Kebia Berry',
  'Roseli Berry', 'Chilan Berry', 'Mirror Herb', 'Loaded Dice', 'Punching Glove', 'Room Service', 'Red Card', 'Eject Button',
  'Eject Pack', 'Iron Ball', 'Toxic Orb', 'Flame Orb', 'Damp Rock', 'Heat Rock', 'Smooth Rock', 'Icy Rock', 'Terrain Extender',
  'Ability Shield', 'Adrenaline Orb', 'Big Root', 'Binding Band', 'Grip Claw', 'Custap Berry', 'Salac Berry', 'Liechi Berry',
  'Petaya Berry', 'Aguav Berry', 'Figy Berry', 'Iapapa Berry', 'Mago Berry', 'Wiki Berry', 'Leppa Berry', 'Kee Berry', 'Maranga Berry'])
// How often each Pokémon / item shows up on real Champions teams (public/data/usage.json), 0-1.
let usage: { species: Record<string, number>; items: Record<string, number>; held: Record<string, Record<string, number>> } = { species: {}, items: {}, held: {} }
const usageShare = (table: Record<string, number>, id: string) => {
  const top = Math.max(1, ...Object.values(table))
  return Math.log1p(table[id] ?? 0) / Math.log1p(top)
}
const commonBonus = (name: string) => Math.max(COMMON_ITEMS.has(name) ? 0.03 : 0, 0.05 * usageShare(usage.items, key(name)))
const itemIdByName = new Map(ITEMS.map((i) => [i.name, i.id]))
const NATURES = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky']

interface Candidate {
  id: string
  aliases: string[]
  abilities: number[]
  learn: Set<number>
  fullyEvolved: number
  bst: number
  legal: boolean // in Pokémon Champions
  popular: number // 0-1, how often it's on real Champions teams
  sid: string // Showdown id
}

// Pokémon available in Pokémon Champions (Showdown's champions mod formats-data: every species
// without isNonstandard). Sheets are for Champions events, so these are much more likely; others
// stay possible for older formats. Refresh when new Pokémon are added to the game.
interface Legal { species: Set<string>; items: string[] } // Showdown ids / item names
let legalList: Promise<Legal> | null = null
const loadLegal = () =>
  (legalList ??= fetch(asset('data/usage.json'))
    .then((r) => r.json())
    .then((d) => { usage = { species: d.species ?? {}, items: d.items ?? {}, held: d.held ?? {} } })
    .catch(() => {})
    .then(() => fetch(asset('data/champions-legal.json')))
    .then((r) => r.json())
    .then((d: { species: string[]; items: string[] }) => {
      const items = new Set(d.items)
      return { species: new Set(d.species), items: ITEMS.filter((i) => items.has(key(i.name))).map((i) => i.name) }
    })
    .catch(() => ({ species: new Set<string>(), items: ITEM_NAMES })))

const REGIONAL_WORD: Record<string, string> = { Alolan: 'Alola', Galarian: 'Galar', Hisuian: 'Hisui', Paldean: 'Paldea' }

let holders: Map<number, number> | null = null
/** How many Champions Pokémon have each ability. */
function abilityHolders(cands: Candidate[]) {
  if (holders) return holders
  holders = new Map()
  for (const c of cands) if (c.legal) for (const a of c.abilities) holders.set(a, (holders.get(a) ?? 0) + 1)
  return holders
}

let candidateList: Candidate[] | null = null
function candidatesFrom(data: ScanData, legal: Set<string>): Candidate[] {
  if (candidateList) return candidateList
  const seen = new Set<string>()
  candidateList = []
  for (const [name, abilities, , learn, fullyEvolved, bst] of data.species) {
    const id = resolvePokemon(name)
    // A Mega is written as its base Pokémon plus the stone, so Megas aren't candidates.
    if (!id || seen.has(id) || /-mega|-gmax|-primal/.test(id)) continue
    seen.add(id)
    const p = getPokemon(id)
    const aliases = new Set([name.replace(/-/g, ' ')])
    if (p) {
      aliases.add(p.name)
      if (p.isDefault) aliases.add(p.species)
      if (p.form) {
        aliases.add(`${p.species} ${p.form}`)
        aliases.add(`${p.form} ${p.species}`)
        const regional = p.form.match(/^(Alolan|Galarian|Hisuian|Paldean)\b/)?.[1]
        if (regional) aliases.add(`${p.species} ${regional}`).add(`${p.species} ${REGIONAL_WORD[regional]}`)
      }
      if (/-male$/.test(id)) aliases.add(`${p.species} Male`).add(`${p.species} M`)
      if (/-female$/.test(id)) aliases.add(`${p.species} Female`).add(`${p.species} F`)
    }
    candidateList.push({ id, aliases: [...aliases], abilities, learn: new Set(learn), fullyEvolved, bst, legal: !legal.size || legal.has(key(name)), popular: usageShare(usage.species, key(name)), sid: key(name) })
  }
  return candidateList
}

/** "Basculegion Male", "Indeedee (F)", "Meowstic ♀" -> the gender written, if any. */
function writtenGender(text: string): 'male' | 'female' | null {
  if (/♀|\bfemale\b|\bfem\b|[\s(-]f\)?\s*$/i.test(text)) return 'female'
  if (/♂|\bmale\b|[\s(-]m\)?\s*$/i.test(text)) return 'male'
  return null
}

// Basculegion's two forms have the same abilities and moves, and players often leave the
// gender off. The usual sets differ: Male is the physical attacker (Wave Crash, Last Respects),
// Female the special one (Shadow Ball, Muddy Water).
const BASC_PHYSICAL = new Set(['Wave Crash', 'Last Respects', 'Aqua Jet', 'Flip Turn', 'Liquidation', 'Crunch', 'Psychic Fangs', 'Phantom Force', 'Head Smash', 'Zen Headbutt'])
const BASC_SPECIAL = new Set(['Shadow Ball', 'Muddy Water', 'Hydro Pump', 'Surf', 'Scald', 'Hex', 'Ice Beam', 'Water Pulse', 'Weather Ball', 'Hydro Steam'])
const PHYSICAL_NATURES = new Set(['Adamant', 'Jolly', 'Brave', 'Lonely', 'Naughty', 'Impish', 'Careful'])
const SPECIAL_NATURES = new Set(['Modest', 'Timid', 'Quiet', 'Mild', 'Rash', 'Calm', 'Bold'])

function guessBasculegion(moves: string[], nature: string): { gender: 'male' | 'female'; sure: boolean } {
  let lean = 0
  for (const m of moves) lean += BASC_PHYSICAL.has(m) ? 1 : BASC_SPECIAL.has(m) ? -1 : 0
  if (PHYSICAL_NATURES.has(nature)) lean += 0.5
  if (SPECIAL_NATURES.has(nature)) lean -= 0.5
  return { gender: lean >= 0 ? 'male' : 'female', sure: Math.abs(lean) >= 1.5 }
}

/** A row can hold more than one reading (a second look at a hard row), split by ALT. */
const ALT = ' ¦ '
const readings = (row: string) => row.split(ALT).filter((r) => key(r).length >= 3)
const simAny = (row: string, name: string) => Math.max(0, ...readings(row).map((r) => sim(r, name)))

/** Every name in `list` at least `min` similar to the text: index -> similarity. */
function matches(text: string, list: string[], min = 0.45) {
  const hits = new Map<number, number>()
  if (!readings(text).length) return hits
  list.forEach((n, i) => {
    const s = simAny(text, n)
    if (s >= min) hits.set(i, s)
  })
  return hits
}
const bestOf = (hits: Map<number, number>, allow?: (i: number) => boolean) => {
  let top = 0
  for (const [i, s] of hits) if (s > top && (!allow || allow(i))) top = s
  return top
}

const STONES = ITEMS.filter((i) => i.mega?.length)

function identify(data: ScanData, legal: Legal, box: Box): SheetMon {
  const [pokemonRow = '', secondRow = '', abilityRow = '', itemRow = '', ...moveRows] = box
  // Players sometimes write the ability and the nature in each other's rows. Only then (the
  // nature row doesn't read as a nature but does as an ability, better than the ability row)
  // swap them.
  const abilitySim = (t: string) => best(t, data.abilities, 0)?.score ?? 0
  const swapped = !best(secondRow, NATURES, 0.7) && abilitySim(secondRow) >= 0.6 && abilitySim(secondRow) > abilitySim(abilityRow) && !!best(abilityRow, NATURES, 0.55)
  const traitRows = swapped ? secondRow : abilityRow
  const nature = best(swapped ? abilityRow : secondRow, NATURES, 0.7)?.name ?? ''
  // Items from the Champions item list; anything else only when written out clearly.
  const itemMatch = best(itemRow, legal.items, 0.66, commonBonus) ?? best(itemRow, ITEM_NAMES, 0.9)
  let item = itemMatch ? itemIdByName.get(itemMatch.name) ?? '' : ''

  // "Mega Raichu Y" is written as Raichu holding its stone.
  const gender = writtenGender(pokemonRow)
  const nameText = readings(pokemonRow).map((r) => r.replace(/\bmega\b/i, '').replace(/\s+[XY]\s*$/, '').replace(/[♂♀]/g, '').trim()).join(ALT)
  const named = readings(nameText).length > 0
  const first = readings(nameText)[0] ?? ''
  const exact = (resolvePokemon(first) || resolveForms(first)).replace(/-mega.*$/, '')

  // Soft evidence: every ability/move/stone the writing could be, with how close it is. Each
  // candidate is scored on the closest one it can actually have, so a rough handwritten read
  // ("Maeonblont") still counts for the Pokémon that learns Moonblast.
  const abilityHits = matches(traitRows, data.abilities)
  const abilityTop = bestOf(abilityHits)
  const moveHits = moveRows.map((m) => matches(m, data.moves))
  const plainItem = itemMatch && !getItem(item)?.mega && itemMatch.score >= 0.85 // e.g. Leftovers: not a stone
  const stoneHits = new Map<string, number>()
  if (!plainItem)
    for (const st of STONES) {
      const sv = simAny(itemRow, st.name)
      if (sv >= 0.5) for (const [from] of st.mega!) { const id = resolvePokemon(from); stoneHits.set(id, Math.max(stoneHits.get(id) ?? 0, sv)) }
    }
  // "…ite Y" / "…ite X": a lone X or Y at the end narrows it to the few X/Y stones (Charizardite,
  // Mewtwonite, Raichunite) even when the rest is a scrawl. Each counts as a fair stone read (the
  // closest, if clearly closest, a bit more); the ability and moves pick between them.
  if (!plainItem)
    for (const r of readings(itemRow)) {
      const m = r.match(/^(.*[A-Za-z].*?)\s+([XY])(?:\s+\W{1,2})*\s*$/)
      if (!m) continue
      const xy = STONES.filter((st) => st.name.endsWith(` ${m[2]}`))
        .map((st) => ({ st, s: sim(m[1], st.name.slice(0, -2)) }))
        .sort((a, b) => b.s - a.s)
      xy.forEach(({ st, s }, i) => {
        const sv = i === 0 && (xy.length === 1 || s - xy[1].s >= 0.05) ? 0.68 : 0.62
        for (const [from] of st.mega!) { const id = resolvePokemon(from); stoneHits.set(id, Math.max(stoneHits.get(id) ?? 0, sv)) }
      })
    }
  const stoneTop = Math.max(0, ...stoneHits.values())

  const cands = candidatesFrom(data, legal.species)
  // An ability few Pokémon have (Drizzle, Good as Gold, Emergency Exit) all but names the Pokémon.
  const rarity = (i: number) => { const n = abilityHolders(cands).get(i) ?? 0; return n <= 2 ? 2 : n <= 5 ? 1.5 : 1 }
  const topAbility = [...abilityHits].reduce((a, b) => (b[1] > a[1] ? b : a), [-1, 0])[0]
  const nameSims = cands.map((c) => (named ? Math.max(...c.aliases.map((a) => simAny(nameText, a))) : 0))
  // A clear name counts for a lot; a garbled one (handwriting) only a little.
  const nameWeight = Math.max(0, ...nameSims) >= 0.7 ? 18 : 8
  const scored = cands.map((c, ci) => {
    const nameSim = nameSims[ci]
    let score = named ? nameWeight * (nameSim - 0.55) : 0
    if (exact && c.id === exact) score += 10
    if (!c.legal) score -= 5
    // Popular Pokémon are more likely: decides between rough reads that fit two about equally.
    score += 2.5 * c.popular
    if (abilityTop) {
      let own = 0, ownIdx = -1
      for (const [i, sv] of abilityHits) if (sv > own && c.abilities.includes(i)) [own, ownIdx] = [sv, i]
      score += own ? 10 * (own - 0.5) * (own >= 0.6 ? rarity(ownIdx) : 1) : -(abilityTop >= 0.8 ? 8 * rarity(topAbility) : abilityTop >= 0.6 ? 3 : 0)
    }
    for (const hits of moveHits) {
      const top = bestOf(hits)
      if (!top) continue
      const own = bestOf(hits, (i) => c.learn.has(i))
      // Rough reads match something in any big learnset, so only fairly close ones count much.
      score += own >= 0.55 ? 1.5 * Math.min(1, (own - 0.55) / 0.35) : -(top >= 0.8 ? 3 : top >= 0.65 ? 1 : 0)
    }
    if (stoneTop >= 0.6) {
      const own = stoneHits.get(c.id) ?? 0
      score += own ? 24 * (own - 0.5) : -(stoneTop >= 0.8 ? 12 : stoneTop >= 0.7 ? 4 : 0)
    }
    const tie = c.fullyEvolved * 0.8 + c.bst / 1000 // tournament Pokémon are usually fully evolved
    return { id: c.id, sid: c.sid, score, total: score + tie, nameSim, learn: c.learn, abilities: c.abilities }
  }).sort((a, b) => b.total - a.total)
  // The item reads as a Mega Stone: its Pokémon wins a near tie (popularity alone mustn't put
  // Sneasler over the Gengar holding Gengarite).
  const stoneOwners = itemMatch && itemMatch.score >= 0.75 ? getItem(item)?.mega?.map(([from]) => resolvePokemon(from)) ?? [] : []
  if (stoneOwners.length && scored[0] && !stoneOwners.includes(scored[0].id)) {
    const oi = scored.findIndex((x) => stoneOwners.includes(x.id))
    if (oi > 0 && scored[0].score - scored[oi].score < 3) scored.unshift(...scored.splice(oi, 1))
  }

  const top = scored[0]
  const twinsOf = (id: string) => Object.values(GENDERED).find((pair) => pair.includes(id))
  const twins = top ? twinsOf(top.id) : undefined
  const rival = scored.find((s) => s !== top && !twins?.includes(s.id))
  const strong = top && (top.nameSim >= 0.7 || bestOf(abilityHits, (i) => top.abilities.includes(i)) >= 0.8 || (stoneHits.get(top.id) ?? 0) >= 0.7)
  let pokemon = top && top.score > 0 ? top.id : ''
  let confident = !!pokemon && !!strong && (!rival || top.score - rival.score >= 4)
  let note: string | undefined

  // What the rows most likely say, now that the Pokémon is known (shown for checking, and used for Basculegion).
  const pick = (hits: Map<number, number>, allow: (i: number) => boolean) => {
    let bi = -1, bs = 0
    for (const [i, sv] of hits) if (sv > bs && allow(i)) [bi, bs] = [i, sv]
    return bi
  }
  const read = (hits: Map<number, number>, owns: (i: number) => boolean, list: string[]) => {
    let i = pokemon ? pick(hits, owns) : -1
    if (i < 0) i = pick(hits, (j) => hits.get(j)! >= 0.6)
    return i >= 0 ? list[i] : ''
  }
  const ability = read(abilityHits, (i) => top.abilities.includes(i), data.abilities)
  const moves = moveHits.map((h) => read(h, (i) => top.learn.has(i), data.moves)).filter(Boolean)

  // Gendered forms: what's written decides; otherwise the ability/moves (Indeedee, Meowstic and
  // Oinkologne differ), or for Basculegion its usual sets.
  if (pokemon && twins) {
    const [male, female] = twins
    if (gender) pokemon = gender === 'male' ? male : female
    else if (male.startsWith('basculegion')) {
      const guess = guessBasculegion(moves, nature)
      pokemon = guess.gender === 'male' ? male : female
      note = t(guess.sure ? 'ui.import.teamSheet.genderMoves' : 'ui.import.teamSheet.genderMovesUnsure', { gender: guess.gender === 'male' ? t('ui.import.teamSheet.male') : t('ui.import.teamSheet.female') })
      if (!guess.sure) confident = false
    } else {
      const other = scored.find((s) => s.id === (pokemon === male ? female : male))
      if (other && top.score - other.score < 2) {
        note = t('ui.import.teamSheet.genderMissing')
        confident = false
      }
    }
  }

  // A Mega Stone can be checked against the Pokémon: fix a misread stone name.
  if (pokemon && readings(itemRow).length && !plainItem) {
    const stones = STONES.filter((i) => i.mega!.some(([from]) => resolvePokemon(from) === top.id)).map((i) => i.name)
    const stone = best(itemRow, stones, 0.45)
    if (stone && stone.score >= (itemMatch?.score ?? 0) - 0.1) item = itemIdByName.get(stone.name) ?? ''
    else if (!item) item = itemIdByName.get(best(itemRow, legal.items, 0.62, commonBonus)?.name ?? '') ?? ''
  }

  const alternatives = scored.filter((s) => s.id !== pokemon && s.score > -10).slice(0, 3).map((s) => s.id)
  // An unclear item read, now that the Pokémon is known: lean on what that Pokémon actually holds
  // on real teams ("SY 4ras Berry" on Incineroar: Sitrus). Only rough reads; a clear one stands.
  const held = pokemon ? usage.held[top.sid] ?? {} : {}
  const heldTotal = Object.values(held).reduce((a, b) => a + b, 0)
  const curSim = item ? simAny(itemRow, getItem(item)?.name ?? '') : 0
  if (heldTotal >= 3 && readings(itemRow).length && curSim < 0.8) {
    const rank = (n: string) => simAny(itemRow, n) + commonBonus(n) + (0.15 * (held[key(n)] ?? 0)) / heldTotal
    let pickName = '', pickRank = item ? rank(getItem(item)?.name ?? '') : 0
    for (const n of legal.items) {
      if (simAny(itemRow, n) < 0.45) continue
      const r = rank(n)
      if (r > pickRank + 0.02) [pickName, pickRank] = [n, r]
    }
    if (pickName) item = itemIdByName.get(pickName) ?? item
  }

  // Only a Pokémon that Mega Evolves with it holds a Mega Stone: anything else gets the closest
  // other item instead.
  const stoneFits = (name: string) => {
    const mega = ITEMS.find((i) => i.name === name)?.mega
    return !mega || (!!pokemon && mega.some(([from]) => resolvePokemon(from) === top.id))
  }
  if (pokemon && item && !stoneFits(getItem(item)?.name ?? '')) {
    const held2 = (n: string) => (heldTotal >= 3 ? (0.15 * (held[key(n)] ?? 0)) / heldTotal : 0)
    const pick = best(itemRow, legal.items.filter(stoneFits), 0.6, (n) => commonBonus(n) + held2(n))
    item = pick ? itemIdByName.get(pick.name) ?? '' : ''
  }

  // The item is only sure when it reads clearly better than every other item it could be
  // ("Garchompe 2": Garchompite or Garchompite Z? "lr sy Seed": Grassy or Misty?). A blank item
  // row is checked too: nearly every team gives every Pokémon an item.
  const itemName = getItem(item)?.name ?? ''
  let itemSure = !!item
  if (item) {
    const mine = simAny(itemRow, itemName)
    const rival = Math.max(0, ...legal.items.filter((n) => n !== itemName).map((n) => simAny(itemRow, n)))
    itemSure = mine >= 0.92 || mine - rival >= 0.08
  }
  return { written: readings(pokemonRow)[0] ?? '', ability, item, itemWritten: readings(itemRow)[0] ?? '', moves, pokemon, alternatives, confident: confident && itemSure, note }
}

/** "Arcanine Hisuian Form" -> "Arcanine [Hisuian Form]" for the RK9 form reader. */
function resolveForms(text: string): string {
  // Letters only: OCR noise like "*" would break the form reader's patterns.
  const words = text.replace(/[^\p{L}\p{N}\s'%-]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  for (let i = words.length - 1; i >= 1; i--) {
    const id = resolveRk9Species(`${words.slice(0, i).join(' ')} [${words.slice(i).join(' ')}]`)
    if (id) return id
  }
  return ''
}

// ---------- Row labels ----------

/** Which row a printed label belongs to: 0 Pokémon, 1 Nature etc., 2 Ability, 3 Held Item, 4-7 Moves. */
function labelRow(text: string): number | null {
  const t = text.trim()
  if (/^Pok[ée]mon$/i.test(t)) return 0
  if (/^(Nature|Tera Type|Stat Alignment)$/i.test(t)) return 1
  if (/^Ability$/i.test(t)) return 2
  if (/^Held Item$/i.test(t)) return 3
  const m = t.match(/^Move\s*([1-4])$/i)
  return m ? 3 + Number(m[1]) : null
}

interface Label { row: number; x0: number; x1: number; y: number; h: number }

/**
 * Split labels into the form's two columns, then into boxes: top to bottom, a new box starts when
 * the row number goes back down (or jumps a box's worth of space).
 */
function groupBoxes(labels: Label[], pageWidth: number): Label[][] {
  const byX = [...labels].sort((a, b) => a.x1 - b.x1)
  let split = Infinity, gap = pageWidth * 0.2
  for (let i = 1; i < byX.length; i++) if (byX[i].x1 - byX[i - 1].x1 > gap) [gap, split] = [byX[i].x1 - byX[i - 1].x1, byX[i].x1]
  // Labels are right-aligned in their column: a "label" far from that edge is a stray word.
  const columns = [labels.filter((l) => l.x1 < split), labels.filter((l) => l.x1 >= split)].map((c) => {
    const edge = median(c.map((l) => l.x1)), h = median(c.map((l) => l.h))
    return c.filter((l) => Math.abs(l.x1 - edge) < 3 * h)
  })
  const walk = (column: Label[], pitch: number) => {
    const boxes: Label[][] = []
    let last: Label | null = null
    for (let l of [...column].sort((a, b) => a.y - b.y)) {
      // A misread number ("Move 2" read as "Move 4") right under the last label isn't a new box:
      // boxes are at least ~2 rows apart. Number it from its position instead.
      if (last && pitch && l.row <= last.row && last.row < 7 && l.y - last.y < 1.5 * pitch) {
        const row = last.row + Math.max(1, Math.round((l.y - last.y) / pitch))
        if (row <= 7) l = { ...l, row }
      }
      const jump = last && pitch && l.y - last.y > (l.row - last.row + 1.6) * pitch
      if (!last || l.row <= last.row || jump) boxes.push([])
      boxes[boxes.length - 1].push(l)
      last = l
    }
    // The form has three boxes per column: join pieces of one box that were split apart (the
    // closest pair whose rows follow on), or a seventh "box" would push a real one off the end.
    while (pitch && boxes.length > 3) {
      let bi = -1, bg = Infinity
      for (let i = 0; i + 1 < boxes.length; i++) {
        const a = boxes[i], b = boxes[i + 1], la = a[a.length - 1], fb = b[0]
        if (fb.row <= la.row) continue
        const gap = Math.abs(fb.y - la.y - (fb.row - la.row) * pitch)
        if (gap < bg) [bi, bg] = [i, gap]
      }
      if (bi < 0 || bg > 1.5 * pitch) break
      boxes.splice(bi, 2, [...boxes[bi], ...boxes[bi + 1]])
    }
    // Still more than three: part of another sheet in the photo (above or below this one). The
    // form's boxes are next to each other, so drop whichever end box has fewer labels.
    while (boxes.length > 3) boxes.splice(boxes[0].length < boxes[boxes.length - 1].length ? 0 : boxes.length - 1, 1)
    return boxes
  }
  // Row spacing from neighbouring labels in the same box, then group again with it.
  const steps = columns.flatMap((c) => walk(c, 0)).flatMap((b) => b.slice(1).map((l, i) => (l.y - b[i].y) / (l.row - b[i].row)))
  const pitch = median(steps.filter((s) => s > 0))
  const boxes = columns.flatMap((c) => walk(c, pitch))
  // Left then right, top to bottom: the order on the sheet, row by row.
  const left = boxes.filter((b) => b[0].x1 < split), right = boxes.filter((b) => b[0].x1 >= split)
  const ordered: Label[][] = []
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) ordered.push(left[i])
    if (right[i]) ordered.push(right[i])
  }
  return ordered.filter((b) => b.length >= 2)
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0)

// ---------- PDF with real text ----------

interface Segment { text: string; x0: number; x1: number; y: number; h: number }

/** The PDF page's text pieces joined into runs on each line. */
function segments(items: { str: string; x: number; w: number; y: number; h: number }[]): Segment[] {
  const out: Segment[] = []
  const lines: (typeof items)[] = []
  for (const it of items) {
    if (!it.str.trim()) continue
    const line = lines.find((l) => Math.abs(l[0].y - it.y) < 2)
    if (line) line.push(it)
    else lines.push([it])
  }
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x)
    let cur: Segment | null = null
    for (const it of line) {
      if (cur && it.x - cur.x1 < 3) {
        cur.text += (it.x - cur.x1 > 0.5 ? ' ' : '') + it.str
        cur.x1 = it.x + it.w
      } else {
        if (cur) out.push(cur)
        cur = { text: it.str, x0: it.x, x1: it.x + it.w, y: it.y, h: it.h }
      }
    }
    if (cur) out.push(cur)
  }
  return out.map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ').trim() }))
}

function sheetFromSegments(segs: Segment[], pageWidth: number): RawSheet | null {
  const labels: (Label & { seg: Segment })[] = []
  for (const s of segs) {
    const row = labelRow(s.text)
    if (row !== null) labels.push({ row, x0: s.x0, x1: s.x1, y: s.y, h: s.h, seg: s })
  }
  const labelSegs = new Set(labels.map((l) => l.seg))
  const valueOf = (l: Label) => {
    // The nearest text to the right on the same line that isn't another label or a stat number.
    const right = segs.filter((s) => !labelSegs.has(s) && Math.abs(s.y - l.y) < 2.5 && s.x0 > l.x1 && !/^\d+$/.test(s.text))
    const nextLabel = Math.min(...labels.filter((o) => Math.abs(o.y - l.y) < 2.5 && o.x0 > l.x1).map((o) => o.x0))
    return right.filter((s) => s.x0 < nextLabel).sort((a, b) => a.x0 - b.x0).map((s) => s.text).join(' ')
  }
  const boxes = groupBoxes(labels, pageWidth).map((b) => {
    const rows: Box = Array(8).fill('')
    for (const l of b) rows[l.row] = valueOf(l)
    return rows
  })
  if (!boxes.some((b) => b[0])) return null
  const playerLabel = segs.find((s) => /^Player Name:?$/i.test(s.text))
  const player = playerLabel
    ? segs.filter((s) => Math.abs(s.y - playerLabel.y) < 2.5 && s.x0 > playerLabel.x1 && !/Age Division|Juniors|Seniors|Masters/i.test(s.text)).sort((a, b) => a.x0 - b.x0)[0]?.text ?? ''
    : ''
  return { player, boxes }
}

async function openPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  return pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
}

type Pdf = Awaited<ReturnType<typeof openPdf>>

/** One page's sheet from the PDF's own text, or null (a scanned page has no text). */
async function pdfPageText(pdf: Pdf, p: number): Promise<RawSheet | null> {
  const page = await pdf.getPage(p)
  const { height, width } = page.getViewport({ scale: 1 })
  const items = (await page.getTextContent()).items.flatMap((it) =>
    'str' in it ? [{ str: it.str, x: it.transform[4], w: it.width, y: height - it.transform[5], h: it.height }] : [],
  )
  const segs = segments(items)
  return otsFromSegments(segs, width) ?? sheetFromSegments(segs, width)
}

async function pdfPicture(pdf: Pdf, p: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(p)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: SIZE / Math.max(base.width, base.height) })
  const c = document.createElement('canvas')
  c.width = Math.round(viewport.width)
  c.height = Math.round(viewport.height)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  await page.render({ canvasContext: ctx, viewport, canvas: c } as Parameters<typeof page.render>[0]).promise
  return c
}

// ---------- Pictures ----------

const SIZE = 2400 // working size (long side): handwriting needs a bit more detail than print

async function imageCanvas(file: File) {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name)
      ? t('ui.import.teamSheet.heic')
      : t('ui.import.teamSheet.openImage'))
  }
  const scale = SIZE / Math.max(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c
}

/** The picture turned clockwise by `turns` quarter turns. */
function quarterTurn(src: HTMLCanvasElement, turns: number) {
  turns = ((turns % 4) + 4) % 4
  if (!turns) return src
  const c = document.createElement('canvas')
  ;[c.width, c.height] = turns % 2 ? [src.height, src.width] : [src.width, src.height]
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((turns * Math.PI) / 2)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return c
}

/**
 * Do the lines of text run up and down? Rows of text make the dark-pixel count change sharply
 * from one pixel row to the next (text line, gap, text line); across them it changes smoothly.
 */
function looksSideways(src: HTMLCanvasElement) {
  const scale = 400 / Math.max(src.width, src.height)
  const w = Math.max(1, Math.round(src.width * scale)), h = Math.max(1, Math.round(src.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11
  const paper = median(Array.from({ length: 2000 }, (_, i) => lum[Math.floor((i * w * h) / 2000)]))
  const rows = new Float32Array(h), cols = new Float32Array(w)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (lum[y * w + x] < paper * 0.7) { rows[y]++; cols[x]++ }
  const jumpiness = (p: Float32Array) => { let d = 0, t = 0; for (let i = 1; i < p.length; i++) { d += Math.abs(p[i] - p[i - 1]); t += p[i] } return t ? d / t : 0 }
  const r = jumpiness(rows), k = jumpiness(cols)
  sheetDebug.sideways = [Math.round(r * 100) / 100, Math.round(k * 100) / 100]
  return k > r * 1.25
}

const letters = (t: string) => t.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toLowerCase()
const near = (a: string, b: string) => distance(a, b) <= (b.length >= 6 ? 2 : b.length >= 4 ? 1 : 0)
const HEADER_WORDS = /^(video|game|team|list|must|listed|all|exactly)$/

/** The printed row labels among the words of each recognised line. */
function findLabels(lines: { words: Word[] }[]): Label[] {
  const labels: Label[] = []
  for (const { words } of lines) {
    const header = words.some((w) => HEADER_WORDS.test(letters(w.text)))
    for (let i = 0; i < words.length; i++) {
      const w = words[i], t = letters(w.text), next = words[i + 1], n = next ? letters(next.text) : ''
      const add = (row: number, end: Word = w) => labels.push({ row, x0: w.x0, x1: end.x1, y: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 })
      if ((near(t, 'pokemon') || near(t, 'pokmon')) && !header) add(0)
      else if (near(t, 'nature') || t === 'tera' || near(t, 'alignment')) add(1, near(t, 'alignment') ? w : n && (near(n, 'type') || near(n, 'alignment')) ? next : w)
      else if (near(t, 'stat') && n && near(n, 'alignment')) { add(1, next); i++ }
      else if (near(t, 'ability')) add(2)
      else if (near(t, 'held')) add(3, n && near(n, 'item') ? next : w)
      else if (t === 'item' && !(i && near(letters(words[i - 1].text), 'held'))) add(3)
      else {
        const joined = t.match(/^move([1-4])$/)
        const digit = n.replace(/[li|]/g, '1').match(/^([1-4])$/)
        if (joined) add(3 + Number(joined[1]))
        else if (near(t, 'move') && digit) { add(3 + Number(digit[1]), next); i++ }
      }
    }
  }
  return labels
}

/** Dark-pixel map of the page, for finding the box edges. */
function darkMap(src: HTMLCanvasElement) {
  const { width: w, height: h } = src
  const px = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  const lum = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = (px[i * 4] * 3 + px[i * 4 + 1] * 6 + px[i * 4 + 2]) / 10
  const paper = median(Array.from({ length: 4000 }, (_, i) => lum[Math.floor((i * w * h) / 4000)]))
  const dark = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) dark[i] = lum[i] < paper * 0.6 ? 1 : 0
  return { w, h, dark }
}

/** How much of the band [y0, y1] is covered by a dark vertical line at x (allowing 1px of tilt). */
function columnCover(map: ReturnType<typeof darkMap>, x: number, y0: number, y1: number) {
  let hit = 0, n = 0
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(map.h, Math.round(y1)); y++, n++) {
    // Up to 2px either side: a rule in a photo is rarely perfectly upright.
    const i = y * map.w + x
    if (map.dark[i] || map.dark[i - 1] || map.dark[i + 1] || map.dark[i - 2] || map.dark[i + 2]) hit++
  }
  return n ? hit / n : 0
}

/** The first vertical rule right of x (box edge or stats column) that runs through this row and a neighbour. */
function ruleAfter(map: ReturnType<typeof darkMap>, x: number, xMax: number, y: number, pitch: number) {
  for (let cx = Math.round(x); cx < Math.min(map.w - 1, xMax); cx++) {
    if (columnCover(map, cx, y - 0.3 * pitch, y + 0.3 * pitch) < 0.85) continue
    // Rules are thin; a scribbled-out word is a wide dark blob.
    if (columnCover(map, cx + Math.round(0.3 * pitch), y - 0.3 * pitch, y + 0.3 * pitch) > 0.6) continue
    // A rule runs on unbroken through the next row up or down (box edge, stats column); a tall
    // pen stroke in big handwriting ("l", "f") stops at the row's edge.
    if (columnCover(map, cx, y - 1.5 * pitch, y + 0.3 * pitch) > 0.85 || columnCover(map, cx, y - 0.3 * pitch, y + 1.5 * pitch) > 0.85) return cx
  }
  return xMax
}

/** Darkest ink to black, paper to white: faint grey print and pencil read much better. */
function stretch(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const px = img.data
  const lum: number[] = []
  for (let i = 0; i < px.length; i += 4) lum.push(px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11)
  const sorted = [...lum].sort((a, b) => a - b)
  const ink = sorted[Math.floor(sorted.length * 0.01)], paper = sorted[Math.floor(sorted.length * 0.6)]
  if (paper - ink < 40) return c // blank, or nothing to gain
  for (let i = 0; i < lum.length; i++) {
    const v = Math.max(0, Math.min(255, ((lum[i] - ink) / (paper - ink)) * 255))
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * White out a box edge left at either end of a cut-out row: a dark column running most of the
 * strip's height (removeRules only takes lines longer than the strip is tall). Left in, a column
 * of these edges down the stacked rows makes the recognition read the faint text as junk.
 */
function eraseEdges(c: HTMLCanvasElement) {
  const { width: w, height: h } = c
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const lum = (i: number) => px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11
  const paper = median(Array.from({ length: 500 }, (_, i) => lum(Math.floor((i * w * h) / 500))))
  const cover = (x: number) => { let n = 0; for (let y = 0; y < h; y++) if (lum(y * w + x) < paper * 0.7) n++; return n / h }
  const reach = Math.min(Math.round(h * 0.6), Math.floor(w / 4))
  const wipe = (x: number) => { for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = 255 } }
  let hit = false
  for (const side of [1, -1]) {
    for (let k = 0; k < reach; k++) {
      const x = side > 0 ? w - 1 - k : k
      if (cover(x) < 0.55) continue
      hit = true
      for (let d = -2; d <= 2; d++) if (x + d >= 0 && x + d < w) wipe(x + d)
    }
  }
  if (hit) ctx.putImageData(img, 0, 0)
  return c
}

/**
 * White out table lines that cross a cut-out row at a slant (a photo taken at an angle): straight
 * lines, nearly level, running most of the way across. removeRules only takes level lines; slanted
 * ones left in run through the writing and make the recognition put words in the wrong row.
 */
function eraseSlantedRules(c: HTMLCanvasElement) {
  const { width: w, height: h } = c
  if (w < h * 3) return c
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const dark = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) dark[i] = px[i * 4] < 128 ? 1 : 0
  const at = (x: number, y: number) => (y >= 0 && y < h ? dark[y * w + x] | (y > 0 ? dark[(y - 1) * w + x] : 0) | (y + 1 < h ? dark[(y + 1) * w + x] : 0) : 0)
  let changed = false
  for (let n = 0; n < 3; n++) {
    let best = { cover: 0, y0: 0, slope: 0 }
    for (let si = -12; si <= 12; si++) {
      const slope = si * 0.005
      for (let y0 = -Math.round(Math.abs(slope) * w); y0 < h + Math.abs(slope) * w; y0++) {
        let hit = 0
        for (let x = 0; x < w; x += 2) hit += at(x, Math.round(y0 + slope * x))
        const cover = hit / Math.ceil(w / 2)
        if (cover > best.cover) best = { cover, y0, slope }
      }
    }
    if (best.cover < 0.6) break
    // A rule is thin: just above and below it is mostly paper. A long word isn't.
    const band = (dy: number) => { let hit = 0; for (let x = 0; x < w; x += 2) hit += at(x, Math.round(best.y0 + dy + best.slope * x)); return hit / Math.ceil(w / 2) }
    if (Math.max(band(-5), band(5)) > 0.35) break
    for (let x = 0; x < w; x++) {
      const yc = Math.round(best.y0 + best.slope * x)
      for (let y = yc - 2; y <= yc + 2; y++) if (y >= 0 && y < h) { dark[y * w + x] = 0; const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = 255 }
    }
    changed = true
  }
  if (changed) ctx.putImageData(img, 0, 0)
  return c
}

/** One written line as black on white, ~80px tall, with ruled lines removed. */
function lineImage(page: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number, height = 80) {
  // Contrast first: faint grey table lines in a photo only count as lines once they're dark.
  const piece = stretch(eraseEdges(eraseSlantedRules(removeRules(stretch(crop(page, x0, y0, x1, y1)), (y1 - y0) * 0.4))))
  const scale = height / piece.height
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(piece.width * scale))
  out.height = height
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(piece, 0, 0, out.width, out.height)
  return thicken(out)
}

/** Strokes 1px bolder (darkest neighbour): thin pen handwriting reads noticeably better. */
function thicken(c: HTMLCanvasElement) {
  const { width: w, height: h } = c
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const src = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) src[i] = px[i * 4]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 255
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) m = Math.min(m, src[yy * w + xx])
      const i = (y * w + x) * 4
      px[i] = px[i + 1] = px[i + 2] = m
    }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * Read a box's rows in one go: each row's writing is cut out and stacked under the others with
 * white space between, so one recognition pass reads all eight (much faster than one per row).
 */
async function readStrips(worker: Worker, page: HTMLCanvasElement, strips: { x0: number; x1: number; y: number }[], pitch: number): Promise<Box> {
  const H = 64, GAP = 28
  const images = strips.map((s) => (s.x1 - s.x0 < pitch ? null : lineImage(page, s.x0, s.y - 0.5 * pitch, s.x1, s.y + 0.5 * pitch, H)))
  const sheet = document.createElement('canvas')
  sheet.width = Math.max(200, ...images.map((im) => (im ? im.width : 0))) + 2 * GAP
  sheet.height = strips.length * (H + GAP) + GAP
  const ctx = sheet.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, sheet.width, sheet.height)
  images.forEach((im, i) => im && ctx.drawImage(im, GAP, GAP + i * (H + GAP)))
  if (sheetDebug.keepStrips) ((sheetDebug.strips as HTMLCanvasElement[] | undefined) ?? (sheetDebug.strips = [])).push(sheet)
  const { words } = await ocr(worker, sheet)
  const rows: Word[][] = strips.map(() => [])
  for (const w of words) {
    const i = Math.floor(((w.y0 + w.y1) / 2 - GAP / 2) / (H + GAP))
    if (i >= 0 && i < rows.length && w.text.trim()) rows[i].push(w)
  }
  return rows.map((ws) => clean(ws.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' ')))
}

// "¥" is how a printed "Y" often comes out ("Charizardite ¥").
// Stand-alone numbers are the staff page's stats column read along with the row ("Hurricane 105").
const clean = (t: string) => t.replace(/¥/g, 'Y').replace(/[|_—=~]+/g, ' ').replace(/(^|\s)[[(]?\d{2,3}[\])]?(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim()

async function pictureText(src: HTMLCanvasElement, readable: (row: number, text: string) => boolean, onProgress?: (msg: string) => void): Promise<RawSheet> {
  onProgress?.(t('ui.import.ocrLoading'))
  const { createWorker, PSM } = await import('tesseract.js')
  const worker: Worker = await createWorker('eng')
  try {
    onProgress?.(t('ui.import.teamSheet.finding'))
    for (const k of Object.keys(sheetDebug)) if (k !== 'keepStrips') delete sheetDebug[k]
    // Sideways photos: turn the way the text lines run, and if the form's labels still can't be
    // found, try the other ways round (upside down, the other quarter turn).
    let turns = looksSideways(src) ? 3 : 0
    let page = enhance(straighten(quarterTurn(src, turns)))
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    let { lines } = await ocr(worker, page)
    if (findLabels(lines).length < 12 && !otsLayout(lines.flatMap((l) => l.words), page.width)) {
      let found = findLabels(lines).length
      for (const extra of [2, 1, 3]) {
        const turn = (turns + extra) % 4
        onProgress?.(t('ui.import.teamSheet.turning'))
        const p2 = enhance(straighten(quarterTurn(src, turn)))
        const again = await ocr(worker, p2)
        const n = findLabels(again.lines).length, isOts = !!otsLayout(again.lines.flatMap((l) => l.words), p2.width)
        if (n > found || isOts) [page, lines, turns, found] = [p2, again.lines, turn, isOts ? 99 : n]
        if (found >= 12) break
      }
    }
    sheetDebug.turns = turns
    // A Regionals / International sheet (language tables) instead of the paper form?
    const ots = (ls: typeof lines) => otsLayout(ls.flatMap((l) => l.words), page.width)
    const readOts = async (layout: OtsLayout) => {
      sheetDebug.ots = layout
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      return otsFromPicture(worker, page, layout, onProgress)
    }
    const first = ots(lines)
    if (first) return await readOts(first)
    let labels = findLabels(lines)
    // Crisp screenshots: solid grid lines round every cell stop the labels being found. Erase
    // long dark runs and look again. Only when most labels are missing: on photos the erased
    // version finds more labels but places them less exactly, which hurts the reads.
    if (labels.length < 24) {
      const h = median(labels.map((l) => l.h)) || page.height / 110
      const again = await ocr(worker, removeRules(page, h))
      const more = findLabels(again.lines)
      sheetDebug.labelCounts = [labels.length, more.length]
      const second = ots(again.lines)
      if (second) return await readOts(second)
      if (more.length > labels.length) [lines, labels] = [again.lines, more]
    }
    const boxes = groupBoxes(labels, page.width)
    Object.assign(sheetDebug, { lines: lines.map((l) => l.words.map((w) => `${w.text}@${Math.round(w.x0)},${Math.round(w.y0)}-${Math.round(w.x1)}`).join(' ')), labels, boxes })
    if (boxes.length < 2) throw new Error(t('ui.import.teamSheet.noList'))

    const pitch = median(boxes.flatMap((b) => b.slice(1).map((l, i) => (l.y - b[i].y) / (l.row - b[i].row))).filter((s) => s > 0)) || median(labels.map((l) => l.h)) * 2
    const map = darkMap(page)
    const rightEdges = (right: boolean) => median(boxes.flatMap((b) => b.map((l) => l.x1)).filter((x) => (x > page.width * 0.4) === right))
    const columnStep = rightEdges(true) - rightEdges(false) || page.width / 2
    const split = Math.min(...boxes.filter((b) => b[0].x1 > page.width * 0.4).map((b) => Math.min(...b.map((l) => l.x0))))

    const read = async (x0: number, y: number, x1: number, height?: number) => {
      if (x1 - x0 < pitch) return ''
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
      const { data } = await worker.recognize(lineImage(page, x0, y - 0.5 * pitch, x1, y + 0.5 * pitch, height))
      return clean(data.text)
    }

    const out: Box[] = []
    for (const [bi, b] of boxes.entries()) {
      onProgress?.(t('ui.import.teamSheet.readingMon', { n: bi + 1, total: boxes.length }))
      // Each row's height from the labels found in this box: a straight line through rows 1-7.
      // The Pokémon row is a bit taller than the others, so it sits ~1.2 rows above row 1.
      const fit = b.filter((l) => l.row > 0)
      const rows = fit.map((l) => l.row), ys = fit.map((l) => l.y)
      const mr = rows.reduce((s, r) => s + r, 0) / (rows.length || 1), my = ys.reduce((s, y) => s + y, 0) / (ys.length || 1)
      const vr = rows.reduce((s, r) => s + (r - mr) ** 2, 0)
      const slope = vr > 0 && fit.length >= 3 ? rows.reduce((s, r, i) => s + (r - mr) * (ys[i] - my), 0) / vr : pitch
      const top = b.find((l) => l.row === 0)
      const yOf = (r: number) => {
        if (!fit.length) return top!.y + (r ? (r + 0.2) * pitch : 0)
        return r ? my + (r - mr) * slope : my + (1 - mr) * slope - 1.2 * slope
      }
      // Labels are right-aligned, so the writing starts after the labels' common right edge.
      const labelRight = median(b.map((l) => l.x1))
      const inLeftColumn = labelRight < split
      // Never read past the box: the other column, or one column's width from the labels.
      const limit = Math.min(inLeftColumn && Number.isFinite(split) ? split - 0.3 * pitch : page.width, labelRight + columnStep * 0.92)
      const strips = Array.from({ length: 8 }, (_, r) => {
        const own = b.find((l) => l.row === r && l.x1 > labelRight - 0.5 * pitch && l.x1 < labelRight + 0.5 * pitch)
        const x0 = Math.max(labelRight, own?.x1 ?? 0) + 0.25 * pitch
        const y = own ? own.y : yOf(r)
        const x1 = ruleAfter(map, x0 + pitch, limit, y, pitch) - 3
        return { x0, x1, y }
      })
      if (strips.some((st) => !Number.isFinite(st.x0 + st.x1 + st.y))) { out.push(Array(8).fill('')); continue }
      // One box that can't be read (e.g. cut off at the photo's edge) mustn't lose the others.
      try {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
        const box = await readStrips(worker, page, strips, pitch)
        // The key rows that came back as nothing recognisable get a second read on their own:
        // reading one line at a time is slower but steadier than the stacked read.
        for (const r of [0, 2, 3]) {
          if (readable(r, box[r])) continue
          const again = await read(strips[r].x0, strips[r].y, strips[r].x1)
          if (again && again !== box[r]) box[r] = box[r] ? again + ALT + box[r] : again
        }
        out.push(box)
      } catch {
        out.push(Array(8).fill(''))
      }
    }

    // "Player Name:" line (often handwritten, so only a hint for matching players).
    let player = ''
    for (const { words } of lines) {
      const i = words.findIndex((w, j) => near(letters(w.text), 'player') && words[j + 1] && near(letters(words[j + 1].text), 'name'))
      if (i < 0) continue
      const label = words[i + 1], h = label.y1 - label.y0
      const stop = lines.flatMap((l) => l.words).find((w) => /^age$/i.test(letters(w.text)) && Math.abs(w.y0 - label.y0) < h * 2 && w.x0 > label.x1)
      player = (await read(label.x1 + h * 0.3, (label.y0 + label.y1) / 2, stop ? stop.x0 - h : page.width * 0.55)).replace(/^[:.\s]+/, '')
      break
    }
    sheetDebug.raw = out
    return { player, boxes: out }
  } finally {
    await worker.terminate()
  }
}

// ---------- Regionals / International team sheets ----------
//
// Printed by the event: one table per language (EN, FR, IT, DE, ES, JP, KO, SC, TC) stacked down
// the page, each with a header row "EN 1 2 3 4 5 6" and eight rows (Pokémon, Ability, Held Item,
// Stat Alignment, Move 1-4) under the six numbered columns. The English table is read, and the
// other Latin-alphabet tables back it up (translated back to English names).

const OTS_ORDER = ['EN', 'FR', 'IT', 'DE', 'ES', 'JP', 'KO', 'SC', 'TC'] as const
const OTS_READ = { FR: 'fr', IT: 'it', DE: 'de', ES: 'es' } as const
type OtsLanguage = keyof typeof OTS_READ

interface OtsLayout {
  columns: [number, number][] // left/right of the six Pokémon columns
  blocks: { lang: (typeof OTS_ORDER)[number]; rows: number[] }[] // centre height of each of the 8 rows
  pitch: number
  playerWords: Word[]
}

/** Least-squares line through (x, y) points: y = a + b·x. */
function fitLine(points: [number, number][]): [number, number] {
  const n = points.length, mx = points.reduce((s, p) => s + p[0], 0) / n, my = points.reduce((s, p) => s + p[1], 0) / n
  const vx = points.reduce((s, p) => s + (p[0] - mx) ** 2, 0)
  const b = vx ? points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / vx : 0
  return [my - b * mx, b]
}

/** Find the language tables and numbered columns from positioned words (OCR or PDF text). */
function otsLayout(words: Word[], width: number): OtsLayout | null {
  const headers: { index: number; y: number; h: number }[] = []
  const digits: [number, number][] = [] // [column number, x centre]
  for (const w of words) {
    const code = w.text.replace(/[^A-Za-z]/g, '').toUpperCase()
    const index = OTS_ORDER.indexOf(code as (typeof OTS_ORDER)[number])
    if (index < 0 || w.text.trim().length > 4 || w.x0 > width * 0.3) continue
    const y = (w.y0 + w.y1) / 2, h = w.y1 - w.y0
    // A table header has the column numbers on the same line.
    const row = words.filter((d) => /^[1-6]$/.test(d.text.trim()) && d.x0 > w.x1 && Math.abs((d.y0 + d.y1) / 2 - y) < h * 0.8)
    if (row.length < 2 || headers.some((hd) => hd.index === index)) continue
    headers.push({ index, y, h })
    for (const d of row) digits.push([Number(d.text.trim()), (d.x0 + d.x1) / 2])
  }
  if (headers.length < 3 || !headers.some((h) => h.index <= 4) || digits.length < 4) return null
  // Tables are evenly stacked and columns evenly spaced: fit both so missed headers/numbers don't matter.
  const [ya, yb] = fitLine(headers.map((h) => [h.index, h.y]))
  const [xa, xb] = fitLine(digits)
  if (yb <= 0 || xb <= 0) return null
  const pitch = yb / 9 // a header row plus 8 rows per table
  const columns = Array.from({ length: 6 }, (_, i) => [xa + xb * (i + 1) - xb / 2, xa + xb * (i + 1) + xb / 2] as [number, number])
  const blocks = OTS_ORDER.slice(0, 5).map((lang, i) => ({ lang, rows: Array.from({ length: 8 }, (_, r) => ya + yb * i + pitch * (r + 1)) }))
  // "Name [US] - nickname" above the English table.
  const top = ya - pitch * 1.5
  const tag = words.find((w) => /\[[A-Z]{2}\]/.test(w.text) && w.y1 < top)
  const playerWords = tag ? words.filter((w) => Math.abs((w.y0 + w.y1) / 2 - (tag.y0 + tag.y1) / 2) < (tag.y1 - tag.y0) && w.x1 <= tag.x1).sort((a, b) => a.x0 - b.x0) : []
  return { columns, blocks, pitch, playerWords }
}

/** The tag's text up to the country code: "Jane Doe [US] - Jay" -> "Jane Doe". */
const otsPlayer = (words: Word[]) => words.map((w) => w.text).join(' ').replace(/\s*\[[A-Z]{2}\].*$/, '').trim()

/** OTS row order (Pokémon, Ability, Item, Stat Alignment, Moves) -> form order (Pokémon, Nature, Ability, Item, Moves). */
const otsToForm = (r: string[]): Box => [r[0], r[3], r[1], r[2], r[4], r[5], r[6], r[7]]

/** Build the sheet from a reader of one cell: table `bi`, column `c` (0-5), row `r` (0-7). */
function otsSheet(layout: OtsLayout, cell: (bi: number, c: number, r: number) => string): RawSheet {
  const read = (bi: number) => layout.columns.map((_, c) => otsToForm(Array.from({ length: 8 }, (_, r) => cell(bi, c, r))))
  const foreign: RawSheet['foreign'] = {}
  layout.blocks.forEach((b, bi) => { if (b.lang in OTS_READ) foreign[b.lang as OtsLanguage] = read(bi) })
  return { player: otsPlayer(layout.playerWords), boxes: read(0), foreign }
}

/** Regionals sheet from a PDF page's own text. */
function otsFromSegments(segs: Segment[], width: number): RawSheet | null {
  const words = segs.map((s) => ({ text: s.text, x0: s.x0, x1: s.x1, y0: s.y - s.h, y1: s.y }))
  const layout = otsLayout(words, width)
  if (!layout) return null
  return otsSheet(layout, (bi, c, r) => {
    const [x0, x1] = layout.columns[c], y = layout.blocks[bi].rows[r]
    return words
      .filter((w) => (w.x0 + w.x1) / 2 > x0 && (w.x0 + w.x1) / 2 < x1 && Math.abs((w.y0 + w.y1) / 2 - y) < layout.pitch / 2)
      .sort((p, q) => p.x0 - q.x0).map((w) => w.text).join(' ')
  })
}

/** Regionals sheet from a picture: each table's 48 cells cut out and read in one stacked pass. */
async function otsFromPicture(worker: Worker, page: HTMLCanvasElement, layout: OtsLayout, onProgress?: (msg: string) => void): Promise<RawSheet> {
  const tables: string[][] = []
  for (const [bi, b] of layout.blocks.entries()) {
    onProgress?.(t('ui.import.teamSheet.readingTable', { lang: b.lang }))
    // Column by column, top to bottom: strip c*8 + r.
    const strips = layout.columns.flatMap(([x0, x1]) => b.rows.map((y) => ({ x0: x0 + 2, x1: x1 - 2, y })))
    tables[bi] = await readStrips(worker, page, strips, layout.pitch)
  }
  return otsSheet(layout, (bi, c, r) => tables[bi][c * 8 + r] ?? '')
}

/**
 * Other-language readings turned into English names and added as extra readings of the English
 * rows (only close matches, so a bad read can't invent evidence).
 */
async function addForeign(raw: RawSheet): Promise<RawSheet> {
  if (!raw.foreign) return raw
  const boxes = raw.boxes.map((b) => [...b])
  for (const [lang, code] of Object.entries(OTS_READ) as [OtsLanguage, (typeof OTS_READ)[OtsLanguage]][]) {
    const rows = raw.foreign[lang]
    if (!rows) continue
    const names: NameTable = await loadNames(code)
    const back = (table: Record<string, string>) => {
      const local = Object.values(table), english = Object.keys(table)
      return (text: string) => {
        const hit = best(text.replace(/\[.*?\]/g, ''), local, 0.8)
        return hit ? english[local.indexOf(hit.name)] : ''
      }
    }
    const pokemon = back(names.pokemon), ability = back(names.abilities), move = back(names.moves)
    const itemBack = back(names.items)
    rows.forEach((row, bi) => {
      if (!boxes[bi]) return
      const add = (r: number, english: string) => { if (english) boxes[bi][r] = boxes[bi][r] ? boxes[bi][r] + ALT + english : english }
      add(0, pokemon(row[0]))
      add(2, ability(row[2]))
      const itemId = itemBack(row[3])
      add(3, itemId ? getItem(itemId)?.name ?? '' : '')
      for (let r = 4; r < 8; r++) add(r, move(row[r]))
    })
  }
  return { ...raw, boxes }
}

/** Last picture read's layout, for checking the reader in the browser console. */
export const sheetDebug: Record<string, unknown> = {}

// ---------- Putting it together ----------

const blankMon = (): SheetMon => ({ written: '', ability: '', item: '', itemWritten: '', moves: [], pokemon: '', alternatives: [], confident: false })

/**
 * Every team list in a file: one for a photo or screenshot; one per page for a PDF (a stack of
 * sheets scanned or exported together), skipping a page that repeats the one before it (each
 * player's form has a staff page and an opponents page with the same team).
 */
export async function readTeamSheets(file: File, onProgress?: (msg: string) => void): Promise<TeamSheet[]> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)
  if (!isPdf && !isImage) throw new Error(t('ui.import.teamSheet.usePhoto'))
  const [data, legal] = await Promise.all([loadScanData(), loadLegal()])
  const finish = async (raw: RawSheet, exact: boolean): Promise<TeamSheet> => {
    raw = await addForeign(raw)
    const mons = raw.boxes.slice(0, 6).map((b) => identify(data, legal, b))
    while (mons.length < 6) mons.push(blankMon())
    // A picture where not one Pokémon could even be guessed is a failed read: say so rather
    // than showing six empty slots. Any guesses at all are still shown (marked to check).
    if (!exact && !mons.some((m) => m.pokemon)) {
      throw new Error(t('ui.import.teamSheet.noneReadable'))
    }
    return { player: exact ? raw.player.trim() : plausibleName(raw.player), mons, exact }
  }
  // Does a row's text already match a real name (so a second read isn't needed)?
  const lists: Record<number, string[]> = { 0: data.species.map(([n]: [string, ...unknown[]]) => n.replace(/-/g, ' ')), 2: data.abilities, 3: legal.items }
  const readable = (row: number, text: string) => !!best(text, lists[row] ?? [], 0.75)
  if (isImage) return [await finish(await pictureText(await imageCanvas(file), readable, onProgress), false)]

  onProgress?.(t('ui.import.teamSheet.readingPdf'))
  const pdf = await openPdf(file)
  const sheets: TeamSheet[] = []
  const sig = (t: TeamSheet) => `${key(t.player)}|${t.mons.map((m) => m.pokemon).join(',')}`
  for (let p = 1; p <= pdf.numPages; p++) {
    const text = await pdfPageText(pdf, p)
    let sheet: TeamSheet
    if (text && text.boxes.some((b) => b[0])) sheet = await finish(text, true)
    else {
      if (pdf.numPages > 1) onProgress?.(t('ui.import.teamSheet.pageOf', { p, total: pdf.numPages }))
      try {
        sheet = await finish(await pictureText(await pdfPicture(pdf, p), readable, (m) => onProgress?.(pdf.numPages > 1 ? t('ui.import.teamSheet.pageStatus', { p, total: pdf.numPages, status: m }) : m)), false)
      } catch (e) {
        if (pdf.numPages === 1) throw e
        continue // not a team list page (e.g. a cover page)
      }
    }
    if (!sheet.mons.some((m) => m.pokemon)) continue
    if (sheets.length && sig(sheets[sheets.length - 1]) === sig(sheet)) continue
    sheets.push(sheet)
  }
  if (!sheets.length) throw new Error(t('ui.import.teamSheet.noListInFile'))
  return sheets
}

const FORM_WORDS = /\b(page|pages|event|staff|tournament|document|organi[sz]er|submit|player|name|trainer|battle|division|profile|switch)\b/i

/**
 * A player name read from a picture, or "" when it's clearly not a name: stray marks and ruled
 * lines read as letters ("e g h s h w 2 111 hw"), or the form's own printed words. Short bits
 * stuck on the end ("Avi Margolis i]") are dropped.
 */
export function plausibleName(raw: string): string {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length || FORM_WORDS.test(raw)) return ''
  const junk = tokens.filter((t) => t.length <= 2 || /[^\p{L}'.-]/u.test(t)).length
  if (junk > tokens.length / 2) return ''
  const words = tokens.map((t) => t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')).filter(Boolean)
  while (words.length > 1 && words[words.length - 1].length <= 2) words.pop()
  while (words.length > 1 && words[0].length <= 1) words.shift()
  if (!words.length || words.length > 4) return ''
  if (words.some((w) => /[^\p{L}'.-]/u.test(w))) return ''
  if (!words.some((w) => w.length >= 3)) return ''
  if (words.some((w) => w.length >= 4 && !/[aeiouyàáâäèéêëìíîïòóôöùúûü]/i.test(w))) return ''
  return words.join(' ')
}

/** The first team list in a file. */
export async function readTeamSheet(file: File, onProgress?: (msg: string) => void): Promise<TeamSheet> {
  return (await readTeamSheets(file, onProgress))[0]
}

/**
 * How well a name written on a sheet matches a player's name (0-1). Sheets often have just a
 * first name ("Nich") or a nickname, so a matching start of either name counts too.
 */
export function playerNameMatch(written: string, player: string): number {
  const w = key(written), p = key(player)
  if (w.length < 2 || !p) return 0
  let score = simKeys(w, p)
  const words = player.split(/\s+/).map(key).filter(Boolean)
  const wWords = written.split(/\s+/).map(key).filter(Boolean)
  for (const pw of words) for (const ww of wWords) if (ww.length >= 3 && pw.length >= 3) {
    if (pw === ww) score = Math.max(score, 0.85)
    else if (pw.startsWith(ww) || ww.startsWith(pw)) score = Math.max(score, 0.75)
    else score = Math.max(score, simKeys(ww, pw) - 0.15)
  }
  return score
}

/** For tests: identify one box of written rows. */
export async function identifyRows(rows: string[]) {
  return identify(await loadScanData(), await loadLegal(), rows)
}
