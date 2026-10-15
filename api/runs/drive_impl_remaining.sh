#!/bin/bash -l
set -o pipefail
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
B=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
P=/Users/vincent/work/ror/apps/vincent/tamanly/plan
APP=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_app
ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
IC=$R/impl_checklist.md
PL=$R/impl_progress.log
PUSH=$R/push_progress.sh
HAIKU=claude-haiku-5-5
SONNET=claude-sonnet-5-5
OPUS=claude-opus-5-5
# effort: low for build+review (Vincent 2026-10-15). Work on backend main only.

mark_plan(){ # id status
  python3 -c '
import sys
path, pid, status = sys.argv[1:4]
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

progress(){ # pct plan commits tests cost
  echo "$(date '+%Y-%m-%d %H:%M %Z') | $1 | $2 | $3 | $4 | $5" >> "$PL"
  # also refresh overall Progress line on checklist
  python3 -c "import sys;p,a,b=sys.argv[1:4];ls=open(p).read().splitlines();open(p,'w').write('\n'.join([('Progress: %s — %s'%(a,b)) if x.startswith('Progress:') else x for x in ls])+'\n')" "$IC" "$1" "$2"
}

pc_plan(){ # msg
  cd "$P"
  /usr/bin/git add api/runs/impl_checklist.md api/runs/impl_progress.log api/usage_log.csv api/endpoints.yml api/README.md 2>/dev/null
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"
}

cost_since(){ python3 /Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs/cost_since.py "$1"; }

run_backend_module(){
  /usr/bin/git -C $B checkout main >/dev/null 2>&1 || true
  # $1=MOD $2=label $3=pct_after $4=build_prompt $5=review_prompt $6=commit_msg_prefix
  local MOD=$1 LABEL=$2 PCT=$3 BUILD=$4 REVIEW=$5 CMSG=$6
  mark_plan "$MOD" "running"
  [ -f $R/${MOD}.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/${MOD}.base

  if [ ! -f $R/${MOD}_build.ok ]; then
    rm -f $R/${MOD}_build.done
    $R/run_claude_retry.sh "$MOD" build "$HAIKU" low "$BUILD"
    if [ ! -s $R/${MOD}_build.json ] || grep -q '"is_error":true' $R/${MOD}_build.json; then
      mark_plan "$MOD" "HALTED build limit/error"
      progress "$PCT" "$LABEL HALTED build" "-" "-" "-"
      exit 1
    fi
    cd $B
    bundle exec rspec > $R/${MOD}_build_spec.log 2>&1
    if [ $? -ne 0 ]; then
      # one Haiku rescue pass for red specs
      cat > $R/${MOD}_specfix.txt <<X
$COMMON_FIX
Module $MOD specs are red. Log: ../plan/api/runs/${MOD}_build_spec.log
Fix until green. Plan: see matching 2026-10-15 plan under ../plan/api/plans/.
Do NOT commit/push. Run: PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec (full) until green if feasible, else targeted then note.
X
      $R/run_claude_retry.sh "$MOD" specfix "$HAIKU" low $R/${MOD}_specfix.txt
      if [ ! -s $R/${MOD}_specfix.json ] || grep -q '"is_error":true' $R/${MOD}_specfix.json; then
        mark_plan "$MOD" "HALTED specfix limit"
        exit 1
      fi
      cd $B
      bundle exec rspec > $R/${MOD}_build_spec.log 2>&1 || { mark_plan "$MOD" "specs red"; progress "$PCT" "$LABEL specs red" "-" "-" "-"; exit 1; }
    fi
    /usr/bin/git add -A -- . ':!bun.lock'
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$CMSG (build)"
    touch $R/${MOD}_build.ok
    pc_plan "$MOD build checkpoint"
    "$PUSH" || true
  fi

  if [ ! -f $R/${MOD}_tests.ok ]; then
    cd $B
    bundle exec rspec > $R/${MOD}_full.log 2>&1
    RSPEC=$?
    bin/rails test >> $R/${MOD}_full.log 2>&1
    MINITEST=$?
    if [ $RSPEC -ne 0 ] || [ $MINITEST -ne 0 ]; then
      mark_plan "$MOD" "RED full suite"
      progress "$PCT" "$LABEL RED suite" "$(/usr/bin/git -C $B rev-parse --short HEAD)" "see ${MOD}_full.log" "-"
      exit 1
    fi
    touch $R/${MOD}_tests.ok
    pc_plan "$MOD tests checkpoint"
  fi

  if [ ! -f $R/${MOD}_review.ok ]; then
    BASE=$(cat $R/${MOD}.base)
    cat > $R/${MOD}_review_run.txt <<X
Review $LABEL on feature/mobile-api.
Diff: /usr/bin/git diff ${BASE}..HEAD
Plan: ../plan/api/plans/ (matching 2026-10-15 file) and ../plan/api/runs/impl_checklist.md
$(cat "$REVIEW" | tail -n +1)
Budget Sonnet low: fix real bugs only with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Do NOT commit or push. Only edit tamanly_backend (+ plan/api/endpoints.yml/README if needed). End with findings, judgement calls, test counts.
X
    rm -f $R/${MOD}_review.done
    $R/run_claude_retry.sh "$MOD" review "$SONNET" low $R/${MOD}_review_run.txt
    if [ ! -s $R/${MOD}_review.json ] || grep -q '"is_error":true' $R/${MOD}_review.json; then
      mark_plan "$MOD" "HALTED review limit"
      exit 1
    fi
    cd $B
    bundle exec rspec > $R/${MOD}_review_spec.log 2>&1
    RSPEC=$?
    bin/rails test >> $R/${MOD}_review_spec.log 2>&1
    MINITEST=$?
    if [ $RSPEC -ne 0 ] || [ $MINITEST -ne 0 ]; then
      mark_plan "$MOD" "RED after review"
      exit 1
    fi
    /usr/bin/git add -A -- . ':!bun.lock'
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$CMSG (review fixes)"
    touch $R/${MOD}_review.ok
    pc_plan "$MOD review checkpoint"
    "$PUSH" || true
  fi

  local HEAD=$(/usr/bin/git -C $B rev-parse --short HEAD)
  local BASE=$(cat $R/${MOD}.base)
  local COMMITS=$(/usr/bin/git -C $B log --oneline ${BASE}..HEAD | tr '\n' '; ')
  local TESTS=$(grep -E 'examples,|runs,' $R/${MOD}_review_spec.log 2>/dev/null | tr '\n' ' ')
  [ -z "$TESTS" ] && TESTS=$(grep -E 'examples,|runs,' $R/${MOD}_full.log 2>/dev/null | tr '\n' ' ')
  local COST=$(cost_since "$MOD")
  mark_plan "$MOD" "done"
  progress "$PCT" "$LABEL done" "$COMMITS" "$TESTS" "$COST"
  pc_plan "$MOD done"
}

COMMON_FIX='cwd=tamanly_backend. Short clean fixes only. No SMS. Never push. Do NOT commit.'

# ===== modules =====
# P04
run_backend_module P04 "P04 walk-in notify" "33%" "$R/P04_build.txt" "$R/P04_review.txt" "P04: walk-in host notify"

# A11
run_backend_module A11 "P05-A11 guard permit csv" "50%" "$R/A11_build.txt" "$R/A11_review.txt" "A11: guard permit show/deny + gate CSV"

# P03
run_backend_module P03 "P03 org booking limit" "67%" "$R/P03_build.txt" "$R/P03_review.txt" "P03: org booking limit"

# A12
run_backend_module A12 "P05-A12 billing access refund" "80%" "$R/A12_build.txt" "$R/A12_review.txt" "A12: statement PDF, access requests, refund account"

# A13
run_backend_module A13 "P05-A13 incidents+listings" "90%" "$R/A13_build.txt" "$R/A13_review.txt" "A13: incidents + listing photos/kind/condition"

# P01 docs
mark_plan P01 "running"
if [ ! -f $R/P01_build.ok ]; then
  (cd $ROOT && /Users/vincent/.local/bin/claude -p "$(cat $R/P01_build.txt)" --model $HAIKU --effort low --output-format json --dangerously-skip-permissions < /dev/null > $R/P01_build.json 2>$R/P01_build.err)
  ruby $P/api/log_run.rb $R/P01_build.json P01 build plan $HAIKU low >> $R/P01_build.err 2>&1 || true
  if [ ! -s $R/P01_build.json ] || grep -q '"is_error":true' $R/P01_build.json; then
    # limit wait loop
    while :; do
      sleep 900
      /Users/vincent/.local/bin/claude -p "ok" --model $HAIKU --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break
    done
    (cd $ROOT && /Users/vincent/.local/bin/claude -p "$(cat $R/P01_build.txt)" --model $HAIKU --effort low --output-format json --dangerously-skip-permissions < /dev/null > $R/P01_build.json 2>$R/P01_build.err)
    ruby $P/api/log_run.rb $R/P01_build.json P01 build plan $HAIKU low >> $R/P01_build.err 2>&1 || true
  fi
  cd $P
  /usr/bin/git add storyboard api/plans 2>/dev/null
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P01: invite-only storyboard/docs - plan"
  if [ -d $APP/.git ]; then
    cd $APP
    /usr/bin/git add docs/plans/mobile-app 2>/dev/null
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P01: invite-only access guides"
  fi
  touch $R/P01_build.ok
  "$PUSH" || true
fi
if [ ! -f $R/P01_review.ok ]; then
  (cd $ROOT && /Users/vincent/.local/bin/claude -p "$(cat $R/P01_review.txt)" --model $SONNET --effort low --output-format json --dangerously-skip-permissions < /dev/null > $R/P01_review.json 2>$R/P01_review.err)
  ruby $P/api/log_run.rb $R/P01_review.json P01 review plan $SONNET low >> $R/P01_review.err 2>&1 || true
  if [ -s $R/P01_review.json ] && ! grep -q '"is_error":true' $R/P01_review.json; then
    cd $P
    /usr/bin/git add storyboard api/plans 2>/dev/null
    /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P01: review doc fixes - plan"
    if [ -d $APP/.git ]; then
      cd $APP
      /usr/bin/git add docs/plans/mobile-app 2>/dev/null
      /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P01: review guide fixes"
    fi
    touch $R/P01_review.ok
    "$PUSH" || true
  fi
fi
COST01=$(cost_since P01)
mark_plan P01 "done"
progress "100%" "P01 invite-only docs done" "see plan+app commits" "docs only" "$COST01"
pc_plan "P01 done"

# Final full suite sanity
cd $B
bundle exec rspec > $R/ALL_final.log 2>&1
RSPEC=$?
bin/rails test >> $R/ALL_final.log 2>&1
MINITEST=$?
TESTS=$(grep -E 'examples,|runs,' $R/ALL_final.log | tr '\n' ' ')
if [ $RSPEC -ne 0 ] || [ $MINITEST -ne 0 ]; then
  progress "100%" "FINAL SUITE RED" "$(/usr/bin/git -C $B rev-parse --short HEAD)" "$TESTS" "-"
  echo FINAL_RED
  exit 1
fi
progress "100%" "ALL PLANS DONE" "$(/usr/bin/git -C $B log --oneline b1ea6f1..HEAD | wc -l | tr -d ' ') commits since P02" "$TESTS" "see usage_log"
echo ALL_PLANS_DONE
