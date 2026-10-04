# M05 · Permits & contractors

**Status:** Not started · **Owner:** — · **Wave:** 4 · **Depends on:** M04 (Gate::Check, gate events, guard console), M06 (Payable, Checkout, Escrow, slip verification), M10, M02, M11

**Goal:** Cover the full Malaysian renovation-permit lifecycle:
- An owner applies by category with documents.
- Management reviews and approves, conditionally on the deposit if one is due.
- The deposit and fee are paid, and the deposit goes into escrow.
- The contractor gets a shareable pass that the guardhouse checks against allowed hours, worker count and plates.
- Management sees who is on site live, can issue notices or stop work, and can blacklist offenders.
- After the work, an inspection releases the deposit in full, in part (itemised deductions), or forfeits it.

**Read first:**
- `../README.md`: Global Constraints (the exact permit statuses)
- `../contracts.md` §6 (Payable, Escrow), §7 (gate verdicts) and §10 (`permit.*` events)
- `../decisions.md` ADR-014 (state machines)

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Tasks |
|---|---|---|
| Mobile | Submit permit applications by category (renovation, contractor/vendor entry, move-in/out, heavy vehicle) | T05.2 |
| Mobile | Required document uploads (contractor company details, worker IC/passports, renovation plans, insurance policies) | T05.2 |
| Mobile | Integrated deposit & fee payment (gateway or bank-transfer receipt) | T05.4 |
| Mobile | Application status tracker | T05.3 |
| Mobile | Digital contractor pass & entry QR, shareable | T05.5 |
| Mobile | Work completion & deposit refund request | T05.8 |
| Mobile | Security: verify contractor / vendor permits (allowed hours, worker count, vehicle plates) | T05.5 |
| Mobile | Push for permit status & deposit updates | T05.3, T05.4, T05.8 |
| Web | Central permit registry & workflow board (filter by taman, unit, category, status, date) | T05.3 |
| Web | Category & policy configuration (types, deposits, fees, refund bank account, document checklists, work hours and day restrictions) | T05.1 |
| Web | Application review & approval workflow (review drawings and credentials, approve, reject with remarks, request resubmission, conditional approval pending deposit) | T05.3 |
| Web | Deposit escrow & refund management (pre- and post-work inspection checklist; full or partial refund with itemised deductions, or forfeiture) | T05.8 (ledger in M06 T06.8) |
| Web | Live dashboard of active on-site contractors | T05.6 |
| Web | Blacklist errant contractors / vendors across a taman or the whole portfolio | T05.7 |
| Web | Digital stop-work orders or violation notices | T05.6 |

**Prototype references:**
- Admin:
  - `admin/#/permits` (registry and `?view=board`)
  - `admin/#/permit/PMT-2669` (review)
  - `admin/#/refunds`
  - `admin/#/onsite`
  - `admin/#/enforcement`
  - `admin/#/permit-types`
- Guard console: `security/` → Permits view and `permitSheet` (worker stepper)
- `admin/data.js` sources:
  - `CONTRACTORS`
  - `PERMIT_TYPES`
  - `WORK_HOURS`
  - `PSTATUS`
  - `PERMITS`
  - `CHECKLIST`
  - `ONSITE`
  - `BLACKLIST`
  - `NOTICES`
  - `REFUND_ACCOUNTS`
- Storyboard:
  - D1 Permits list
  - D2 Category
  - D3 Details & documents
  - D4 Deposit & fee
  - D5 Status tracker
  - D6 Contractor pass
  - D7 Inspection & refund
  - C8 Contractor permit check

## Data model

**Status enum** (stored as snake_case; labels are the exact strings from Global Constraints):

| Stored value | Label |
|---|---|
| `pending_review` | Pending Review |
| `docs_requested` | Docs requested |
| `pending_deposit` | Pending Deposit |
| `approved` | Approved |
| `work_in_progress` | Work In Progress |
| `inspection_scheduled` | Inspection Scheduled |
| `completed` | Completed |
| `deposit_refunded` | Deposit Refunded |
| `rejected` | Rejected |

**Tables:**

