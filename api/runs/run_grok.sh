#!/bin/bash -l
# usage: run_grok.sh MOD ROLE MODEL EFFORT PROMPTFILE   (outputs in this runs/ dir)
# Allowed Grok 4.7 id: grok-4.7 (see `grok models`). Historical runs used grok-4.7-build.
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
B=/Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
cd $B
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
/Users/vincent/.local/bin/grok --prompt-file "$5" -m $3 --effort $4 --output-format json --permission-mode bypassPermissions --cwd $B > $R/$1_$2.json 2>$R/$1_$2.err
ruby ../plan/api/log_run.rb $R/$1_$2.json $1 "$2" $2 $3 $4 >> $R/$1_$2.err 2>&1
echo done > $R/$1_$2.done
