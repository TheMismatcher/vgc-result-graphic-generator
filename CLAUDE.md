# Notes for Claude

## Visible text goes through the string catalog

Any text a visitor sees, on the website or printed on a graphic, goes in `src/i18n/en.json` and is
shown with `t()` (website) or `gt()` (graphics), never typed straight into the code. Rules and the
review-sheet workflow: `src/i18n/README.md`.

- New or changed text: add/edit the key in en.json (with a notes.json entry when it has placeholders
  or is a short label), run `npm run i18n:check` and `npm run i18n:sync`, then add the new rows to the
  review sheet with Status `New` (or mark changed ones `Changed`). Nicholas reviews every string.
- New style, renamed style, or changed Standings description: `npm run i18n:sync` (picks it up from
  the registry), then update the sheet.
- Don't rewrite reviewed wording in en.json by hand; changes go through the sheet and `npm run i18n:apply`.
