# DMV VGC Standings Generator

Make shareable graphics for Pokémon VGC tournaments, built for the DMV VGC community.
Everything runs in the browser: graphics are drawn on the page and saved as PNGs, so there's no server to run.

## Features

- **Standings:** top cut lists, photo cards, champion spotlight, top cut bracket, and the Arena design (three backgrounds). Optional "Show CP earned" badges using the official League Cup / Challenge Championship Points tables.
- **Usage:** most-used Pokémon, from your standings or a whole Limitless tournament.
- **Replay:** paste a Pokémon Showdown replay (the last game of a best-of-3 is enough) to get both teams with items, the set score, and the winner.
- **Team Battle:** team-vs-team weeks (e.g. USPL): paste one replay per set for a graphic with every set, both teams, and the overall result. Neutral, Win, and Loss versions.
- **Regional Results:** one graphic per player at a Regional (e.g. who made Day 2), with name, record, team, and photo pulled from RK9.
- **Imports:** Limitless (standings, teams, bracket, usage), RK9 (rosters, team lists, records), TOM `.tdf` files, Pokepaste / Showdown exports, Showdown replays, and **Pokémon Champions team screenshots** (phone or Switch; read in the browser, even with nicknames).
- **Branding:** DMV VGC built in, or your own name, logo, and colors.
- **Extras:** Mega forms, player photos, save/open tournament files, copy image to clipboard.

## Run it locally

You need [Node.js](https://nodejs.org) (the LTS version).

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
```

Your work is saved in the browser automatically. **Load sample** fills every tab with an example tournament.

## Publish

```bash
npm run build    # creates the dist/ folder
```

Upload `dist/` to [Netlify](https://app.netlify.com/drop) (drag and drop), or connect this repository to Netlify with build command `npm run build` and publish directory `dist`.

Use Netlify rather than GitHub Pages: the Regional Results tab reads RK9 through a pass-through route (`/rk9/*`, set up in `public/_redirects`), which GitHub Pages doesn't support.

## Update Pokémon and items

```bash
npm run data
```

Re-downloads the lists from [PokeAPI](https://pokeapi.co), rebuilds the screenshot reader's ability/move data (`public/data/team-scan.json`, from Pokémon Showdown), and fetches any new sprites (e.g. after a DLC adds Pokémon). Smooth item icons come from the [Bulbagarden Archives](https://archives.bulbagarden.net) (with PokeAPI as backup); small pixel icons from PokeAPI and Pokémon Showdown are the fallback.

## Where things live

| Path | What |
|---|---|
| `src/templates/` | The graphic designs, one folder each (see [TEMPLATES.md](TEMPLATES.md)) |
| `src/pages/`, `src/components/` | The editing interface (one page per tab) |
| `src/brand.ts`, `public/brand/` | Built-in DMV branding and custom branding |
| `src/data/options.ts` | Formats, tournament types, Tera types |
| `src/lib/cp.ts` | Official League Cup / Challenge Championship Points tables (update each season) |
| `src/lib/limitless.ts` | Limitless import (standings, teams, bracket, usage) |
| `src/lib/rk9.ts` | RK9 rosters, team lists, and records (Regional Results tab) |
| `src/lib/replay.ts` | Showdown replay reader (teams, items, set score, best-of-3) |
| `src/lib/teamBattle.ts` | Team battles: sets from replays, side detection, overall score |
| `src/lib/pokepaste.ts` | Pokepaste / Showdown team import |
| `src/lib/teamScan.ts` | Team screenshot reader: finds the cards, reads text (tesseract.js), identifies species from item, ability, moves, sprite, and gender icon |
| `src/lib/bracket.ts` | Top cut bracket (seeding, winners, Limitless results) |
| `src/lib/files.ts` | Save / open tournament files |
| `scripts/build-data.mjs` | Builds the Pokémon/item lists and downloads sprites |

## Credits

Pokémon data and sprites from [PokeAPI](https://pokeapi.co), item icons from the [Bulbagarden Archives](https://archives.bulbagarden.net) and [Pokémon Showdown](https://pokemonshowdown.com). Tournament data from [Limitless](https://play.limitlesstcg.com), [RK9](https://rk9.gg), and Showdown replays.

Pokémon and all related names and artwork © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company. This is a non-commercial fan tool, not affiliated with or endorsed by them.
