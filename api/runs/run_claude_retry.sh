#!/bin/bash -l
# usage: run_claude_retry.sh MOD ROLE MODEL EFFORT PROMPTFILE
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
CLAUDE=/Users/vincent/.local/bin/claude
B=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
MOD=$1; ROLE=$2; MODEL=$3; EFFORT=$4; PROMPT=$5
while :; do
  (cd $B && $CLAUDE -p "$(cat $PROMPT)" --model $MODEL --effort $EFFORT --output-format json --dangerously-skip-permissions < /dev/null > $R/${MOD}_${ROLE}.json 2>$R/${MOD}_${ROLE}.err)
  ruby $R/../log_run.rb $R/${MOD}_${ROLE}.json $MOD "$ROLE" $ROLE $MODEL $EFFORT >> $R/${MOD}_${ROLE}.err 2>&1 || true
  if [ -s $R/${MOD}_${ROLE}.json ] && ! grep -q '"is_error":true' $R/${MOD}_${ROLE}.json; then
    echo done > $R/${MOD}_${ROLE}.done
    return 0 2>/dev/null || exit 0
  fi
  echo "LIMIT/ERR $(date +%H:%M) waiting 15m for $MOD $ROLE" >> $R/${MOD}_${ROLE}.err
  while :; do
    sleep 900
    $CLAUDE -p "ok" --model $MODEL --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break
  done
done
