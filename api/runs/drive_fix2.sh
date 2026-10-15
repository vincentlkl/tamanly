#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable; CL=$R/fix2_checklist.md
T=("" "cap unpaid booking window at 15 min, release pending payment" "bookings.user_id; facility_booking pays own only" "payment window from approval + notify booker" "deposit-only bookings require online payment" "FCM PushSender, BroadcastPushJob, in-app notifications")
st(){ sed -i '' "s/^| $1 | \(.*\) | [^|]* | [^|]* |$/| $1 | \1 | $2 | $3 |/" $CL; }
pc(){ cd $P; /usr/bin/git add api/modules api/usage_log.csv api/runs/fix2_checklist.md; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
[ -f $R/FX2.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/FX2.base
for n in 1 2 3 4 5; do [ -f $R/FX2F${n}_build.ok ] && continue
  rm -f $R/FX2F${n}_build.done; $R/run_claude.sh FX2F$n build claude-haiku-5-5 medium $R/FX2F${n}_build.txt
  { [ ! -s $R/FX2F${n}_build.json ] || grep -q '"is_error":true' $R/FX2F${n}_build.json; } && { st $n "HALTED (limit), partial uncommitted; rerun drive_fix2.sh" ""; exit 1; }
  cd $B; bundle exec rspec > $R/FX2F${n}_spec.log 2>&1 || { st $n "specs red, uncommitted (FX2F${n}_spec.log)" ""; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix2 $n/5: ${T[$n]}"
  st $n done $(/usr/bin/git rev-parse --short HEAD); touch $R/FX2F${n}_build.ok; pc "Fix2 $n/5"
done
if [ ! -f $R/FX2_review.ok ]; then
  cd $B; bundle exec rspec > $R/FX2_full.log 2>&1 && bin/rails test >> $R/FX2_full.log 2>&1 || { sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | RED (FX2_full.log) | |/" $CL; exit 1; }
  sed -i '' "s/^| - | Full rspec + minitest | .*/| - | Full rspec + minitest | done ($(grep -E 'examples,|runs,' $R/FX2_full.log | tr '\n' ' ')) | |/" $CL
  cat > $R/FX2_review.txt <<X
Review the fix batch in this Rails app: /usr/bin/git diff $(cat $R/FX2.base)..HEAD and ../plan/api/runs/fix2_checklist.md (unpaid booking window capped at 15 min releasing pending payment via Payments::Release; bookings.user_id with facility_booking paying own bookings only; payment window from approval + booker notified; deposit-only bookings payable online; FCM HTTP v1 PushSender, token pruning, BroadcastPushJob batches/retries/counts, in-app notification rows honouring preferences, no secrets in code, FCM stubbed in specs). Check correctness (concurrency, settle-vs-release race, no double charge, tenant isolation, authz) and CLEAN CODE (short, no duplication, small methods, nothing extra). Budget limited: fix real issues only, with specs. Run PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable bundle exec rspec and bin/rails test until green. No product decisions beyond the plan; list judgement calls. Do NOT commit or push. Only edit tamanly_backend. End with findings, judgement calls, test counts.
X
  rm -f $R/FX2_review.done; $R/run_claude.sh FX2 review opus medium $R/FX2_review.txt
  { [ ! -s $R/FX2_review.json ] || grep -q '"is_error":true' $R/FX2_review.json; } && { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | HALTED (limit); rerun drive_fix2.sh | |/" $CL; exit 1; }
  cd $B; bundle exec rspec > $R/FX2_review_spec.log 2>&1 && bin/rails test >> $R/FX2_review_spec.log 2>&1 || { sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | RED after review (FX2_review_spec.log) | |/" $CL; exit 1; }
  /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "Fix2 review fixes"
  sed -i '' "s/^| - | Opus medium review + fixes | .*/| - | Opus medium review + fixes | done ($(grep -E 'examples,|runs,' $R/FX2_review_spec.log | tr '\n' ' ')) | $(/usr/bin/git rev-parse --short HEAD) |/" $CL
  touch $R/FX2_review.ok; pc "Fix2 review"
fi
echo ALLDONE
