# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview
- Stack: Angular 22 (TypeScript), Angular CLI (esbuild-based `application`/`dev-server`/`karma` builders — all standalone, no NgModule), ESLint, ngx-bootstrap, Bootstrap
- Single standalone component: `src/app/app.component.ts` computes dough ingredient weights (flour/water/salt/yeast/olive oil) from portion counts and hydration parameters; bootstrapped directly via `bootstrapApplication` in `src/main.ts` (no `app.module.ts`)
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
npm test                     # unit tests (Karma, watch mode)
ng test --watch=false --browsers=ChromeHeadless   # CI-style single run
npm run lint                 # ESLint via Angular CLI (angular-eslint)
```

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
- Builders modernized off Webpack: `serve` → `@angular/build:dev-server`, `test` → `@angular/build:karma` (both were flagged deprecated on the old `@angular-devkit/build-angular:*` builders). `karma.conf.js` updated to match (`karma-coverage` replaces `karma-coverage-istanbul-reporter`, no more `@angular-devkit/build-angular` framework/plugin entry).
- Sass deprecation warnings from Bootstrap's own SCSS (via `src/styles.scss`'s `@import`s) are silenced via `stylePreprocessorOptions.sass.silenceDeprecations` in both the `build` and `test` targets in `angular.json` (`import`, `global-builtin`, `color-functions`, `slash-div`, `if-function`). Bootstrap 5.3.8 still uses `@import` internally (not yet `@use`), so this is still needed even post-Bootstrap-5-upgrade.
- `.browserslistrc` switched to Angular's modern `baseline widely available on <date>` query, dropping the old `> 0.5% / last 2 versions` query that was pulling in ancient/niche browsers (KaiOS, old Opera Mini, Chrome 109, etc.) and producing "unsupported browser" warnings.
- Angular offers an optional `ng update @angular/cli --name migrate-karma-to-vitest` migration to switch off Karma entirely — not applied, kept the existing Jasmine/Karma/ChromeHeadless setup.
- The `e2e` architect target and npm script were removed: they pointed at Protractor (`@angular-devkit/build-angular:protractor`), which no longer ships in `@angular-devkit/build-angular`, and there was no `e2e/` directory or `protractor` dependency in the project anyway — it was already dead before this migration.
- `extract-i18n` architect target still uses the legacy `@angular-devkit/build-angular:extract-i18n` builder — unused by any npm script, left as-is. Note: since `@angular/localize` was removed as a dead dependency (see below), actually invoking this target would now fail; nothing in the project uses i18n.

## Post-migration cleanup
- `tsconfig.json`: `strict: true` + `angularCompilerOptions.strictTemplates: true` enabled (previously only `strictInjectionParameters`/`fullTemplateTypeCheck`). Build/lint/tests all pass clean with no code changes required.
- Removed dead dependencies: `@angular/router` and `@angular/localize` were listed in `package.json` but never imported anywhere in `src/` (no routing, no i18n in this single-component app).
- `Dockerfile`: `nginx:1.17` (2019-era, known CVEs) → `nginx:1.30.5` (current stable). Verified with a local `docker build` + `docker run` (HTTP 200, `nginx -v` confirms 1.30.5).
- Bootstrap 4.1.1 → 5.3.8. The app's own markup (`app.component.html`) needed zero changes — no renamed/removed classes were in use (`.close`, `.form-group`, `data-toggle`, etc.). `src/styles.scss` did need two new `@import`s that BS4 didn't require:
  - `bootstrap/scss/containers` — `.container`/`.container-fluid` moved out of `_grid.scss` into their own partial in BS5.
  - `bootstrap/scss/helpers` and `bootstrap/scss/utilities/api` — BS5's utilities (`.mt-4`, `.text-center`, `.align-middle`, `.clearfix`, etc.) became map-driven; `@import "utilities"` alone now only defines the `$utilities` Sass map, it no longer emits any CSS classes on its own.
  - **Caught by grepping the compiled CSS for every Bootstrap class actually used in the templates** (`.container`, `.mt-4`, `.clearfix`, ...) after the version bump — the build produced zero errors/warnings despite silently dropping these classes, so this class of regression won't show up in `npm run build`/lint/tests. Worth the same grep check after any future Bootstrap import changes.
  - Also fixed: `npm ci` no longer needs `--legacy-peer-deps` (see above) — Bootstrap 5 dropped the jQuery/Popper peer deps.
