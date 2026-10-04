# M07 · Facilities

**Status:** Not started · **Owner:** — · **Wave:** 3 · **Depends on:** M03, M10, M06 (Payable, Escrow). Also M02 and M11.

**Goal:** Residents browse bookable facilities, pick free slots, pay any fee or deposit, and get a reminder before their booking. Management configures the catalog and rules, approves or overrides bookings, and sees utilization. The database guarantees that no slot is ever double-booked.

**Read first:**
- Review Focus 3
- `../contracts.md` §6 (Payable)
- `../decisions.md` ADR-014

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | Facility catalog & calendars | All |
| Web | Booking rules (caps, deposits, blackout dates) | All |
| Web | Approve / override bookings | All |
| Web | Utilization reports | All |
| Mobile | Browse bookable facilities | All |
| Mobile | Book slots, cancel, see booking status | All |
| Mobile | Push reminders before booked time | All |
| Mobile | Push for booking confirmations | All |
| Mobile | Directory of facilities | Facilities half |

**Prototype references:**
- Admin pages:
  - `admin/#/facilities`: catalog and week calendar; on phones, a day agenda
  - `admin/#/bookings`
  - `admin/#/booking-rules`
  - `admin/#/utilization`
- Storyboard screens: F1 Book a facility, F2 Pick slots, F3 My bookings.

## Data model

**`facilities`**

| Column | Notes |
|---|---|
| `taman_id` | |
| `name` | |
| `kind` | `hall` / `court` / `bbq` / `pool` / `gym` / `room` / `other` |
| `capacity` | |
| `bookable` | Boolean. Pool and gym are false: listed only |
| `rate_cents`, `rate_unit` | `rate_unit` is `per_hour` or `per_booking` |
| `deposit_cents` | |
| `requires_approval` | Boolean |
| `status` | `open` / `closed` |
| `closed_reason` | |
| `opens_at`, `closes_at` | Time of day |
| `slot_minutes` | Default 60 |
| `description` | |

A facility has an attached `photo`.

**`facility_rules`**: one row per facility.

| Column | Notes |
|---|---|
| `facility_id` | |
| `max_hours` | Per booking |
| `per_unit_per_month` | |
| `advance_days` | |
| `cancel_cutoff_hours` | |
| `reminder_hours` | Default 2 |

**`blackout_dates`**

| Column | Notes |
|---|---|
| `taman_id` | |
| `facility_id` | Null means every facility in the taman |
| `on_date` | |
| `reason` | |

**`bookings`**

| Column | Notes |
|---|---|
| `reference` | |
| `taman_id`, `facility_id`, `unit_id` | |
| `booked_by_id` | |
| `starts_at`, `ends_at` | |
| `status` | `pending_payment` / `pending_approval` / `confirmed` / `rejected` / `cancelled` / `completed` |
| `hold_expires_at` | |
| `purpose` | |
| `guests` | |
| `fee_cents`, `deposit_cents` | |
| `cancelled_by_id` | |
| `cancel_reason` | |
| `reminded_at` | |
| `override_by_id` | |
| `override_reason` | |

