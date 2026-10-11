// Import a team from a pokepast.es link or pasted Showdown export text.

import type { Mon } from '../types'
import { resolveItem, resolvePokemon } from '../data/dex'
import { emptyTeam } from './state'

export interface ImportResult {
  team: Mon[]
  unmatched: string[] // names we couldn't find, so the user can fix them by hand
}

const PASTE_URL = /^(https?:\/\/)?(www\.)?pokepast\.es\/[^/\s]+/i

export async function importTeam(input: string): Promise<ImportResult> {
  const text = input.trim()
  if (!text) throw new Error('Paste a pokepast.es link or a Showdown team export.')
  if (PASTE_URL.test(text)) {
    const url = text.replace(/^(?!https?:\/\/)/, 'https://').replace(/\/+$/, '').replace(/\/raw$/, '') + '/raw'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Couldn't load that paste (${res.status}). Check the link.`)
    return parseShowdown(await res.text())
  }
  if (/^https?:\/\//i.test(text)) throw new Error('Only pokepast.es links are supported.')
  return parseShowdown(text)
}

export function parseShowdown(text: string): ImportResult {
  const team = emptyTeam()
  const unmatched: string[] = []
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)

  blocks.slice(0, 6).forEach((block, i) => {
    const lines = block.split('\n').map((l) => l.trim())
    const [left, itemName = ''] = lines[0].split(' @ ')
    // "Nickname (Species) (M)" | "Species (F)" | "Species"
    const head = left.replace(/\s\((M|F)\)$/, '').trim()
    const species = head.match(/\(([^)]+)\)$/)?.[1] ?? head
    const pokemon = resolvePokemon(species)
    const item = itemName ? resolveItem(itemName) : ''
    const teraLine = lines.find((l) => /^tera type:/i.test(l))
    const tera = teraLine ? teraLine.split(':')[1].trim().toLowerCase() : ''

    if (!pokemon) unmatched.push(species)
    if (itemName && !item) unmatched.push(itemName.trim())
    team[i] = { pokemon, item, tera }
  })

  if (!blocks.length) throw new Error('No Pokémon found in that text.')
  return { team, unmatched }
}
