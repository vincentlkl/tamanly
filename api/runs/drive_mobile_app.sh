#!/bin/bash -l
set -o pipefail
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
APP=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_app
P=/Users/vincent/work/ror/apps/vincent/tamanly/plan
ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
PUSH=$R/push_progress.sh
IC=$R/mobile_checklist.md
PL=$R/mobile_progress.log
HAIKU=claude-haiku-5-5
OPUS=claude-opus-5-5
GROK=grok-4.7
EFFORT=low
export PATH="/Users/vincent/Developer/flutter/bin:$PATH"

mark(){ # id status
  python3 -c '
import sys
path,pid,status=sys.argv[1:4]
out=[]
for L in open(path):
  L=L.rstrip("\n")
  if L.startswith("| "+pid+" |"):
    parts=L.split("|")
    if len(parts)>=4:
      parts[3]=" "+status+" "
      L="|".join(parts)
  out.append(L)
open(path,"w").write("\n".join(out)+"\n")
' "$IC" "$1" "$2"
}

progress(){ # pct msg
  echo "$(date '+%Y-%m-%d %H:%M %z') | $1 | $2" >> "$PL"
  python3 -c "import sys;p,a,b=sys.argv[1:4];ls=open(p).read().splitlines();open(p,'w').write('\n'.join([('Progress: %s — %s'%(a,b)) if x.startswith('Progress:') else x for x in ls])+'\n')" "$IC" "$1" "$2"
}

run_review(){ # MOD
  local MOD=$1
  cat > $R/${MOD}_review_run.txt <<X
Review Flutter module $MOD in tamanly_app.
Plan: docs/plans/mobile-app/ (matching file). Diff since base: /usr/bin/git -C $APP diff \$(cat $R/${MOD}.base)..HEAD
Fix real bugs only. Keep short/clean. No SMS. Never push. Do NOT commit (drive commits).
Run from tamanly_app: flutter analyze → No issues found!; flutter test → All tests passed!.
Budget Opus low. End with findings + test counts.
X
  rm -f $R/${MOD}_review.done
  $R/run_claude_app_retry.sh "$MOD" review "$OPUS" "$EFFORT" $R/${MOD}_review_run.txt
  if [ ! -s $R/${MOD}_review.json ] || grep -q '"is_error":true' $R/${MOD}_review.json; then
    # Opus limited → try Grok 4.7 via grok CLI if available
    echo "Opus failed/limited; trying grok-4.7" >> $R/${MOD}_review.err
    if [ -x /Users/vincent/.local/bin/grok ]; then
      (cd $APP && /Users/vincent/.local/bin/grok --prompt-file $R/${MOD}_review_run.txt -m $GROK --effort low --output-format json --permission-mode bypassPermissions --cwd $APP > $R/${MOD}_review.json 2>>$R/${MOD}_review.err) || true
      ruby $R/../log_run.rb $R/${MOD}_review.json $MOD review review $GROK low >> $R/${MOD}_review.err 2>&1 || true
    fi
  fi
  if [ ! -s $R/${MOD}_review.json ] || grep -q '"is_error":true' $R/${MOD}_review.json; then
    mark "$MOD" "HALTED review limit"
    progress "stuck" "$MOD HALTED review"
    exit 1
  fi
}

run_module(){ # MOD FILE TITLE PCT
  local MOD=$1 FILE=$2 TITLE=$3 PCT=$4
  mark "$MOD" "running"
  [ -f $R/${MOD}.base ] || /usr/bin/git -C $APP rev-parse --short HEAD > $R/${MOD}.base

  if [ ! -f $R/${MOD}_build.ok ]; then
    cat > $R/${MOD}_build.txt <<X
Implement Tamanly Flutter module $MOD ($TITLE) exactly from:
$APP/docs/plans/mobile-app/$FILE

Rules (from 00-index.md):
- cwd=$APP only. Never edit tamanly_backend/ or plan/api (except you may tick boxes + Status/Owner in this module plan file).
- Follow tasks/steps in order. Tick - [x] only after done. Set **Status:** In progress + **Owner:** haiku at start; Done when last task passes.
- Short clean code (ponytail). No SMS. No flutter pub upgrade. No packages beyond the plan.
- Never git push. Do NOT commit (drive commits).
- Every task ends green: flutter analyze → No issues found!; flutter test → All tests passed!
- Prefer fakes/fixtures; Local testing against dev server only when the plan says so.
Budget Haiku low. End with tasks done, plan fixes, open questions.
X
    rm -f $R/${MOD}_build.done
    $R/run_claude_app_retry.sh "$MOD" build "$HAIKU" "$EFFORT" $R/${MOD}_build.txt
    if [ ! -s $R/${MOD}_build.json ] || grep -q '"is_error":true' $R/${MOD}_build.json; then
      mark "$MOD" "HALTED build limit"
      progress "$PCT" "$MOD HALTED build"
      exit 1
    fi
    cd $APP
    flutter analyze > $R/${MOD}_build_analyze.log 2>&1 || { mark "$MOD" "analyze red"; progress "$PCT" "$MOD analyze red"; exit 1; }
    flutter test > $R/${MOD}_build_test.log 2>&1 || { mark "$MOD" "tests red"; progress "$PCT" "$MOD tests red"; exit 1; }
    /usr/bin/git add -A -- . ':!build' ':!.dart_tool'
    /usr/bin/git add "docs/plans/mobile-app/$FILE" 2>/dev/null || true
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$MOD: $TITLE (build)"
    touch $R/${MOD}_build.ok
    "$PUSH" || true
  fi

  if [ ! -f $R/${MOD}_review.ok ]; then
    run_review "$MOD"
    cd $APP
    flutter analyze > $R/${MOD}_review_analyze.log 2>&1 || { mark "$MOD" "analyze red after review"; exit 1; }
    flutter test > $R/${MOD}_review_test.log 2>&1 || { mark "$MOD" "tests red after review"; exit 1; }
    /usr/bin/git add -A -- . ':!build' ':!.dart_tool'
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$MOD: $TITLE (review fixes)"
    touch $R/${MOD}_review.ok
    mark "$MOD" "done"
    progress "$PCT" "$MOD $TITLE done"
    "$PUSH" || true
  else
    mark "$MOD" "done"
  fi
}

# Modules in order
run_module M01 01-foundation.md "foundation" "8%"
run_module M02 02-access.md "access" "17%"
run_module M03 03-home-directory.md "home-directory" "25%"
run_module M04 04-visitors-sos.md "visitors-sos" "33%"
run_module M05 05-guard.md "guard" "42%"
run_module M06 06-billing-payments.md "billing-payments" "50%"
run_module M07 07-permit-apply.md "permit-apply" "58%"
run_module M08 08-permit-track.md "permit-track" "67%"
run_module M09 09-facilities.md "facilities" "75%"
run_module M10 10-marketplace.md "marketplace" "83%"
run_module M11 11-notifications.md "notifications" "92%"
run_module M12 12-profile.md "profile" "100%"

progress "100%" "ALL MOBILE MODULES DONE"
echo ALL_MOBILE_DONE
