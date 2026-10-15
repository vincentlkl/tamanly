# One app, guard view by role — Implementation Plan

> **For agentic workers:** use superpowers:executing-plans and `ponytail:ponytail` (level **full**). Tick a step only after you've done it and seen the expected result. Shortest working diff. Business logic goes in services.

**Goal:** There is one Flutter app (`tamanly_app`) and no guard APK. After sign-in, the app reads `me.modes`. A person with `guard` gets the guard shell (`/guard…`). A person with `resident` gets the resident shell (`/home…`). Someone with both lands in guard mode and can switch modes on G1. The guard view covers the gate screens already planned in guide 05 (C5–C9), plus **walk-ins** and **deliveries**, which the backend already serves.

**Architecture:**
- **Role is server truth.** `MeSerializer.modes` (`tamanly_backend/app/serializers/me_serializer.rb:22`) gives `guard` when any `StaffMembership` is `guard?`, `resident` when there's an active occupancy, and `staff` for any non-guard membership. The app never asks the user to pick a role.
- **The router picks the shell.** `lib/router.dart` already has both `StatefulShellRoute`s (`ResidentShell`, `GuardShell` in `lib/shells.dart`) and a `guardOnly` redirect (`router.dart:75`). This plan replaces `guardOnly` with guide 01 M10's `session.guardMode` and flips the dual-role default to guard.
- **Almost no backend work.** All 18 `/api/v1/guard/*` routes are built and specced (`config/routes.rb:124-152`, `spec/requests/api/v1/guard_*_spec.rb`, module `a05-guard.md` all ticked). The one gap is that `POST /guard/walkins` tells nobody. The host resident gets no push, so their `walkin_requests/:id/reply` is never prompted (Task 1).

**Source:** Vincent, 2026-10-15, after `plan/api/runs/guide_review.md` (05: "creating walk-ins or deliveries in the app needs a decision"; API gaps table: `guard/walkins`, `deliveries`, `units` "built, unused").
**Depends on:** `2026-10-15-invite-only-signup.md` D5, which deletes A3 `role_page.dart`. That page holds the guard/staff cards that currently sign out (`lib/access/role_page.dart:62-65`).

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Detection:** `me.modes` from `GET /api/v1/me` and from every token payload. `guard` ∈ modes → can use the guard view. Taman list: `me.staff[]` rows with `role == "guard"` → their `tamans` (`Me.staffTamans`, guide 05 M2). The app doesn't call any extra endpoint to detect the role. |
| D2 | **`session.guardMode`** (guide 01 M10, `session.mode` in secure storage): `modes ∋ guard && (modes ∌ resident \|\| mode != 'resident')`. **Dual-role default = guard.** `mode` is `null` until G1's switch sets `resident` or `guard`. Vincent: "has the guard role → guard view". Sign-out clears `mode` and `tamanId`. |
| D3 | **Redirect rules** (`_redirect`, after the signed-out/setup checks):<br>• `guardMode` → any path outside `/guard…` and the shared set (`/notifications`, `/me/help`, `/upgrade`, `/offline`) → `/guard`.<br>• not `guardMode` → `/guard…` → `/home`.<br>• `modes == ['staff']` only (office staff, no unit) → `/console`: a static page saying "Use the Tamanly web console", with Sign out. There is no staff UI in the app.<br>• `modes` empty → invite-only plan D7 (`/invites`). |
| D4 | **Guard API calls** send `X-Taman-Id` from `session.tamanId` (guide 01 M11, guide 05 M2 picker), never `X-Unit-Id`. `Api._headers` (`lib/api.dart:97`) must **leave out `X-Unit-Id` on `/api/v1/guard/` paths**: in guard mode, a dual-role user's selected unit means nothing. A guard membership with no active taman gets `403 forbidden` (`Guard::BaseController#pick_taman`). C5 shows "No active post. Contact the office." plus G1's mode switch (when dual) and Sign out, not an error loop. |
| D5 | **Screens in scope** (guard shell, guide 05):<br>• C5 home, including **SOS acknowledge** (`POST guard/sos/:id/acknowledge` → `acknowledged`).<br>• C6 scan.<br>• C7 verdict (admit/deny/check_out/call; `409 invalid_transition`; `plate_confirmed`).<br>• C8 contractor, starting from the `checks` verdict, because `guard/permits/:id` show/deny don't exist.<br>• C9 log, with no CSV export (`gate_events/csv` isn't routed).<br>• Permits tab.<br>**New in 05:** **W1 Walk-in** and **W2 Delivery** (D6). |
| D6 | **Walk-ins and deliveries** both start from a buttons row on C5 ("Walk-in", "Delivery") and go through the same **unit search** (`GET guard/units?q=` → `{id,name,occupants[]}`, 25 max).<br>• **W1** `/guard/walkin`: unit, visitor name, plate, people (1–99), purpose → `POST guard/walkins` (201) → a status card that polls `GET guard/walkins/:id` every 3 s until the status leaves `waiting`. The status is `approved` / `declined` / `expired` (2 min) / `answered_by_phone`. "Call host" → `POST guard/units/:id/call` → `tel:`. On `approved`, `Walkins::Reply` has already issued a 30-minute single-entry `VisitorEntry` (kind `walkin`). W1 then shows "Admit", which calls the existing `POST guard/visitor_passes/:id/admit` with `visitor_pass_id` (Task 1 exposes it).<br>• **W2** `/guard/delivery`: unit, courier name, plate, pax → `POST guard/deliveries` (201, a pass already `inside`) → SnackBar, back to C5. C9 shows the row as a normal `delivery`. |
| D7 | **Shift notes and incidents** (`guard/shift_notes`, `guard/incidents`) are **out of scope**. guide_review lists them as "web console only" and no design screen exists. See Q3. |
| D8 | **No separate guard APK or flavor.** One bundle id and one store listing. The guard UI is code under `lib/guard/` behind the router, so there's no build-time flag. |
| D9 | **Out of scope:** SMS (none anywhere), guard self-signup (guards are invited by admin, decision 2 in `plan/api/README.md`), a staff mobile UI, offline gate mode. |

