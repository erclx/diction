#!/usr/bin/env bash

# Claude Code sends a payload and closes stdin. A bare read with nothing feeding
# it blocks forever and holds the session open, so the read is bounded. `read`
# rather than `timeout cat`, which macOS does not ship.
IFS= read -r -d '' -t 2 input
[ -n "$input" ] || {
  printf '%s reads a Claude Code hook payload on stdin and cannot be run by hand.\n' "${0##*/}" >&2
  exit 1
}

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

case "$file" in
*.md) ;;
*) exit 0 ;;
esac

case "$file" in
*.claude/.tmp/* | *.claude/memory/* | *.claude/review/* | *.claude/plans/*) exit 0 ;;
esac

[ -f "$file" ] || exit 0

command -v aitk >/dev/null 2>&1 || exit 0

report=$(aitk markdown audit "$file" --json 2>/dev/null)
[ -n "$report" ] || exit 0

hits=$(printf '%s' "$report" | jq -r '.entries[0].bans[]? | "\(.line): \(.kind): \(.term)"')
[ -n "$hits" ] || exit 0

msg=$(printf 'Standards-audit: markdown.md violations in %s. Rewrite or restructure (do not lazy-swap).\n%s' "$file" "$hits")

jq -nc --arg msg "$msg" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$msg}}'
