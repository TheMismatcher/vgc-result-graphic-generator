# Templates

Each graphic the generator outputs is a **template**: one folder in `src/templates/` with a React component and its CSS. Templates only *draw* data; the forms, Pokepaste import, and PNG export are shared, so adding a design never touches the rest of the app.

Current templates:

| Folder | Kind | Size | What |
|---|---|---|---|
| `shared/LoudBackground.tsx` | — | — | Shared "Comic Book" background (colour panels, lightning split, sunburst, halftone, speed lines; called "Loud" in the code). Add it to any template for a Comic Book version |
| `top-cut/` | standings | 1080×1350 | Top 8 list with full teams (versions: Clean, Banner, White Banner headers, and Comic Book background) |
| `editorial/` | standings | 1080×1350, 1080×1080 | "Editorial" magazine direction (upright type, big numerals, hairlines, brand colours as accents). Top Cut and Champion, each in Paper (off-white) and Night (navy) |
| `sports-page/` | standings | 1080×1350 | Newspaper sports page: a generated headline about the winner (Anton), their team with names, a FINAL stamp, and a box score for 2nd–8th. Uses @fontsource/anton + oswald |
| `mosaic/` | standings | 1080×1350 | Top 8 on white cards over a tile wall of the top cut's Pokémon as one-colour silhouettes (Mono = second colour; Gradient = main → second). Layout is seeded by event name + date |
| `eras/` | standings | 1080×1350 | Game/region-styled top cuts: Kanto Game Boy (4 greens, Press Start 2P font, green-tinted pixel sprites), Paldea (Scarlet/Violet orange/purple + dark angled panels), Unova (Black/White monochrome bands); locations: Glimwood Tangle (glowing mushroom forest), Route 201 (sky, tall grass, wooden route-sign header). Scenery is inline SVG, seeded by event name |
| `eras/more.tsx` | standings | 1080×1350 | Battle Tower (navy/gold spotlights), Mt. Coronet (Spear Pillar ruins + cosmic sky), Hoenn Gen 3 (GBA menu boxes), Pokédex (red device, players as No.001…), Ghost (Halloween dusk, wisps, tower), and Champion (Trading Card): winner as a holo card, ace in the art window, team as "attacks" |
| `places/` | standings | 1080×1350 | Real places from the games' own art (no redraws): Spear Pillar (Platinum map from Bulbapedia, NPCs painted out with the floor's 64px repeat; solid + Glass), Spear Pillar Hall of Origin (Platinum Hall of Origin map with Arceus; the champion's card/row/box is paved with the Hall's glass floor tile, places/hall-of-origin-floor.png), Spear Pillar Hall Champion (the plain Spear Pillar map with that same Hall floor on the champion only), Spear Pillar Concept Art (official BDSP concept art, cropped 4:5), Route 201 Official + Glass (Platinum Route 201 tree line over its tall-grass tile, places/route-201-pt.png; Gen 4 maps have no sky), Route 119 (Emerald map: Weather Institute section and Bridge section, each solid + Glass) and Route 120 (solid + Glass). All 9 are themes on every layout plus Usage/Replay/Team Battle (themes/places.tsx + places.css, colours set by CSS variables per place). Snowpoint Official (framed on the docks), Snowpoint Full Map (the whole town from temple to docks, widened to 4:5 with the map's own forest/edge tiles), Route 217 and Lake Acuity (Platinum maps from Bulbapedia, NPCs / half-buried trainers painted out with tile-aligned snow; `.pl-snow` white text-box panels, navy border, icy inner line; each also as Glass with see-through navy panels), each a theme on every layout. Also official-art styles (same `places/` theme system, dark glass panels coloured from each image): Glimwood Tangle Official (a frame of the official 24-hour Pokémon Live Camera stream, Oct 2019); Terastal Official / Dynamax Official are retired in favour of **Terastal Prism** and **Dynamax Cloud** (`power/recreated.tsx`): recreated Tera starfield / red Dynamax storm cloud backgrounds, and the Pokémon themselves restyled on a canvas (`shared/monEffect.tsx`, `<MonFx>` read by MonSprite): the winner's team Terastallized into Stellar crystal / Dynamaxed with red aura, everyone else with a prism / red energy rim. **Tera Raid Den** (also `power/recreated.tsx`, `TeraDen`): the Tera Raid cave recreated from the official SV raid screenshot (faceted crystal walls with the champion's first two Pokémon reflected faintly in them, hexagonal crystal pillars and the centre platform on the horizon, black floor with rainbow light streaks), same Stellar-crystal winner; side graphics get the den without the reflections. **Tera Raid Den Prism** is the same den with `prism` on: rainbow-tinted and rainbow-edged facets, prism light shafts and glints on the walls, prism-topped pillars, a prism ring on the platform, and a thin prism edge on every panel (`.pl-tdenprism`). Bracket pictures aren't MonSprites, so they get a CSS rim instead; the older hand-drawn Glimwood/Terastal/Dynamax stay for comparison. **Scarlet Book** / **Violet Book**: the official book renders (Bulbagarden archives) with the front cover perspective-straightened flat, then widened to exactly 4:5 by seam insertion through plain cloth only (places/*-book-cover-sv.jpg, 1620×2025) so the cover's edges are the graphic's edges (square frames like Champion use places/*-book-square-sv.jpg, 1620×1620: rows of cloth removed, then widened; `Place.square` in themes/places.tsx), cloth-coloured panels edged in the cover's gold foil (`.pl-scarlet` / `.pl-violet` + `.pl-book`), on every layout plus Usage/Replay/Team Battle. Maps are pre-scaled on a canvas with nearest-neighbour so the PNG export stays crisp |
| `cards/` | standings (Champion) | 1080×1350 | Trading Card Classic (Base Set 1999 frame: yellow border, type frame, bevelled art window, gold strip) and Trading Card Modern (Scarlet & Violet frame: silver border, BASIC tab, HP spot, info strip, weakness/resistance/retreat bar, regulation mark from the format), both laid out from official card scans at 63×88 mm. Ace's type → energy + frame colour (era-correct mapping), team = attacks (energy cost from types, item in the damage column). Official energy symbols in cards/energy/, types from src/data/types.json (`npm run data`), Cabin font. Each has a Photo version (the champion's photo fills the art window via PlayerPhoto; initials when none). The older Trading Card is retired |
| `power/` | standings | 1080×1350, 1080×1080 | Battle-mechanic styles, each a Top Cut (`index.tsx`) plus a theme for the other 5 layouts (`themes.tsx`): Terastal (prismatic crystal shards, glassy cut-corner cards, jewel crown; tints to the champion's Tera type when the format uses Tera), Mega Evolution (original helix-in-a-ring symbol, prismatic rays, glowing purple-pink-orange borders), Dynamax (red cloud vortex, hexagon energy, red pillars, stadium lights, giant silhouette of the champion's ace, Anton type). `power.css` restyles cards from CSS variables; `terastal.css` / `mega.css` / `dynamax.css` set them |
| `top8-photos/` | standings | 1080×1350 | Top 8 cards with player photos and teams (alternating colors + a White version) |
| `top8-mixed/` | standings | 1080×1350 | Photo cards for the top 4, compact rows for 5th–8th (alternating colors + a White version) |
| `top4-photos/` | standings | 1080×1080 | Top 4 with big player photos and teams |
| `champion/` | standings | 1080×1080 | Winner spotlight |
| `bracket/` | standings | 1080×1350 | Top cut bracket with results (set up under "Top cut bracket" or imported from Limitless). Plus a Comic Book version |
| `arena/` | standings | 1080×1350 | Dark esports look; three backgrounds: Spotlight, Grid, Sunset |
| `usage/` | usage | 1080×1350 | 12 most-used Pokémon |
| `day2/` | day2 | 1644×1644 | One player at a big event (event, name, record, photo, team). Default `clean.tsx` ("Event Results") is drawn as vector shapes with a hue slider (`day2.hue`); `mosaic.tsx` has two Mosaic versions on a silhouette-tile wall with two pickable gradient colours (`day2.colors`). |
| `team-battle/` | teamBattle | 1080×1350 | Team vs team (e.g. USPL week): logos, records, every set with both teams, overall winner. Neutral (and Comic Book), plus Win / Loss versions told from your team's side (Team A, left) |
| `vs-result/` | match | 1080×1080 | Replay result: both teams, score, winner |

Everything listed in `src/templates/registry.ts` appears in the template picker. To drop a version (e.g. the White ones), delete its line there. To hide a style but keep it (saved selections still open), change its `tag(` to `retire(`: it then only shows when "Show retired styles" is ticked in the picker. Retired now: Terastal Official, Dynamax Official, Paldea, Hoenn Gen 3, the original Route 201, the Mosaic variants (all but Mosaic), Mt. Coronet, Ghost, and the Ghost Pixel variants (Ghost Pixel Glass Team Line was renamed **Ghost Pixels**).

## Working with an artist

Ask the artist for:

1. **A background image at the exact final size** (e.g. 1080×1350 PNG), with every piece of art that never changes: frames, logos, decorations, labels like "TOP 8". Leave the spots for names, sprites, and numbers empty.
2. **A mockup with sample data filled in**, showing where each name/sprite/item goes, plus fonts and text colors.
3. **The font files** if they use something other than Montserrat.
4. Answers to: how many players does it show? What happens with long names? Are items, Tera types, records, and socials shown?

Then the template is the background image plus text and sprites placed on top at fixed pixel positions.

## Adding a template

1. Copy an existing folder, e.g. `src/templates/top-cut/` to `src/templates/fall-2026/`.
2. Put the artist's background in the folder (`background.png`).
3. Edit `index.tsx`: give it a new `id`, `name`, `description`, `width`, `height`, and `maxPlayers` (or `maxEntries` for usage).
4. Register it in `src/templates/registry.ts`.

A minimal background-image template:

```tsx
import type { StandingsTemplate } from '../types'
import { FitText, MonSprite } from '../shared/parts'
import background from './background.png'
import './fall-2026.css'

const Fall2026: StandingsTemplate = {
  id: 'fall-2026',
  name: 'Fall 2026',
  description: 'Artist design for the fall season.',
  kind: 'standings',
  width: 1080,
  height: 1350,
  maxPlayers: 8,
  Component: ({ data }) => (
    <div className="dmv f26" style={{ width: 1080, height: 1350 }}>
      <img src={background} style={{ position: 'absolute', inset: 0 }} alt="" />
      <FitText className="f26-title" text={data.tournament.name} max={64} width={700} />
      {data.players.map((p, i) => (
        <div key={p.uid} className="f26-row" style={{ top: 300 + i * 125 }}>
          <FitText className="f26-name" text={p.name} max={36} width={300} />
          {p.team.map((m, j) => (
            <MonSprite key={j} mon={m} size={88} style={{ position: 'absolute', left: 420 + j * 95, top: 10 }} />
          ))}
        </div>
      ))}
    </div>
  ),
}

export default Fall2026
```

## Data a template receives

Standings templates get `data: StandingsData`, usage templates `data: UsageData`, match templates `data: MatchData` (see `src/templates/types.ts`):

- `tournament`: name, date, divisions, etc.
- `typeLabel`, `dateLabel`, `formatLabel`, `playerCount`: ready-to-print text
- `format.tera`, `format.items`: whether the format uses Tera types and items
- `cp` (standings): when "Show CP earned" is on, a function giving the Championship Points for a placing (`data.cp(1)` → 50 at a League Cup); `null` when off. Render it with `<CpBadge points={data.cp(i + 1)} />` so the normal version stays unchanged. Tables live in `src/lib/cp.ts`.
- `bracket` (standings): the top cut bracket (`rounds` of matches with `entries` and `winner`, plus `champion`), or null
- `players` (standings): in placing order, already trimmed to `maxPlayers`. Each has `name`, `record`, `social`, optional `photo`, and `team` (6 slots of `{ pokemon, item, tera }`)
- `entries`, `totalTeams` (usage): sorted most-used first, each with `pokemon`, `count`, `percent`
- `players`, `score`, `winner`, `round` (match): the two players from the Replay tab, set score, winner index (0, 1, or null)

## Helpers (`src/templates/shared/`)

- `<MonSprite mon size showTera />`: HOME render with item badge and optional Tera dot
- `<FitText text max width />`: shrinks long text to fit a width
- `<PlayerPhoto player />`: the player's uploaded photo (cropped to fill its box, using their framing slider), or their initials if none
- `<Logo size />`: the community logo
- `eventFacts(data)`, `ordinal(n)`: text helpers (in `format.ts`)
- `sprites.render(id)`, `sprites.icon(id)`, `sprites.item(id)` (in `src/data/dex.ts`): image URLs
- `brand.css`: brand colors as CSS variables (`--red` = main, `--blue` = second, `--yellow` = highlight, plus `--red-dark`/`--blue-dark`), outlined `.dmv-title` text, `.dmv-halftone` dots. Always use these variables instead of hard-coded colors so custom branding works.
- `useBrand()` (in `src/brand.ts`): the active brand's name and logo

## Rules for templates that export correctly

- Use fixed pixel sizes; the preview scales the whole graphic down for you.
- Use images from `public/` or imported into the folder. Images from other websites can block the export.
- Load fonts in `src/index.css` (installed via `@fontsource/...` or as files) so they're embedded in the PNG.

Event Results (Day 2) templates support an event type (Regionals, Play! Pokémon, Internationals, Special Events, Worlds) that sets the logo, default colour and default top-bar text (`src/templates/day2/events.ts`; graphics saved with no type are treated as Regionals). An empty caption hides the caption bar.
