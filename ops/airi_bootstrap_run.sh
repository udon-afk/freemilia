#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AIRI_DIR="${AIRI_DIR:-$WORKSPACE_DIR/products/airi}"

if ! command -v node >/dev/null 2>&1; then
  echo "[AIRI] node is required (recommend v24)." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "[AIRI] corepack is required." >&2
  exit 1
fi

corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true

if [[ ! -d "$AIRI_DIR" ]]; then
  mkdir -p "$(dirname "$AIRI_DIR")"
  git clone --depth 1 --branch main https://github.com/moeru-ai/airi.git "$AIRI_DIR"
fi

node "$WORKSPACE_DIR/ops/airi_sync_avatar_profile.mjs"

cd "$AIRI_DIR"
pnpm install --frozen-lockfile
pnpm dev:web
