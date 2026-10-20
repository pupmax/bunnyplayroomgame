#!/usr/bin/env bash
# Stage built dists into the pages repo. Root deploy NEVER deletes the sub-games (ruby/, test/, linye/, tail/) or the game source (source/).
# Usage: ./deploy-stage.sh [root] [ruby] [test] [linye] [tail] [source]   (default: root ruby test linye)   PAGES=/tmp/pages4
# 'source' copies the game source into source/: src, tests, configs, package files, html entries, scripts, README.
# Never copied: node_modules, dist*, screenshots, mockups, backups, .env / token / key files. Aborts on token-like strings.
set -euo pipefail
PAGES=${PAGES:-/tmp/pages4}; SRC=$(cd "$(dirname "$0")" && pwd)
KEEP='^(\.git|\.nojekyll|ruby|test|linye|tail|source)$'
parts=("$@"); [ ${#parts[@]} -eq 0 ] && parts=(root ruby test linye)
for p in "${parts[@]}"; do
  case $p in
    root) for f in $(ls -A "$PAGES"); do [[ $f =~ $KEEP ]] || rm -rf "$PAGES/$f"; done
          cp -r "$SRC/dist/." "$PAGES/"; touch "$PAGES/.nojekyll";;
    ruby|test|linye|tail) rm -rf "$PAGES/$p"; cp -r "$SRC/dist-$p" "$PAGES/$p";;
    source) if [ "$(cd "$PAGES" && pwd)/source" = "$SRC" ]; then echo "'source' must be run from a separate working copy, not from the repo's own source/ (it would delete itself)"; exit 1; fi
          rm -rf "$PAGES/source"; mkdir -p "$PAGES/source"
          cp -r "$SRC/src" "$SRC/tests" "$PAGES/source/"
          for f in "$SRC"/*.ts "$SRC"/*.json "$SRC"/*.html "$SRC"/*.sh "$SRC"/README.md "$SRC"/.gitignore; do [ -f "$f" ] && cp "$f" "$PAGES/source/"; done
          find "$PAGES/source" \( -name node_modules -o -name 'dist*' -o -name screenshots -o -name mockups -o -iname '*backup*' -o -name '.env*' \
            -o -iname '*token*' -o -name '*.pem' -o -name '*.key' -o -name .npmrc \) -prune -exec rm -rf {} +
          if grep -rIlE 'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|x-access-token:[A-Za-z0-9]' "$PAGES/source"; then
            echo "SECRET-LIKE STRING in source/ (files above) - aborting"; rm -rf "$PAGES/source"; exit 1; fi;;
    *) echo "unknown part $p"; exit 1;;
  esac
done
for d in ruby test linye tail; do [ -f "$PAGES/$d/index.html" ] || echo "WARNING: $d/ missing"; done
[ -f "$PAGES/source/package.json" ] || echo "WARNING: source/ missing"
echo staged: "${parts[@]}"
