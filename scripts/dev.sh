#!/bin/bash
set -e
set -o pipefail

GREEN='\033[0;32m'
GREY='\033[0;90m'
NC='\033[0m'

log() { echo -e "${GREY}│${NC} ${GREEN}✓${NC} $1"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

log "starting backend on http://localhost:8000"
(cd "$ROOT/backend" && bun run dev) &
BACKEND_PID=$!

log "starting frontend on http://localhost:5173"
(cd "$ROOT/frontend" && bun run dev -- --open) &
FRONTEND_PID=$!

wait
