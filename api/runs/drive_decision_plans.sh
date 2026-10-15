#!/bin/bash -l
# PLAN DOCS ONLY: Opus 5.5 medium writes plan/api/plans/2026-10-15-*.md from Vincent's post-review decisions.
R=/Users/vincent/work/ror/apps/vincent/tamanly/plan/api/runs
ROOT=/Users/vincent/work/ror/apps/vincent/tamanly
PLAN=$ROOT/plan
PLANS=$PLAN/api/plans
CL=$R/decision_plans_checklist.md
M=claude-opus-5-5
CLAUDE=/Users/vincent/.local/bin/claude
export PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable
N=6
mkdir -p "$PLANS"
pct(){ d=$(ls $R/DP_P*.ok 2>/dev/null | wc -l | tr -d ' '); sed -i '' "s/^Progress: .*/Progress: $d\/$N chunks ($((d*100/N))%)/" $CL; }
commit_plan(){ # message
  cd "$PLAN" && /usr/bin/git add api/plans api/runs/decision_plans_checklist.md api/usage_log.csv 2>/dev/null
  /usr/bin/git diff --cached --quiet || /usr/bin/git commit -qm "$1"
}
COMMON='PLAN DOCS ONLY. You may READ any file under tamanly_backend, tamanly_app, and plan. You may CREATE or OVERWRITE only the single plan file named in your chunk under plan/api/plans/ (absolute path given). Do NOT edit backend, Flutter, storyboard, modules, endpoints.yml, or any other path. Do NOT run git commit/push/reset. Do NOT implement code. Cite real paths, models, routes and serializers you verified. Follow the style of plan/docs/superpowers/plans/2026-10-10-ar-aging.md (Goal, Architecture, Decisions table, Global Constraints, File map, checkbox Tasks) but keep it shorter and concrete for Tamanly mobile API work. Constraints locked: no SMS anywhere; short clean code; never push; UUID PKs; money in *_cents; business logic in services; tenant = taman (see tamanly_backend/docs/AGENT_CONVENTIONS.md); API contract = plan/api/endpoints.yml + swagger; rspec request specs + rswag. Source decisions: Vincent (2026-10-15) after guide review in plan/api/runs/guide_review.md. Also read plan/api/README.md "Decisions locked" and the relevant plan/api/modules/*.md.'

# P01 invite-only
id=P01; outfile=$PLANS/2026-10-15-invite-only-signup.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Topic: Sign-up is invite-only.
Vincent: remove "Create account" from guides/design flows; accounts created only by admin email invite; invite-code / deep-link accept flow stays.
Already built (verify): POST /auth/password, /auth/invite/accept, /auth/password/forgot|/reset, admin invites, user_invitations. No signup endpoint.
Plan must cover: (1) product decisions locked; (2) guide/storyboard changes (which screens/files lose Create account; set-password / accept-invite / forgot-reset screens to keep or add); (3) any tiny API gaps (e.g. GET /invites?code= if still needed for sub-tenant codes — distinguish admin user-invite token vs sub-tenant invite code); (4) Flutter guide rewrite bullets for 00/01/02; (5) open questions only if truly blocking. Under ~200 lines.
After research, WRITE the markdown file to that exact path using a shell redirection or by writing the file (you have Write). Confirm the file exists before finishing.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  # Allow Write for plan file creation
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      # Claude answered but did not write the file — extract result into the plan file as fallback
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: invite-only signup ($id)"
fi

# P02 visitor categories
id=P02; outfile=$PLANS/2026-10-15-visitor-categories.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Topic: Property-management-defined visitor categories.
Vincent: PM can create categories; admin dashboard + API + mobile app all see them; Contractor becomes just a category (not a hardcoded kind).
Verify today: visitor_passes Create KINDS = guest delivery ehailing service (hardcoded). Admin visitors_controller is a registry, not category CRUD. No VisitorCategory model. Compare with org-owned market categories / permit types for the pattern.
Plan must cover: (1) data model (org vs taman scope — argue from AGENT_CONVENTIONS); (2) seed defaults including Contractor; (3) admin CRUD pages (prototype fidelity note if plan/admin has something); (4) API list endpoint for mobile + change create pass to take category_id or slug; (5) migration of existing kind strings; (6) Flutter guide bullets for C2 chips; (7) tasks with checkboxes; (8) open questions. Under ~250 lines.
WRITE the file to that exact path. Confirm it exists.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: visitor categories ($id)"
fi

# P03 booking limit
id=P03; outfile=$PLANS/2026-10-15-booking-limit.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Topic: Booking limit configurable per organisation (period weekly OR monthly + count).
Vincent: design said weekly; API today enforces facility.per_month (default 8) via Bookings::Create; admin BookingRulesController edits "Bookings per unit per month".
Plan must cover: (1) where the setting lives (organization vs taman vs facility — argue); (2) schema change (replace per_month or add period enum + count); (3) Bookings::Create count window (week start Mon KL vs calendar month); (4) admin UI change on booking rules; (5) API facility serializer fields the app needs; (6) Flutter guide 09-facilities bullets; (7) migration/backfill; (8) tasks; (9) open questions. Under ~200 lines.
WRITE the file. Confirm it exists.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: booking limit ($id)"
fi

