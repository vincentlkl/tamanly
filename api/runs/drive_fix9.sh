#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix9_checklist.md
T=("" "retry reclaims stale pending push rows")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix9_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX9.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX9.base
for n in 1; do [ -f $R/FX9F${n}_build.ok ] && continue
  rm -f $R/FX9F${n}_build.done; $R/run_claude.sh FX9F$n build claude-haiku-5-5 medium $R/FX9F${n}_build.txt
  { [ ! -s $R/FX9F${n}_build.json ] || grep -q '"is_error":true' $R/FX9F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix9.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX9F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX9F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix9 $n/1: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX9F${n}_build.ok; pc "Fix9 $n/1"
done
if [ ! -f $R/FX9_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX9_full.log 2>&1 && bin/rails test >> $R/FX9_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX9_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX9_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX9_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX9.base)..HEAD and ../plan/api/runs/fix9_checklist.md (retry also reclaims push rows stuck pending > 10 min, via the same safe outer-check UPDATE as fix8, window in a constant; specs for stale vs fresh pending). Check correctness (claim still atomic under concurrency incl. re-check of the staleness condition and timestamp bump, in-flight first-send rows not stolen, retry gating allows stale-only broadcasts, stats correct) and CLEAN CODE (short, small methods, no duplication, no dead code). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. Keep db/schema.rb to real changes only. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX9_review.done; $R/run_claude.sh FX9 review opus medium $R/FX9_review.txt
  { [ ! -s $R/FX9_review.json ] || grep -q '"is_error":true' $R/FX9_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix9.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX9_review_spec.log 2>&1 && bin/rails test >> $R/FX9_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX9_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix9 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX9_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX9_review.ok; pc "Fix9 review"
fi
echo ALLDONE
