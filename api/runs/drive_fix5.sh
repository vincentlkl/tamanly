#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix5_checklist.md
T=("" "remove SMS from broadcasts, default Push, drop fake 98%" "remove SMS from late-fee reminders" "remove SMS from announcements and leftovers")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix5_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX5.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX5.base
for n in 1 2 3; do [ -f $R/FX5F${n}_build.ok ] && continue
  rm -f $R/FX5F${n}_build.done; $R/run_claude.sh FX5F$n build claude-haiku-5-5 medium $R/FX5F${n}_build.txt
  { [ ! -s $R/FX5F${n}_build.json ] || grep -q '"is_error":true' $R/FX5F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix5.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX5F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX5F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix5 $n/3: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX5F${n}_build.ok; pc "Fix5 $n/3"
done
if [ ! -f $R/FX5_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX5_full.log 2>&1 && bin/rails test >> $R/FX5_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX5_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX5_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX5_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX5.base)..HEAD and ../plan/api/runs/fix5_checklist.md (removing all SMS from the backend admin since the app has no SMS: broadcasts default Push, no SMS channel in broadcasts/late-fee reminders/announcements, credits text gone, no fake 98% delivered, leftover enums/constants/seeds/i18n en+ms/helpers/specs removed, stored SMS data migrated to push or in-app). Check correctness (data migrations safe and idempotent, no broken views/forms, nothing unrelated removed, rg -i sms leftovers) and CLEAN CODE (short, no duplication, no dead code). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX5_review.done; $R/run_claude.sh FX5 review opus medium $R/FX5_review.txt
  { [ ! -s $R/FX5_review.json ] || grep -q '"is_error":true' $R/FX5_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix5.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX5_review_spec.log 2>&1 && bin/rails test >> $R/FX5_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX5_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix5 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX5_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX5_review.ok; pc "Fix5 review"
fi
echo ALLDONE
