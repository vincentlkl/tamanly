#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix4_checklist.md
T=("" "recipient_count counts push or inbox recipients" "auto-cancel minutes limited to 1..1440" "remove SMS credit check and SMS flash text")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix4_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX4.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX4.base
for n in 1 2 3; do [ -f $R/FX4F${n}_build.ok ] && continue
  rm -f $R/FX4F${n}_build.done; $R/run_claude.sh FX4F$n build claude-haiku-5-5 medium $R/FX4F${n}_build.txt
  { [ ! -s $R/FX4F${n}_build.json ] || grep -q '"is_error":true' $R/FX4F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix4.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX4F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX4F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix4 $n/3: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX4F${n}_build.ok; pc "Fix4 $n/3"
done
if [ ! -f $R/FX4_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX4_full.log 2>&1 && bin/rails test >> $R/FX4_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX4_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX4_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX4_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX4.base)..HEAD and ../plan/api/runs/fix4_checklist.md (broadcast recipient_count counts every distinct person receiving push or inbox row; booking auto-cancel minutes validated 1..1440 with en/ms messages and form min/max; SMS credit check and SMS flash text removed since the app has no SMS). Check correctness (no regressions to admin broadcast/invoice flows, nothing unrelated removed, counts correct across batches) and CLEAN CODE (short, no duplication, small methods, no dead code left behind). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX4_review.done; $R/run_claude.sh FX4 review opus medium $R/FX4_review.txt
  { [ ! -s $R/FX4_review.json ] || grep -q '"is_error":true' $R/FX4_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix4.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX4_review_spec.log 2>&1 && bin/rails test >> $R/FX4_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX4_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix4 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX4_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX4_review.ok; pc "Fix4 review"
fi
echo ALLDONE
