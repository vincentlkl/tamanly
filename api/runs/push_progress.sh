#!/bin/bash -l
# Regenerate both PROGRESS.md files, commit if changed, push app + plan + backend.
# Never force. Skip a repo if origin missing/unreachable.
set -euo pipefail
ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
APP=$ROOT/tamanly_app
PLAN=$ROOT/plan
BACKEND=$ROOT/tamanly_backend
GIT=/usr/bin/git
LOG=$ROOT/plan/api/runs/push_progress.log

log(){ echo "$(date '+%Y-%m-%d %H:%M:%S %z') $*" | tee -a "$LOG"; }

"$APP/bin/progress" | tee -a "$LOG"
"$BACKEND/bin/progress" | tee -a "$LOG"

# commit app progress
cd "$APP"
$GIT add PROGRESS.md bin/progress 2>/dev/null || true
if ! $GIT diff --cached --quiet; then
  $GIT commit -qm "Update PROGRESS.md"
  log "app: committed $($GIT rev-parse --short HEAD)"
else
  log "app: PROGRESS.md unchanged"
fi

# commit backend progress on main only
cd "$BACKEND"
$GIT checkout main >/dev/null 2>&1 || true
$GIT add PROGRESS.md bin/progress 2>/dev/null || true
if ! $GIT diff --cached --quiet; then
  $GIT commit -qm "Update PROGRESS.md"
  log "backend: committed $($GIT rev-parse --short HEAD)"
else
  log "backend: PROGRESS.md unchanged"
fi

# commit plan script changes if any (push_progress / drive hooks only — caller may have more)
cd "$PLAN"
$GIT add api/runs/push_progress.sh api/runs/drive_impl_remaining.sh api/runs/impl_checklist.md api/runs/impl_progress.log 2>/dev/null || true
if ! $GIT diff --cached --quiet; then
  $GIT commit -qm "Update push_progress / impl pause note"
  log "plan: committed $($GIT rev-parse --short HEAD)"
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
# main only — do not push feature/mobile-api (Vincent 2026-10-15)
log "done"
