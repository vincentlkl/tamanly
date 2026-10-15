#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix3_checklist.md
T=("" "per-property booking auto-cancel minutes" "recurring job sends scheduled broadcasts once" "announcement push off still creates inbox row" "broadcast recipient_count counts people")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix3_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX3.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX3.base
for n in 1 2 3 4; do [ -f $R/FX3F${n}_build.ok ] && continue
  rm -f $R/FX3F${n}_build.done; $R/run_claude.sh FX3F$n build claude-haiku-5-5 medium $R/FX3F${n}_build.txt
  { [ ! -s $R/FX3F${n}_build.json ] || grep -q '"is_error":true' $R/FX3F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix3.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX3F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX3F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix3 $n/4: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX3F${n}_build.ok; pc "Fix3 $n/4"
done
if [ ! -f $R/FX3_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX3_full.log 2>&1 && bin/rails test >> $R/FX3_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX3_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX3_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX3_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX3.base)..HEAD and ../plan/api/runs/fix3_checklist.md (per-property booking auto-cancel minutes default 15 covering unpaid and never-approved bookings, editable in admin property settings, used by the expiry job; recurring every-minute job sending due scheduled broadcasts exactly once via BroadcastPushJob; announcement push opt-out still creates in-app inbox rows; broadcast recipient_count counts distinct users not devices). Check correctness (concurrency/exactly-once, settle-vs-release race, tenant isolation, admin authz, validation) and CLEAN CODE (short, no duplication, small methods, nothing extra). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions beyond the plan; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX3_review.done; $R/run_claude.sh FX3 review opus medium $R/FX3_review.txt
  { [ ! -s $R/FX3_review.json ] || grep -q '"is_error":true' $R/FX3_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix3.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX3_review_spec.log 2>&1 && bin/rails test >> $R/FX3_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX3_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix3 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX3_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX3_review.ok; pc "Fix3 review"
fi
echo ALLDONE
