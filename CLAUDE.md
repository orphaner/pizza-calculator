# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview
- Stack: Angular 22 (TypeScript), Angular CLI (esbuild-based `application`/`dev-server`/`unit-test` builders — all standalone, no NgModule), ESLint, Vitest (unit) + Playwright (integration), ngx-bootstrap, Bootstrap
- Single standalone component: `src/app/app.component.ts` computes dough ingredient weights (flour/water/salt/yeast/olive oil) from portion counts and hydration parameters; bootstrapped directly via `bootstrapApplication` in `src/main.ts` (no `app.module.ts`)
- **Zoneless**: no `zone.js`, `provideZonelessChangeDetection()` in `src/main.ts`. Change detection relies entirely on Angular's own event-binding notifications (`(ngModelChange)`, `(click)`, etc. all mark the view dirty on their own) — there is nothing to configure per-component for this to work, but any code that mutates component state from *outside* an Angular-triggered callback (raw `setTimeout`, a non-Angular event listener, a promise not awaited through Angular APIs) would silently fail to update the view and needs a manual `ChangeDetectorRef.markForCheck()`/signal.
- Build output: `dist/pizza-calculator/browser` (path set in `angular.json`; the `application` builder nests output under `browser/` as of Angular 18)
- Production: Docker build (`Dockerfile`) → static files served by NGINX
- Upgraded from Angular 9 → 22 in one pass (`ng update` one major at a time). `ngx-bootstrap` majors track Angular majors 1:1 from v8 onward, so it was bumped in lockstep at every step.

## Tooling / Node version
- Node version is managed by [mise](https://mise.jdx.dev/), pinned in `mise.toml` (currently 24.21.0) — this is the single source of truth (no `.nvmrc`). Run `mise install` once per checkout.
- Bumped from 18.20.8: Angular CLI 22 requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`. 24.21.0 is the current LTS line satisfying that.
- `NODE_OPTIONS=--openssl-legacy-provider` is gone from all npm scripts — it was only needed for the old webpack-based Angular 9 build on Node 17+/OpenSSL 3; the modern esbuild-based builder doesn't need it.
- `mise run start` / `mise start` runs `npm start` (dev server) using the pinned Node version.
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
  (Chrome) and `mobile` (Pixel 7, 412px), so every spec runs twice — 10 specs,
  20 runs. Only Chromium is installed (`npx playwright install chromium`); the
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
  scroll, no wrapped label or clipped value, the total sitting below every
  section, and sections stacking on mobile vs sitting side by side on desktop.
  These formalise checks that were previously done by hand over CDP.
- The layout specs inspect *every* `.ingredient-row`, so they would pass
  vacuously on a blank page. `beforeEach` asserts a row is visible and one spec
  asserts the exact row count (14) to keep that from happening — preserve those
  guards when editing.
- Suite was validated by mutation: changing the biga hydration from `* 0.5` to
  `* 0.6` made exactly the biga-split spec fail (expected 146, got 175) while
  the other 18 stayed green, which is the intended blast radius.
- CI does not run any tests today — the workflow only builds and pushes the
  Docker image. These suites are local-only until that changes.

## Docker
```bash
docker build -t pizza-calculator:local .
docker run --rm -p 8080:80 pizza-calculator:local   # http://localhost:8080
mise run docker-build         # build image (no cache)
mise run docker-push          # push nicolaznk/pizza-calculator:latest (requires Docker Hub login)
```

## CI
- `.github/workflows/build.yml`: `actions/checkout@v7` → `docker/login-action@v4` → `docker/build-push-action@v7` (`push: true`), building and pushing to Docker Hub (`nicolaznk/pizza-calculator:latest`) on push/PR to `master`, using `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets.
- The dead `node-version: [12.x]` strategy matrix (never referenced — no `actions/setup-node` step existed) was removed along with the old `@v1`/`@v2` action versions and the deprecated inline-credentials auth pattern.

## Known follow-ups from the Angular 9 → 22 migration
- `npm run lint` is wired up (ESLint via `angular-eslint`) and passes clean. `app.component.ts` is standalone with `ChangeDetectionStrategy.OnPush`.
- Builders modernized off Webpack: `build`/`serve` → `@angular/build:application`/`:dev-server` (were flagged deprecated on the old `@angular-devkit/build-angular:*` aliases).
- `test` migrated from Karma+Jasmine to **Vitest** via `ng update @angular/cli --name migrate-karma-to-vitest` (builder: `@angular/build:unit-test`, `"runner": "vitest"`). `karma.conf.js`, `src/test.ts`, and all `karma-*`/`@types/jasmine` packages were removed. Spec syntax (`describe`/`it`/`expect`/`beforeEach`) is unchanged — only the runner changed, via explicit `import { ... } from "vitest"` in each spec file (added by `ng g @schematics/angular:refactor-jasmine-vitest --add-imports`).
- Two non-obvious fixes were needed to get Vitest actually passing, neither caught by the migration schematic itself:
  - `polyfills` in `angular.json` switched from the file `src/polyfills.ts` (which only did `import 'zone.js'`) to the literal `["zone.js"]` polyfill declaration. With a `.ts` file, the builder can't statically tell zone.js is a build-time polyfill, so it loads it via `await import(...)` in the test-bed-init, and that fails with "Top-level await is not supported" under Zone.js. The literal `"zone.js"` polyfill entry makes it load via a plain `import` instead.
  - `waitForAsync(...)` around `TestBed.configureTestingModule(...).compileComponents()` in spec files was replaced with a plain `async () => { await ...compileComponents(); }`. `waitForAsync` needs zone.js's ProxyZone (from `zone.js/testing`), which isn't set up the same way under the new Vitest test-bed-init — it threw "Expected to be running in 'ProxyZone', but it was not found."
  - Also removed `tsconfig.json`'s explicit `"typeRoots": ["node_modules/@types"]` (a redundant vestige equal to the TS default) — it was blocking resolution of `"vitest/globals"` in `tsconfig.spec.json`'s `types` array (`TS2688: Cannot find type definition file for 'vitest/globals'`), since that package ships its own types outside `@types/`.
- Sass deprecation warnings from Bootstrap's own SCSS (via `src/styles.scss`'s `@import`s) are silenced via `stylePreprocessorOptions.sass.silenceDeprecations` in both the `build` and `test` targets in `angular.json` (`import`, `global-builtin`, `color-functions`, `slash-div`, `if-function`). Bootstrap 5.3.8 still uses `@import` internally (not yet `@use`), so this is still needed even post-Bootstrap-5-upgrade.
- `.browserslistrc` switched to Angular's modern `baseline widely available on <date>` query, dropping the old `> 0.5% / last 2 versions` query that was pulling in ancient/niche browsers (KaiOS, old Opera Mini, Chrome 109, etc.) and producing "unsupported browser" warnings.
- The `e2e` architect target and npm script were removed: they pointed at Protractor (`@angular-devkit/build-angular:protractor`), which no longer ships in `@angular-devkit/build-angular`, and there was no `e2e/` directory or `protractor` dependency in the project anyway — it was already dead before this migration.
- The `extract-i18n` architect target was removed from `angular.json` — it used the legacy `@angular-devkit/build-angular:extract-i18n` builder, was never invoked by any npm script, and would have failed anyway since `@angular/localize` was already removed as a dead dependency (see below); nothing in the project uses i18n.

