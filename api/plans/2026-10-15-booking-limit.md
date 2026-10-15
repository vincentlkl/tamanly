# Booking limit: weekly or monthly — Implementation Plan

> **For agentic workers:** use superpowers:executing-plans and `ponytail:ponytail` (level **full**). Tick a step only after you've done it and seen the expected result. Shortest working diff. Business logic goes in services.

**Goal:** An admin sets each facility's booking limit as **N bookings per unit per week _or_ per month**. Today it's monthly only (`facilities.per_month`). `Bookings::Create` enforces the limit for the week or month that contains the booking. The app shows the rule and the unit's quota (`used/limit this week|month`).

**Architecture:**
- **One rule per facility.** Replace `facilities.per_month` with `booking_limit` (count) plus `booking_limit_period` (`week` | `month`).
- **One window helper.** `Bookings::Quota` works out the window (a KL week starting Monday, or a calendar month) and the count of bookings that hold a slot. `Bookings::Create` and `FacilitySerializer.detail` both use it, so the API can't tell the app one number and enforce another.
- **The admin form is unchanged except for the limit field.** The Booking rules page gets a count input plus a Week/Month select.

**Source:** Vincent, 2026-10-15, after `plan/api/runs/guide_review.md` (09: "The design's weekly quota conflicts with the API's `per_month`").

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Where the setting lives: on `facilities`, not `organizations` or `tamans`.** <br>• The limits really do differ by facility. The seeds and `Facilities::Save.apply_rule_defaults` give halls 2 and courts 8. A single organization-wide number would lose that.<br>• Admins already edit limits per facility on `/admin/booking-rules` (`Admin::BookingRulesController`), and `Bookings::Create` already reads them from `@facility`.<br>• `organizations` has no settings columns today (`db/schema.rb:626`). A per-org setting would need a new settings page plus an inheritance rule.<br>• "Configurable per organisation" is met because each organization's admins configure their own facilities, scoped through `Facility.in_scope`. An org-wide default only matters once there are many facilities: see Q1. |
| D2 | **Schema:** `rename_column :facilities, :per_month, :booking_limit` (existing values kept). Add `booking_limit_period` as a string, default `"month"`, `null: false`. Model: `enum :booking_limit_period, { week: "week", month: "month" }, prefix: :limit_per, validate: true`. Existing rows behave exactly as they do today. |
| D3 | **Window:** the week or month containing the booking's `starts_at` (not today), in KL time. Week = `starts_at.all_week`, which starts Monday because Rails defaults `beginning_of_week` to `:monday`, the app doesn't override it (no `beginning_of_week` under `config/`), and `config.time_zone` is KL. Month = `starts_at.all_month`, the current behaviour. Counted: `Booking.holding` for the same facility and unit. |
| D4 | **Error:** the i18n key `api.bookings.per_month` is replaced by `api.bookings.booking_limit` with `week`/`month` variants ("…this week's / this month's booking limit"). The field stays `starts_at`, with `422 validation_failed`. |
| D5 | **API (`GET /facilities/:id`):** drop `per_month`. Add `booking_limit` (int), `booking_limit_period` (`"week"`/`"month"`) and `quota: { used, limit, period, resets_on }` for `Current.unit`. `resets_on` is the first day of the next window. `rules[]` gets the right sentence. Breaking `per_month` is acceptable: the app has never run against the real API (guide_review: tests only pass against `FakeApi`). |
| D6 | **Quota for "now":** the detail endpoint shows the quota for the window containing **today** (KL). The app can't know which window a slot falls into until the user picks one, and a slot in a later window is checked by the server at Confirm (D3). |
| D7 | **No backfill job.** The rename keeps the counts and the period defaults to `month`. Seeds: courts use `week` with a count of 2 (the design's weekly quota); halls stay at 2 per `month`. See Q2. |
| D8 | **Out of scope:** SMS (none anywhere), per-user limits, different limits for owners and tenants, and a limit across all facilities. |

## Global Constraints

- `tamanly_backend/docs/AGENT_CONVENTIONS.md` applies: UUID PKs, `*_cents` money, logic in `app/services/<domain>/`, tenant = taman (`Facility.in_scope`, and the API uses `Current.unit.taman.facilities`), and `AuditEvent.record!` on every save (`facility.rules_updated` already exists).
- Contract = `plan/api/endpoints.yml` + `swagger/v1/swagger.yaml` (rswag from `spec/swagger_helper.rb`).
- Tests: rspec request specs + rswag (`spec/requests/api/v1/`), plus the existing minitest. Run from `tamanly_backend/`.
- Migration: one file. Use the next free prefix after `20261015200000`, e.g. `20261016100000_booking_limit_period.rb`.
- No git commit or push without Vincent.

## File map

| File | Change |
|---|---|
| `db/migrate/20261016100000_booking_limit_period.rb` | new: rename + add column |
| `app/models/facility.rb` | enum; the validation uses `booking_limit` |
| `app/services/bookings/quota.rb` | new: `call(facility, unit, at:)` → `{used:, limit:, period:, resets_on:}` |
| `app/services/bookings/create.rb` | replace `monthly_count`/`per_month` with `Quota` |
| `app/services/facilities/save_rules.rb`, `save.rb` | permit/assign `booking_limit`, `booking_limit_period`; hall default |
| `app/views/admin/booking_rules/show.html.erb` | "Bookings per unit" number + Week/Month select |
| `app/serializers/facility_serializer.rb` | D5 fields; `detail(facility, unit:)` |
| `app/controllers/api/v1/facilities_controller.rb` | pass `Current.unit` |
| `config/locales/{en,ms}/facilities.yml` | `rules.booking_limit.{week,month}`, `api.bookings.booking_limit.{week,month}` |
| `db/seeds/07_facilities.rb`, `spec/factories.rb`, `test/services/facilities_marketplace_comms_test.rb` | rename the attribute |
| `spec/swagger_helper.rb` → `swagger/v1/swagger.yaml` | `facility_detail` schema |
| `spec/requests/api/v1/{bookings,facilities}_spec.rb` | week + month cases |
| `tamanly_app/docs/plans/mobile-app/09-facilities.md` | guide bullets below (separate chunk; listed here only) |

## Flutter guide 09 changes (to apply to the guide later, not in this chunk)

- Context: replace "`rules.per_month` bookings per unit" with "`booking_limit` bookings per unit per `booking_limit_period`".
- Fixture (`facility.json`): remove `rules{…}` as an object (the API sends `rules` as a string array) and `per_month`. Add top-level `"booking_limit": 2, "booking_limit_period": "week", "quota": {"used":1,"limit":2,"period":"week","resets_on":"2026-10-19"}`.
- M5 quota card: "Resident quota: {used}/{limit} this week|month". The rules line uses `rules[]` from the server; stop composing it from fields.
- ARB: replace `facQuota`/`facMonthlyQuota`/`facRules` with `facQuotaWeek` "Quota {used}/{limit} this week" / `facQuotaMonth` (plus `ms`: "minggu ini" / "bulan ini"). Drop `facRules`.
- M7: on `422` with `details.starts_at`, show the server message (it names the window) and keep the pick.
- M8: the F3 banner stays gated on `meta.quota` (still not provided; Q3).
- Tests: `find.text('Quota 1/2 this week')`, plus a month fixture variant.

## Tasks

### Task 1: Schema + model
- [ ] Migration: `rename_column :facilities, :per_month, :booking_limit`; `add_column :facilities, :booking_limit_period, :string, default: "month", null: false`.
- [ ] `Facility`: enum per D2; replace `:per_month` with `:booking_limit` in the `numericality` validation.
- [ ] Rename `per_month` in `spec/factories.rb:81`, `db/seeds/07_facilities.rb:41` (courts `week`/2, halls `month`/2) and the minitest at `test/services/facilities_marketplace_comms_test.rb:10`.
- [ ] `bin/rails db:migrate` → `schema.rb` shows `booking_limit` and `booking_limit_period`.

### Task 2: `Bookings::Quota` + Create
- [ ] `Bookings::Quota.call(facility, unit, at:)`: `range = facility.limit_per_week? ? at.all_week : at.all_month`; `used = Booking.holding.where(facility:, unit:, starts_at: range).count`; `resets_on = range.end.to_date + 1`.
- [ ] `Bookings::Create#call`: `raise Invalid.new(:starts_at, "booking_limit.#{@facility.booking_limit_period}") if quota[:used] >= @facility.booking_limit`, using `Quota.call(@facility, @occupancy.unit, at: @starts_at)`. Delete `monthly_count`.
- [ ] Locales en/ms: `api.bookings.booking_limit.{week,month}`; remove `per_month`.
- [ ] `spec/requests/api/v1/bookings_spec.rb` (next to `:394`):
  - month 1: book Mon, then 422 for the same month;
  - week 1: book Sun 2026-10-18, then Mon 2026-10-19 is 201 (new week) and Tue 2026-10-20 is 422;
  - a cancelled booking does not count.
- [ ] `bundle exec rspec spec/requests/api/v1/bookings_spec.rb` → green.

### Task 3: API facility detail
- [ ] `FacilitySerializer.detail(facility, unit:)`: D5 fields. `quota` = `Bookings::Quota.call(facility, unit, at: Time.current)`, with `limit: facility.booking_limit`. In `rules_for`, the limit sentence comes from `facilities.rules.booking_limit.<period>`.
- [ ] `FacilitiesController#show` → `FacilitySerializer.detail(..., unit: Current.unit)`.
- [ ] `spec/swagger_helper.rb` `facility_detail`: replace `per_month` with `booking_limit`, `booking_limit_period` (enum week/month) and `quota` (object: used, limit, period, resets_on date). Then `bundle exec rake rswag:specs:swaggerize`.
- [ ] `spec/requests/api/v1/facilities_spec.rb:193`: set `booking_limit: 2, booking_limit_period: "week"`; expect `quota.used`, `resets_on` = next Monday, and the `rules` sentence.
- [ ] `plan/api/endpoints.yml`: note the field change on `GET /api/v1/facilities/:id` (touch only after Vincent ok's this plan; that file is out of this chunk).

### Task 4: Admin booking rules
- [ ] `show.html.erb:24`: the "Bookings per unit" field becomes `number_field_tag "facility[booking_limit]"` (1–60) + `select_tag "facility[booking_limit_period]", options_for_select([["per week","week"],["per month","month"]], @facility.booking_limit_period)` in one field row.
- [ ] `Facilities::SaveRules.call!`: assign `booking_limit:` and `booking_limit_period:` instead of `per_month:`. Hall defaults in `Facilities::Save.apply_rule_defaults`: `booking_limit = 2` (period stays `month`).
- [ ] Minitest/system for booking rules (if one exists, `grep -rn booking_rules test/`): save `week`, reload, value persists, audit `facility.rules_updated`.

### Task 5: Verify
- [ ] `grep -rn per_month app config db/seeds spec test` → no hits (migrations excepted).
- [ ] `bundle exec rspec && bin/rails test` → green.

## Open questions

- **Q1.** Does Vincent want an **organization-wide** limit (one rule for every facility), or is per-facility with a default enough? Recommendation: per-facility (D1). If org-wide is required, add `organizations.booking_limit` + `booking_limit_period` as the defaults copied in `Facilities::Save` for new facilities. Don't do a runtime fallback.
- **Q2.** Seed and default values for courts: 2 per week (design), or keep 8 per month?
- **Q3.** Should `GET /bookings` return `meta.quota` for the F3 banner? It's per facility, so it only makes sense when filtered by facility. Recommendation: no; the F3 banner is dropped.
- **Q4.** Should the week window be the one containing the booking date (D3), or a rolling 7 days from now? Recommendation: the calendar week, because it's easier to explain to residents.
