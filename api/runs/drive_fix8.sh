#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix8_checklist.md
T=("" "retry atomically claims failed push rows")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix8_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX8.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX8.base
for n in 1; do [ -f $R/FX8F${n}_build.ok ] && continue
  rm -f $R/FX8F${n}_build.done; $R/run_claude.sh FX8F$n build claude-haiku-5-5 medium $R/FX8F${n}_build.txt
  { [ ! -s $R/FX8F${n}_build.json ] || grep -q '"is_error":true' $R/FX8F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix8.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX8F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX8F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix8 $n/1: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX8F${n}_build.ok; pc "Fix8 $n/1"
done
if [ ! -f $R/FX8_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX8_full.log 2>&1 && bin/rails test >> $R/FX8_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX8_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX8_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX8_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX8.base)..HEAD and ../plan/api/runs/fix8_checklist.md (broadcast retry atomically claims failed push rows so two concurrent retry jobs never push to the same person; spec simulating two jobs). Check correctness (claim is truly atomic in Postgres, batching/paging with claims, stats still correct, crash leaves no double-push, tenant isolation) and CLEAN CODE (short, small methods, no duplication, no dead code). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Keep db/schema.rb to real changes only. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX8_review.done; $R/run_claude.sh FX8 review opus medium $R/FX8_review.txt
  { [ ! -s $R/FX8_review.json ] || grep -q '"is_error":true' $R/FX8_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix8.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX8_review_spec.log 2>&1 && bin/rails test >> $R/FX8_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX8_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix8 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX8_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX8_review.ok; pc "Fix8 review"
fi
echo ALLDONE
