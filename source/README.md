# Bunny Playroom Games — how to edit and publish the game (beginner guide)

This `source/` folder is the whole game. The **repo root** is the live website (GitHub Pages):

| Website address | What it is | Built with | Build output (inside `source/`) | Copy it to (repo) |
|---|---|---|---|---|
| `https://pupmax.github.io/bunnyplayroomgame/` | main game | `npm run build:main` | `dist/` | repo root |
| `.../bunnyplayroomgame/test/` | tester build (all levels unlocked) | `npm run build:test` | `dist-test/` | `test/` |
| `.../bunnyplayroomgame/ruby/` | Ruby standalone game | `npm run build:ruby` | `dist-ruby/` | `ruby/` |
| `.../bunnyplayroomgame/linye/` | Linye vs Puppy — Shadow Tag | `npm run build:linye` | `dist-linye/` | `linye/` |

> **Golden rule:** never delete or overwrite the folders `source/`, `test/`, `ruby/` or `linye/` in the repo root unless that is the one you are updating.

---

## 1. One-time setup

1. **Install Node.js (LTS version)** from <https://nodejs.org> → click the **LTS** download, run the installer with the default options.
2. **Install Git** from <https://git-scm.com/downloads> (Windows: keep the default options).
3. Open a terminal:
   - **macOS:** open the *Terminal* app.
   - **Windows:** open *PowerShell* (Start menu → type "PowerShell").
4. Check they work (each should print a version number):
   ```bash
   node -v
   git --version
   ```
5. **Download (clone) the repo** and go into the source folder:
   ```bash
   git clone https://github.com/pupmax/bunnyplayroomgame.git
   cd bunnyplayroomgame/source
   npm install
   ```
   `npm install` downloads the game's tools into `source/node_modules/` (takes a minute; only needed once, or again if `package.json` changes).

## 2. Run the game on your computer

From inside `bunnyplayroomgame/source`:
```bash
npm run dev
```
It prints something like:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.23:5173/
```
- Open the **Local** address in your browser. Pages: `/` main game, `/test.html` tester build, `/ruby.html`, `/linye.html`.
- **On your phone:** connect the phone to the **same Wi-Fi**, then open the **Network** address on the phone (e.g. `http://192.168.1.23:5173/linye.html`). If no Network line appears, run `npm run dev -- --host` instead. If the phone can't connect, allow Node through your computer's firewall when asked.
- Leave it running: every time you save a file the page reloads by itself. Stop it with **Ctrl + C**.

## 3. Change the Shadow Tag catch lines

Open `source/src/lines.ts` in any text editor (VS Code is a good free one) and find `shadowCatch`:
```ts
  shadowCatch: [
    'Sticky situation, Puppy!',
    'Ouch! Wool cushion activated.',
    "Tag, you're squished!",
    "That's gonna leave a quill mark!",
    'Who left a Puppy on the floor?',
    'Fastest hedgehog in the playroom!',
  ],
```
To add a line, add a new row **inside the brackets**, in quotes, **ending with a comma**:
```ts
    'Fastest hedgehog in the playroom!',
    'Boop! Right on the nose!',
  ],
```
- If your line contains an apostrophe (`you're`, `that's`), wrap it in **double quotes**: `"Tag, you're squished!",`
- Keep lines to about **32 characters** or less so the bubble fits on a phone screen.
- The game picks a random line after each catch and never shows the same one twice in a row.
- All the other characters' lines are in the same file (`hiveBonk`, `rubyHurt`, …).

Save the file; `npm run dev` reloads the game so you can see it.

## 4. Build

Still inside `source/`. Build only what you want to publish:
```bash
npm run typecheck     # optional: checks the code for mistakes first
npm run build:main    # main game  -> dist/
npm run build:test    # /test/     -> dist-test/
npm run build:ruby    # /ruby/     -> dist-ruby/
npm run build:linye   # /linye/    -> dist-linye/
npm run build:all     # all four
```
Each build gets a build id (like `2610191455` = 26-10-19 14:55 Bangkok time) shown on the title screen and in `version.json`.

## 5. Publish (copy the build into the repo, then push)

Run these from inside `source/`. The repo root is `..` (one folder up).

