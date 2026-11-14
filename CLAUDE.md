# Notes for Claude

## Visible text goes through the string catalog

Any text a visitor sees, on the website or printed on a graphic, goes in `src/i18n/en.json` and is
shown with `t()` (website) or `gt()` (graphics), never typed straight into the code. Rules and the
review-sheet workflow: `src/i18n/README.md`.

* New or changed text: add/edit the key in en.json (with a notes.json entry when it has placeholders
  or is a short label), run `npm run i18n:check` and `npm run i18n:sync`, then add the new rows to the
  review sheet with Status `New` (or mark changed ones `Changed`). Nicholas reviews every string.
* The mismatched.gg home page (`home/index.html`) uses the same catalog (`ui.home.*`): after changing its
  text in en.json run `npm run i18n:home`; new visible text there gets a key and a `data-i18n` attribute.
* New style, renamed style, or changed Standings description: `npm run i18n:sync` (picks it up from
  the registry), then update the sheet.
* Don't rewrite reviewed wording in en.json by hand; changes go through the sheet and `npm run i18n:apply`.
  If a feature really needs different English for an existing key, change it in en.json and mark that
  row `Changed` in the sheet so Nicholas sees it.
* Changed a template or anything that ends up on a graphic? Run `npm run render-diff`: it lists every
  template whose text or markup changed against the last commit (expect only the ones you meant to
  change) and any graphics string the test data never draws. It can't see English left in the code,
  so also search `src/templates` for quoted English after template work.
* The review sheet: "DMV graphics maker: text review",
  https://docs.google.com/spreadsheets/d/1gT9-9oXm7WYcHyodz0Ezk-k_qzvuONRdSIA_3WdFMRM/edit
  (Strings tab; how to write rows: "Updating the sheet" in src/i18n/README.md). Updating it is part of
  the same task as the code change, not a later step. Mention the new rows to Nicholas when you finish.
