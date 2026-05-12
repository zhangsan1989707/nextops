#!/bin/zsh
set -euo pipefail

WORKSPACE="${NEXTOPS_WORKSPACE:-/Users/leohang/project/nextops}"
CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"
PROMPT_FILE="${NEXTOPS_PROMPT_FILE:-$WORKSPACE/automation/nightly-codex-prompt.md}"
LOG_DIR="${NEXTOPS_LOG_DIR:-$WORKSPACE/logs/nightly-codex}"
LOCK_DIR="${NEXTOPS_LOCK_DIR:-/tmp/nextops-nightly-codex.lock}"
RUN_ID="$(date '+%Y%m%d-%H%M%S')"
RUN_LOG="$LOG_DIR/run-$RUN_ID.log"
LAST_MESSAGE="$LOG_DIR/last-message-$RUN_ID.md"

mkdir -p "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$RUN_LOG"
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Another nightly Codex run is already active: $LOCK_DIR"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

if [ ! -x "$CODEX_BIN" ]; then
  log "Codex CLI not found or not executable: $CODEX_BIN"
  exit 1
fi

if [ ! -d "$WORKSPACE/.git" ]; then
  log "Workspace is not a git repository: $WORKSPACE"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  log "Prompt file not found: $PROMPT_FILE"
  exit 1
fi

cd "$WORKSPACE"

log "Nightly Codex run started"
log "Workspace: $WORKSPACE"
log "Codex: $($CODEX_BIN --version 2>/dev/null || echo unknown)"
log "Prompt: $PROMPT_FILE"

if git diff --quiet && git diff --cached --quiet; then
  log "Git worktree is clean"
else
  log "Git worktree has existing changes; Codex will be instructed not to overwrite user work"
  git status --short | tee -a "$RUN_LOG"
fi

export NEXTOPS_NIGHTLY_RUN_ID="$RUN_ID"
export NEXTOPS_NIGHTLY_LOG="$RUN_LOG"

CODEX_COMMAND=(
  "$CODEX_BIN"
  exec
  --cd "$WORKSPACE"
  --sandbox danger-full-access
  --ask-for-approval never
  --dangerously-bypass-approvals-and-sandbox
  --output-last-message "$LAST_MESSAGE"
  -
)

log "Starting Codex non-interactive run"

{
  cat "$PROMPT_FILE"
  printf '\n\n本次运行上下文：\n'
  printf -- '- 当前时间：%s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf -- '- 日志文件：%s\n' "$RUN_LOG"
  printf -- '- 最终消息文件：%s\n' "$LAST_MESSAGE"
  printf -- '- 如需记录阻塞、取舍或未完成事项，请写入最终消息。\n'
} | /usr/bin/caffeinate -dimsu "${CODEX_COMMAND[@]}" 2>&1 | tee -a "$RUN_LOG"

CODEX_STATUS=${pipestatus[2]:-0}
log "Codex exited with status: $CODEX_STATUS"

log "Final git status:"
git status --short | tee -a "$RUN_LOG"

if [ "${NEXTOPS_PUSH:-0}" = "1" ]; then
  log "NEXTOPS_PUSH=1; pushing current branch"
  git push 2>&1 | tee -a "$RUN_LOG"
fi

log "Nightly Codex run finished"
exit "$CODEX_STATUS"