The double-booking guard on `bookings` (Review Focus 3):

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (facility_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status IN ('pending_payment', 'pending_approval', 'confirmed'));
```

`btree_gist` is enabled in M00 T00.1.

## Interfaces

**Produces:**

```ruby
Bookings::Availability.call(facility, date:)   # => Array<Slot(starts_at, ends_at, state: :free | :taken | :blackout | :past | :closed)>
Bookings::Create.call(occupancy:, facility:, starts_at:, hours:, purpose:, guests:, override: nil)  # => Booking; raises Bookings::SlotTaken, ActiveRecord::RecordInvalid
Bookings::Cancel.call(booking, by:, reason: nil)
Bookings::Decide.call(booking, approve:, by:, reason: nil)
BookingCharge   # Payable: amount_due = fee + deposit; apply_payment! confirms (or moves to pending_approval) and calls Escrow.collect! for the deposit
```

**Consumes:**
- M03: occupancy scope `facility_booking`.
- M06: `Payable`, `Payments::Checkout`, `Escrow`.
- M10: `Notifier` for these events:
  - `booking.confirmed`
  - `booking.pending_approval`
  - `booking.rejected`
  - `booking.cancelled_by_admin`
  - `booking.reminder`

## API endpoints

Every endpoint needs `X-Unit-Id`. Booking and cancelling also need the `facility_booking` scope.

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/facilities` | F1: facilities in the unit's taman, plus listed-only ones (pool, gym) with their hours |
| GET | `/api/v1/facilities/:id` | Details and rules, in plain words ("Up to 6 hours. Book up to 60 days ahead.") |
| GET | `/api/v1/facilities/:id/availability?date=2026-10-10` | F2 |
| POST | `/api/v1/bookings` (idempotent) | F2. Returns `booking` and, when payment is due, `payment_required: { amount, payable: { type: "booking", id } }` |
| GET | `/api/v1/bookings?status=upcoming\|past` | F3 |
| GET | `/api/v1/bookings/:id` | |
| POST | `/api/v1/bookings/:id/cancel` | F3 |

## Tasks

### T07.1 · Facility catalog, rules and blackout dates

**Files:**
- Create:
  - migrations and models for `facilities`, `facility_rules` and `blackout_dates`
  - `app/controllers/admin/facilities_controller.rb`
  - `app/controllers/admin/booking_rules_controller.rb`
  - views
  - `db/seeds/07_facilities.rb`
- Test:
  - `spec/models/facility_spec.rb`
  - `spec/requests/admin/facilities_spec.rb`
  - `spec/requests/admin/booking_rules_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Catalog CRUD.** Needs `facilities: edit`. Changes are audited as `facility.updated`.
  - **Closing a facility.** It needs a reason. It warns "3 upcoming bookings will be cancelled and the residents told", then cancels them with `booking.cancelled_by_admin` once confirmed.
  - **Rules page** (`admin/#/booking-rules`):
    - One card per facility, with these fields:
      - max hours
      - bookings per unit per month
      - advance days
      - cancellation cutoff
      - reminder hours
      - deposit
    - A blackout dates list per taman, with add and remove.
  - **Validation.** `closes_at` must be after `opens_at`. `slot_minutes` must be 30, 60 or 120.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed the 15 facilities, their rules and the blackout dates from `FACILITIES` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add facility catalog, booking rules and blackout dates"`.

### T07.2 · Booking engine and the no-overlap constraint (Review Focus 3)

**Files:**
- Create:
  - the bookings migration, including the exclusion constraint
  - `app/models/booking.rb`
  - `app/services/bookings/{availability,create,cancel,decide}.rb`
- Test:
  - `spec/services/bookings/create_spec.rb`
  - `spec/services/bookings/availability_spec.rb`
  - `spec/models/booking_overlap_spec.rb`

- [ ] **Step 1: Write the failing concurrency spec.**

  ```ruby
  RSpec.describe "Booking overlap" do
    include_context "concurrency"

    it "lets exactly one of two simultaneous bookings for the same slot win" do
      court = create(:facility, kind: "court", rate_cents: 0, deposit_cents: 0)
      a, b = create_list(:occupancy, 2, unit: create(:unit, taman: court.taman))
      at = Time.zone.local(2026, 10, 10, 20)
      results = [a, b].map do |occ|
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            Bookings::Create.call(occupancy: occ, facility: court, starts_at: at, hours: 1, purpose: "Badminton", guests: 4)
            :ok
          rescue Bookings::SlotTaken
            :taken
          end
        end
      end.map(&:value)
      expect(results).to contain_exactly(:ok, :taken)
      expect(Booking.where(facility: court).count).to eq(1)
    end

    it "allows back-to-back bookings (20:00-21:00 then 21:00-22:00)" do
      court = create(:facility, kind: "court", rate_cents: 0, deposit_cents: 0)
      occ = create(:occupancy, unit: create(:unit, taman: court.taman))
      first = Bookings::Create.call(occupancy: occ, facility: court, starts_at: Time.zone.local(2026, 10, 10, 20), hours: 1, purpose: "Badminton", guests: 4)
      second = Bookings::Create.call(occupancy: occ, facility: court, starts_at: Time.zone.local(2026, 10, 10, 21), hours: 1, purpose: "Badminton", guests: 4)
      expect([first, second]).to all(be_persisted)
    end
  end
  ```

