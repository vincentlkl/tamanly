#!/bin/bash -l
# drive_all.sh : A06F1, A09, A10 — build (Haiku medium) -> suites -> commit -> review (Opus medium) -> suites -> commit
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; B=$R/../../../tamanly_backend; P=$R/../..
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
CL=$R/ALL_checklist.md
mark(){ echo "- $(date '+%Y-%m-%d %H:%M') $*" >> $CL; }
suites(){ cd $B && bundle exec rspec > $R/$1_spec.log 2>&1 && bin/rails test >> $R/$1_spec.log 2>&1; }
counts(){ grep -E "examples,|runs," $R/$1_spec.log | tr '\n' ' '; }
commit(){ cd $B; /usr/bin/git add -A -- . ':!bun.lock'; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1"; h=$(/usr/bin/git rev-parse --short HEAD)
  cd $P; /usr/bin/git add api/modules api/endpoints.yml api/usage_log.csv api/runs/ALL_checklist.md 2>/dev/null; /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1 (plan)"; }
run(){ # id model prompt
  [ -f $R/$1.ok ] && return 0
  rm -f $R/$1.done; $R/run_claude.sh ${1%_*} ${1##*_} $2 medium $3
  if [ ! -s $R/$1.json ] || grep -q '"is_error":true' $R/$1.json; then mark "HALT at $1 (limit/error: $(ruby -rjson -e 'puts JSON.parse(File.read(ARGV[0]))["result"].to_s[0,120]' $R/$1.json 2>/dev/null)). RESUME: rerun runs/drive_all.sh (finished steps have .ok files; partial work for this step is uncommitted in the tree)"; exit 1; fi
  if suites $1; then commit "$4"; touch $R/$1.ok; mark "$1 done, $(counts $1) commit $h"; else mark "RED after $1, see $1_spec.log; RESUME: fix tests then rerun"; exit 1; fi; }
step(){ # MOD stem desc base
  M=$1
  [ "$M" = A06F1 ] || { [ -f $R/${M}_build.txt ] || $R/mkprompt.sh $M $2 "$3" build; sed -i '' 's/Do not start the next module./Do not start the next module. Do not make product decisions beyond the plan; list judgement calls./' $R/${M}_build.txt; }
  run ${M}_build claude-haiku-5-5 $R/${M}_build.txt "Mobile API $M: $3"
  if [ ! -f $R/${M}_review.txt ]; then $R/mkprompt.sh $M $2 "$3" review
    sed -i '' "s#It was just built (uncommitted; see /usr/bin/git status and git diff HEAD; earlier modules are committed and reviewed)#It was just built and committed (review /usr/bin/git diff $(cat $R/${M}.base)..HEAD; earlier modules are reviewed)#" $R/${M}_review.txt
    echo 'Budget is limited: fix real issues only, no broad rewrites. Do not make product decisions beyond the plan; list them as judgement calls. Leave fixes uncommitted.' >> $R/${M}_review.txt; fi
  run ${M}_review claude-opus-5-5 $R/${M}_review.txt "Mobile API $M review fixes"; }
for m in A06F1 A09 A10; do [ -f $R/$m.base ] || /usr/bin/git -C $B rev-parse --short HEAD > $R/$m.base
  case $m in A06F1) step A06F1 a06-permits "permit withdraw lock + tenancy scope";; A09) step A09 a09-marketplace "marketplace";; A10) step A10 a10-notifications "notifications";; esac; done
mark ALLDONE; echo ALLDONE
