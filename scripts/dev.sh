#!/bin/bash
set -e
set -o pipefail

GREEN='\033[0;32m'
GREY='\033[0;90m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREY}│${NC} ${GREEN}✓${NC} $1"; }
warn() { echo -e "${GREY}│${NC} ${YELLOW}!${NC} $1"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$ROOT/.claude/.tmp/dev/pids"

FRONTEND_BASE_PORT="${DICTION_FRONTEND_PORT:-5173}"
BACKEND_BASE_PORT="${DICTION_BACKEND_PORT:-8000}"

OLLAMA_URL="${OLLAMA_HOST:-http://localhost:11434}"

BACKEND_PID=""
FRONTEND_PID=""

port_in_use() {
  local port="$1"
  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null || return 1
  exec 3>&- 3<&-
  return 0
}

find_free_port() {
  local port="$1"
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  printf '%s' "$port"
}

ensure_deps() {
  if [ ! -d "$ROOT/frontend/node_modules" ]; then
    log "installing frontend deps (first run in this worktree)"
    (cd "$ROOT/frontend" && bun install)
  fi
  if [ ! -d "$ROOT/backend/.venv" ]; then
    log "syncing backend deps (first run in this worktree)"
    (cd "$ROOT/backend" && uv sync)
  fi
}

ensure_real_stack() {
  log "syncing real model extras (scoring, tts, feedback)"
  (cd "$ROOT/backend" && uv sync --extra scoring --extra tts --extra feedback)

  log "Kokoro self-downloads its model on first real boot (cached in the HF cache)"

  if [ "${DICTION_USE_STUB_EXPLAINER:-false}" != "true" ] && ! curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    warn "Ollama unreachable at $OLLAMA_URL. Start it, or set DICTION_USE_STUB_EXPLAINER=true for surfaces that skip the LLM."
    exit 1
  fi
}

kill_group() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  kill -- "-$pid" 2>/dev/null || true
}

cleanup() {
  kill_group "$BACKEND_PID"
  kill_group "$FRONTEND_PID"
  rm -f "$PIDFILE"
}

stop() {
  if [ ! -f "$PIDFILE" ]; then
    warn "no dev pair recorded for this worktree"
    return 0
  fi
  # shellcheck source=/dev/null
  . "$PIDFILE"
  kill_group "${BACKEND_PID:-}"
  kill_group "${FRONTEND_PID:-}"
  rm -f "$PIDFILE"
  log "stopped this worktree's dev pair"
}

pair_running() {
  [ -f "$PIDFILE" ] || return 1
  local key value
  while IFS='=' read -r key value; do
    case "$key" in
    BACKEND_PID | FRONTEND_PID)
      if [ -n "$value" ] && kill -0 "$value" 2>/dev/null; then
        return 0
      fi
      ;;
    esac
  done <"$PIDFILE"
  return 1
}

start() {
  if pair_running; then
    warn "a dev pair is already running for this worktree. Use 'scripts/dev.sh restart' to replace it, or 'scripts/dev.sh stop' to end it."
    exit 1
  fi
  ensure_deps
  mkdir -p "$(dirname "$PIDFILE")"

  local backend_port frontend_port
  backend_port="$(find_free_port "$BACKEND_BASE_PORT")"
  frontend_port="$(find_free_port "$FRONTEND_BASE_PORT")"

  export DICTION_BACKEND_PORT="$backend_port"
  export VITE_BACKEND_URL="http://localhost:$backend_port"
  export DICTION_RUN_MODE=dev

  if [ "${DICTION_DEV_MODELS:-stub}" = "real" ]; then
    ensure_real_stack
    export DICTION_USE_STUB_SCORER="${DICTION_USE_STUB_SCORER:-false}"
    export DICTION_USE_STUB_PROSODY="${DICTION_USE_STUB_PROSODY:-false}"
    export DICTION_USE_STUB_EXPLAINER="${DICTION_USE_STUB_EXPLAINER:-false}"
    export DICTION_USE_STUB_CRITIC="${DICTION_USE_STUB_CRITIC:-false}"
    export DICTION_USE_STUB_GENERATOR="${DICTION_USE_STUB_GENERATOR:-false}"
    export DICTION_USE_STUB_SYNTH="${DICTION_USE_STUB_SYNTH:-false}"
    log "model stack: real (installed extras, stubs off unless explicitly set)"
  else
    export DICTION_USE_STUB_SCORER=true
    export DICTION_USE_STUB_PROSODY=true
    export DICTION_USE_STUB_EXPLAINER=true
    export DICTION_USE_STUB_CRITIC=true
    export DICTION_USE_STUB_GENERATOR=true
    export DICTION_USE_STUB_SYNTH=true
    log "model stack: stub (set DICTION_DEV_MODELS=real to use installed models)"
  fi

  trap cleanup EXIT INT TERM

  log "starting backend on http://localhost:$backend_port"
  setsid bash -c "cd '$ROOT/backend' && exec bun run dev" &
  BACKEND_PID=$!

  log "starting frontend on http://localhost:$frontend_port"
  setsid bash -c "cd '$ROOT/frontend' && exec bun run dev -- --port $frontend_port --strictPort --open" &
  FRONTEND_PID=$!

  {
    echo "BACKEND_PID=$BACKEND_PID"
    echo "FRONTEND_PID=$FRONTEND_PID"
    echo "BACKEND_PORT=$backend_port"
    echo "FRONTEND_PORT=$frontend_port"
  } >"$PIDFILE"

  wait
}

case "${1:-start}" in
start) start ;;
stop) stop ;;
restart)
  stop
  start
  ;;
*)
  echo "usage: $0 [start|stop|restart]" >&2
  exit 2
  ;;
esac
