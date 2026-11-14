# Text and translation

Every piece of text a visitor can see (on the website or printed on a graphic) lives in a string
catalog, not in the code. That way all of it can be reviewed in one sheet, and later translated
(Spanish first). **Nicholas reviews every string before it's final; translation starts only after
the English is frozen.**

## Files

| File | What |
|---|---|
| `src/i18n/en.json` | The English catalog: `"key": "text"`. Edited by hand when adding text, and by `npm run i18n:apply` when reviewed wording comes back from the sheet. |
| `src/i18n/templates.en.json` | Style names and Standings descriptions shown in the style picker. **Generated** by `npm run i18n:sync` from the registry; only its values are edited (by `i18n:apply`). |
| `src/i18n/notes.json` | Notes for the reviewer/translator, by key: context, what each `{placeholder}` is, length limits. A string, or `{ "note": "...", "maxLength": 12 }`. |
| `src/i18n/index.ts` | `t()`, `gt()`, `gtDate()`, `gtOrdinal()`, `gtNumber()`, the language settings, `?ids` review mode. |
| `src/i18n/templates.ts` | `styleName(style)` and `templateDescription(t)` for the picker. |
| `scripts/i18n/check.mjs` | `npm run i18n:check`: finds text typed straight into the code. |
| `scripts/i18n/pending.json` | Files not moved into the catalog yet (the check doesn't fail on those). |
| `scripts/i18n/sync.mjs` | `npm run i18n:sync`: updates templates.en.json, writes `scripts/i18n/out/rows.json` for the sheet. |
| `scripts/i18n/home.mjs` | `npm run i18n:home`: writes the catalog's English into the mismatched.gg home page (`home/index.html`, keys `ui.home.*` plus any other key it shows); `-- --check` (part of `npm run lint`) fails if it's out of date or has text with no key. |
| `scripts/i18n/apply.mjs` | `npm run i18n:apply -- edits.json`: writes reviewed wording into the catalog. |

## Using it in code

```tsx
import { t, gt } from '../i18n'

// Website text (buttons, hints, dialogs, errors…): t()
<Button>{t('ui.branding.resetColors')}</Button>
dialog.confirm(t('ui.branding.deleteConfirm', { name, builtIn: DMV_BRAND.name }), t('ui.common.delete'))

// Text printed on a graphic: gt(), plus gtDate / gtOrdinal / gtNumber for dates, 1st/2nd, numbers
<th>{gt('gfx.sportsPage.colRecord')}</th>
```

- **Two languages.** The website and the graphics each have their own language (someone on the Spanish
  site may still want English graphics). Anything inside a template (`src/templates/**`) or that ends
  up on a PNG uses `gt()`; everything else uses `t()`. TypeScript enforces it: `t()` only takes `ui.*`
  and `term.*` keys, `gt()` only `gfx.*` and `term.*`.
- **Call them while rendering, never at the top level of a module.** A module constant would freeze
  the language at load time. For lists of labels, store keys and call `t()` where they're shown:
  ```ts
  const COLOR_FIELDS: { key: …; label: UiKey }[] = [{ key: 'main', label: 'ui.branding.color.main' }]
  …  <span>{t(c.label)}</span>
  ```
- **Whole sentences, with placeholders.** Never glue pieces together (`name + ' wins ' + event`); write
  `"{lastName} wins {event}"` so a translator can change the word order. Same for a sentence with a
  link or bold word inside: one key per sentence, with the link text as a placeholder.
- **Bold words inside a sentence:** keep the sentence as one key and mark the words `<b>…</b>`, then
  show it with `rich(t('…'))` from `src/components/rich.tsx` (only `<b>` is supported).
- **Counts use plurals:** `"{count, plural, one {# player} other {# players}}"` (`#` = the number; `=0 {…}` also works).
- **Dates, placings, numbers on graphics:** `gtDate(y, m, d)`, `gtOrdinal(n)`, `gtNumber(n)`. Never `toLocaleDateString('en-US')` or an English suffix table.
- **Official Pokémon / Play! Pokémon terms** shown on both the site and graphics (event types, type
  names, Championship Points…) are `term.*` keys, usable by `t()` and `gt()`. When the English name is
  also stored data or an id (e.g. `TOURNAMENT_TYPES[].name`, format names), keep that English as the id
  and look the visible text up by key (see `eventTypeKey()` in `src/data/options.ts`).
- **Don't put in the catalog:** player / team / event names and other user data; Pokémon, item, move
  and ability names (they come from `public/data/names`, nine languages); brand names (DMV VGC, Play!
  Pokémon, RK9, Limitless, Showdown…) except inside a sentence; the English that the import readers
  match against (RK9 / Limitless / TOM parsing, team-sheet natures and item names). Those files or
  lines get `i18n-ignore` comments.
- **Style names and Standings descriptions** stay as they are in the registry (style names are also
  ids). The picker shows them through `styleName()` / `templateDescription()`, which read
  templates.en.json. After adding or renaming a style or changing a description, run `npm run i18n:sync`.

### Keys

`<kind>.<area>.<name>`, camelCase names, e.g. `ui.branding.resetColors`, `gfx.sportsPage.colRecord`.

- kind: `ui` (website), `gfx` (graphics), `term` (official terms, both).
- area for `ui`: `home` for the mismatched.gg home page (`home/index.html`, a plain HTML page: elements carry
  `data-i18n="key"`, see scripts/i18n/home.mjs), otherwise the tab or component: `common` (reused everywhere: Remove, Delete, Loading…), `app`,
  `standings`, `usage`, `replay`, `teamBattle`, `eventResults`, `branding`, `preview`, `picker`,
  `player`, `bracket`, `tournament`, `import.limitless` / `import.rk9` / `import.tdf` /
  `import.teamSheet` / `import.screenshot` / `import.standingsPhoto` / `import.pokepaste` /
  `import.replay`, `dialog`. Add new areas to `AREAS` in scripts/i18n/sync.mjs so the sheet names them.
- area for `gfx`: `common` (on many styles: Player, Champion, Top Cut, +{cp} CP…), `facts` (the small
  facts line), or the style/template family in camelCase (`sportsPage`, `comicBook`, `tradingCard`,
  `teamBattle`, `eventResults`…).
- Reuse a key only when it's the same words with the same meaning in the same kind of spot. Two
  "Final"s that could translate differently (a stamp on a graphic vs. a bracket round) get two keys.

### Notes for the reviewer and translator (notes.json)

Add a note when a string has placeholders (say what each is), is an abbreviation or column header,
must stay short (give `maxLength` for text on graphics with a fixed width), is printed in capitals,
or could be read two ways. Keep it to one or two sentences.

## Checking

```bash
npm run i18n:check            # fails on raw text typed into the code (also runs as part of npm run lint)
npm run i18n:check -- --list  # what's left, per file
npm run i18n:check -- src/pages/UsagePage.tsx   # every finding in one file
npm run i18n:check -- --update                  # after converting files: drop the clean ones from pending.json
```

`npm run render-diff` (or `-- <commit>`) draws every template's HTML from the last commit and from the
working folder with two test tournaments and lists any template whose text or markup changed, any it
couldn't draw, and any graphics string the test data never drew. Use it after any change that should
leave the graphics as they are (like moving text into the catalog). It compares markup, not pixels.

Review mode: open the site with `?ids` (e.g. `http://localhost:5173/?ids`) and every string shows its
key after it, on the website and on the graphics, so text on screen can be matched to its sheet row.

## The review sheet

Google Sheet **"DMV graphics maker: text review"**
(https://docs.google.com/spreadsheets/d/1gT9-9oXm7WYcHyodz0Ezk-k_qzvuONRdSIA_3WdFMRM/edit). Tabs:

- **Strings**: one row per catalog key. Columns: A ID · B Where it appears · C Type · D English (in
  the app) · E Your edit · F Status (dropdown) · G Notes for translator · H Spanish · I Added (date the
  row was added) · J Code (files using it). Rows sorted Website, Official term, Graphic, Style name,
  Style description; new rows go at the bottom. D, E and H are formatted as plain text.
  - Status: `New` (not reviewed) → `Approved` (as in "English (in the app)", or as in "Your edit").
    `Changed` = the app's English changed after it was approved; `Removed` = no longer in the app;
    `Cut?` = only on retired styles (still reviewed). Later: `Translated`, `Spanish out of date`.
- **Glossary**: VGC / Pokémon terms and how to handle them in Spanish.
- **Do not translate**: names and words that stay as they are.
- **How to review**: the instructions Nicholas follows.

### Updating the sheet (after adding or changing text)

Done by Claude with the Google Sheets connector (no credentials in this repo):

1. `npm run i18n:sync` → `scripts/i18n/out/rows.json`.
2. Read the sheet's Strings tab. For each row in rows.json:
   - not in the sheet → append it after the last filled row, as the 10 columns A–J: `id`, `where`,
     `type`, `english`, "" (Your edit), `New` (or `Cut?` if `retired` is true), `note` (plus
     " Max N characters." when `maxLength` is set), "" (Spanish), today's date as `'2026-11-12` (the
     apostrophe keeps it text), `files`. Put an apostrophe in front of any value that starts with
     `+`, `=`, `-` or `@`, or the sheet reads it as a formula and shows `#ERROR!`. Read the new rows
     back to check. Rows past 1000 need the Strings formatting (wrap, plain-text D/E/H, the Status
     dropdown, the filter range) extended first;
   - in the sheet, "English (in the app)" differs → update it; if its Status was `Approved` and the
     new English isn't the reviewer's own edit being applied, set Status `Changed`;
   - "Where", "Notes", "Code" → refresh.
3. Rows in the sheet whose ID is no longer in rows.json → Status `Removed` (don't delete them).

### Bringing reviewed wording into the app

1. From the sheet, take rows with Status `Approved` and a "Your edit" that differs from "English (in the app)".
2. Write them as `[{ "id": "...", "text": "<Your edit>" }]` to a file and run `npm run i18n:apply -- that-file.json`.
   It warns when the placeholders change (the code must pass them).
3. `npx tsc -b`, render-check every touched graphic (long text can overflow), then sync the sheet so
   "English (in the app)" matches.

## Adding Spanish (later, once the English is frozen)

`es.json` / `templates.es.json` from the sheet's Spanish column, added to `catalogs` and `LANGS` in
index.ts, plus the two language pickers (site and graphics) that call `setLanguages()` and remount the
app. Before sending to the translator, test overflow with a padded build (every string ~30% longer).
