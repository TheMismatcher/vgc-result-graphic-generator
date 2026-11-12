// Checks that a change which should leave the graphics alone (like moving their text into the string
// catalog) really does: draws every template's HTML from a base commit and from the working folder,
// with the same two test tournaments (the sample, and a sparse one with blanks and 4 players), and lists
// every template whose output differs.
//
//   npm run render-diff               compare the last commit (HEAD) with the working folder
//   npm run render-diff -- <ref>      compare another commit/branch
//
// Templates are drawn with React's server renderer, so effects (canvas map backgrounds, text measuring)
// don't run: this compares markup and text, not pixels. Templates that can't be drawn this way are listed,
// so they can be looked at in the browser instead. Output: scripts/i18n/out/render-diff.txt.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'scripts/i18n/out')
const SELF = fileURLToPath(import.meta.url)

// ---- child mode: draw every template under one root, write JSON ----
if (process.argv[2] === '--snapshot') {
  const [, , , root, stateFile, outFile] = process.argv
  // Coverage pass: ?ids makes every catalog string carry its key, so we can list keys no drawing used.
  if (process.env.RENDER_DIFF_IDS) globalThis.location = { search: '?ids' }
  const { createServer } = await import('vite')
  const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), resolve: { preserveSymlinks: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' })
  const load = (p) => server.ssrLoadModule(p)
  // Templates measure text while drawing (FitText). Stand-in: width = characters x font size x 0.55, the same
  // on both sides, so identical text still gives identical markup. Images and canvases only load in effects.
  const ctx = { font: '10px sans-serif', measureText(text) { return { width: [...String(text)].length * (parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '10') * 0.55) } } }
  globalThis.document = { createElement: () => ({ getContext: () => ctx }), fonts: { status: 'loaded', ready: Promise.resolve() } }
  const origError = console.error
  console.error = () => {} // React warns about useLayoutEffect on the server; not useful here
  try {
    // React from Node, not through Vite: the templates' own `react` import is external, so this is the same copy.
    const { createRequire } = await import('node:module')
    const req = createRequire(path.join(root, 'package.json'))
    const React = req('react')
    const { renderToStaticMarkup } = req('react-dom/server')
    const reg = await load('/src/templates/registry.ts')
    const { standingsData, eventInfo } = await load('/src/lib/event.ts')
    const { teamBattleData } = await load('/src/lib/teamBattle.ts')
    const { percent } = await load('/src/lib/usage.ts')
    const { BrandContext, resolveBrand } = await load('/src/brand.ts')
    const { DisplayContext, DEFAULT_LOOKS } = await load('/src/lib/display.ts')
    const { BackdropContext, DEFAULT_OPACITY } = await load('/src/lib/backdrop.tsx')
    const { DAY2_EVENT_KINDS } = await load('/src/templates/day2/events.ts')

    const states = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    const h = React.createElement
    const out = { html: {}, failed: {} }
    for (const [label, state] of Object.entries(states)) {
    const noop = () => {}
    const wrap = (el, showCP) =>
      h(BrandContext.Provider, { value: resolveBrand(state.brand) },
        h(BackdropContext.Provider, { value: { backdrop: state.backdrop ?? null, setBackdrop: noop, opacity: state.customPanels ?? DEFAULT_OPACITY, setOpacity: noop } },
          h(DisplayContext.Provider, { value: { showMegas: true, setShowMegas: noop, showCP, setShowCP: noop, looks: { ...DEFAULT_LOOKS }, tileShuffle: 0, shuffleTiles: noop, setLook: noop } }, el)))

    const event = eventInfo(state.tournament)
    const format = event.format
    const usageTotal = Number(state.usage.totalTeams) || 0
    const usageSorted = state.usage.entries.filter((e) => e.pokemon).slice().sort((a, b) => b.count - a.count)
    const score = (v) => (v === '' ? 0 : v)
    const m = state.match
    const day2Player = state.day2.players.find((p) => p.uid === state.day2.selected) ?? state.day2.players[0]

    // Each template with the data its tab gives it; Standings also with CP on, Event Results for every event kind.
    const jobs = []
    for (const tpl of reg.STANDINGS_TEMPLATES) {
      for (const cp of [false, true]) jobs.push([`${tpl.id}${cp ? ' +CP' : ''}`, tpl, { ...standingsData({ ...state, settings: { ...state.settings, showCP: cp } }, tpl.maxPlayers) }, cp])
    }
    for (const tpl of reg.USAGE_TEMPLATES) jobs.push([tpl.id, tpl, { ...event, totalTeams: usageTotal, entries: usageSorted.slice(0, tpl.maxEntries).map((e) => ({ ...e, percent: percent(e.count, usageTotal) })) }, false])
    for (const tpl of reg.MATCH_TEMPLATES) jobs.push([tpl.id, tpl, { ...event, players: m.players, score: [score(m.score[0]), score(m.score[1])], winner: m.winner, round: m.round, bestOf: m.bestOf ?? 1, gamesPlayed: m.gamesPlayed ?? 0 }, false])
    for (const tpl of reg.TEAM_BATTLE_TEMPLATES) jobs.push([tpl.id, tpl, teamBattleData(state.teamBattle, format), false])
    for (const tpl of reg.DAY2_TEMPLATES) {
      for (const kind of DAY2_EVENT_KINDS) jobs.push([`${tpl.id} [${kind}]`, tpl, { event: state.day2.event, caption: state.day2.caption, player: day2Player, format, hue: state.day2.hue, colors: state.day2.colors, kind }, false])
    }

    for (const [key, tpl, data, cp] of jobs) {
      const k = `${key} (${label})`
      try {
        out.html[k] = renderToStaticMarkup(wrap(h(tpl.Component, { data }), cp))
      } catch (e) {
        out.failed[k] = String(e?.message ?? e).split('\n')[0].slice(0, 160)
      }
    }
    }
    fs.writeFileSync(outFile, JSON.stringify(out))
  } finally {
    console.error = origError
    await server.close()
  }
  process.exit(0)
}

