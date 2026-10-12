# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview
- Stack: Angular 22 (TypeScript), Angular CLI (esbuild-based `application`/`dev-server`/`unit-test` builders — all standalone, no NgModule), ESLint, Vitest (unit) + Playwright (integration), Bootstrap
- Single standalone component: `src/app/app.component.ts` computes dough ingredient weights (flour/water/salt/yeast/olive oil) from portion counts and hydration parameters; bootstrapped directly via `bootstrapApplication` in `src/main.ts` (no `app.module.ts`)
- **Zoneless**: no `zone.js`, `provideZonelessChangeDetection()` in `src/main.ts`. Change detection relies entirely on Angular's own event-binding notifications (`(ngModelChange)`, `(click)`, etc. all mark the view dirty on their own) — there is nothing to configure per-component for this to work, but any code that mutates component state from *outside* an Angular-triggered callback (raw `setTimeout`, a non-Angular event listener, a promise not awaited through Angular APIs) would silently fail to update the view and needs a manual `ChangeDetectorRef.markForCheck()`/signal.
- Build output: `dist/pizza-calculator/browser` (path set in `angular.json`; the `application` builder nests output under `browser/` as of Angular 18)
- Production: Cloudflare Workers static assets at https://pizza.beroot.org (see "Cloudflare Workers" below). The Docker build (`Dockerfile`) → static files served by NGINX still exists as a self-hosting option.
- Upgraded from Angular 9 → 22 in one pass (`ng update` one major at a time). `ngx-bootstrap` majors track Angular majors 1:1 from v8 onward, so it was bumped in lockstep at every step (it has since been removed entirely — see "Settings UI" below).

