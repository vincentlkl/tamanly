# M12 · Analytics & overview

**Status:** Not started · **Owner:** — · **Wave:** 4 · **Depends on:** M03–M09 for the data, M02 for the UI

**Goal:** Give the figures management and JMB committees ask for, per taman and across the portfolio. The figures are occupancy, collections rate, visitor volume, facility usage, active renovation permits and deposit escrow balances. They are fast because history comes from nightly snapshots and only today is computed live.

**Read first:**
- The prototype `admin/#/analytics` and the overview page
- `../contracts.md` §3 (permission key `analytics`)

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | Occupancy, collections rate, visitor volume, facility usage, active renovation permits & deposit escrow balances | All |
| Web | Per-taman and cross-portfolio views for multi-property owners / JMB / management | All |

How each audience is served:
- **Multi-property owners** get their figures through the billing summary API (M06 T06.6).
- **JMB committee members** get a staff membership with role `taman_manager`, scoped to their taman, and a permission override that sets every module to `view`. No new role is needed. This is documented in T12.3.

**Prototype references:**
- `admin/#/analytics`
- `admin/#/` (overview figures)

## Data model

**`daily_stats`**

| Column | Notes |
|---|---|
| `taman_id` | |
| `on_date` | |
| `metrics` | jsonb |

Unique on `[taman_id, on_date]`.

The `metrics` keys are fixed and listed here:

```
units_total, units_occupied, units_vacant, units_under_notice,
invoiced_cents, collected_cents, overdue_cents, due_this_month_cents, collected_this_month_cents,
visitors_admitted, visitors_denied, walkins, deliveries,
bookings, booked_hours, open_hours,
permits_active_renovation, permits_pending_review,
escrow_held_cents, escrow_refunded_cents, escrow_forfeited_cents
```

## Interfaces

**Produces:**

```ruby
Analytics::Snapshot.call(taman, on: Date.yesterday)       # => DailyStat (idempotent upsert)
Analytics::Metrics.for(taman_ids:, from:, to:)            # => Analytics::Report (tiles + series), today computed live
Analytics::Metrics.collections_rate(taman_ids:, month:)   # => Float 0..1 = collected_this_month / due_this_month (invoices with due_on in month)
```

**Consumes:**

Read-only queries on these tables:
- `units`, `occupancies`
- `invoices`, `payments`, `escrow_entries`
- `visitor_passes`, `gate_events`
- `bookings`, `facilities`
- `permits`

## Tasks

### T12.1 · Nightly snapshots

**Files:**
- Create: migration, `app/models/daily_stat.rb`, `app/services/analytics/snapshot.rb`, `app/jobs/analytics/snapshot_job.rb`, `lib/tasks/analytics.rake` (backfill)
- Test: `spec/services/analytics/snapshot_spec.rb`

- [ ] **Step 1: Write failing specs.** Build a fixture taman with known counts:
  - 10 units: 8 occupied, 1 vacant, 1 under notice.
  - Invoices worth RM 1,850 due this month, with RM 1,295 collected.
  - 12 visitor admits yesterday (KL date) and 2 denies.
  - 1 booking of 3 hours.
  - 2 active renovation permits.
  - RM 3,000 held in escrow.

  The snapshot must store exactly these numbers. Running it twice for the same date updates the row and does not duplicate it. Events at 23:59 KL count for that day. Events at 00:00 KL count for the next day.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - `SnapshotJob` runs at 00:30 KL for every taman.
  - The rake task `analytics:backfill[from,to]` fills history. Seeds call it for the 180 days before the demo date, so the charts have data.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add nightly analytics snapshots"`.

### T12.2 · Analytics page

**Files:**
- Create: `app/services/analytics/metrics.rb`, `app/controllers/admin/analytics_controller.rb`, views
- Test: `spec/services/analytics/metrics_spec.rb`, `spec/requests/admin/analytics_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Tiles.** These show for the current scope:
    - occupancy %
    - collections rate for the month
    - visitors in the last 30 days
    - facility usage %
    - active renovation permits
    - escrow held

    Each tile shows a delta against the previous period, for example "+3.1 pts vs Sep".
  - **Series:**
    - collections by month for the last 6 months (invoiced against collected)
    - visitors per day for the last 30 days
    - occupancy by taman
    - utilisation by facility
  - **Live data.** Today's numbers come from live queries. Earlier days come from `daily_stats`.
  - **Scope.** The scope switcher decides between per-taman and cross-portfolio, using the M02 cookie.
  - **Export.** CSV export gives one row per taman per metric.
  - **Permissions.** The page needs `analytics: view`.
  - **Performance.** With 4 tamans and 180 days of snapshots, the page renders in under 300 ms. The spec checks the query count (≤ 15) using `ActiveSupport::Notifications`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Use `Ui::TileComponent` and `Ui::BarsComponent` from M02. No chart library is needed.
  - Match the prototype layout: key figures in a 2-column grid on phones, then charts at full width.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add analytics page"`.

### T12.3 · Overview figures, cross-portfolio comparison and JMB access

**Files:**
- Create: `app/views/admin/overview/_figures.html.erb`, `app/views/admin/analytics/_compare.html.erb`, `docs/jmb-access.md` (in the app repo)
- Test: `spec/requests/admin/overview_figures_spec.rb`, `spec/requests/admin/analytics_compare_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Overview.** The overview page shows four figures below the worklist:
    - collections rate
    - overdue amount
    - visitors today
    - on site now

    Each links to its page.
  - **Comparison.** In "All tamans" scope the Analytics page has a comparison table with one row per taman. Each row shows occupancy, collections rate, overdue, visitors over 30 days, utilisation, active permits and escrow held. Columns are sortable, and the table falls back to cards on phones.
  - **JMB access.** A staff member with role `taman_manager` and all-`view` overrides sees the Analytics page and the comparison for their taman only. Every write button is hidden, and every write attempt returns 403.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Write `docs/jmb-access.md`. It is a 10-line runbook: invite a JMB member as `taman_manager`, then set every module to View for that taman in Roles & permissions.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add overview figures, portfolio comparison and JMB access"`.

## Module done when

- [ ] With the seeded data, the analytics figures match the prototype's Analytics page within ±2%.
- [ ] A JMB-style user can view their taman's figures and cannot change anything.

## Progress log

| Date | Who | Note |
|---|---|---|