- [ ] **Step 2: Write the failing rule specs for `Create`.** Each failure has a plain message:

  | Case | Message |
  |---|---|
  | Outside open hours | "Book between 08:00 and 22:00." |
  | Not aligned to the slot | "Pick a start on the hour." |
  | Longer than `max_hours` | "Up to 2 hours per booking." |
  | Beyond `advance_days` | "You can book up to 14 days ahead." |
  | In the past | "Pick a time from now on." |
  | Over `per_unit_per_month` | "Your unit has used its 8 bookings for October." Counted by the KL month of `starts_at`, excluding cancelled and rejected bookings |
  | Blackout date | "Closed on 18 Oct: Taman AGM." |
  | Facility closed | "Futsal court is closed for repair." |
  | Not bookable (pool) | "This facility doesn't take bookings." |
  | Sub-tenant without `facility_booking` | `scope_missing` |

  Status after creation:
  - A free facility without approval becomes `confirmed` and sends `booking.confirmed`.
  - A free facility with approval becomes `pending_approval` and sends `booking.pending_approval` to staff.
  - A paid facility becomes `pending_payment` with `hold_expires_at` 15 minutes ahead.

  Fee calculation:
  - `per_hour` is rate × hours.
  - `per_booking` is the flat rate.

  Overrides:
  - A staff `override:` with a reason skips the caps and the advance rule.
  - It never skips the overlap constraint.
  - It is audited as `booking.override`.

- [ ] **Step 3: Write the failing availability spec.** For a court with 08:00–22:00 hours and a 60-minute slot, on a day with one confirmed booking at 20:00, it returns:
  - 14 slots;
  - the 20:00 slot as `:taken`;
  - slots before now as `:past`.

  On a blackout day every slot is `:blackout`.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the migration and services.**
  - Write the constraint SQL in the migration with `execute`.
  - `Create` rescues `ActiveRecord::StatementInvalid` when the cause is `PG::ExclusionViolation` and raises `Bookings::SlotTaken`. The API maps that to 409 `slot_taken` with "Someone just booked that slot. Pick another time."
  - Add `Bookings::ExpireHoldsJob`. It runs every minute and cancels `pending_payment` bookings past `hold_expires_at` with the reason "Payment not completed".

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add booking engine with database-level overlap guard"`.

### T07.3 · Booking API and payment

**Files:**
- Create:
  - `app/models/booking_charge.rb`
  - `app/controllers/api/v1/{facilities,bookings}_controller.rb`
  - serializers
- Modify: `app/services/payments/checkout.rb` (register the `booking` payable type)
- Test:
  - `spec/requests/api/v1/facilities_spec.rb` (rswag)
  - `spec/requests/api/v1/bookings_spec.rb` (rswag)
  - `spec/models/booking_charge_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Facility list.** `GET /facilities` lists the unit's taman only. Each facility has:
    - `bookable`, `rate`, `deposit`, `requires_approval`
    - `status`
    - `rules_text`, a list of plain-language strings
  - **Availability.** It returns slots for the date in KL time.
  - **Creating a booking.**
    - `POST /bookings` returns 201 with the booking.
    - For a paid facility it also returns `payment_required`. The app then calls `POST /payments` with the booking payable (M06).
    - A taken slot returns 409 `slot_taken`.
  - **Booking charge.** `BookingCharge#apply_payment!`:
    - moves the booking to `confirmed`, or to `pending_approval` when approval is needed;
    - calls `Escrow.collect!(booking, amount_cents: deposit_cents, payment:)` when the deposit is above zero.
  - **Cancelling.**
    - Cancelling before the cutoff sets `cancelled`. If a fee or deposit was paid, it adds a worklist item (`Admin::Registry.worklist(:bookings)`): "Refund RM 80.00 for BK-5102".
      - Staff refund the fee in the gateway dashboard and mark the payment `refunded` on Reconciliation.
      - Staff return the deposit with `Escrow.refund!`, from the booking drawer (T07.4).
    - Cancelling after the cutoff returns 409 with "Cancellations close 72 hours before. Contact the management office."
  - **My bookings.** Upcoming bookings are sorted soonest first. Past bookings include `completed`.
  - **Isolation.** Include the tenant isolation shared example.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add facility booking API with fee and deposit payment"`.