### macOS / Linux
```bash
# main game -> repo root (replaces index.html, version.json and assets/ only)
rm -rf ../assets && cp -R dist/. ..

# a sub-game -> its own folder (replace ONLY that folder)
rm -rf ../test  && cp -R dist-test  ../test
rm -rf ../ruby  && cp -R dist-ruby  ../ruby
rm -rf ../linye && cp -R dist-linye ../linye
```
(Shortcut that does the same safely: `PAGES=.. ./deploy-stage.sh test` — parts `root`, `test`, `ruby`, `linye`.)

### Windows PowerShell
```powershell
# main game -> repo root (replaces index.html, version.json and assets\ only)
Remove-Item -Recurse -Force ..\assets -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force dist\* ..\

# a sub-game -> its own folder (replace ONLY that folder)
Remove-Item -Recurse -Force ..\test  -ErrorAction SilentlyContinue; Copy-Item -Recurse dist-test  ..\test
Remove-Item -Recurse -Force ..\ruby  -ErrorAction SilentlyContinue; Copy-Item -Recurse dist-ruby  ..\ruby
Remove-Item -Recurse -Force ..\linye -ErrorAction SilentlyContinue; Copy-Item -Recurse dist-linye ..\linye
```

### Then commit and push (same on every computer)
```bash
cd ..                      # go to the repo root
git status                 # check: only the folders you meant to change (and source/ if you edited code)
git add -A
git commit -m "Shadow Tag: new catch lines"
git push
```
GitHub Pages updates in about a minute. Check it worked by opening e.g. `https://pupmax.github.io/bunnyplayroomgame/linye/version.json` — it should show your new build id.

## 6. Common mistakes

- **Running `npm` commands in the wrong folder.** They only work inside `source/` (where `package.json` is). Error `Missing script` or `ENOENT package.json` = you are in the wrong folder; `cd source`.
- **Missing comma or quote in `lines.ts`.** The page goes blank or `npm run dev` shows a red error. Every line needs quotes at both ends and a comma at the end.
- **Apostrophe inside single quotes** (`'Tag, you're squished!'`) breaks the file. Use double quotes for that line.
- **Editing the built files** (repo root `assets/`, `test/assets/`…) instead of `source/src/`. Built files are overwritten on the next build; always edit `source/src/` and rebuild.
- **Forgetting to build before copying.** Copying old `dist-*` folders publishes the old game. Rebuild first; check the build id.
- **Copying into the wrong place**, e.g. `dist-test` into the repo root (that replaces the main game with the tester build) or deleting `source/`, `test/`, `ruby/`, `linye/` by accident. Use only the commands above. If something went wrong before you committed, `git checkout -- .` and `git clean -fd` in the repo root undo all uncommitted changes (careful: they also discard your edits that are not yet copied/committed).
- **Committing `node_modules/` or `dist*/`.** `source/.gitignore` blocks them; don't delete that file.
- **Old version still showing on the phone.** Wait a minute, then reload; check `version.json` for the build id.
- **`git push` rejected** ("fetch first" / "non-fast-forward"): someone else pushed. Run `git pull`, then `git push` again. **Never use `git push --force`.**
- **Node too old** (strange syntax errors on `npm run dev`): install the current **LTS** from nodejs.org and run `npm install` again.

## For developers

- Code: `src/scenes/` (levels: Pounce, Shadow, Hub, …), `src/systems/` (shared, e.g. `squash.ts` = Shadow Tag squash catches), `src/art/`, `src/assets/`. Entries: `index.html` → `src/main.ts`, `test.html` → `src/main.ts` (`window.__TESTER`), `ruby.html` → `src/main-ruby.ts`, `linye.html` → `src/main-linye.ts`.
- Tests are Playwright scripts (`npx playwright install chromium` once) run against a static server of a build, e.g. `npx vite preview` or `python3 -m http.server 4201 -d dist-test`:
  `npm test` (= `tests/smoke.mjs`, main on :4199), `tests/squash.mjs`, `tests/shadowbubble.mjs`, `tests/shadowcatchfit.mjs`, `tests/shadowscorepop.mjs`, `tests/testerdoors.mjs`, `tests/hallhammer.mjs`, `tests/rapidtap.mjs`, `tests/linye-standalone.mjs`, `tests/pouncebots.mjs`.
- `deploy-stage.sh [root] [ruby] [test] [linye] [source]` (`PAGES=<repo>`): root never deletes `ruby/ test/ linye/ source/`; `source` refreshes `source/` from a separate working copy (no node_modules, dist*, screenshots, mockups, backups, .env/token files; aborts on token-like strings).
