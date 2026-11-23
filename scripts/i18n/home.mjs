// The mismatched.gg pages (home/index.html, home/credits/index.html) take their text from this app's string
// catalog (src/i18n/en.json, keys ui.home.* and ui.credits.* plus any other key they show). They're plain HTML
// pages with no build step, so this script writes the catalog's English into each:
//   - the text of every element with data-i18n="key",
//   - the alt / content attribute of elements with data-i18n-alt / data-i18n-content,
//   - the strings block <script type="application/json" id="i18n-en"> (every key the page uses,
//     including the ones its script passes to t('…')).
//
//   npm run i18n:home             update the pages from the catalog
//   npm run i18n:home -- --check  fail if a page is out of date, uses a key the catalog lacks, or has
//                                 visible text with no key (also runs as part of npm run lint)
//
// Text that stays as it is (brand, event and people's names) goes on an element with data-i18n-ignore.

import fs from 'node:fs'
import path from 'node:path'
import { EN, ROOT, readJson } from './lib.mjs'

const PAGES = ['home/index.html', 'home/credits/index.html']
const PREFIXES = ['ui.home.', 'ui.credits.'] // catalog keys that only these pages use
const check = process.argv.includes('--check')
const en = readJson(EN)
const problems = []
const used = new Set() // keys shown on any of the pages

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => esc(s).replace(/"/g, '&quot;')
const value = (key) => {
  if (!(key in en)) problems.push(`${key}: not in src/i18n/en.json`)
  return en[key] ?? ''
}

for (const page of PAGES) {
  const file = path.join(ROOT, page)
  const html = fs.readFileSync(file, 'utf8')

  // Element text: <tag … data-i18n="key" …>text</tag> (the text holds no other tags).
  let out = html.replace(/(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (_, open, _tag, key, _text, close) => open + esc(value(key)) + close)
  // Attributes.
  for (const attr of ['alt', 'content']) {
    out = out.replace(new RegExp(`<[^>]*\\sdata-i18n-${attr}="([^"]+)"[^>]*>`, 'g'), (tag, key) => {
      const v = escAttr(value(key))
      return new RegExp(`\\s${attr}="`).test(tag) ? tag.replace(new RegExp(`(\\s${attr}=")[^"]*(")`), `$1${v}$2`) : tag.replace(/\s*\/?>$/, ` ${attr}="${v}"$&`)
    })
  }
  // Strings block: every key the page uses.
  const keys = new Set([...out.matchAll(/data-i18n(?:-alt|-content)?="([^"]+)"/g), ...out.matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]))
  const strings = Object.fromEntries([...keys].sort().map((k) => [k, value(k)]))
  out = out.replace(/(<script type="application\/json" id="i18n-en">)[\s\S]*?(<\/script>)/, (_, a, b) => `${a}${JSON.stringify(strings).replace(/</g, '\\u003c')}${b}`)
  for (const k of keys) used.add(k)

  // Visible text with no key: blank out keyed / ignored elements, scripts, styles and comments, then look for words.
  const unkeyed = out
    .replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '')
    .replace(/(<(\w+)\b[^>]*\sdata-i18n(?:-ignore)?(?:="[^"]*")?[^>]*>)[^<]*(<\/\2>)/g, '$1$3')
    .replace(/<title>[^<]*<\/title>/, '') // the home page's title is the brand name
  for (const m of unkeyed.matchAll(/>([^<]*[A-Za-z][^<]*)</g)) problems.push(`${page}: text with no key: "${m[1].trim()}"`)
  for (const m of unkeyed.matchAll(/<[^>]*\s(alt|title|aria-label|placeholder)="([^"]*[A-Za-z][^"]*)"[^>]*>/g))
    if (!/data-i18n-(alt|ignore)|data-i18n-ignore/.test(m[0])) problems.push(`${page}: ${m[1]} with no key: "${m[2]}"`)

  const stale = out !== html
  if (check) { if (stale) problems.unshift(`${page} is out of date with the catalog: run npm run i18n:home`) }
  else {
    if (stale) fs.writeFileSync(file, out)
    console.log(`${page}: ${keys.size} strings${stale ? ', updated' : ', already up to date'}.`)
  }
}

// Catalog keys meant for these pages that none of them shows.
for (const k of Object.keys(en)) if (PREFIXES.some((p) => k.startsWith(p)) && !used.has(k)) problems.push(`${k}: in the catalog but not on any page`)

if (check) {
  if (problems.length) {
    console.error(`mismatched.gg page text:\n  ${problems.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`mismatched.gg page text: ${used.size} strings on ${PAGES.length} pages, all from the catalog.`)
} else if (problems.length) {
  console.error(`  ${problems.join('\n  ')}`)
  process.exit(1)
}
