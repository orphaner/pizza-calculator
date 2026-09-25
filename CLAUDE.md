# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview
- Stack: Angular 9 (TypeScript), Angular CLI, Karma/Jasmine for unit tests, TSLint, ngx-bootstrap, Bootstrap
- Single-component app: `src/app/app.component.ts` computes dough ingredient weights (flour/water/salt/yeast/olive oil) from portion counts and hydration parameters
- Build output: `dist/pizza-calculator` (path set in `angular.json`)
- Production: Docker build (`Dockerfile`) → static files served by NGINX

## Tooling / Node version
- Node version is managed by [mise](https://mise.jdx.dev/), pinned in `mise.toml` (currently 18.20.8) — this is the single source of truth (no more `.nvmrc`). Run `mise install` once per checkout.
- Bumped from 14.18.3: Node 14 has no official macOS arm64 build and fails to compile from source on modern Xcode/Clang (`cxxabi.h` not found building V8). Node 18 has a prebuilt arm64 binary and matches the `NODE_OPTIONS=--openssl-legacy-provider` flag already used in `package.json` scripts (only valid on Node 17+).
- `mise run start` / `mise start` runs `npm start` (dev server) using the pinned Node version.
- The Docker build stage (`Dockerfile`) uses `node:18.20.8-slim`, aligned with `mise.toml`.

## Common commands
```bash
mise install                 # install pinned Node version
npm ci                       # install dependencies
npm start                    # dev server, http://localhost:4200
npm run build                # dev build
npm run build -- --prod      # production build (AOT, optimizations)
npm test                     # unit tests (Karma, watch mode)
ng test --watch=false --browsers=ChromeHeadless   # CI-style single run
npm run lint                 # TSLint via Angular CLI
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
