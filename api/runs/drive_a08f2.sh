#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/A08f2_checklist.md
T=("" "booking checkout charges fee + deposit" "expire unpaid bookings after 15 min" "facility_booking can pay own bookings" "refunds manual (docs)" "Booking option in reconciliation filter")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules/a08-facilities.md api/usage_log.csv api/runs/A08f2_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/A08G2.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/A08G2.base
for n in 1 2 3 4 5; do [ -f $R/A08G2F${n}_build.ok ] && continue
  rm -f $R/A08G2F${n}_build.done; $R/run_claude.sh A08G2F$n build claude-haiku-5-5 medium $R/A08G2F${n}_build.txt
  { [ ! -s $R/A08G2F${n}_build.json ] || grep -q '"is_error":true' $R/A08G2F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_a08f2.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/A08G2F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (A08G2F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "A08 follow-up $n/5: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/A08G2F${n}_build.ok; pc "A08 follow-up $n/5"
done
if [ ! -f $R/A08G2_review.ok ]; then
  cd $B; bundle exec rspec > $R/A08G2_full.log 2>&1 && bin/rails test >> $R/A08G2_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (A08G2_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/A08G2_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/A08G2_review.txt <<X
Review the A08 booking follow-ups in this Rails app: /usr/bin/git diff $(cat $R/A08G2.base)..HEAD and ../plan/api/runs/A08f2_checklist.md (fee+deposit checkout, 15-min unpaid booking expiry releasing the slot, facility_booking scope can pay own bookings, manual refunds documented, Booking option in admin reconciliation filter). Check correctness (concurrency, no double charge, tenant isolation, expiry vs in-flight payment race) and CLEAN CODE (short, no duplication, small methods, nothing extra). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions beyond the plan; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/A08G2_review.done; $R/run_claude.sh A08G2 review opus medium $R/A08G2_review.txt
  { [ ! -s $R/A08G2_review.json ] || grep -q '"is_error":true' $R/A08G2_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_a08f2.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/A08G2_review_spec.log 2>&1 && bin/rails test >> $R/A08G2_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (A08G2_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "A08 follow-ups review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/A08G2_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/A08G2_review.ok; pc "A08 follow-ups review"
fi
echo ALLDONE
