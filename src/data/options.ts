import type { Format } from '../types'

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

export const formatByName = (name: string) => FORMATS.find((f) => f.name === name) ?? FORMATS[0]
export const tournamentTypeName = (id: string) => TOURNAMENT_TYPES.find((t) => t.id === id)?.name ?? ''
export const teraType = (id: string) => TERA_TYPES.find((t) => t.id === id)