| Table | Columns |
|---|---|
| `permit_types` | `organization_id`, `key` (`renovation`/`contractor_entry`/`move`/`heavy_vehicle`/custom), `name_en`, `name_ms`, `icon`, `deposit_landed_cents`, `deposit_strata_cents`, `fee_cents`, `max_days`, `max_workers`, `needs_inspection`, `max_tonnes`, `refund_account_id`, `active` |
| `permit_type_documents` | `permit_type_id`, `name_en`, `name_ms`, `required`, `position` |
| `work_hours` | One per taman: `weekday_from`, `weekday_to`, `saturday_from`, `saturday_to`, `sunday_allowed` (bool), `public_holidays_allowed` (bool), `quiet_rules` (text, e.g. "No hacking or drilling on Saturdays") |
| `public_holidays` | `on_date`, `name`, `state` (null means national) |
| `refund_accounts` | `organization_id`, `label`, `bank_name`, `account_name`, `account_no_last4` |
| `contractors` | `organization_id`, `name`, `ssm_no`, `phone`, `email` (deduplicated on `[organization_id, ssm_no]`) |
| `permits` | See below |
| `permit_documents` | `permit_id`, `permit_type_document_id` (nullable for extras), `state` (`needs_review`/`verified`/`resubmit`), `note`, `reviewed_by_id`; `file` attached |
| `permit_workers` | `permit_id`, `name`, `id_kind` (`ic`/`passport`), `id_last4`, `nationality`; `id_scan` attached (purged per retention) |
| `permit_vehicles` | `permit_id`, `plate`, `tonnes` |
| `permit_charges` | `permit_id`, `kind` (`deposit`/`fee`), `amount_cents`, `paid_cents` (Payable) |
| `permit_status_changes` | `permit_id`, `from`, `to`, `remark`, `by_id`, `created_at` (the status tracker) |
| `permit_notices` | `reference`, `permit_id`, `taman_id`, `kind` (`violation_notice`/`stop_work`), `reason`, `status` (`active`/`acknowledged`/`lifted`), `issued_by_id`, `acknowledged_at`, `lifted_at`, `lifted_by_id` |
| `blacklist_entries` | `organization_id`, `taman_id` (null means portfolio-wide), `kind` (`company`/`person`/`vehicle`), `name`, `ssm_no`, `id_last4`, `plate`, `reason`, `expires_on`, `added_by_id`, `lifted_at` |
| `inspections` | `permit_id`, `stage` (`pre`/`post`), `scheduled_at`, `inspector_id`, `checklist` (jsonb `[{ item, ok, note }]`), `result` (`pass`/`issues`), `notes`, `done_at`; `photos` attached |
| `refund_decisions` | `permit_id` (unique), `outcome` (`full`/`partial`/`forfeit`), `deductions` (jsonb `[{ item, amount_cents }]`), `refund_cents`, `decided_by_id`, `payout_ref`, `payout_account`, `paid_at` |

