# Bunny Playroom Games — source

Phaser 3.90 + TypeScript + Vite. This folder is the full game source; the built games are served by GitHub Pages from the repo root:

| Path | Entry | Build config | Output |
|---|---|---|---|
| `/` (main game) | `index.html` → `src/main.ts` | `vite.config.ts` | `dist/` |
| `/test/` (tester build, all levels unlocked) | `test.html` → `src/main.ts` (`window.__TESTER`) | `vite.test.config.ts` | `dist-test/` |
| `/ruby/` (Ruby standalone) | `ruby.html` → `src/main-ruby.ts` | `vite.ruby.config.ts` | `dist-ruby/` |
| `/linye/` (Linye vs Puppy — Shadow Tag standalone) | `linye.html` → `src/main-linye.ts` | `vite.linye.config.ts` | `dist-linye/` |

## Where things live
- **Dialogue / bubble lines: `src/lines.ts`.** The Shadow Tag catch bubbles are the `shadowCatch` list there — add a line to the array and it joins the pool (never the same line twice in a row; lines up to ~32 characters fit on screen at the edges).
- Levels: `src/scenes/` (Pounce, Shadow, Hub, …). Shared systems: `src/systems/` (e.g. `squash.ts` = Shadow Tag squash catches). Art: `src/art/`, `src/assets/`.
- Each build writes `version.json` with a build id (`YYMMDDhhmm`, Bangkok time), also shown on the title card.

## Build
Requires Node 20+.
```bash
npm ci                                   # install exact deps from package-lock.json
npm run dev                              # local dev server (main game)
npx tsc --noEmit -p .                    # typecheck
npx vite build -c vite.config.ts         # main   -> dist/
npx vite build -c vite.test.config.ts    # /test/ -> dist-test/
npx vite build -c vite.ruby.config.ts    # /ruby/ -> dist-ruby/
npx vite build -c vite.linye.config.ts   # /linye/ -> dist-linye/
```

## Test
Tests are Playwright scripts (`npx playwright install chromium` once) run against a local static server of a build, e.g. `npx vite preview` or `python3 -m http.server 4201 -d dist-test`:
```bash
node tests/smoke.mjs                     # main build (localhost:4199)
URL=http://localhost:4201/ node tests/squash.mjs
node tests/shadowbubble.mjs              # defaults to localhost:4201 (/test/)
node tests/shadowcatchfit.mjs            # Shadow catch pool + bubbles on screen at the edges
node tests/testerdoors.mjs
MAIN=http://localhost:4201/ LEVELS=Pounce,Shadow SKIP_RUBY=1 SKIP_LINYE=1 node tests/rapidtap.mjs
node tests/pouncebots.mjs ignore,walk,spam,lookaway,casual,noob 12   # Pounce difficulty bots
```

## Deploy (GitHub Pages repo `pupmax/bunnyplayroomgame`)
1. Clone the Pages repo (e.g. to `/tmp/pages4`) and build what you want to ship.
2. Stage it: `PAGES=/tmp/pages4 ./deploy-stage.sh test` (parts: `root`, `ruby`, `test`, `linye`, `source`).
   - `root` replaces the main game at the repo root but **never deletes `ruby/`, `test/`, `linye/` or `source/`**.
   - `source` refreshes this `source/` folder (no node_modules, dist*, screenshots, mockups, backups, .env/token files; aborts if a token-like string is found).
3. Check `git status` only touches what you meant to ship, then commit and do a normal `git push` (never force). Pages updates in ~1 minute; verify `<path>/version.json` shows the new build id.
