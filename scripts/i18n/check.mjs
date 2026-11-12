// Finds visible text typed straight into the code instead of going through the string catalog
// (src/i18n). See src/i18n/README.md.
//
//   npm run i18n:check                 fail on raw text in any file NOT listed in scripts/i18n/pending.json
//   npm run i18n:check -- --list       files still to extract, with how many strings each
//   npm run i18n:check -- <file...>    every finding in those files (paths relative to the repo)
//   npm run i18n:check -- --update     drop files that are now clean from pending.json (never adds)
//
// It's a heuristic: it catches JSX text, user-facing attributes (title, aria-label, placeholder, alt,
// label…), strings inside {…} in JSX, dialog/notify/confirm/alert and set…Error/Status/Message calls,
// `new Error('…')`, and label/hint/title-like object properties. Text in plain constants or records
// (e.g. a Record<string, string> of labels) can slip past it, so read each file, don't just trust it.
// Silence a false positive with `i18n-ignore` in a comment on that line or the line above, or a whole
// file with `i18n-ignore-file` near the top (e.g. the import readers, which match English on purpose).

import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PENDING = path.join(ROOT, 'scripts/i18n/pending.json')
const SCAN = ['src/App.tsx', 'src/brand.ts', 'src/components', 'src/pages', 'src/templates', 'src/lib', 'src/data']
const SKIP = [/\.d\.ts$/, /^src\/i18n\//]

const USER_ATTRS = new Set(['title', 'aria-label', 'aria-description', 'placeholder', 'alt', 'label', 'subtitle', 'hint', 'caption', 'message', 'confirmLabel', 'heading', 'tooltip', 'text', 'emptyText', 'helperText'])
const USER_PROPS = new Set(['label', 'hint', 'title', 'placeholder', 'caption', 'message', 'tooltip', 'heading', 'subtitle', 'help', 'helperText', 'warning', 'error'])
const CALLS = /(^|\.)(notify|confirm|alert|prompt)$|(^|\.)set[A-Z]\w*(Error|Status|Message|Warning|Note|Notice|Hint|Progress)$/
const I18N_CALLS = new Set(['t', 'gt', 'tDynamic', 'styleName', 'templateDescription'])

const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/')
function files() {
  const out = []
  const walk = (p) => {
    const abs = path.join(ROOT, p)
    if (!fs.existsSync(abs)) return
    if (fs.statSync(abs).isDirectory()) for (const f of fs.readdirSync(abs)) walk(path.join(p, f))
    else if (/\.(tsx?|mjs)$/.test(p)) out.push(abs)
  }
  SCAN.forEach(walk)
  return out.filter((f) => !SKIP.some((re) => re.test(rel(f))))
}

const hasWords = (s) => /[A-Za-z]/.test(s)
// Strings inside expressions: skip ones that look like ids / class names / paths / units.
const looksLikeCode = (s) => /^(ui|gfx|term|style|desc)\.[\w.-]+$/.test(s) || /^[a-z0-9_\-./:#?=&%@[\]()]*$/.test(s) || /^(#[0-9a-f]{3,8}|\d+(px|%|em|rem|s|ms)?)$/i.test(s) || /^[a-z-]+(\s+[a-z0-9-:[\]/.%#]+)+$/.test(s)

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text
  if (ts.isPropertyAccessExpression(expr)) return `${calleeName(expr.expression)}.${expr.name.text}`
  return ''
}

function scan(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (/i18n-ignore-file/.test(text.slice(0, 2000))) return []
  const lines = text.split('\n')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found = []
  const ignored = (line) => /i18n-ignore/.test(lines[line] ?? '') || /i18n-ignore/.test(lines[line - 1] ?? '')
  const add = (node, what, s) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    if (ignored(line)) return
    found.push({ line: line + 1, what, text: s.trim().replace(/\s+/g, ' ').slice(0, 100) })
  }
  const insideI18nCall = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && I18N_CALLS.has(calleeName(p.expression).split('.').pop())) return true
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p)) return false
    }
    return false
  }
  // String-ish literals in an expression that would end up on screen.
  const literalsIn = (expr, what) => {
    const visit = (n) => {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return // handled by the main walk
      if (ts.isCallExpression(n) && I18N_CALLS.has(calleeName(n.expression).split('.').pop())) return
      if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind)) return
      if (ts.isElementAccessExpression(n)) return visit(n.expression)
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['includes', 'startsWith', 'endsWith', 'split', 'join', 'replace', 'test', 'find', 'filter', 'some', 'get', 'has'].includes(n.expression.name.text)) return visit(n.expression.expression)
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        if (hasWords(n.text) && !looksLikeCode(n.text)) add(n, what, n.text)
        return
      }
      if (ts.isTemplateExpression(n)) {
        const raw = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join('…')
        if (hasWords(raw) && !looksLikeCode(raw.replace(/…/g, ''))) add(n, what, raw)
        n.templateSpans.forEach((s) => visit(s.expression))
        return
      }
      ts.forEachChild(n, visit)
    }
    visit(expr)
  }

  const walk = (node) => {
    if (ts.isJsxText(node) && hasWords(node.text)) add(node, 'JSX text', node.text)
    else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf)
      if (USER_ATTRS.has(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) { if (hasWords(node.initializer.text)) add(node, `${name}=`, node.initializer.text) }
        else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) literalsIn(node.initializer.expression, `${name}=`)
      }
      return // other attributes (className, key, href…) are code
    } else if (ts.isJsxExpression(node) && node.expression && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      literalsIn(node.expression, 'JSX {…}')
    } else if (ts.isCallExpression(node) && CALLS.test(calleeName(node.expression))) {
      node.arguments.forEach((a) => literalsIn(a, `${calleeName(node.expression)}()`))
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /Error$/.test(node.expression.text)) {
      node.arguments?.forEach((a) => literalsIn(a, 'new Error()'))
    } else if (ts.isPropertyAssignment(node) && USER_PROPS.has(node.name.getText(sf).replace(/['"]/g, '')) && !insideI18nCall(node)) {
      literalsIn(node.initializer, `${node.name.getText(sf)}:`)
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
  return found
}

const args = process.argv.slice(2)
const pending = new Set(fs.existsSync(PENDING) ? JSON.parse(fs.readFileSync(PENDING, 'utf8')).files : [])
const results = new Map(files().map((f) => [rel(f), scan(f)]))
const withHits = [...results].filter(([, r]) => r.length)

if (args.includes('--update')) {
  const still = [...pending].filter((f) => results.get(f)?.length)
  fs.writeFileSync(PENDING, JSON.stringify({ note: 'Files still to move into the string catalog. npm run i18n:check -- --update drops finished ones.', files: still.sort() }, null, 2) + '\n')
  console.log(`pending.json: ${still.length} files left (${pending.size - still.length} done).`)
  process.exit(0)
}
if (args.includes('--init')) {
  fs.writeFileSync(PENDING, JSON.stringify({ note: 'Files still to move into the string catalog. npm run i18n:check -- --update drops finished ones.', files: withHits.map(([f]) => f).sort() }, null, 2) + '\n')
  console.log(`pending.json: ${withHits.length} files.`)
  process.exit(0)
}
if (args.includes('--list')) {
  let total = 0
  for (const [f, r] of withHits.sort((a, b) => a[0].localeCompare(b[0]))) {
    total += r.length
    console.log(`${String(r.length).padStart(4)}  ${f}${pending.has(f) ? '' : '   <- NOT in pending.json'}`)
  }
  console.log(`${String(total).padStart(4)}  total in ${withHits.length} files`)
  process.exit(0)
}
const only = args.filter((a) => !a.startsWith('--'))
if (only.length) {
  for (const f of only) {
    const r = results.get(f.replace(/^\.\//, ''))
    if (!r) { console.log(`${f}: not scanned (path relative to the repo, under ${SCAN.join(', ')})`); continue }
    console.log(`${f}: ${r.length} finding(s)`)
    for (const h of r) console.log(`  ${String(h.line).padStart(5)}  ${h.what.padEnd(14)} ${h.text}`)
  }
  process.exit(0)
}

// Default: raw text outside pending files fails; pending files are summarised.
const bad = withHits.filter(([f]) => !pending.has(f))
let pendingCount = 0
for (const [f, r] of withHits) if (pending.has(f)) pendingCount += r.length
for (const [f, r] of bad) {
  console.log(`${f}`)
  for (const h of r) console.log(`  ${String(h.line).padStart(5)}  ${h.what.padEnd(14)} ${h.text}`)
}

// Catalog sanity: every key in notes.json exists; every en.json key is used somewhere.
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'))
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/notes.json'), 'utf8'))
const problems = Object.keys(notes).filter((k) => !(k in en) && !k.startsWith('style.') && !k.startsWith('desc.')).map((k) => `notes.json: "${k}" is not in en.json`)
const source = files().map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const unused = Object.keys(en).filter((k) => !source.includes(`'${k}'`) && !source.includes(`"${k}"`) && !k.startsWith('term.'))
for (const p of problems) console.log(p)
if (unused.length) console.log(`Unused keys in en.json (remove them, or they are built at run time and fine):\n  ${unused.join('\n  ')}`)

console.log(`\n${bad.length ? `${bad.reduce((n, [, r]) => n + r.length, 0)} raw string(s) in ${bad.length} file(s) that should use t()/gt().` : 'No raw text outside pending files.'} ${pendingCount} more in ${pending.size} pending file(s) (npm run i18n:check -- --list).`)
process.exit(bad.length || problems.length ? 1 : 0)
