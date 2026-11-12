import type { Format } from '../types'
import { gt, t, type GfxKey, type UiKey } from '../i18n'

export const FORMATS: Format[] = [
  { name: 'VGC 2026 - Regulation M-C', tera: false, items: true },
  { name: 'VGC 2026 - Regulation M-B', tera: false, items: true },
  { name: 'VGC 2026 - Regulation M-A', tera: false, items: true },
  { name: 'VGC 2025 - Regulation J', tera: true, items: true },
  { name: 'VGC 2025 - Regulation I', tera: true, items: true },
  { name: 'VGC 2025 - Regulation H', tera: true, items: true },
  { name: 'VGC 2024 - Regulation G', tera: true, items: true },
  { name: 'VGC 2025 - Regulation F', tera: true, items: true },
  { name: 'Custom Format', tera: true, items: true },
]

// `name` is the English kept in saved files and matched by the imports; what people see comes from
// the catalog (term.eventType.<id>): eventTypeKey() for t() in the website, tournamentTypeName() on graphics.
export const TOURNAMENT_TYPES = [
  { id: 'grassroots', name: 'Grassroots' },
  { id: 'challenge', name: 'League Challenge' },
  { id: 'cup', name: 'League Cup' },
  { id: 'regional', name: 'Regional Championship' },
  { id: 'international', name: 'International Championship' },
]

export const TERA_TYPES: { id: string; name: string; color: string }[] = [
  { id: 'normal', name: 'Normal', color: '#9fa19f' },
  { id: 'fire', name: 'Fire', color: '#e62829' },
  { id: 'water', name: 'Water', color: '#2980ef' },
  { id: 'electric', name: 'Electric', color: '#fac000' },
  { id: 'grass', name: 'Grass', color: '#3fa129' },
  { id: 'ice', name: 'Ice', color: '#3dcef3' },
  { id: 'fighting', name: 'Fighting', color: '#ff8000' },
  { id: 'poison', name: 'Poison', color: '#9141cb' },
  { id: 'ground', name: 'Ground', color: '#915121' },
  { id: 'flying', name: 'Flying', color: '#81b9ef' },
  { id: 'psychic', name: 'Psychic', color: '#ef4179' },
  { id: 'bug', name: 'Bug', color: '#91a119' },
  { id: 'rock', name: 'Rock', color: '#afa981' },
  { id: 'ghost', name: 'Ghost', color: '#704170' },
  { id: 'dragon', name: 'Dragon', color: '#5060e1' },
  { id: 'dark', name: 'Dark', color: '#624d4e' },
  { id: 'steel', name: 'Steel', color: '#60a1b8' },
  { id: 'fairy', name: 'Fairy', color: '#ef70ef' },
  { id: 'stellar', name: 'Stellar', color: '#44b4c4' },
]

// `name` is also the id (saved in files, matched by the imports); what people see comes from the catalog (term.format.*).
const FORMAT_KEYS: Record<string, UiKey & GfxKey> = {
  'VGC 2026 - Regulation M-C': 'term.format.reg2026MC',
  'VGC 2026 - Regulation M-B': 'term.format.reg2026MB',
  'VGC 2026 - Regulation M-A': 'term.format.reg2026MA',
  'VGC 2025 - Regulation J': 'term.format.reg2025J',
  'VGC 2025 - Regulation I': 'term.format.reg2025I',
  'VGC 2025 - Regulation H': 'term.format.reg2025H',
  'VGC 2024 - Regulation G': 'term.format.reg2024G',
  'VGC 2025 - Regulation F': 'term.format.reg2025F',
  'Custom Format': 'term.format.custom',
}
/** A format's name for the website. Names that aren't ours (e.g. from an import) show as they are. */
export const formatName = (name: string) => (FORMAT_KEYS[name] ? t(FORMAT_KEYS[name]) : name)
/** A format's name as printed on graphics. */
export const gtFormatName = (name: string) => (FORMAT_KEYS[name] ? gt(FORMAT_KEYS[name]) : name)

const TYPE_KEYS: Record<string, UiKey & GfxKey> = {
  normal: 'term.type.normal',
  fire: 'term.type.fire',
  water: 'term.type.water',
  electric: 'term.type.electric',
  grass: 'term.type.grass',
  ice: 'term.type.ice',
  fighting: 'term.type.fighting',
  poison: 'term.type.poison',
  ground: 'term.type.ground',
  flying: 'term.type.flying',
  psychic: 'term.type.psychic',
  bug: 'term.type.bug',
  rock: 'term.type.rock',
  ghost: 'term.type.ghost',
  dragon: 'term.type.dragon',
  dark: 'term.type.dark',
  steel: 'term.type.steel',
  fairy: 'term.type.fairy',
  stellar: 'term.type.stellar',
}
/** A Tera / Pokémon type's name for the website (and graphics via `gtTypeName`). */
export const typeName = (id: string) => (TYPE_KEYS[id] ? t(TYPE_KEYS[id]) : id)

export const formatByName = (name: string) => FORMATS.find((f) => f.name === name) ?? FORMATS[0]
export const eventTypeKey = (id: string) => `term.eventType.${id}` as UiKey & GfxKey
/** The event type as printed on graphics. */
export const tournamentTypeName = (id: string) => (TOURNAMENT_TYPES.some((t) => t.id === id) ? gt(eventTypeKey(id)) : '')
export const teraType = (id: string) => TERA_TYPES.find((t) => t.id === id)