// ---- parent mode ----
const ref = process.argv[2] || 'HEAD'
fs.mkdirSync(OUT, { recursive: true })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-diff-'))
const base = path.join(tmp, 'base')
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' })

// One sample tournament for both sides (the sample makes random ids), built by the working folder's code.
const stateFile = path.join(tmp, 'state.json')
{
  const { createServer } = await import('vite')
  const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' })
  const { sampleState } = await server.ssrLoadModule('/src/lib/sample.ts')
  const s = sampleState()
  s.settings = { ...s.settings, looks: {} }
  // Second data set for the fallbacks and small layouts: 4 players, missing names / records / socials,
  // no tournament name, type, date or player count, unnamed replay players and Event Results player,
  // a best-of-3 with no games counted.
  const blank = (p, f) => ({ ...p, ...f })
  const sparse = structuredClone(s)
  sparse.tournament = { ...sparse.tournament, name: '', type: '', divisions: { masters: '', seniors: '', juniors: '' } }
  sparse.players = sparse.players.slice(0, 4).map((p, i) => blank(p, [{ name: '', record: '' }, { record: '' }, { social: '' }, { name: '', record: '', social: '' }][i]))
  sparse.match = { ...sparse.match, players: sparse.match.players.map((p) => blank(p, { name: '', record: '', social: '' })), round: '' }
  sparse.day2 = { ...sparse.day2, event: '', caption: '', players: sparse.day2.players.map((p) => blank(p, { name: '', record: '' })) }
  sparse.tournament.date = ''
  sparse.match = { ...sparse.match, bestOf: 3, gamesPlayed: 0 }
  // Unfinished 4-player bracket with a blank name (TBD); a third set has no bracket at all.
  sparse.bracket = { size: 4, slots: sparse.players.map((p) => p.name), winners: [[null, null], [null]] }
  const nobracket = { ...structuredClone(sparse), bracket: { size: 0, slots: [], winners: [] } }
  fs.writeFileSync(stateFile, JSON.stringify({ sample: s, sparse, nobracket }))
  await server.close()
}

