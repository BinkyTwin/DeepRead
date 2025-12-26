#!/usr/bin/env bash
set -euo pipefail

echo "== git status =="
git status --porcelain

echo "== quick checks (best-effort) =="

# Python checks
if [ -d "deepread-api" ]; then
    echo "-- Python backend checks --"
    cd deepread-api
    if command -v ruff >/dev/null 2>&1; then ruff check . || true; fi
    if command -v pytest >/dev/null 2>&1; then pytest -q || true; fi
    cd ..
fi

# Node checks
if [ -d "deepread-app" ]; then
    echo "-- Node frontend checks --"
    cd deepread-app
    if command -v pnpm >/dev/null 2>&1; then pnpm -s test || true; fi
    if command -v npm >/dev/null 2>&1; then npm -s test 2>/dev/null || true; fi
    if command -v bun >/dev/null 2>&1; then bun test || true; fi
    cd ..
fi

echo "Done."
