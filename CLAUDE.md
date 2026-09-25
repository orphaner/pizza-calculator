# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview
- Stack: Angular 22 (TypeScript), Angular CLI (esbuild-based `application` builder), Karma/Jasmine for unit tests, ESLint, ngx-bootstrap, Bootstrap
- Single-component app: `src/app/app.component.ts` computes dough ingredient weights (flour/water/salt/yeast/olive oil) from portion counts and hydration parameters
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
- `npm run lint` is wired up (ESLint via `angular-eslint`) but currently reports ~14 pre-existing findings in `app.component.ts` (unused imports, `any` usage, non-`OnPush`/non-standalone component, etc.) — not fixed, since they're app-code style choices, not upgrade blockers.
- The Karma unit-test builder is flagged deprecated by the CLI in favor of `@angular/build:karma` (part of Angular's move away from Webpack). Tests still pass; migrating the builder/tooling wasn't done.
- Angular offers an optional `ng update @angular/cli --name migrate-karma-to-vitest` migration to switch off Karma entirely — not applied, kept the existing Jasmine/Karma/ChromeHeadless setup as-is.
- The `e2e` architect target and npm script were removed: they pointed at Protractor (`@angular-devkit/build-angular:protractor`), which no longer ships in `@angular-devkit/build-angular`, and there was no `e2e/` directory or `protractor` dependency in the project anyway — it was already dead before this migration.
- `browserslist` still lists some very old/niche browsers (`kaios`, `and_qq`, `opera` old versions, `chrome 109`, etc.) that the current Angular CLI build ignores or warns about; harmless, but worth pruning if the warnings are annoying.
