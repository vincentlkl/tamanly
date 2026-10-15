# Booking limit: one org setting (week or month) — Implementation Plan (P03)

> **For agentic workers:** use superpowers:executing-plans and `ponytail:ponytail` (level **full**). Tick a step only after you've done it and seen the expected result. Shortest working diff. Business logic goes in services.

**Goal:** Each **organization** has **one** booking limit: **N bookings per unit per week _or_ per month**, applied to every facility in that org. Admins set it once (not per facility). `Bookings::Create` enforces it. The app shows the rule and the unit's quota.

**Locked (Vincent 2026-10-15):** org-wide setting (not per facility). Court/facility seed default stays **8 per month** (existing `per_month` values kept until the org setting replaces enforcement).

**Architecture:**
- **One rule per organization.** `organizations.booking_limit` (int, default 8) + `organizations.booking_limit_period` (`week`|`month`, default `month`).
- **Drop facility-level enforcement.** Stop reading `facilities.per_month` in `Bookings::Create`. Keep the column for now (no rename required) or leave unused; do **not** expose per-facility limit editors as the source of truth. Admin Booking rules page shows / edits the **organization** limit (once), not per facility.
- **One window helper.** `Bookings::Quota` uses the org setting + KL week (Monday) or calendar month containing `starts_at`. Count = `Booking.holding` for the same **facility + unit** in that window (limit is org-wide; counting stays per facility+unit so one unit cannot burn the whole org quota across facilities… wait: Vincent said one setting for the org. Clarify count scope below).

**Count scope (D3):** The limit is "N bookings **per unit** per week|month" using the org's N and period. Count bookings for that unit on **that facility** (same as today), so each facility still has its own slot pressure; only the number/period comes from the org. (If Vincent later wants one quota across all facilities, change `Quota` to drop the facility filter.)

**Source:** Vincent, 2026-10-15 (override of earlier per-facility draft).

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Setting lives on `organizations`:** `booking_limit` integer default 8 null false; `booking_limit_period` string default `"month"` null false. Enum on `Organization` like `{ week: "week", month: "month" }`. |
| D2 | **Admin UI:** Booking rules page edits the current org's limit (count + Week/Month). Remove or ignore the per-facility "Bookings per unit per month" field as the authority (may leave `facilities.per_month` in DB unused by API create). |
| D3 | **Window + count:** KL; week = `starts_at.all_week` (Monday); month = `starts_at.all_month`. `used = Booking.holding.where(facility:, unit:, starts_at: range).count`. Limit/period from `facility.taman.organization`. |
| D4 | **Error:** i18n `api.bookings.booking_limit.{week,month}`; field `starts_at`; `422`. |
| D5 | **API `GET /facilities/:id`:** drop exposing facility `per_month` as the rule. Add `booking_limit`, `booking_limit_period` from the org, and `quota: { used, limit, period, resets_on }` for `Current.unit`. |
| D6 | **Quota "now":** window containing **today** (KL) on the detail endpoint. |
| D7 | **No per-facility period.** Seeds keep facility rows as-is; org defaults 8/`month`. |
| D8 | **Out of scope:** SMS; per-user limits; separate limits per facility. |

## Global Constraints

- `tamanly_backend/docs/AGENT_CONVENTIONS.md`. Org-owned columns (no `taman_id` on organizations).
- Contract = `plan/api/endpoints.yml` + swagger. Migration prefix **`20261016100000`** (P05 starts at `20261016100100`).
- Scoped exception: may edit `config/routes.rb` only if a new admin route is required (prefer existing booking-rules path).
- Never push. Tests: rspec + minitest. `PGHOST=127.0.0.1 PGPORT=55432 PGGSSENCMODE=disable`.

## File map

| File | Change |
|---|---|
| `db/migrate/20261016100000_org_booking_limit.rb` | add org columns; backfill 8/`month` |
| `app/models/organization.rb` | enum + validations |
| `app/services/bookings/quota.rb` | new |
| `app/services/bookings/create.rb` | use Quota + org setting |
| `app/controllers/admin/booking_rules_controller.rb` + view | edit org limit |
| `app/serializers/facility_serializer.rb` | D5 fields from org |
| locales, specs, swagger, `plan/api/endpoints.yml` | as needed |
| guide `09-facilities.md` | later (docs chunk) |

## Tasks

### Task 1: Schema + model
- [ ] Migration adds `organizations.booking_limit` (default 8) and `booking_limit_period` (default `"month"`).
- [ ] `Organization` enum + numericality on limit (≥ 1).
- [ ] `bin/rails db:migrate`.

### Task 2: Quota + Create
- [ ] `Bookings::Quota.call(facility, unit, at:)` reads org from `facility.taman.organization`.
- [ ] `Bookings::Create` uses Quota; remove `per_month` check.
- [ ] Specs: month and week cases; cancelled excluded.
- [ ] `bundle exec rspec spec/requests/api/v1/bookings_spec.rb` green.

### Task 3: Facility detail API
- [ ] Serializer exposes org limit/period + quota; stop presenting facility `per_month` as the rule.
- [ ] rswag + facilities request specs.
- [ ] Update `endpoints.yml` notes.

### Task 4: Admin booking rules
- [ ] Form fields bind to `Current.organization` (or equivalent) limit + period.
- [ ] Saving audits `organization.booking_limit_updated` (or reuse existing audit pattern).
- [ ] Facility blackout / other rules on the page stay as they are.

### Task 5: Verify
- [ ] `bundle exec rspec && bin/rails test` green.
- [ ] No SMS. Short clean code.

## Open questions
None blocking (Vincent locked org-wide + 8/month default).
