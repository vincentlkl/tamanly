#!/bin/bash -l
set -o pipefail
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
B=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
P=/Users/vincent/work/ror/apps/vincent/tamanly/plan
APP=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_app
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
CL=$R/P02_checklist.md
IC=$R/impl_checklist.md

st(){
  python3 -c '
import sys
path, step, status, commit = sys.argv[1:5]
out=[]
for L in open(path):
    L=L.rstrip("\n")
    if L.startswith("| "+step+" |"):
        parts=L.split("|")
        # ["", " 1 ", " item ", " status ", " commit ", ""]
        if len(parts)>=5:
            parts[3]=" "+status+" "
            parts[4]=" "+commit+" "
            L="|".join(parts)
    out.append(L)
open(path,"w").write("\n".join(out)+"\n")
' "$CL" "$1" "$2" "$3"
}
pct(){
  d=$(ls $R/P02_build.ok $R/P02_specfix.ok $R/P02_tests.ok $R/P02_review.ok 2>/dev/null | wc -l | tr -d " ")
  pctn=$((d * 100 / 4))
  sed -i "" "s/^Progress: .*/Progress: ${d}\/4 steps (${pctn}%)/" $CL
}
pc(){
  cd "$P"
  /usr/bin/git add api/runs/P02_checklist.md api/runs/impl_checklist.md api/usage_log.csv api/endpoints.yml 2>/dev/null
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"
}

[ -f $R/P02.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/P02.base
touch $R/P02_build.ok
st 1 "done (uncommitted; 13 specs red)" ""

# Step 1b: spec fix
if [ ! -f $R/P02_specfix.ok ]; then
  st 1b running ""
  rm -f $R/P02_specfix.done
  $R/run_claude_retry.sh P02 specfix claude-haiku-5-5 medium $R/P02_specfix.txt
  if [ ! -s $R/P02_specfix.json ] || grep -q '"is_error":true' $R/P02_specfix.json; then
    st 1b "HALTED limit/error" ""
    exit 1
  fi
  cd $B
  bundle exec rspec spec/requests/api/v1/visitor_passes_spec.rb spec/requests/api/v1/visitor_categories_spec.rb > $R/P02_specfix_spec.log 2>&1
  if [ $? -ne 0 ]; then
    st 1b "specs still red (P02_specfix_spec.log)" ""
    exit 1
  fi
  /usr/bin/git add -A -- . ":!bun.lock"
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: visitor categories"
  st 1b done "$(/usr/bin/git rev-parse --short HEAD)"
  touch $R/P02_specfix.ok
  pct
  pc "P02 build+specfix checkpoint"
fi

# Step 2: full suite
if [ ! -f $R/P02_tests.ok ]; then
  st 2 running ""
  cd $B
  bundle exec rspec > $R/P02_full.log 2>&1
  RSPEC=$?
  bin/rails test >> $R/P02_full.log 2>&1
  MINITEST=$?
  if [ $RSPEC -ne 0 ] || [ $MINITEST -ne 0 ]; then
    st 2 "RED (P02_full.log)" ""
    exit 1
  fi
  COUNTS=$(grep -E "examples,|runs," $R/P02_full.log | tr "\n" " ")
  st 2 "done ($COUNTS)" ""
  touch $R/P02_tests.ok
  pct
  pc "P02 tests checkpoint"
fi

# Step 3: Opus review
if [ ! -f $R/P02_review.ok ]; then
  st 3 running ""
  cat > $R/P02_review.txt <<X
Review P02 visitor categories on feature/mobile-api: /usr/bin/git diff $(cat $R/P02.base)..HEAD and ../plan/api/plans/2026-10-15-visitor-categories.md and ../plan/api/runs/P02_checklist.md.

Check: org-owned categories; Create uses category_id + base; Contractor seeded; serializer category; GET /visitor_categories scoped; admin CRUD; no hard-delete when in use; onsite/Gate contractor filters use permit_id: present; no SMS; CLEAN CODE (short, no dead code, services hold logic).

Budget limited (Opus medium): fix real bugs only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Keep schema.rb to real changes. Do NOT push. Do NOT commit (drive commits). Only edit tamanly_backend (+ plan/api/endpoints.yml if needed). End with findings, judgement calls, test counts.
X
  rm -f $R/P02_review.done
  $R/run_claude_retry.sh P02 review claude-opus-5-5 medium $R/P02_review.txt
  if [ ! -s $R/P02_review.json ] || grep -q '"is_error":true' $R/P02_review.json; then
    st 3 "HALTED limit/error" ""
    exit 1
  fi
  cd $B
  bundle exec rspec > $R/P02_review_spec.log 2>&1
  RSPEC=$?
  bin/rails test >> $R/P02_review_spec.log 2>&1
  MINITEST=$?
  if [ $RSPEC -ne 0 ] || [ $MINITEST -ne 0 ]; then
    st 3 "RED after review" ""
    exit 1
  fi
  /usr/bin/git add -A -- . ":!bun.lock"
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: review fixes"
  COUNTS=$(grep -E "examples,|runs," $R/P02_review_spec.log | tr "\n" " ")
  st 3 "done ($COUNTS)" "$(/usr/bin/git rev-parse --short HEAD)"
  touch $R/P02_review.ok
  pct
  pc "P02 review checkpoint"
fi

# Guide task (docs) — non-blocking on limit
if [ ! -f $R/P02_guide.ok ]; then
  st - "Guide Task 6 running" ""
  (cd /Users/vincent/work/ror/apps/vincent/tamanly && /Users/vincent/.local/bin/claude -p "$(cat $R/P02_guide.txt)" --model claude-haiku-5-5 --effort medium --output-format json --dangerously-skip-permissions < /dev/null > $R/P02_guide.json 2>$R/P02_guide.err) || true
  ruby $P/api/log_run.rb $R/P02_guide.json P02 guide plan claude-haiku-5-5 medium >> $R/P02_guide.err 2>&1 || true
  if [ -s $R/P02_guide.json ] && ! grep -q '"is_error":true' $R/P02_guide.json; then
    if [ -d $APP/.git ]; then
      cd $APP
      /usr/bin/git add docs/plans/mobile-app/04-visitors-sos.md 2>/dev/null
      /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "P02: visitor categories guide chips"
    fi
    st - "Guide Task 6 done" ""
    touch $R/P02_guide.ok
    pc "P02 guide checkpoint"
  else
    st - "Guide Task 6 SKIPPED limit/error" ""
  fi
fi

sed -i "" "s/^| P02 | \(.*\) | [^|]* |\$/| P02 | \1 | done |/" $IC
sed -i "" "s/^Progress: .*/Progress: 1\/5 backend plans (20%) — P01 docs last/" $IC
echo P02_ALLDONE