`permits` columns:
- `reference`
- `taman_id`, `unit_id`
- `applicant_id`
- `permit_type_id`
- `contractor_id`
- `contractor_contact_name`, `contractor_contact_phone`
- `scope_of_work`
- `starts_on`, `ends_on`
- `workers_count`
- `status`
- `deposit_cents`, `fee_cents` (copied from the type at submit)
- `insurer`, `policy_no`, `cover_cents`
- `refund_bank_name`, `refund_account_name`, `refund_account_no` (encrypted with `encrypts`)
- `pass_token`, `pass_code`
- `remarks`
- `blacklist_hit` (boolean, set at submit by T05.7's matcher)
- `completion_requested_at`, `completion_note`
- `submitted_at`, `approved_at`

## Interfaces

**Produces:**

```ruby
Permit::TRANSITIONS  # frozen hash, see T05.3
Permits::Submit.call(occupancy:, params:)                     # => Permit (pending_review); raises ActiveRecord::RecordInvalid
Permits::Transition.call(permit, to:, by:, remark: nil)       # => Permit; raises Permits::InvalidTransition; audits + notifies
Permits::Review.call(permit, decision: :approve | :reject | :request_docs, by:, remark:, document_states: {})
Permits::GateRule.call(raw, station:, at:)                    # registered with Gate::Check
Permits::OnSite.for(organization, taman_ids:)                 # => Array<OnSiteRow(permit, workers_in, since, last_event)>
Permits::Notices.issue!(permit, kind:, reason:, by:) / .lift!(notice, by:)
Blacklist.match(contractor: nil, id_last4: nil, plate: nil, taman:)   # => BlacklistEntry | nil
Permits::Refund.decide!(permit, outcome:, deductions:, by:) / .pay!(permit, payout_ref:, payout_account:, by:)
PermitCharge  # Payable
```

**Consumes:**
- M04: `Gate::Check.register`, `GateEvent`, `Gate::Admit`, the guard console Permits view slot
- M06: `Payable`, `Payments::Checkout`, `Payments::VerifySlip`, `Escrow`
- M10: `Notifier`
- M03: `Occupancy` (owner or tenant; sub-tenants can't apply)

## API endpoints

Residents need an `X-Unit-Id` header. Only owners and tenants can apply.

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/permit_types` | D2. Each type includes deposit for this unit's taman kind, fee, max days, max workers, required documents and work-hours text |
| GET | `/api/v1/permits` | D1 |
| GET | `/api/v1/permits/:id` | D5. Includes the status timeline, documents with state, charges, and `next_action` |
| POST | `/api/v1/permits` | D3. Multipart, idempotent; documents, workers and vehicles go inline |
| PATCH | `/api/v1/permits/:id/documents/:doc_id` | Resubmit a document |
| POST | `/api/v1/permits/:id/withdraw` | Moves the permit to `rejected` with the remark "Withdrawn by applicant"; only before `approved` |
| POST | `/api/v1/payments` | D4. Payable type `permit` (M06 endpoint) |
| GET | `/api/v1/permits/:id/pass` | D6. `qr_payload`, `code`, `share_url`, allowed hours, workers, plates |
| POST | `/api/v1/permits/:id/completion` | D7. Request inspection with optional notes and photos |
| GET | `/api/v1/permits/:id/refund` | D7. Inspection result, deductions, refund amount, payout status |
| POST | `/api/v1/permits/:id/notices/:notice_id/acknowledge` | Applicant acknowledges a notice |

`next_action` values:
- `upload_docs`
- `pay`
- `share_pass`
- `request_inspection`
- `none`

Guard (C8): `POST /api/v1/guard/checks` already covers contractor passes through `Gate::Check`. These endpoints are added:

| Method | Path |
|---|---|
| GET | `/api/v1/guard/permits/today` |
| POST | `/api/v1/guard/permits/:id/admit` (`{ station_id, workers_in, plates }`) |
| POST | `/api/v1/guard/permits/:id/exit` |

Public: `/p/:token` also renders contractor passes (contractor name, taman, allowed hours, workers, valid dates). It never shows the unit owner's name.

## Tasks

### T05.1 · Permit types, document checklists, work hours and refund accounts

**Files:**
- Create:
  - migrations and models for `permit_types`, `permit_type_documents`, `work_hours`, `public_holidays` and `refund_accounts`
  - `app/controllers/admin/permit_types_controller.rb`
  - views
  - `db/seeds/05_permits.rb` (types part)
- Test:
  - `spec/models/permit_type_spec.rb`
  - `spec/models/work_hours_spec.rb`
  - `spec/requests/admin/permit_types_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `PermitType#deposit_for(taman)` returns the landed or strata amount.
  - `WorkHours#allows?(time)` gives:

    | Time (KL) | Result |
    |---|---|
    | Wed 09:00–18:00 | true |
    | Wed 18:01 | false |
    | Sat 09:00–13:00 | true |
    | Sun, when `sunday_allowed` is false | false |
    | A public holiday, when not allowed | false |

  - `WorkHours#describe` returns "Weekdays 09:00–18:00 · Saturday 09:00–13:00 · No work on Sundays and public holidays".
  - On the admin page (`admin/#/permit-types`):
    - One card per type, editing deposit (landed/strata), fee, max days, max workers, needs inspection, max tonnes and refund account.
    - A document checklist editor with required/optional, reorder, and EN/BM names.
    - A work hours editor per taman.
    - Refund accounts CRUD (bank details are shown masked).
    - Needs `permit_review: full`.
    - Audited as `permit_type.updated` and `work_hours.updated`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the models, page and seeds.**
  - Seed from `PERMIT_TYPES`, `WORK_HOURS` and `REFUND_ACCOUNTS`.
  - Seed the 2026 and 2027 Malaysian national public holidays plus the Selangor and Kuala Lumpur state holidays into `public_holidays`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add permit types, document checklists and work hours"`.

### T05.2 · Applying for a permit (resident API)

**Files:**
- Create:
  - migrations and models for `contractors`, `permits`, `permit_documents`, `permit_workers`, `permit_vehicles` and `permit_status_changes`
  - `app/services/permits/submit.rb`
  - `app/controllers/api/v1/{permit_types,permits,permit_documents}_controller.rb`
  - serializers
- Test:
  - `spec/services/permits/submit_spec.rb`
  - `spec/requests/api/v1/permits_spec.rb` (rswag)

- [ ] **Step 1: Write failing specs.**
  - Submit creates a `pending_review` permit with reference `PMT-####`, copies deposit and fee from the type, and records the first status change. It fires `permit.submitted` to the staff bell and audits `permit.submitted` (the actor is the resident).
  - Each of these fails with a field error:

    | Rule | Message |
    |---|---|
    | A required document is missing | "Upload the Contractor SSM certificate." |
    | `ends_on - starts_on` exceeds `max_days` | "Renovation permits run up to 90 days." |
    | `workers_count > max_workers` | "Up to 8 workers for this permit." |
    | `starts_on` is in the past | "Pick a start date from today." |
    | A sub-tenant applies | 403 |
    | A file is not PDF/JPEG/PNG/HEIC, or over 10 MB | Rejected |

  - Contractor lookup reuses the row for an existing `ssm_no` in the organisation and creates one otherwise.
  - A blacklisted contractor, worker ID or plate is still accepted, but the permit is flagged `blacklist_hit` for the reviewer. It is not auto-rejected: the reviewer decides.
    - `Blacklist.match` arrives in T05.7. Until then `Submit` calls it only `if defined?(Blacklist)`, and T05.7 adds this spec case.
  - Resubmitting a document (PATCH) on a `docs_requested` permit replaces the file and sets `needs_review`. Once every resubmitted document is uploaded, the permit returns to `pending_review`.
  - Withdraw works before `approved` and is refused after.
  - `GET /permits/:id` returns the timeline from `permit_status_changes` with labels in the user's locale, plus `next_action`.
  - Include the tenant isolation shared example.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Store only the last 4 characters of IC/passport numbers in columns. The scan is the source of truth and is purged by retention (M14).

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add permit applications API"`.

### T05.3 · Workflow: state machine, registry, board and review page

**Files:**
- Create:
  - `app/models/permit.rb` (`TRANSITIONS`)
  - `app/services/permits/{transition,review}.rb`
  - `app/controllers/admin/permits_controller.rb`
  - `app/queries/admin/permits_query.rb`
  - views (index, board, review)
  - `config/initializers/{admin_permits,notifications_permits}.rb`
- Test:
  - `spec/models/permit_transitions_spec.rb`
  - `spec/services/permits/review_spec.rb`
  - `spec/requests/admin/permits_spec.rb`
  - `spec/system/admin/permit_review_spec.rb`

- [ ] **Step 1: Write failing transition specs** covering every allowed pair and a sample of forbidden ones.

  ```ruby
  Permit::TRANSITIONS = {
    "pending_review"       => %w[docs_requested pending_deposit approved rejected],
    "docs_requested"       => %w[pending_review rejected],
    "pending_deposit"      => %w[approved rejected],
    "approved"             => %w[work_in_progress rejected],
    "work_in_progress"     => %w[inspection_scheduled],
    "inspection_scheduled" => %w[completed work_in_progress],
    "completed"            => %w[deposit_refunded],
    "deposit_refunded"     => [],
    "rejected"             => []
  }.freeze
  ```

  Forbidden moves, for example `completed → approved`, raise `Permits::InvalidTransition`. The API maps that to 409 `invalid_transition`.

- [ ] **Step 2: Write failing review specs.**
  - Approving a permit that still has unpaid charges moves it to `pending_deposit` (conditional approval). With no charges it moves to `approved` and issues the pass (T05.5).
  - Rejecting needs remarks.
  - Requesting documents needs at least one document marked `resubmit` with a note.
  - Every decision records a `permit_status_changes` row, audits `permit.<decision>`, and fires `permit.status_changed`. The push reads "PMT-2689 needs a new document: Public liability insurance" or "PMT-2689 approved. Pay the RM 1,050.00 deposit and fee to start."
  - Per-document verify and resubmit buttons save the document state without changing the permit status.

- [ ] **Step 3: Write failing page specs.**
  - **Registry** (`admin/#/permits`):
    - Tabs by status group: Needs review, Awaiting deposit, Active, Inspection, Closed, All.
    - Filters: taman, unit, category, status, start date range.
    - Search: reference, unit, applicant, contractor, SSM.
    - CSV export.
  - **Board** (`?view=board`): one column per status. On phones it snaps one column per swipe.
  - **Review page** (`/admin/permits/:id`):
    - Scope, dates, workers, vehicles, contractor and insurance.
    - Documents with an inline PDF and image viewer.
    - The blacklist hit banner.
    - The decision form.
    - The status timeline.
  - **Permissions:** `permit_review: edit` to decide, `view` to see.
  - **Sidebar and worklist:** the count is `pending_review` plus `pending_deposit` with a slip uploaded. Reviews older than 2 days go on the worklist.
  - Include the tenant isolation shared example.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement it.**
  - Seed from `PERMITS` in `admin/data.js`, with the same status distribution and documents.
  - Register the `permit.*` events (contracts §10) with EN and BM templates.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add permit workflow, registry, board and review page"`.

### T05.4 · Deposit and fee payment

**Files:**
- Create:
  - the `permit_charges` migration
  - `app/models/permit_charge.rb`
  - `app/services/permits/charges.rb`
- Modify:
  - `app/services/payments/checkout.rb` (register the `permit` payable type: both charges at once)
  - `app/services/payments/verify_slip.rb` (callback)
- Test:
  - `spec/models/permit_charge_spec.rb`
  - `spec/requests/api/v1/permit_payment_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - Approval creates two charges: a fee, which is not refundable, and a deposit. Charges of 0 are skipped.
  - `POST /api/v1/payments` with `{ payables: [{ type: "permit", id }] }` pays both charges in one payment.
  - Settling (gateway or verified slip) does three things:
    - it marks the charges paid;
    - it calls `Escrow.collect!(permit, amount_cents: deposit, payment:)`;
    - it moves the permit `pending_deposit → approved`, then fires `permit.deposit_verified` and issues the pass.
  - An uploaded slip shows the permit as "Receipt uploaded" in the registry, using the prototype's `depositState`. Rejecting the slip notifies the applicant, and the permit stays in `pending_deposit`.
  - `depositState` in the API derives from the charges and payments:

    | Value | Meaning |
    |---|---|
    | `not_paid` | No payment yet |
    | `receipt_uploaded` | Slip uploaded, waiting on staff |
    | `held` | Deposit paid and in escrow |
    | `refunded` | Deposit returned |
    | `forfeited` | Deposit kept by management |

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add permit deposit and fee payment into escrow"`.

### T05.5 · Contractor pass and guardhouse verification

**Files:**
- Create:
  - `app/services/permits/gate_rule.rb`
  - `app/services/permits/issue_pass.rb`
  - `app/controllers/api/v1/guard/permits_controller.rb`
  - `app/views/security/permits/*` (Permits view + `permitSheet`)
  - `app/views/passes/_permit.html.erb`
- Modify: `config/initializers/gate.rb` (register `:permit`)
- Test:
  - `spec/services/permits/gate_rule_spec.rb`
  - `spec/requests/api/v1/guard/permits_spec.rb`
  - `spec/system/security/contractor_check_spec.rb`

- [ ] **Step 1: Write failing gate-rule specs.** Port the prototype's `judgePermit`:

  | Situation | Tone | Code | Title / reason |
  |---|---|---|---|
  | Approved or WIP, within dates, Wed 10:00 | ok | admit | "Admit contractor". Reasons: "Bina Jaya Renovation · 5 workers allowed · WXY 1234" |
  | Same, Wed 18:30 | bad | outside_hours | "Outside work hours". Reason: "Weekdays 09:00–18:00" |
  | Sunday when not allowed | bad | outside_hours | |
  | Before `starts_on` or after `ends_on` | bad | expired / not_yet_valid | |
  | Active stop-work order | bad | stop_work | "Stop-work order". Reason: the notice reason |
  | Contractor, worker or plate on the blacklist for this taman or portfolio-wide | bad | blacklisted | |
  | Status `pending_deposit` or earlier | bad | not_yet_valid | "Permit not approved yet" |
  | Pass of another taman | bad | wrong_taman | |

  Actions are `[:admit, :refuse, :count_workers, :check_plate]`.

- [ ] **Step 2: Write failing admit specs.**
  - Admitting with `workers_in` above `max_workers` (counting workers already inside today) is refused with "8 workers allowed. 6 are already inside, so 2 more can enter."
  - The first admit moves `approved → work_in_progress` (system actor, audited).
  - Each admit creates a `gate_event` with `permit_id`, `people_count` and `plate`.
  - Exit records an `exit` event.

- [ ] **Step 3: Write a failing system spec.** In the guard console Permits view:
  - Today's active permits appear.
  - Scanning a contractor QR opens `permitSheet` with the worker stepper.
  - Admitting updates the on-site board (T05.6) live.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement it.**
  - `IssuePass` sets `pass_token` and `pass_code` (`Pass::Code` from M04).
  - `/p/:token` renders the permit pass partial.
  - Register `Gate::Check.register(:permit) { |raw, station:, at:| Permits::GateRule.call(raw, station:, at:) }`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add contractor pass and guardhouse permit verification"`.

### T05.6 · On site now, violation notices and stop-work orders

**Files:**
- Create:
  - the `permit_notices` migration and model
  - `app/services/permits/{on_site,notices}.rb`
  - `app/controllers/admin/onsite_controller.rb`
  - `app/controllers/admin/permit_notices_controller.rb`
  - views, plus the overview slot `app/views/admin/overview/_onsite.html.erb`
- Test:
  - `spec/services/permits/on_site_spec.rb`
  - `spec/services/permits/notices_spec.rb`
  - `spec/requests/admin/onsite_spec.rb`
  - `spec/system/admin/onsite_live_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `OnSite.for` lists permits with an admit event today (KL date) and no later exit. It shows `workers_in` (admits minus exits) and `since` (the first admit today).
  - Admits after midnight count toward the new day.
  - **On site now page** (`admin/#/onsite`):
    - Shows all tamans in scope.
    - Each card shows contractor, unit, workers in / allowed, since, and the permit link, with Notice and Stop work buttons.
    - Updates arrive live through `[organization, :onsite]`.
    - The live count in the sidebar uses a green dot.
  - **Issuing a notice:**
    - It needs a reason.
    - It creates `NTC-###`.
    - It fires `permit.violation_notice` or `permit.stop_work` to the applicant.
    - The contractor is told without SMS (ADR-012): an email if the contractor record has one, plus a "Send on WhatsApp" button for staff. The button opens `https://wa.me/<contractor contact phone>?text=<notice text and reference>`.
    - The guardhouse sees a stop-work order at the next scan.
    - It is audited.
    - A stop-work order immediately makes `Gate::Check` return `stop_work` for that permit.
  - **Lifting a stop-work order** needs `contractor_enforcement: edit` and is audited.
  - **Applicant acknowledgement** goes through the API and sets `acknowledged`.
  - The enforcement page lists notices with status filters.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed `NOTICES` and `ONSITE` (as gate events) from `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add live on-site board, notices and stop-work orders"`.

### T05.7 · Contractor blacklist

**Files:**
- Create:
  - the `blacklist_entries` migration and model
  - `app/services/blacklist.rb`
  - `app/controllers/admin/blacklist_entries_controller.rb` (a tab on the Enforcement page)
- Test:
  - `spec/services/blacklist_spec.rb`
  - `spec/requests/admin/blacklist_entries_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `Blacklist.match` covers these cases:

    | Entry | Matches |
    |---|---|
    | Company by SSM number | Regardless of name spelling |
    | Person by ID last-4 plus name similarity | trigram ≥ 0.6 |
    | Vehicle by plate | Plate normalised: uppercase, single spaces |
    | Taman-scoped | That taman only |
    | Portfolio-wide (`taman_id: nil`) | Every taman in the organisation |
    | Expired or lifted | No match |
    | Another organisation's entry | Never matches |

  - **Admin:**
    - Adding needs `contractor_enforcement: full` and a reason, and offers a scope choice ("This taman" or "All tamans we manage").
    - Lifting is audited.
    - Adding a company with active permits warns "2 active permits use this contractor" with links.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed from `BLACKLIST` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add contractor blacklist across taman or portfolio"`.

### T05.8 · Inspections and deposit refunds

**Files:**
- Create:
  - migrations and models for `inspections` and `refund_decisions`
  - `app/services/permits/{schedule_inspection,record_inspection,refund}.rb`
  - `app/controllers/admin/refunds_controller.rb`
  - `app/controllers/api/v1/permit_completions_controller.rb`
  - views
- Test:
  - `spec/services/permits/refund_spec.rb`
  - `spec/requests/admin/refunds_spec.rb`
  - `spec/requests/api/v1/permit_completion_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Pre-work inspection** (optional, from `approved`): staff record the checklist from `CHECKLIST` (lift padding, corridors, common area, road shoulder, drains) with notes and photos.
  - **Completion request:**
    - `POST /permits/:id/completion` from `work_in_progress` stores the request and puts "Schedule inspection" on the worklist.
    - Staff schedule a time, which moves the permit to `inspection_scheduled` and notifies the applicant: "Inspection on Tue 13 Oct, 10:00".
  - **Post-work inspection:**
    - Staff compare against the pre-work notes.
    - `result: issues` with "Needs fixing" sends the permit back to `work_in_progress` with remarks.
    - `pass` lets them decide the refund.
  - **`Refund.decide!` outcomes:**

    | Outcome | Effect |
    |---|---|
    | `full` | `refund_cents = held` |
    | `partial` | Itemised deductions, e.g. `[{ item: "Lift car padding torn", amount_cents: 25000 }]`. Each one calls `Escrow.deduct!`, and their total can't exceed the amount held: "Deductions can't exceed the RM 1,000.00 held." |
    | `forfeit` | Calls `Escrow.forfeit!` and needs a reason |

    Then:
    - The permit moves to `completed`.
    - The applicant gets `permit.status_changed`, which carries the deduction lines.
    - The decision is audited as `permit.refund_decided`.
  - **`Refund.pay!`:**
    - It records the IBG reference and the account (from the permit's encrypted refund bank fields, masked in the UI), and calls `Escrow.refund!`.
    - The permit moves to `deposit_refunded`, and `permit.refund_paid` fires.
    - A forfeit skips the payout. The permit stays `completed`, and the escrow balance becomes 0.
  - **Inspections & refunds page** (`admin/#/refunds`):
    - Tabs: To schedule, Scheduled, To decide, To pay, Done.
    - The decision drawer has a deductions editor: add row, item, RM amount, running total, and "Refund to applicant: RM 750.00".
    - Needs `deposits_refunds: edit`.
  - **`GET /api/v1/permits/:id/refund`** returns the inspection result, deductions, refund amount and payout status (D7).

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed inspections and refunds for the `completed` and `deposit_refunded` permits from `admin/data.js`, using the same deduction texts.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add inspections and itemised deposit refunds"`.

## Module done when

- [ ] The full lifecycle works on staging with one permit:
  1. Apply in the app.
  2. Request documents.
  3. Resubmit.
  4. Approve conditionally.
  5. Pay with the Fake gateway.
  6. Share the pass.
  7. The guard admits 5 workers at 10:00 and refuses them at 18:30.
  8. Issue a stop-work order, then lift it.
  9. Request completion.
  10. Inspection finds one deduction.
  11. Partial refund paid.
- [ ] After that run, the escrow balance for the permit is 0, the ledger reads collected, deduction, refund, and the push notifications arrived at each step.

## Progress log

| Date | Who | Note |
|---|---|---|
