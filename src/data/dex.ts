// Pokémon + item lookups, built from the JSON written by `npm run data`.

import pokemonJson from './pokemon.json'
import itemsJson from './items.json'
import { asset } from '../brand'

export interface PokemonEntry {
  id: string
  name: string
  species: string
  dex: number
  isDefault: boolean
  form?: string // the game's form label for alternate forms, e.g. "Heat Rotom", "Alolan Form"
}
export interface ItemEntry {
  id: string
  name: string
  hasSprite: boolean
  hd: boolean
  mega?: [string, string][] // Mega Stones: [Showdown base name, Showdown Mega name]
}

export const POKEMON = pokemonJson as PokemonEntry[]
export const ITEMS = (itemsJson as ItemEntry[]).slice().sort((a, b) => a.name.localeCompare(b.name))

const pokemonById = new Map(POKEMON.map((p) => [p.id, p]))
const itemById = new Map(ITEMS.map((i) => [i.id, i]))

export const getPokemon = (id: string) => pokemonById.get(id)
export const getItem = (id: string) => itemById.get(id)

export const sprites = {
  /** Small 96px sprite, for pickers and lists. */
  icon: (id: string) => asset(`sprites/pokemon/${id}.png`),
  /** HOME 3D render, for graphics. */
  render: (id: string) => asset(`sprites/home/${id}.png`),
  /** Smooth 160px bag icon when available, otherwise the small pixel icon. */
  item: (id: string) => {
    const item = itemById.get(id)
    if (item?.hd) return asset(`sprites/items-hd/${id}.png`)
    return item?.hasSprite ? asset(`sprites/items/${id}.png`) : ''
  },
  /** True when only the pixel icon exists (draw it with crisp, blocky scaling). */
  itemIsPixel: (id: string) => !itemById.get(id)?.hd,
}

/** "Choice Scarf" -> "choice-scarf", "Flabébé" -> "flabebe" */
export function normalize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'.:%]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const pokemonByName = new Map<string, string>()
for (const p of POKEMON) {
  pokemonByName.set(normalize(p.name), p.id)
  if (p.isDefault && !pokemonByName.has(normalize(p.species))) pokemonByName.set(normalize(p.species), p.id)
}
for (const p of POKEMON) pokemonByName.set(p.id, p.id)

// Showdown names that don't line up with PokeAPI ids.
const SHOWDOWN_ALIASES: Record<string, string> = {
  'maushold-four': 'maushold-family-of-four',
  maushold: 'maushold-family-of-three',
  'tatsugiri-mega': 'tatsugiri-curly-mega',
  'meowstic-mega': 'meowstic-male-mega',
  'zygarde-10%': 'zygarde-10',
  'necrozma-dusk-mane': 'necrozma-dusk',
  'necrozma-dawn-wings': 'necrozma-dawn',
  'minior-meteor': 'minior-red-meteor',
}

// "Rotom" + "Heat Rotom" -> "rotom-heat". Punctuation is ignored ("(Aqua Breed)" = "- Aqua Breed")
// and "Forme" = "Form".
const formKey = (species: string, form: string) =>
  `${normalize(species)}|${normalize(form).replace(/forme\b/g, 'form').replace(/[^a-z0-9%]/g, '')}`
// When two forms share a label (e.g. Darmanitan's Zen Mode, regular and Galarian), the first listed wins.
const pokemonByForm = new Map<string, string>()
for (const p of POKEMON) if (p.form && !pokemonByForm.has(formKey(p.species, p.form))) pokemonByForm.set(formKey(p.species, p.form), p.id)

/** Find an alternate form by its official label, e.g. ("Tauros", "Paldean Form (Blaze Breed)"). */
export const resolveForm = (species: string, form: string) => pokemonByForm.get(formKey(species, form)) ?? ''

/** Resolve a Showdown / Pokepaste species name to a PokeAPI id, or "" if unknown. */
export function resolvePokemon(name: string): string {
  const n = normalize(name)
    .replace(/-f(-|$)/, '-female$1')
    .replace(/-m(-|$)/, '-male$1')
  const raw = normalize(name)
  // "-breed": Showdown's "Tauros-Paldea-Aqua" is PokeAPI's "tauros-paldea-aqua-breed".
  for (const key of [SHOWDOWN_ALIASES[raw], n, raw, `${n}-mask`, `${n}-breed`, `${n}-standard`, `${n}-incarnate`]) {
    if (key && pokemonByName.has(key)) return pokemonByName.get(key)!
  }
  // Cosmetic forms PokeAPI doesn't list separately (e.g. "Sinistcha-Masterpiece"): use the base species.
  const dash = raw.indexOf('-')
  if (dash > 0) return pokemonByName.get(raw.slice(0, dash)) ?? ''
  return ''
}

const itemByName = new Map<string, string>()
for (const i of ITEMS) {
  itemByName.set(i.id, i.id)
  itemByName.set(normalize(i.name), i.id)
  itemByName.set(i.id.replace(/-/g, ''), i.id) // Showdown's packed ids, e.g. "FocusSash"
}

/** The Mega form a Pokémon becomes with this item, e.g. ("garchomp", "garchompite-z") -> "garchomp-mega-z"; "" if none. */
export function megaForm(pokemonId: string, itemId: string): string {
  for (const [from, to] of itemById.get(itemId)?.mega ?? []) {
    if (resolvePokemon(from) === pokemonId) {
      const mega = resolvePokemon(to)
      if (mega) return mega
    }
  }
  return ''
}

export function resolveItem(name: string): string {
  return itemByName.get(normalize(name)) ?? ''
}