git('worktree', 'add', '--detach', base, ref)
try {
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(base, 'node_modules'))
  const snap = (root, name, ids = false) => {
    const file = path.join(tmp, `${name}.json`)
    execFileSync(process.execPath, [SELF, '--snapshot', root, stateFile, file], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, ...(ids ? { RENDER_DIFF_IDS: '1' } : {}) } })
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  const before = snap(base, 'before')
  const after = snap(ROOT, 'after')
  // Graphics strings that no drawing used: their text wasn't checked by this run.
  const seen = new Set()
  for (const html of Object.values(snap(ROOT, 'ids', true).html)) for (const m of html.matchAll(/⟨([^⟩]+)⟩/g)) seen.add(m[1].toLowerCase()) // some text is upper-cased
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'))
  const unseen = Object.keys(catalog).filter((k) => k.startsWith('gfx.') && !seen.has(k.toLowerCase()))

  const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const firstDiff = (a, b) => {
    let i = 0
    while (i < a.length && a[i] === b[i]) i++
    const from = Math.max(0, i - 40)
    return `    before: …${a.slice(from, i + 60)}…\n    after:  …${b.slice(from, i + 60)}…`
  }
  const lines = []
  const keys = [...new Set([...Object.keys(before.html), ...Object.keys(after.html), ...Object.keys(before.failed), ...Object.keys(after.failed)])]
  const changed = [], textChanged = [], onlyBefore = [], onlyAfter = [], failed = []
  for (const k of keys) {
    const a = before.html[k], b = after.html[k]
    if (after.failed[k] || before.failed[k]) failed.push(`${k}: ${after.failed[k] ?? before.failed[k]}`)
    else if (a === undefined) onlyAfter.push(k)
    else if (b === undefined) onlyBefore.push(k)
    else if (a !== b) (text(a) !== text(b) ? textChanged : changed).push(k)
  }
  const drawn = keys.length - failed.length
  lines.push(`Compared ${ref} with the working folder: ${keys.length} template drawings (${drawn} drawn on both sides).`)
  lines.push(`Text changed: ${textChanged.length}. Markup changed, same text: ${changed.length}. Couldn't draw: ${failed.length}. New: ${onlyAfter.length}. Gone: ${onlyBefore.length}. Graphics strings not drawn: ${unseen.length}.`)
  for (const k of textChanged) lines.push(`\nTEXT CHANGED  ${k}\n${firstDiff(text(before.html[k]), text(after.html[k]))}`)
  for (const k of changed) lines.push(`\nMARKUP CHANGED  ${k}\n${firstDiff(before.html[k], after.html[k])}`)
  if (failed.length) lines.push(`\nCOULDN'T DRAW (check these in the browser):\n  ${failed.join('\n  ')}`)
  lines.push(unseen.length ? `\nGRAPHICS STRINGS NOT DRAWN by the test data (check by hand, or add test data):\n  ${unseen.map((k) => `${k}  "${catalog[k]}"`).join('\n  ')}` : '\nEvery graphics string in the catalog was drawn at least once.')
  if (onlyAfter.length) lines.push(`\nNEW (not in ${ref}):\n  ${onlyAfter.join('\n  ')}`)
  if (onlyBefore.length) lines.push(`\nGONE (only in ${ref}):\n  ${onlyBefore.join('\n  ')}`)
  const report = lines.join('\n') + '\n'
  fs.writeFileSync(path.join(OUT, 'render-diff.txt'), report)
  console.log(report.split('\n').slice(0, 2).join('\n'))
  console.log(`Full list: scripts/i18n/out/render-diff.txt`)
  process.exitCode = textChanged.length || changed.length ? 1 : 0
} finally {
  git('worktree', 'remove', '--force', base)
  fs.rmSync(tmp, { recursive: true, force: true })
}
