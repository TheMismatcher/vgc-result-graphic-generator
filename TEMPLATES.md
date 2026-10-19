# Templates

Each graphic the generator outputs is a **template**: one folder in `src/templates/` with a React component and its CSS. Templates only *draw* data; the forms, Pokepaste import, and PNG export are shared, so adding a design never touches the rest of the app.

Current templates:

| Folder | Kind | Size | What |
|---|---|---|---|
| `shared/LoudBackground.tsx` | — | — | Shared "Loud" comic-book background (colour panels, lightning split, sunburst, halftone, speed lines). Add it to any template for a Loud version |
| `top-cut/` | standings | 1080×1350 | Top 8 list with full teams (versions: Clean, Banner, White Banner headers, and Loud comic-book background) |
| `editorial/` | standings | 1080×1350, 1080×1080 | "Editorial" magazine direction (upright type, big numerals, hairlines, brand colours as accents). Top Cut and Champion, each in Paper (off-white) and Night (navy) |
| `top8-photos/` | standings | 1080×1350 | Top 8 cards with player photos and teams (alternating colors + a White version) |
| `top8-mixed/` | standings | 1080×1350 | Photo cards for the top 4, compact rows for 5th–8th (alternating colors + a White version) |
| `top4-photos/` | standings | 1080×1080 | Top 4 with big player photos and teams |
| `champion/` | standings | 1080×1080 | Winner spotlight |
| `bracket/` | standings | 1080×1350 | Top cut bracket with results (set up under "Top cut bracket" or imported from Limitless). Plus a Loud version |
| `arena/` | standings | 1080×1350 | Dark esports look; three backgrounds: Spotlight, Grid, Sunset |
| `usage/` | usage | 1080×1350 | 12 most-used Pokémon |
| `day2/` | day2 | 1644×1644 | One player at a Regional (event, name, record, photo, team). Default `clean.tsx` is redrawn as vector shapes with a hue slider (`day2.hue`); it also has an "Artist Match" version (sampled colours and shapes); `index.tsx` is the original artist background |
| `team-battle/` | teamBattle | 1080×1350 | Team vs team (e.g. USPL week): logos, records, every set with both teams, overall winner. Neutral (and Loud), plus Win / Loss versions told from your team's side (Team A, left) |
| `vs-result/` | match | 1080×1080 | Replay result: both teams, score, winner |

Everything listed in `src/templates/registry.ts` appears in the template picker. To drop a version (e.g. the White ones), delete its line there.

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
