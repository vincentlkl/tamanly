#!/bin/bash -l
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
T=("" "facilities (list, show, availability)" "bookings (create, list, show, cancel)")
for g in 1 2; do
  [ -f $R/A08G${g}_build.done ] && continue
  $R/run_claude.sh A08G$g build claude-haiku-5-5 medium $R/A08G${g}_build.txt
  grep -q '"is_error":true' $R/A08G${g}_build.json || [ ! -s $R/A08G${g}_build.json ] && { echo "HALT G$g (limit/error)"; exit 1; }
  cd $B
  if bundle exec rspec > $R/A08G${g}_spec.log 2>&1 && bin/rails test >> $R/A08G${g}_spec.log 2>&1; then
    /usr/bin/git add -A -- . ':!bun.lock' && /usr/bin/git commit -qm "Mobile API A08: ${T[$g]}" && echo "COMMIT G$g $(/usr/bin/git rev-parse --short HEAD)"
  else echo "RED G$g"; exit 1; fi
done
echo ALLDONE
