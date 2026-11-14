# mismatched.gg home page

The front page of mismatched.gg, in the generator's Mosaic style: the Mismatched logo and a card for
each tool.

- **Graphics Generator** → `/graphics/` (this repo). `generator-preview.jpg` is the Comic Book Top Cut
  drawn with the sample tournament.
- **DMV Invitational standings** → `/dmv-invitational` (repo `dmv-invitational-standings`; no trailing
  slash, its file paths are written as `dmv-invitational/…`). The card
  shows the live top 5, read from the same Google Sheet as the standings page.
- **Calendar**: coming soon, not a link yet.
- **Ko-fi** panel: set `LINKS.kofi` at the top of the script in `index.html`.

Plain static files, no build step. It lives in this repo so it shares the generator's string catalog.

- **Text:** every string is a `ui.home.*` key (or another catalog key, like the tab names on the
  Graphics card) in `src/i18n/en.json`, with notes in `notes.json`, reviewed in the same sheet. Change
  the English in en.json, then `npm run i18n:home` writes it into the page. `npm run lint` fails if the
  page is out of date or has text with no key. `?ids` shows each string's key. See
  `scripts/i18n/home.mjs`.
- **Tile wall:** a fixed list of Pokémon (`MONS`, HOME renders in `sprites/`, copied from
  `public/sprites/home`) and a fixed seed, so it looks the same on every visit.
- `brand/` holds copies of the placeholder logo from `public/brand/`; replace both when the real logo
  is ready.
- Settings at the top of the script: `LINKS`, `SHOW` (players in the preview), `CUT`, `SHEET`, `MONS`, `SEED`.

## Hosting (DigitalOcean App Platform)

Everything is one app. Each part is its own component, and the app sends each path to the right one:

| Path                | Component                                                 |
| ------------------- | --------------------------------------------------------- |
| `/api`              | proxy function (already live)                             |
| `/dmv-invitational` | standings static site (already live)                      |
| `/graphics`         | generator static site, this repo (**currently `/`**)      |
| `/`                 | this home page: this repo, `home/` folder (**new**)       |

DigitalOcean strips the prefix before handing the request to the component, and doesn't add a trailing
slash. The generator adds the slash itself (script at the top of its `index.html`), so its relative
file paths work at `/graphics`. The standings page instead writes its paths as `dmv-invitational/…`,
which work at `/dmv-invitational` without the slash, so link to it without one.

### Steps

1. Push this repo (generator at /graphics: trailing-slash script; header logo links home).
2. In the app: Settings → App Spec → Edit. Add the home page as a second static site from this repo
   (source folder `home`, no build) and change the generator's route from `/` to `/graphics`. Component
   names below are examples; keep the names the spec already uses.

```yaml
static_sites:
  - name: home
    github:
      repo: TheMismatcher/vgc-result-graphic-generator
      branch: main
      deploy_on_push: true
    source_dir: home
    output_dir: /
  # …the generator and standings sites stay as they are

ingress:
  rules:
    - component: { name: proxy }
      match: { path: { prefix: /api } }
    - component: { name: dmv-invitational-standings }
      match: { path: { prefix: /dmv-invitational } }
    - component: { name: vgc-result-graphic-generator }
      match: { path: { prefix: /graphics } }   # was prefix: /
    - component: { name: home }
      match: { path: { prefix: / } }
```

3. After it deploys, check: `mismatched.gg` shows the cards with the live top 5;
   `mismatched.gg/graphics` opens the generator with its logo; `mismatched.gg/dmv-invitational` still shows
   the logo and Montserrat; the generator's Event Results tab still loads an
   RK9 link (proxy at `/api`).

Saved work in the generator survives the move: browsers keep it per site (mismatched.gg), not per path.

## Credits

Pokémon and all related names © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company.
Non-commercial fan site, not affiliated with or endorsed by them. Font: Montserrat (SIL Open Font License).
