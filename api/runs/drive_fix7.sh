#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix7_checklist.md
T=("" "track per-person broadcast push results" "retry pushes only to failed recipients")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix7_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX7.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX7.base
for n in 1 2; do [ -f $R/FX7F${n}_build.ok ] && continue
  rm -f $R/FX7F${n}_build.done; $R/run_claude.sh FX7F$n build claude-haiku-5-5 medium $R/FX7F${n}_build.txt
  { [ ! -s $R/FX7F${n}_build.json ] || grep -q '"is_error":true' $R/FX7F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix7.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX7F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX7F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix7 $n/2: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX7F${n}_build.ok; pc "Fix7 $n/2"
done
if [ ! -f $R/FX7_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX7_full.log 2>&1 && bin/rails test >> $R/FX7_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX7_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX7_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX7_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX7.base)..HEAD and ../plan/api/runs/fix7_checklist.md (per-person push result tracked per broadcast; retry resends only to failed recipients with no duplicate inbox rows; delivery stats derived from real results). Check correctness (exactly-once under concurrent retry/batches, stats correct across batches and retries, opted-out/no-device people handled, migration/index, tenant isolation) and CLEAN CODE (short, no duplication, small methods, no dead code). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Keep db/schema.rb to real changes only. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX7_review.done; $R/run_claude.sh FX7 review opus medium $R/FX7_review.txt
  { [ ! -s $R/FX7_review.json ] || grep -q '"is_error":true' $R/FX7_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix7.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX7_review_spec.log 2>&1 && bin/rails test >> $R/FX7_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX7_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix7 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX7_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX7_review.ok; pc "Fix7 review"
fi
echo ALLDONE