## Zoneless migration
- Removed `zone.js` entirely: dropped from `dependencies` in `package.json` and from `polyfills` in `angular.json` (now `[]`). `src/main.ts`: `provideZoneChangeDetection()` → `provideZonelessChangeDetection()`.
- No other code changes were required. The app's only reactivity is template event bindings (`(ngModelChange)="valueChange()"`), which Angular marks dirty on its own regardless of zone.js — this has been true since Ivy's notification-based scheduler, not something zoneless mode changes.
- Bundle impact: the `polyfills` chunk (~35 kB raw / ~11 kB transferred) disappeared from the production build entirely.
- Added a regression test (`app.component.spec.ts`) that specifically exercises this: `fixture.autoDetectChanges()` (no manual `detectChanges()` call) + a real `dispatchEvent(new Event('input'))` on the DOM, then asserts the recalculated total appears — this is the one test that would have caught a zoneless regression, since the other tests all call `detectChanges()` manually and wouldn't have noticed if automatic change detection broke.
- Getting Vitest itself to run without zone.js required no extra work beyond removing the polyfill — the test-bed-init already special-cases "polyfills defined but doesn't include zone.js" as the zoneless case (see Vitest migration notes above).

## Post-migration cleanup
- `tsconfig.json`: `strict: true` + `angularCompilerOptions.strictTemplates: true` enabled (previously only `strictInjectionParameters`/`fullTemplateTypeCheck`). Build/lint/tests all pass clean with no code changes required.
- Removed dead dependencies: `@angular/router` and `@angular/localize` were listed in `package.json` but never imported anywhere in `src/` (no routing, no i18n in this single-component app).
- `Dockerfile`: `nginx:1.17` (2019-era, known CVEs) → `nginx:1.30.5` (current stable). Verified with a local `docker build` + `docker run` (HTTP 200, `nginx -v` confirms 1.30.5).
- Bootstrap 4.1.1 → 5.3.8. The app's own markup (`app.component.html`) needed zero changes — no renamed/removed classes were in use (`.close`, `.form-group`, `data-toggle`, etc.). `src/styles.scss` did need two new `@import`s that BS4 didn't require:
  - `bootstrap/scss/containers` — `.container`/`.container-fluid` moved out of `_grid.scss` into their own partial in BS5.
  - `bootstrap/scss/helpers` and `bootstrap/scss/utilities/api` — BS5's utilities (`.mt-4`, `.text-center`, `.align-middle`, `.clearfix`, etc.) became map-driven; `@import "utilities"` alone now only defines the `$utilities` Sass map, it no longer emits any CSS classes on its own.
  - **Caught by grepping the compiled CSS for every Bootstrap class actually used in the templates** (`.container`, `.mt-4`, `.clearfix`, ...) after the version bump — the build produced zero errors/warnings despite silently dropping these classes, so this class of regression won't show up in `npm run build`/lint/tests. Worth the same grep check after any future Bootstrap import changes.
  - Also fixed: `npm ci` no longer needs `--legacy-peer-deps` (see above) — Bootstrap 5 dropped the jQuery/Popper peer deps.
