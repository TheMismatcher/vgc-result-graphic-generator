// Standings from a TOM standings report saved as a PDF (e.g. printed from the browser) or the
// report's own .html file. These hold the real text, so unlike photos nothing is guessed.

import type { ScannedStanding } from './standingsScan'

export type Division = 'juniors' | 'seniors' | 'masters' | 'all'

export interface StandingsDoc {
  tournament: string
  rows: ScannedStanding[] // Masters (or the only table there is)
  counts: Partial<Record<Division, number>> // players in each division found
}

const DIVISION = /^(junior|senior|masters)\s+division$|^all$/i
const divisionOf = (text: string): Division | null => {
  const m = text.trim().match(DIVISION)
  if (!m) return null
  return m[1] ? ((m[1].toLowerCase() === 'masters' ? 'masters' : `${m[1].toLowerCase()}s`) as Division) : 'all'
}

/** "1 Joey McGinley 1 6/2/0 (9)" or with a drop round: "17 Kyle Brynteson 1 4 1/3/0 (3) …" */
const ROW = /^(\d+)\s+(.+?)\s+\d+\s+(?:\d+\s+)?(\d+)\/(\d+)\/(\d+)\b/

function build(tournament: string, tables: Map<Division, ScannedStanding[]>): StandingsDoc {
  const counts: StandingsDoc['counts'] = {}
  for (const [d, rows] of tables) counts[d] = rows.length
  const rows = tables.get('masters') ?? tables.get('all') ?? [...tables.values()][0] ?? []
  if (!rows.length) throw new Error('Couldn’t find a standings table in that file. Use a TOM “Standings” report.')
  return { tournament, rows, counts }
}

// ---------- PDF ----------

async function pdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent()
    // Group text pieces into lines by their height on the page, then left to right.
    const rows: { y: number; items: { x: number; end: number; s: string }[] }[] = []
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue
      const [x, y] = [it.transform[4], it.transform[5]]
      let row = rows.find((r) => Math.abs(r.y - y) < 3)
      if (!row) rows.push((row = { y, items: [] }))
      row.items.push({ x, end: x + it.width, s: it.str })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x)
      lines.push(r.items.reduce((text, it, i) => text + (i && it.x - r.items[i - 1].end > 1 ? ' ' : '') + it.s, '').replace(/\s+/g, ' ').trim())
    }
  }
  return lines
}

export async function readStandingsPdf(file: File): Promise<StandingsDoc> {
  const lines = await pdfLines(file)
  let tournament = ''
  let current: Division | null = null
  const tables = new Map<Division, ScannedStanding[]>()
  for (const line of lines) {
    tournament ||= line.match(/^Tournament:\s*(.+)/i)?.[1]?.trim() ?? ''
    const d = divisionOf(line)
    if (d) {
      current = d
      if (!tables.has(d)) tables.set(d, [])
      continue
    }
    const m = line.match(ROW)
    if (!m) continue
    const div = current ?? 'all'
    if (!tables.has(div)) tables.set(div, [])
    const rows = tables.get(div)!
    const place = Number(m[1])
    // A table continued on the next page repeats nothing; skip rows already seen.
    if (rows.some((r) => r.place === place)) continue
    rows.push({ place, name: m[2].trim(), record: `${m[3]}-${m[4]}-${m[5]}`, check: false })
  }
  return build(tournament, tables)
}

// ---------- HTML (TOM's own report file) ----------

export async function readStandingsHtml(file: File): Promise<StandingsDoc> {
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html')
  // The innermost element that starts with "Tournament:" holds the name after it.
  const label = [...doc.body.querySelectorAll('*')].filter((el) => /^\s*Tournament:/i.test(el.textContent ?? '')).pop()
  const tournament = label?.textContent?.replace(/^\s*Tournament:\s*/i, '').replace(/\s+/g, ' ').trim() ?? ''
  const tables = new Map<Division, ScannedStanding[]>()
  let current: Division | null = null
  // Walk the page in order: a division heading applies to the tables after it.
  for (const el of doc.body.querySelectorAll('*')) {
    if (el.tagName !== 'TABLE') {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' ')
      current = divisionOf(own) ?? current
      continue
    }
    const trs = [...el.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent?.replace(/\s+/g, ' ').trim() ?? ''))
    const header = trs.find((cells) => cells.some((c) => /record/i.test(c)))
    if (!header) continue
    const nameAt = Math.max(1, header.findIndex((c) => /^name$/i.test(c)))
    const recordAt = header.findIndex((c) => /record/i.test(c))
    const div = current ?? 'all'
    const rows = tables.get(div) ?? []
    for (const cells of trs) {
      const rec = cells[recordAt]?.match(/(\d+)\/(\d+)\/(\d+)/)
      const place = Number(cells[0])
      if (!rec || !place || !cells[nameAt]) continue
      rows.push({ place, name: cells[nameAt], record: `${rec[1]}-${rec[2]}-${rec[3]}`, check: false })
    }
    tables.set(div, rows)
  }
  return build(tournament, tables)
}
