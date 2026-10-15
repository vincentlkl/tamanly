#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix6_checklist.md
T=("" "no made-up delivered % on broadcast retry" "validate announcement channels")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix6_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX6.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX6.base
for n in 1 2; do [ -f $R/FX6F${n}_build.ok ] && continue
  rm -f $R/FX6F${n}_build.done; $R/run_claude.sh FX6F$n build claude-haiku-5-5 medium $R/FX6F${n}_build.txt
  { [ ! -s $R/FX6F${n}_build.json ] || grep -q '"is_error":true' $R/FX6F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix6.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX6F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX6F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix6 $n/2: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX6F${n}_build.ok; pc "Fix6 $n/2"
done
if [ ! -f $R/FX6_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX6_full.log 2>&1 && bin/rails test >> $R/FX6_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX6_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX6_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX6_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX6.base)..HEAD and ../plan/api/runs/fix6_checklist.md (broadcast retry no longer fakes 96% delivered, stats only from real results; announcement channels validated against the allowed list with en/ms messages). Check correctness (retry flow still works and records real counts, no double send, existing announcements still valid, API and admin paths) and CLEAN CODE (short, no duplication, no dead code). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX6_review.done; $R/run_claude.sh FX6 review opus medium $R/FX6_review.txt
  { [ ! -s $R/FX6_review.json ] || grep -q '"is_error":true' $R/FX6_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix6.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX6_review_spec.log 2>&1 && bin/rails test >> $R/FX6_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX6_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix6 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX6_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX6_review.ok; pc "Fix6 review"
fi
echo ALLDONE