## Tooling / Node version
- Node version is managed by [mise](https://mise.jdx.dev/), pinned in `mise.toml` (currently 24.21.0) — this is the single source of truth (no `.nvmrc`). Run `mise install` once per checkout.
- Bumped from 18.20.8: Angular CLI 22 requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`. 24.21.0 is the current LTS line satisfying that.
- `NODE_OPTIONS=--openssl-legacy-provider` is gone from all npm scripts — it was only needed for the old webpack-based Angular 9 build on Node 17+/OpenSSL 3; the modern esbuild-based builder doesn't need it.
- `mise run start` / `mise start` runs `npm start` (dev server) using the pinned Node version.
- Run tools through mise, not bare: a plain `npx wrangler ...` picks up the shell's Node (v14 on this machine) and wrangler refuses to start below Node 22. Use the `mise run cf-*` tasks or `mise exec -- npx wrangler ...`.
- The Docker build stage (`Dockerfile`) uses `node:24.21.0-slim`, aligned with `mise.toml`. Plain `npm ci` (no flags) works since the Bootstrap 5 upgrade — Bootstrap 4.1.1's unmet `jquery`/`popper.js` peerDependencies (which forced `--legacy-peer-deps` before) are gone.

## Common commands
```bash
mise install                 # install pinned Node version
npm ci                        # install dependencies
npm start                    # dev server, http://localhost:4200
npm run build                # dev build
npm run build:prod           # production build (AOT, optimizations)
npm test                     # unit tests (Vitest, watch mode)
ng test --watch=false        # CI-style single run
npm run e2e                  # integration tests (Playwright, desktop + mobile)
npm run e2e:ui               # Playwright UI mode (interactive; blocks until closed)
npm run e2e:headed           # same run, visible browser (interactive)
npm run e2e:report           # HTML report of the last run (interactive; serves a page)
npm run lint                 # ESLint via Angular CLI (angular-eslint)
```

## Running checks
Delegate **every read-only verification** to the `test-runner` subagent
(`.claude/agents/test-runner.md`, Haiku, read-only tools) rather than running it
inline: unit tests, e2e tests, lint, production build, the Bootstrap
compiled-CSS check, and responsive screenshot capture. It reports outcomes and,
for failures, the test/file, the assertion with expected vs received, and the
file:line — it never fixes anything.

Keep *authoring* tests out of that agent. What makes a test here worth having is
the judgement about what to assert (see the zoneless and vacuous-pass notes
below), and that judgement is the part worth doing carefully.

Note: subagent definitions are loaded at session start, so edits to that file
only take effect in the next session.

## Integration tests (Playwright)
- Config: `playwright.config.ts`, specs in `e2e/`. Two projects, `desktop`
  (Chrome) and `mobile` (Pixel 7, 412px), so every spec runs twice — 12 specs,
  24 runs. Only Chromium is installed (`npx playwright install chromium`); the
  `mobile` project uses a Chromium-backed device descriptor on purpose, to avoid
  pulling in WebKit.
- The config's `webServer` starts and stops `npm start` itself, and reuses an
  already-running dev server outside CI. Never start one by hand for a test run.
- Interactive equivalents of Cypress's runner: `npm run e2e:ui` (UI mode — pick
  specs, step through actions, time-travel over a DOM snapshot per step, watch
  mode on file changes), `npm run e2e:headed` (plain run, visible browser) and
  `npm run e2e:report` (HTML report of the last run). Also `--debug` for the
  Playwright Inspector and `npx playwright codegen localhost:4200` to record a
  spec. All of these block until closed, so they are for a human at a keyboard
  only — never for the `test-runner` subagent or any automated check.
- `e2e/dough-calculator.spec.ts` covers the arithmetic through the UI: recompute
  on portion change, flour + water = total, the biga split adding back up to the
  complete dough, the checkbox showing/hiding the biga sections, and the flour
  share moving flour between stages.
- `e2e/layout.spec.ts` covers what unit tests structurally cannot: no horizontal
  scroll, no wrapped label or clipped value (for both `.ingredient-row` and
  `.setting-row`), the total sitting below every section, and sections stacking
  on mobile vs sitting side by side on desktop. These formalise checks that were
  previously done by hand over CDP.
- The layout specs inspect *every* `.ingredient-row` / `.setting-row`, so they
  would pass vacuously on a blank page. `beforeEach` asserts a row of each kind
  is visible and two specs assert the exact row counts (14 and 7) to keep that
  from happening — preserve those guards when editing.
- Suite was validated by mutation: changing the biga hydration from `* 0.5` to
  `* 0.6` made exactly the biga-split spec fail (expected 146, got 175) while
  the other 18 stayed green, which is the intended blast radius.
- CI does not run any tests today — the workflow only builds and pushes the
  Docker image. These suites are local-only until that changes.

## Settings UI (portions + dough parameters)
- The two `<tabset>` tabs were replaced by three panels shown at once —
  Portions, Paramètres de la pâte, Biga — mirroring the three ingredient columns
  below. They are `col-12 col-lg-6 col-xxl-4`: three across only from 1400px up.
  A settings row carries input fields as well as a label, so a third of a
  narrower page cannot hold one on a single line — measured, not guessed: at
  992px the usable row width is ~264px against ~283px of content. Below xxl the
  grid falls back to two across, with the biga panel on a second line. `<tabset>` was the **only** use of
  `ngx-bootstrap` in the app, so the dependency was removed entirely with it.
- The settings row is `.row.settings` (panels marked `.settings-col`) and the
  ingredients row is `.row.ingredients`. That scoping matters: both rows contain
  a column headed "Biga", so an unscoped `.col-12` + heading lookup matches two
  elements and fails Playwright's strict mode. The specs use
  `.ingredients .col-12` and `.settings-col`.
- Both panels use `.setting-row`, a deliberate mirror of `.ingredient-row`:
  same white card, 1px border, `.5rem` radius, and a `.625rem` colored left
  border. A parameter wears the color of the ingredient it drives (hydration →
  water blue, salt → salt teal, …), which is why most `.s-bg-*` and `.i-bg-*`
  pairs share one declaration block in `app.component.scss`. Portions are the
  exception: they are not an ingredient, so they stay a neutral grey rather than
  borrowing the flour amber.
- Fields are sized for their content (`width: 4.5rem`, right-aligned) with the
  unit as an `input-group-text` suffix, replacing the old table's full-width
  inputs and its separate "Unité" column.
- `.setting-row` wraps so the fields drop under the label when they no longer
  fit beside it — a safety net with no breakpoint in it, since the row is only
  ever as wide as its column. A layout spec asserts that at the supported widths
  the net is never actually needed. The portion labels are "Adultes"/"Enfant"
  rather than "Pâtons adultes"/"Pâtons enfant" for the same reason (the column
  heading already says Portions); the full wording lives on in their aria-labels.
- The corner "Fork me on GitHub" ribbon is gone, replaced by a quiet
  `.page-footer` link. It was a rotated link inside a 265x265 box at
  `z-index: 9999`, empty almost everywhere, and that empty area silently
  swallowed clicks on whatever sat under it — which is how moving the biga
  switch into the top-right column appeared to "break" it. The layout spec
  "no control is covered by another element" still guards the class of defect:
  a green build, green unit tests and a correct-looking page all missed it.
- The biga has its own panel: a `.setting-row` whose control is a Bootstrap 5
  `.form-check.form-switch` instead of a number field, with "Farine en biga"
  appearing below it as a second row when it is on. `.form-switch` did not exist in Bootstrap 4, so this depends on the BS5
  bump. `.setting-switch` undoes the offsets Bootstrap adds to position a switch
  against a label *inside* `.form-check` — here the label is the row's own.
- Every input carries a label (`<label for>` where there is one field per row,
  `aria-label` on the paired portion fields), which is what lets the e2e specs
  use `getByLabel` instead of the previous `tr` + `.nth(0)` positional lookups.
- `src/styles.scss` dropped the `tables` and `nav` partials with this change —
  `nav` existed only for the tabset's `ul.nav-tabs` and `tables` only for the
  two parameter tables. Re-add them if a table or nav ever comes back.

## Docker
```bash
docker build -t pizza-calculator:local .
docker run --rm -p 8080:80 pizza-calculator:local   # http://localhost:8080
mise run docker-build         # build image (no cache)
mise run docker-push          # push nicolaznk/pizza-calculator:latest (requires Docker Hub login)
```

## Cloudflare Workers (hosting)
- Served at **https://pizza.beroot.org** as a Worker with static assets only — no `main` script, so no Worker code runs; Cloudflare serves the files directly. Config is `wrangler.jsonc` at the repo root.
- Workers rather than Cloudflare Pages: Cloudflare now recommends Workers for new projects, Pages being supported but no longer developed. Free plan cap is 100,000 requests/day (Pages was unlimited).
- `assets.directory` is `./dist/pizza-calculator/browser/` — the `browser/` level matters (the `application` builder nests output there since Angular 18); pointing at `dist/pizza-calculator` would publish an empty-looking site.
- No `not_found_handling`: the app has no router, everything lives on `/`. Set it to `"single-page-application"` if a router is ever added.
- The custom domain is declared in `wrangler.jsonc` (`routes` + `custom_domain: true`): wrangler creates the DNS record and certificate in the `beroot.org` zone itself. It fails if a record already exists on `pizza`. `workers_dev: false` disables the `*.workers.dev` URL.
- `wrangler deploy` with a bare directory (no config file) only works interactively, not in CI — which is why the config is committed.

```bash
mise run cf-login            # OAuth in the browser, once per machine (interactive)
mise run cf-dev              # build:prod, then serve it on the Workers runtime at :8787 (blocks)
mise run cf-deploy           # build:prod, then deploy to pizza.beroot.org
mise exec -- npx wrangler deploy --dry-run   # validate config + asset dir, no credentials needed
```
`cf-login` and `cf-dev` block until closed — for a human at a keyboard only.

## CI
- `.github/workflows/build.yml`: `actions/checkout@v7` → `docker/login-action@v4` → `docker/build-push-action@v7` (`push: true`), building and pushing to Docker Hub (`nicolaznk/pizza-calculator:latest`) on push/PR to `master`, using `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets.
- `.github/workflows/deploy.yml`: on push to `master` → `jdx/mise-action@v5` (installs the Node pinned in `mise.toml`, keeping it the single source of truth) → `npm ci` → `npm run build:prod` → `cloudflare/wrangler-action@v4`, which reads `wrangler.jsonc`. Needs the `CLOUDFLARE_API_TOKEN` (custom token, Account → Workers Scripts → Edit, scoped to the one account) and `CLOUDFLARE_ACCOUNT_ID` secrets. Unlike `build.yml` it does not run on pull requests, since every run deploys to production.
- The dead `node-version: [12.x]` strategy matrix (never referenced — no `actions/setup-node` step existed) was removed along with the old `@v1`/`@v2` action versions and the deprecated inline-credentials auth pattern.