# P04 single app guard
id=P04; outfile=$PLANS/2026-10-15-single-app-guard-role.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Topic: One Flutter app; if the signed-in user has the guard role, show the guard view (including walk-ins and deliveries).
Vincent: same app, role-detect → guard UI. Guide review noted guard/walkins, deliveries, units are built but unused by resident guides; walk-in/delivery creation was an open decision — Vincent wants them in the guard view.
Verify: me.modes / memberships, guard routes under /api/v1/guard/*, current Flutter routing for guard cards that currently sign out.
Plan must cover: (1) how role is detected from /me; (2) router redirect rules (guard home vs resident home; dual-role people); (3) which guard screens are in scope (checks, admit, walk-ins, deliveries, SOS ack, shift notes?); (4) guide 05-guard + 01/02 routing rewrites; (5) no separate guard APK; (6) tasks; (7) open questions (e.g. can a guard also be a resident on another unit). Under ~200 lines.
WRITE the file. Confirm it exists.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: single-app guard role ($id)"
fi

# P05 backend gaps
id=P05; outfile=$PLANS/2026-10-15-backend-gaps.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Topic: Backend implementation plan for missing endpoints, following usual conventions (endpoints.yml, Swagger/rswag, rspec).
Missing from guide_review.md API gaps (build these; do NOT build POST /uploads or POST /auth/firebase — design dropped them):
1. GET /billing/statement/pdf
2. GET /guard/gate_events/csv
3. GET /guard/permits/:id + POST /guard/permits/:id/deny
4. POST /access_requests (billing E5)
5. POST /incidents (resident; f09 had mailto — Vincent chose to build API)
6. PATCH /permits/:id (refund account)
7. GET /invites?code= (invite-code lookup) — verify what invites#index already does
8. Listing photos (and note kind/condition if in design; photos are the must)
Also fold in anything required by P01–P04 that is not already listed (visitor categories API, booking limit fields) as cross-links, not duplicate full plans.
Plan must cover: per endpoint — purpose, suggested path/params/response shape, auth/scopes, service object, specs, swagger, endpoints.yml row, build order module id (A11+ or fixN). File map. Global constraints. Open questions. Under ~300 lines.
WRITE the file. Confirm it exists.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: backend gaps ($id)"
fi

# P06 index synthesis
id=P06; outfile=$PLANS/2026-10-15-index.md
if [ ! -f $R/DP_$id.ok ]; then
  cat > $R/DP_$id.txt <<P
$COMMON
Your chunk ($id): write $outfile
Synthesis: read the five plans just written in plan/api/plans/2026-10-15-invite-only-signup.md, …-visitor-categories.md, …-booking-limit.md, …-single-app-guard-role.md, …-backend-gaps.md. Produce an index that:
(1) one-paragraph summary of each plan;
(2) recommended build order (backend modules then guide rewrites then Flutter);
(3) consolidated open questions that still need Vincent (only real blockers);
(4) what is explicitly out of scope (no SMS, no firebase auth signup, no separate guard app, no POST /uploads);
(5) estimated endpoint/task counts.
Under ~120 lines. WRITE the file. Confirm it exists.
P
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | running |/" $CL
  while :; do
    (cd $ROOT && $CLAUDE -p "$(cat $R/DP_$id.txt)" --model $M --effort medium --output-format json \
      --dangerously-skip-permissions < /dev/null > $R/DP_$id.json 2>$R/DP_$id.err)
    ruby $PLAN/api/log_run.rb $R/DP_$id.json DP_$id plan plan $M medium >> $R/DP_$id.err 2>&1 || true
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ -f "$outfile" ]; then break; fi
    if [ -s $R/DP_$id.json ] && ! grep -q '"is_error":true' $R/DP_$id.json && [ ! -f "$outfile" ]; then
      python3 -c "import json;print(json.load(open('$R/DP_$id.json'))['result'])" > "$outfile" 2>/dev/null || true
      [ -s "$outfile" ] && break
    fi
    sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | LIMIT hit $(date +%H:%M), waiting 15m then retry |/" $CL
    while :; do sleep 900; $CLAUDE -p "ok" --model $M --effort low --output-format json < /dev/null 2>/dev/null | grep -q '"is_error":false' && break; done
  done
  sed -i '' "s/^| $id | \(.*\) | [^|]* |$/| $id | \1 | done |/" $CL
  touch $R/DP_$id.ok; pct; commit_plan "Plan: decision plans index ($id)"
fi
echo ALLDONE
