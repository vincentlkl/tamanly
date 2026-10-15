#!/bin/bash -l
# Review-only: Opus 5.5 medium compares mobile-app implementation guides with the updated design and built API.
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs; ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
CL=$R/guide_review_checklist.md; M=claude-opus-5-5; CLAUDE=/Users/vincent/.local/bin/claude
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
C=(C01:01-foundation C02:02-access C03:03-home-directory C04:04-visitors-sos C05:05-guard C06:06-billing-payments C07:07-permit-apply,08-permit-track C08:09-facilities C09:10-marketplace C10:11-notifications C11:12-profile C12:00-index,2026-10-11-mobile-api)
N=${#C[@]}
pct(){ d=$(ls $R/GR_C*.ok 2>/dev/null | wc -l | tr -d ' '); sed -i '' "s/^Progress: .*/Progress: $d\/$((N+1)) chunks ($((d*100/(N+1)))%)/" $CL; }
run(){ # id promptfile
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $2)" --model $M --effort medium --output-format json --disallowedTools "Edit,Write,NotebookEdit" --dangerously-skip-permissions < /dev/null > $R/GR_$1.json 2>$R/GR_$1.err)
    ruby $ROOT/plan/api/log_run.rb $R/GR_$1.json GR_$1 review review $M medium >> $R/GR_$1.err 2>&1
    if [ -s $R/GR_$1.json ] && ! grep -q '"is_error":true' $R/GR_$1.json; then return 0; fi
    sed -i '' "s/^| $1 | \(.*\) | [^|]* |$/| $1 | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
}
COMMON="REVIEW ONLY: do NOT create, edit or delete any file and do not run git commands that change anything (read-only: git log/diff/show/status, rg, cat, ls are fine). Context: Vincent updated the Tamanly mobile app design and removed/added features. Design sources: plan/storyboard/index.html and plan/storyboard/refined/ (see uncommitted changes: cd plan && /usr/bin/git diff -- storyboard; /usr/bin/git log -- storyboard), plan/storyboard/plans (api.md, README.md, manual.md, modules/f*.md; also check their uncommitted diffs), plan/FEATRURES.md and plan/PRODUCT.md (uncommitted diffs), tamanly_app/docs/storyboard (git -C tamanly_app log/diff incl. commit 619cc7f 'update refined screens' and uncommitted changes). Built API: tamanly_backend on branch feature/mobile-api (config/routes.rb, app/controllers/api, swagger/ docs, plan/api/endpoints.yml, plan/api/modules). Flutter app code: tamanly_app/lib."
for e in "${C[@]}"; do id=${e%%:*}; g=${e#*:}; [ -f $R/GR_$id.ok ] && continue
  files=$(echo $g | tr ',' '\n' | sed 's#^#tamanly_app/docs/plans/mobile-app/#;s#mobile-app/2026#2026#;s#$#.md#' | tr '\n' ' ')
  cat > $R/GR_$id.txt <<P
$COMMON
Your chunk ($id): the implementation guide(s) $files. Compare them with the CURRENT design and the BUILT API. Report, concisely, in markdown with headings: (1) features added in the design but missing from the guide; (2) features removed from the design but still in the guide; (3) screens that changed (cite screen ids/files); (4) API endpoints the guide needs that are missing or differ from the built API, and built endpoints now unused by the design; (5) outdated guide sections (cite section headings/lines); (6) proposed guide changes as a short bullet list. Tag every finding P1 (blocks build/wrong behaviour), P2 (should fix) or P3 (minor). No speculation: cite evidence. Under 120 lines.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  run $id $R/GR_$id.txt
  python3 -c "import json;print(json.load(open('$R/GR_$id.json'))['result'])" > $R/guide_review_$id.md
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done (guide_review_$id.md) |/" $CL; touch $R/GR_$id.ok; pct
done
id=C13
if [ ! -f $R/GR_$id.ok ]; then
  cat > $R/GR_$id.txt <<P
$COMMON
Synthesis: read plan/api/runs/guide_review_C01.md .. guide_review_C12.md (chunk reviews of the mobile-app implementation guides vs the updated design and built API). Verify anything doubtful against the sources, dedupe, and output ONE consolidated markdown report: findings grouped by priority P1/P2/P3 (each one line with guide + evidence), a table of API endpoint gaps (missing / differs / now unused), and proposed guide changes per guide file. Under 150 lines.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  run $id $R/GR_$id.txt
  python3 -c "import json;print(json.load(open('$R/GR_$id.json'))['result'])" > $R/guide_review.md
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done (guide_review.md) |/" $CL; touch $R/GR_$id.ok; pct
fi
echo ALLDONE
