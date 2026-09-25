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
- The Docker build stage (`Dockerfile`) uses `node:24.21.0-slim`, aligned with `mise.toml`. `npm ci` there needs `--legacy-peer-deps` — the lockfile was generated with it (some transitive peer ranges, e.g. bootstrap 4's `jquery`/`popper.js`, aren't fully resolved otherwise) and a strict `npm ci` rejects it as "missing" packages without the flag.

## Common commands
```bash
mise install                 # install pinned Node version
npm ci --legacy-peer-deps    # install dependencies
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
- `.github/workflows/build.yml` builds and pushes a Docker image via `docker/build-push-action` on push/PR to `master`, using `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets.
- Its `node-version` build matrix (`12.x`) is unused dead config — the job never references it.

## Known follow-ups from the Angular 9 → 22 migration
- `npm run lint` is wired up (ESLint via `angular-eslint`) and passes clean. `app.component.ts` is standalone with `ChangeDetectionStrategy.OnPush`.
- Builders modernized off Webpack: `serve` → `@angular/build:dev-server`, `test` → `@angular/build:karma` (both were flagged deprecated on the old `@angular-devkit/build-angular:*` builders). `karma.conf.js` updated to match (`karma-coverage` replaces `karma-coverage-istanbul-reporter`, no more `@angular-devkit/build-angular` framework/plugin entry).
- Sass deprecation warnings from Bootstrap 4's own SCSS (via `src/styles.scss`'s `@import`s) are silenced via `stylePreprocessorOptions.sass.silenceDeprecations` in both the `build` and `test` targets in `angular.json` (`import`, `global-builtin`, `color-functions`, `slash-div`, `if-function`). This hides the noise but doesn't fix the root cause — only a Bootstrap 5 migration (separate, non-trivial markup effort) would.
- `.browserslistrc` switched to Angular's modern `baseline widely available on <date>` query, dropping the old `> 0.5% / last 2 versions` query that was pulling in ancient/niche browsers (KaiOS, old Opera Mini, Chrome 109, etc.) and producing "unsupported browser" warnings.
- Angular offers an optional `ng update @angular/cli --name migrate-karma-to-vitest` migration to switch off Karma entirely — not applied, kept the existing Jasmine/Karma/ChromeHeadless setup.
- The `e2e` architect target and npm script were removed: they pointed at Protractor (`@angular-devkit/build-angular:protractor`), which no longer ships in `@angular-devkit/build-angular`, and there was no `e2e/` directory or `protractor` dependency in the project anyway — it was already dead before this migration.
- `extract-i18n` architect target still uses the legacy `@angular-devkit/build-angular:extract-i18n` builder — unused by any npm script, left as-is.