## Global Constraints

- `tamanly_backend/docs/AGENT_CONVENTIONS.md` applies: UUID PKs, `*_cents` money, logic in `app/services/<domain>/`, tenant = taman (guard routes pin `ActsAsTenant.current_tenant` in `Guard::BaseController#require_guard_taman`), and `AuditEvent.record!` on every state change.
- Contract = `plan/api/endpoints.yml` + `swagger/v1/swagger.yaml` (rswag). Tests: rspec request specs + rswag under `spec/requests/api/v1/`; Flutter `flutter test` against `test/support/fake_api.dart`.
- No git commit or push without Vincent.

## File map

| File | Change |
|---|---|
| `tamanly_backend/app/services/walkins/request.rb` | new: create the `WalkinRequest`, audit `walkin.requested`, push the unit's active occupants (Task 1) |
| `tamanly_backend/app/controllers/api/v1/guard/walkins_controller.rb` | `create` calls `Walkins::Request` |
| `tamanly_backend/app/serializers/walkin_request_serializer.rb` | add `visitor_pass_id` (`walkin.visitor_entry_id`), set once approved |
| `tamanly_backend/spec/requests/api/v1/guard_walkins_spec.rb` | assert the host gets a notification; `visitor_pass_id` appears after approve |
| `tamanly_app/lib/session.dart` | `mode`, `setMode`, `guardMode` (guide 01 M10), dual default = guard |
| `tamanly_app/lib/router.dart` | D3 redirect; `/console`; `/guard/walkin`, `/guard/delivery` above the guard shell |
| `tamanly_app/lib/api.dart` | D4: no `X-Unit-Id` on `/api/v1/guard/` |
| `tamanly_app/lib/guard/walkin_page.dart`, `delivery_page.dart`, `unit_search.dart` | new (W1, W2, shared search) |
| `tamanly_app/docs/plans/mobile-app/01-foundation.md`, `02-access.md`, `05-guard.md`, `12-profile.md`, `00-index.md` | guide rewrites (Task 3) |

## Tasks