### T07.4 · Admin bookings and calendar

**Files:**
- Create:
  - `app/controllers/admin/bookings_controller.rb`
  - `app/queries/admin/bookings_query.rb`
  - `app/views/admin/facilities/_calendar.html.erb`
  - `app/components/ui/week_calendar_component.rb`
- Test:
  - `spec/requests/admin/bookings_spec.rb`
  - `spec/system/admin/facilities_calendar_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Bookings page** (`admin/#/bookings`):
    - Tabs: Pending approval, Upcoming, Past, Cancelled.
    - Filters: taman, facility, date.
    - Search: reference, unit, name.
  - **Approve and reject.** Rejecting needs a reason. Both notify the resident and are audited as `booking.approved` / `booking.rejected`.
  - **Staff override.** Staff can:
    - book on behalf of a unit (with an override reason when breaking caps);
    - cancel any booking with a reason, which sends `booking.cancelled_by_admin`;
    - release a deposit after the booking, as a full refund or with deductions, through `Escrow`.
  - **Calendar** (`admin/#/facilities`):
    - A week grid per facility at 1440px. Bookings are blocks coloured by status.
    - At 390px it becomes a day-by-day agenda.
  - **Sidebar and worklist.** The count is pending approvals. Approvals older than 24 h go on the worklist.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed 110 bookings from `BOOKINGS` in `admin/data.js` with the same statuses. Seeding goes through `Booking.insert_all` after checking overlaps in Ruby, as the prototype does.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add admin bookings with approval, override and calendar"`.

### T07.5 · Reminders, completion and utilization

**Files:**
- Create:
  - `app/jobs/bookings/{remind,complete}_job.rb`
  - `app/services/facilities/utilization.rb`
  - `app/controllers/admin/utilization_controller.rb`
  - views
- Test:
  - `spec/jobs/bookings/remind_job_spec.rb`
  - `spec/services/facilities/utilization_spec.rb`
  - `spec/requests/admin/utilization_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Reminder.** `RemindJob` runs every 5 minutes. It sends `booking.reminder` once for confirmed bookings starting within `reminder_hours`, then sets `reminded_at`. Example push body: "Badminton court A at 20:00 today. Have a good game." A cancelled booking gets no reminder.
  - **Completion.** `CompleteJob` runs every 15 minutes and sets confirmed bookings past `ends_at` to `completed`.
  - **Utilization.** `Facilities::Utilization.call(taman_ids:, from:, to:)` returns per facility:
    - `booked_hours`
    - `open_hours`
    - `rate`, which is booked ÷ open
    - `bookings`
    - `cancellations`
    - `top_hours`, the 3 busiest hours of the week
    - It excludes blackout days from `open_hours`.
  - **Utilization page** (`admin/#/utilization`):
    - Tiles and `Ui::BarsComponent` charts.
    - Date range, per-taman filter, CSV export.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Add both jobs to `config/recurring.yml`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add booking reminders, completion and utilization report"`.

## Module done when

- [ ] Review Focus 3's concurrency spec passes 20 runs in a row: `for i in $(seq 20); do bin/rspec spec/models/booking_overlap_spec.rb || break; done`.
- [ ] A paid hall booking on staging goes through: Fake gateway, then confirmed, then a reminder push 2 h before. The deposit shows on the Escrow page.

## Progress log

| Date | Who | Note |
|---|---|---|
