# Pass-through function (RK9 + Pokédata)

The Event Results tab reads rosters, team lists and pairings from RK9 (rk9.gg) and standings from
Pokédata (pokedata.ovh). Neither site lets other websites read its pages, so the app asks this
function for them instead:

```
GET /api/proxy/fetch?site=rk9&path=/roster/<event-id>
GET /api/proxy/fetch?site=pokedata&path=/standingsVGC/<id>/masters/<id>_Masters.json
```

- Code: `packages/proxy/fetch/index.js` (Node 18, no dependencies).
- It only fetches RK9 roster / pairings / tournament / public team list pages and Pokédata
  standings JSON, GET only. Anything else gets a 400.
- Replies are gzipped + base64 (`gz64:…`; the app unpacks them in `src/lib/proxy.ts`) because
  DigitalOcean Functions can't return more than 1 MB and big RK9 rosters are over 2 MB of HTML.
- Locally, `npm run dev` / `npm run preview` run this same file at the same URL (vite.config.ts),
  so nothing extra is needed for development.

## Deploying on DigitalOcean App Platform

Add this folder to the existing app as a **Functions** component, served at `/api` on the same
domain as the static site.

In the app spec (Settings → App Spec → Edit), add:

```yaml
functions:
  - name: proxy
    github:
      repo: TheMismatcher/vgc-result-graphic-generator
      branch: main
      deploy_on_push: true
    source_dir: functions
```

and route `/api` to it. In the `ingress` section, put this rule **above** the static site's `/` rule:

```yaml
ingress:
  rules:
    - component:
        name: proxy
      match:
        path:
          prefix: /api
    # …the existing rule for the static site (prefix: /) stays below
```

(Older app specs set `routes: [{ path: /api }]` on the component instead of `ingress`. Either way,
the result is `https://<site>/api/proxy/fetch` reaching the function.)

**Check it worked:** opening
`https://<site>/api/proxy/fetch?site=rk9&path=/roster/LA001-jHlXupaysix7HO` should show text
starting with `gz64:`. Then try an RK9 link and a Pokédata link on the Event Results tab.

### If it ends up at a different address

If the function is deployed on its own (a standalone Functions namespace) rather than inside the
app, it gets its own URL, e.g. `https://faas-nyc1-….doserverless.co/api/v1/web/fn-…/proxy/fetch`.
Build the site with that address and the app will use it (the function already allows
cross-site requests):

```
VITE_PROXY_URL=https://…/proxy/fetch npm run build
```

On App Platform that's a build-time environment variable on the static site component.