### Task 1: Backend — tell the host about a walk-in
- [ ] Find the existing push path (`PushSender`, used by `app/jobs/broadcast_push_job.rb`) and how a per-user `Notification` row is written. Reuse it. Add no new job class unless a single-recipient call doesn't exist.
- [ ] `Walkins::Request.call!(taman:, unit:, **attrs)`: create, audit, then notify the active occupants of the unit (`Occupancy.active.where(unit:)`) with `deep_link: "tamanly://walkin_requests/<id>"`. The in-app row is always written. The push respects the person's visitor preference.
- [ ] `WalkinRequestSerializer`: add `visitor_pass_id: walkin.visitor_entry_id` (`belongs_to :visitor_entry, optional: true`, `walkin_request.rb:8`).
- [ ] `Guard::WalkinsController#create` → one call to the service. Spec: 201 + a notification row for the host, none for another unit. Run `bundle exec rspec spec/requests/api/v1/guard_walkins_spec.rb`.
- [ ] Update `endpoints.yml` notes for `POST /api/v1/guard/walkins` and regenerate swagger (`rails rswag`).

### Task 2: Flutter — role routing
- [ ] `Session`: `mode` (secure storage key `mode`), `setMode`, `guardMode` per D2. Clear it on sign-out. Test: guard-only, resident-only, dual with mode null/guard/resident, staff-only.
- [ ] `_redirect`: replace `guardOnly` (`router.dart:75-78`) with D3. Add `/console`. Router test for each row of D3, plus "dual + `/home` → `/guard`" and "dual + mode resident + `/guard` → `/home`".
- [ ] `Api._headers`: skip `X-Unit-Id` for `/api/v1/guard/` paths. Test it in `test/api_test.dart`.
- [ ] Confirm `role_page.dart` is gone (invite-only plan). If it isn't, do that plan's Task first. Don't patch the sign-out cards.

### Task 3: Guide rewrites (docs only)
- [ ] **01-foundation M10:** dual-role default = guard (`mode != 'resident'`). Add the `/console` staff-only route and the D4 header rule. Change M8 "guard-only → `/guard`" to "guardMode → `/guard`".
- [ ] **02-access:** drop A3's guard/staff cards (M6) and point at invite-only D5. After A8/sign-in, `guardMode` → `/guard`.
- [ ] **05-guard:** apply the guide_review list:
  - pass fixture field names;
  - taman error = `422 validation_failed` + `details["X-Taman-Id"]`;
  - `workers_in` = entering now;
  - C8 from the `checks` verdict;
  - no CSV;
  - `acknowledged`, 409, `plate_mismatch` (no `wrong_taman`), `plate_confirmed`.

  Then add **M14 Walk-in (W1)**, **M15 Delivery (W2)**, the unit search, C5's buttons row, and the 403 "No active post" state (D4). Add a Task between 7 and 8 for W1/W2.
- [ ] **12-profile G1:** the mode switch shows only when `modes` has both, with the label "Switch to resident mode" by default.
- [ ] **00-index:** one line: one app; guard view by role; no guard APK.

### Task 4: Flutter — W1/W2 screens (after Task 3 lands in 05)
- [ ] `unit_search.dart`: a debounced (400 ms) `guard.units` list → returns `{id, name}`.
- [ ] `walkin_page.dart` per D6, polling with `Timer.periodic` and cancelling it on dispose or on a final status. Tests: approved, declined, expired, `422` field errors.
- [ ] `delivery_page.dart` per D6. Test: 201 → SnackBar → `/guard`.
- [ ] `flutter analyze && flutter test` green.

## Open questions

| # | Question | Default if no answer |
|---|---|---|
| Q1 | Can a guard also be a resident on another unit (the same `User` with a `StaffMembership` guard and an `Occupancy`)? The backend allows it today (`MeSerializer.modes` returns both). | Yes. Dual-role lands in guard, with a switch on G1 (D2). |
| Q2 | `answered_by_phone` is a `WalkinRequest` status, but no endpoint sets it. Should the guard be able to mark "host confirmed by phone" and admit? | Not in v1. If the host can't reply in the app, the guard calls them. The walk-in expires after 2 min with no pass, so it stays out of the log. Add `POST guard/walkins/:id/confirm` only if guards ask for it. |
| Q3 | Should shift notes and incidents be in the guard app? | No (D7). Console only. |
| Q4 | Should office staff (non-guard) get anything in the app? | No. They get the `/console` page (D3). |
| Q5 | Should a dual-role user's last mode survive sign-out? | No. Sign-out clears it (guide 01 M10). |
