// Pokémon, move, ability and item names in the nine languages Pokémon events print, built by
// `npm run names` (scripts/build-names.mjs). One file per language, loaded only when needed.

import { asset } from '../brand'

export const LANGUAGES = ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh-Hant', 'zh-Hans'] as const
export type Language = (typeof LANGUAGES)[number]

export interface NameTable {
  pokemon: Record<string, string> // English species name -> name
  moves: Record<string, string> // English move name -> name
  abilities: Record<string, string> // English ability name -> name
  items: Record<string, string> // item id -> name
}

const tables = new Map<Language, Promise<NameTable>>()

/** One language's names (empty tables if the file can't be loaded: callers fall back to English). */
export function loadNames(lang: Language): Promise<NameTable> {
  if (!tables.has(lang)) {
    tables.set(
      lang,
      fetch(asset(`data/names/${lang}.json`))
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .catch(() => ({ pokemon: {}, moves: {}, abilities: {}, items: {} })),
    )
  }
  return tables.get(lang)!
}
