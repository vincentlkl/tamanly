#!/bin/bash -l
# Regenerate PROGRESS.md, commit in tamanly_app if changed, push app + plan.
# Never force. Skip backend if no remote. Safe to call after each build/review commit.
set -euo pipefail
ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
APP=$ROOT/tamanly_app
PLAN=$ROOT/plan
BACKEND=$ROOT/tamanly_backend
GIT=/usr/bin/git
LOG=$ROOT/plan/api/runs/push_progress.log

log(){ echo "$(date '+%Y-%m-%d %H:%M:%S %z') $*" | tee -a "$LOG"; }

# 1) regenerate
"$APP/bin/progress" | tee -a "$LOG"

# 2) commit PROGRESS.md (+ bin/progress) in app if changed
cd "$APP"
$GIT add PROGRESS.md bin/progress 2>/dev/null || true
if ! $GIT diff --cached --quiet; then
  $GIT commit -qm "Update PROGRESS.md"
  log "app: committed PROGRESS.md $($GIT rev-parse --short HEAD)"
else
  log "app: PROGRESS.md unchanged"
fi

push_branch(){
  local repo=$1 name=$2
  cd "$repo"
  local branch
  branch=$($GIT rev-parse --abbrev-ref HEAD)
  if ! $GIT remote get-url origin >/dev/null 2>&1; then
    log "$name: SKIP no origin remote (branch $branch)"
    return 0
  fi
  if ! $GIT ls-remote --heads origin >/dev/null 2>&1; then
    log "$name: SKIP origin auth/unreachable"
    return 1
  fi
  # normal push; set upstream on first push
  if $GIT rev-parse --abbrev-ref "@{u}" >/dev/null 2>&1; then
    $GIT push origin HEAD 2>&1 | tee -a "$LOG"
  else
    $GIT push -u origin HEAD 2>&1 | tee -a "$LOG"
  fi
  log "$name: pushed $branch $($GIT rev-parse --short HEAD)"
}

push_branch "$APP" "tamanly_app"
push_branch "$PLAN" "plan"
push_branch "$BACKEND" "tamanly_backend"
log "done"
