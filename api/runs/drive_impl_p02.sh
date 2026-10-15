#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
B=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
P=/Users/vincent/work/ror/apps/vincent/tamanly/plan
APP=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_app
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
CL=$R/P02_checklist.md
IC=$R/impl_checklist.md
st(){ # $1=step $2=status $3=commit
  awk -v s="$1" -v st="$2" -v c="$3" -F'|' 'BEGIN{OFS="|"} $2 ~ "^ "s" $" { $4=" "st" "; $5=" "c" "; } {print}' $CL > $CL.tmp && mv $CL.tmp $CL
}
pct(){ d=$(ls $R/P02_*.ok 2>/dev/null | wc -l | tr -d ' '); sed -i '' "s/^Progress: .*/Progress: $d\/3 steps ($((d*100\/3))%)/" $CL; }
pc(){ cd $P; /usr/bin/git add api/runs/P02_checklist.md api/runs/impl_checklist.md api/usage_log.csv api/endpoints.yml 2>/dev/null; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }

[ -f $R/P02.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/P02.base

# Step 1: Haiku build
if [ ! -f $R/P02_build.ok ]; then
  st 1 running ""
  rm -f $R/P02_build.done
  $R/run_claude_retry.sh P02 build claude-haiku-4-5 medium $R/P02_build.txt
  { [ ! -s $R/P02_build.json ] || grep -q '"is_error":true' $R/P02_build.json; } && { st 1 "HALTED limit/error" ""; exit 1; }
  cd $B
  bundle exec rspec > $R/P02_build_spec.log 2>&1 || { st 1 "specs red (P02_build_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: visitor categories (build)"
  st 1 done $(/usr/bin/git rev-parse --short HEAD)
  touch $R/P02_build.ok; pct; pc "P02 build checkpoint"
fi

# Step 2: full suite marker (already ran rspec; add minitest)
if [ ! -f $R/P02_tests.ok ]; then
  st 2 running ""
  cd $B
  bundle exec rspec > $R/P02_full.log 2>&1 && bin/rails test >> $R/P02_full.log 2>&1 || { st 2 "RED (P02_full.log)" ""; exit 1; }
  COUNTS=$(grep -E 'examples,|runs,' $R/P02_full.log | tr '\n' ' ')
  st 2 "done ($COUNTS)" ""
  touch $R/P02_tests.ok; pct; pc "P02 tests checkpoint"
fi

# Step 3: Opus review
if [ ! -f $R/P02_review.ok ]; then
  st 3 running ""
  # refresh review prompt with base
  sed -i '' "s#\$(cat ../plan/api/runs/P02.base)#$(cat $R/P02.base)#" $R/P02_review.txt 2>/dev/null || true
  cat > $R/P02_review.txt <<X
Review P02 visitor categories on feature/mobile-api: /usr/bin/git diff $(cat $R/P02.base)..HEAD and ../plan/api/plans/2026-10-15-visitor-categories.md and ../plan/api/runs/P02_checklist.md.

Check: org-owned categories; Create uses category_id + base; Contractor seeded; serializer category; GET /visitor_categories scoped; admin CRUD; no hard-delete when in use; onsite/Gate contractor filters use permit_id: present; no SMS; CLEAN CODE (short, no dead code, services hold logic).

Budget limited (Opus medium): fix real bugs only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Keep schema.rb to real changes. Do NOT push. Do NOT commit (drive commits). Only edit tamanly_backend (+ plan/api/endpoints.yml if needed). End with findings, judgement calls, test counts.
X
  rm -f $R/P02_review.done
  $R/run_claude_retry.sh P02 review claude-opus-5-5 medium $R/P02_review.txt
  { [ ! -s $R/P02_review.json ] || grep -q '"is_error":true' $R/P02_review.json; } && { st 3 "HALTED limit/error" ""; exit 1; }
  cd $B
  bundle exec rspec > $R/P02_review_spec.log 2>&1 && bin/rails test >> $R/P02_review_spec.log 2>&1 || { st 3 "RED after review" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: review fixes"
  COUNTS=$(grep -E 'examples,|runs,' $R/P02_review_spec.log | tr '\n' ' ')
  st 3 "done ($COUNTS)" $(/usr/bin/git rev-parse --short HEAD)
  touch $R/P02_review.ok; pct; pc "P02 review checkpoint"
fi

# Guide task (docs)
if [ ! -f $R/P02_guide.ok ]; then
  sed -i '' "s/^| - | Guide Task 6.*/| - | Guide Task 6 (04-visitors-sos.md) | running | |/" $CL
  # run from tamanly root so both repos visible
  (cd /Users/vincent/work/ror/apps/vincent/tamanly && /Users/vincent/.local/bin/claude -p "$(cat $R/P02_guide.txt)" --model claude-haiku-4-5 --effort medium --output-format json --dangerously-skip-permissions < /dev/null > $R/P02_guide.json 2>$R/P02_guide.err)
  ruby $P/api/log_run.rb $R/P02_guide.json P02 guide plan claude-haiku-4-5 medium >> $R/P02_guide.err 2>&1 || true
  if [ -s $R/P02_guide.json ] && ! grep -q '"is_error":true' $R/P02_guide.json; then
    if [ -d $APP/.git ]; then
      cd $APP; /usr/bin/git add docs/plans/mobile-app/04-visitors-sos.md 2>/dev/null
      /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: visitor categories guide chips"
    fi
    sed -i '' "s/^| - | Guide Task 6.*/| - | Guide Task 6 (04-visitors-sos.md) | done | |/" $CL
    touch $R/P02_guide.ok
    pc "P02 guide checkpoint"
  else
    # non-fatal for guide if limit; mark and continue
    sed -i '' "s/^| - | Guide Task 6.*/| - | Guide Task 6 (04-visitors-sos.md) | SKIPPED (limit\/error) | |/" $CL
  fi
fi

# Mark impl checklist
sed -i '' "s/^| P02 | \(.*\) | [^|]* |$/| P02 | \1 | done |/" $IC
sed -i '' "s/^Progress: .*/Progress: 1\/5 backend plans (20%) — P01 docs last/" $IC
echo P02_ALLDONE
