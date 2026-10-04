# M06 · Billing & payments

**Status:** Not started · **Owner:** — · **Wave:** 3 · **Depends on:** M03 and M10. Also M02 (admin) and M11 (API).

**Goal:** Money flows that are never ambiguous:
- Management creates, schedules and bulk-imports invoices.
- Residents pay in the app through Billplz (FPX, card or e-wallet, picked on the Billplz page) or by uploading a bank-transfer slip. Residents pay exactly the amount on the bill.
- The money goes straight into the customer's own Billplz account for that taman (a payout account). Tamanly never holds it.
- Staff reconcile anything that doesn't match automatically.
- Reminders and late fees run on their own.
- Deposits held for permits and bookings sit in an escrow ledger that can't go negative.
- Statements export as CSV or PDF.

**Read first:**
- `../contracts.md` §6 (payments) and §9 (references)
- `../decisions.md`: ADR-008, ADR-011 and ADR-011a (Billplz)
- Review Focus 2 and Review Focus 5
- `PRODUCT.md` principle 3: "Money is clear"

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Tasks |
|---|---|---|
| Web | Create & schedule invoices | T06.1, T06.2 |
| Web | Bulk invoices (user request) | T06.3 |
| Web | Payment reconciliation & status board | T06.5 |
| Web | Permit security deposit tracking, escrow ledger, and refund payouts | T06.8, with M05 T06 |
| Web | Late fees / reminders configuration | T06.7 |
| Web | Export statements (CSV / PDF) | T06.9 |
| Web | Owner portfolio billing across properties | T06.9 |
| Mobile | View invoices & balance for linked units | T06.6 |
| Mobile | Pay bills (in-app payment flow) | T06.4 |
| Mobile | Receipt history & reminders | T06.6, T06.7 |
| Mobile | Sub-tenant: view only or pay if granted | T06.6 |
| Mobile | Push for bills due | T06.7 |

**Prototype references:**
- Admin pages:
  - `admin/#/invoices`, including `?act=bulk-invoice&sample=1`
  - `admin/#/reconciliation`
  - `admin/#/escrow`
  - `admin/#/portfolios`
  - `admin/#/late-fees`
  - `admin/#/statements`
- Bulk invoice logic: `admin/pages2.js`, `bulkParse` and `checkBulkParse`. Port its 10 checks as specs.
- Storyboard screens:
  - E1 Bills
  - E2 Invoice & pay
  - E3 Payment successful
  - E4 Receipts & reminders
  - E5 Sub-tenant · view only

## Data model

**`invoices`**

| Column | Notes |
|---|---|
| `reference` | |
| `taman_id`, `unit_id` | |
| `bill_to_id` | The owner at issue time, a user |
| `category` | `maintenance` / `sinking_fund` / `maintenance_sinking` / `insurance` / `extra` / `late_fee` / `other` |
| `description` | |
| `period_on` | First day of the period month |
| `amount_cents`, `paid_cents` | |
| `issued_on`, `due_on` | |
| `voided_at`, `void_reason` | |
| `schedule_id` | |
| `source_invoice_id` | Set on late fees |
| `batch_id` | |
| `reminders_sent` | jsonb list of reminder offsets already sent (T06.7) |

Constraints and indexes:
- Check `paid_cents BETWEEN 0 AND amount_cents`.
- Unique `[schedule_id, unit_id, period_on]`.
- Unique `[source_invoice_id]` where category is `late_fee`.
- Trigram index on `reference` and `description`.

**`invoice_schedules`**

| Column | Notes |
|---|---|
| `reference` | |
| `taman_id`, `name`, `category` | |
| `target` | `all_units` / `blocks` / `units` |
| `target_ids` | `uuid[]` |
| `amount_mode` | `flat` / `per_sqft` / `unit_fee` |
| `amount_cents`, `rate_per_sqft_cents` | |
| `frequency` | `monthly` / `quarterly` / `yearly` |
| `day_of_month` | |
| `next_run_on` | |
| `due_after_days` | |
| `status` | `active` / `paused` |

**`invoice_batches`**

| Column | Notes |
|---|---|
| `taman_id` | Nullable for multi-taman batches |
| `created_by_id` | |
| `source` | `bulk_paste` / `bulk_csv` / `schedule` |
| `count`, `total_cents` | |

**`payments`**

| Column | Notes |
|---|---|
| `reference` | |
| `organization_id`, `taman_id`, `payer_id` | |
| `payout_route_id` | Where the money goes: the payout account and its Billplz collection |
| `method` | `online` (Billplz) / `bank_transfer` / `cash` / `cheque` |
| `channel` | What Billplz reports the payer used, e.g. `FPX`; blank for other methods |
| `amount_cents` | |
| `status` | contracts §6 |
| `provider`, `provider_ref` | |
| `failure_reason`, `note` | |
| `paid_at` | |
| `verified_by_id` | |

Payments carry an attached `receipt_slip`.

**`payment_allocations`**

| Column | Notes |
|---|---|
| `payment_id` | |
| `payable_type`, `payable_id` | |
| `amount_cents` | |

Unique `[payment_id, payable_type, payable_id]`.

**`payment_events`**

| Column | Notes |
|---|---|
| `provider`, `provider_event_id` | |
| `payment_id` | |
| `payload` | jsonb |
| `processed_at` | |

Unique `[provider, provider_event_id]`.

**`receipts`**

| Column | Notes |
|---|---|
| `reference` | |
| `payment_id` | Unique |
| `issued_at` | |

Receipts carry an attached `pdf`.

**`billing_settings`**: one row per taman.

| Column | Default |
|---|---|
| `grace_days` | 7 |
| `late_fee_kind` | `percent` (or `flat`) |
| `late_fee_rate_bp` | 1000, which is 10.00% |
| `late_fee_flat_cents` | |
| `late_fee_cap_cents` | |
| `late_fee_categories` | `text[]` |
| `reminders` | jsonb `[{ offset_days, push, email }]` |

Bank details for manual transfers come from the taman's payout account, not from here.

**`payout_accounts`**: the customer's own Billplz accounts (ADR-011a). One row per Billplz account, so one per bank account.

| Column | Notes |
|---|---|
| `organization_id` | |
| `label` | e.g. "Damai Jaya MC · sinking fund" |
| `provider` | `billplz`, or `fake` in development and test |
| `credentials` | Encrypted JSON: `api_key` and `x_signature_key` |
| `sandbox` | Boolean |
| `bank_name`, `bank_account_name`, `bank_account_no` | Shown to residents for manual transfers |
| `status` | `connected` / `error` / `disconnected` |
| `last_checked_at` | |
| `last_error` | |

**`payout_routes`**: which account a taman's money goes to, from when.

| Column | Notes |
|---|---|
| `taman_id`, `payout_account_id` | |
| `purpose` | `default` / `sinking_fund` / `deposits` |
| `collection_id` | The Billplz collection created for this route inside the account |
| `starts_on`, `ends_on` | `ends_on` is null while the route is current |

The routes table has a constraint so a taman can never have two live routes for the same purpose:

```sql
ALTER TABLE payout_routes ADD CONSTRAINT payout_routes_no_overlap
  EXCLUDE USING gist (taman_id WITH =, purpose WITH =, daterange(starts_on, ends_on, '[)') WITH &&);
```

**`escrow_entries`**: append-only.

| Column | Notes |
|---|---|
| `taman_id` | |
| `source_type`, `source_id` | A Permit or a Booking |
| `kind` | `collected` / `deduction` / `refund` / `forfeit` |
| `amount_cents` | Positive for `collected`, negative otherwise |
| `payment_id` | |
| `reason` | |
| `payout_ref` | IBG or DuitNow reference of a refund |
| `paid_to` | Masked account the refund went to, e.g. "Maybank ••• 4410" |
| `recorded_by_id` | |
| `created_at` | |

The invoice status the user sees is computed, never stored:

```ruby
def status
  return "void" if voided_at
  return "paid" if paid_cents >= amount_cents
  return "overdue" if due_on < Date.current      # Date.current is KL (config.time_zone)
  paid_cents.positive? ? "partially_paid" : "due"
end
# SQL scopes with the same rules: Invoice.due / .overdue / .partially_paid / .paid / .open
```

## Interfaces

**Produces:**
- contracts §6: `Payable`, `Payments::Checkout`, `Payments::Gateway`, `Payments::Settle`

```ruby
Invoices::Issue.call(unit:, category:, description:, amount_cents:, due_on:, period_on: nil, schedule: nil, batch: nil, notify: true) # => Invoice
Invoices::Bulk.parse(text_or_csv, taman_ids:) # => Invoices::Bulk::Result(rows: [Row(line, unit, category, description, amount_cents, due_on, errors)], valid?, total_cents)
Invoices::Bulk.create!(result, by:)          # => InvoiceBatch
Escrow.collect!(source, amount_cents:, payment:)
Escrow.deduct!(source, amount_cents:, reason:)        # raises Escrow::Insufficient
Escrow.refund!(source, amount_cents:, payout_ref:, paid_to:)
Escrow.forfeit!(source, reason:)                      # takes the whole remaining balance
Escrow.balance(source)                                 # => Integer cents
Billing.balance_for(unit)                              # => { due_cents:, overdue_cents:, next_due_on: }
PayoutRoute.for(taman, purpose: :default, on: Date.current) # => PayoutRoute; falls back to :default; raises Payments::NotSetUp
PayoutRoutes::Open.call(taman:, payout_account:, purpose:, starts_on:)   # creates the Billplz collection, then the route
PayoutAccount#gateway                                  # => Payments::Gateway.for(self)
```

**Consumes:**
- M01: `Reference`, `Money`, `AuditEvent`, `Permissions` (`billing`, `deposits_refunds`)
- M03: `Unit#recipients(scope: :bills_view)`, `Occupancy#allows?`
- M10: `Notifier`
- M11: `Idempotent`, `UnitContext`

## API endpoints

All require `X-Unit-Id` and scopes as noted.

| Method | Path | Scope | Screen |
|---|---|---|---|
| GET | `/api/v1/billing/summary` | none: every unit I can see bills for | E1 portfolio header |
| GET | `/api/v1/invoices?status=open\|paid` | `bills_view` | E1 |
| GET | `/api/v1/invoices/:id` | `bills_view` | E2, including `can_pay` |
| POST | `/api/v1/payments` | `bills_pay` | E2 → gateway. Idempotent |
| GET | `/api/v1/payments/:id` | payer | E3. Poll after returning from the gateway |
| GET | `/api/v1/receipts` | `bills_view` | E4 |
| GET | `/api/v1/receipts/:id/pdf` | `bills_view` | E4 |
| GET | `/api/v1/billing/transfer_instructions?purpose=default\|sinking_fund` | `bills_pay` | Bank details of the payout account for a manual transfer |

`POST /api/v1/payments` takes:

```json
{ "payables": [{ "type": "invoice", "id": "uuid" }], "method": "online" }
```

For a bank transfer, send it as multipart with `method: "bank_transfer"` and a `receipt_slip` file.

**Webhooks:**
- `POST /webhooks/payments/billplz/:payout_account_id` receives Billplz callbacks. It checks the signature with that account's X Signature Key and is never throttled. All customers share this one address; the account id in the path tells them apart.
- `POST /webhooks/payments/fake/:payout_account_id` is the same for the Fake gateway in development and test.
- `GET /payments/:id/return` is the gateway return page. It deep-links back to `tamanly://payments/<id>`.

## Tasks

### T06.1 · Invoices: model, Invoices page, single create, PDF

**Files:**
- Create:
  - migrations for `invoices` and `invoice_batches`
  - `app/models/invoice.rb`, `app/models/concerns/payable.rb`
  - `app/services/invoices/{issue,void}.rb`
  - `app/controllers/admin/invoices_controller.rb`
  - `app/queries/admin/invoices_query.rb`
  - `app/pdfs/invoice_pdf.rb`
  - views
  - `db/seeds/06_billing.rb`
- Test:
  - `spec/models/invoice_spec.rb`
  - `spec/services/invoices/issue_spec.rb`
  - `spec/requests/admin/invoices_spec.rb`
  - `spec/pdfs/invoice_pdf_spec.rb`

- [ ] **Step 1: Write failing model specs** for the computed status (Review Focus 5):

  ```ruby
  RSpec.describe Invoice, "#status" do
    let(:inv) { build(:invoice, amount_cents: 18_500, paid_cents: 0, due_on: Date.new(2026, 10, 15)) }
    it("is due on the due date") { travel_to(Time.zone.local(2026, 10, 15, 23, 59)) { expect(inv.status).to eq("due") } }
    it("is overdue from 00:00 KL the next day") { travel_to(Time.zone.local(2026, 10, 16, 0, 0)) { expect(inv.status).to eq("overdue") } }
    it("is overdue at 16:30 UTC on the 15th, which is 00:30 KL on the 16th") { travel_to(Time.utc(2026, 10, 15, 16, 30)) { expect(inv.status).to eq("overdue") } }
    it("is partially paid") { inv.paid_cents = 9_250; travel_to(Time.zone.local(2026, 10, 1)) { expect(inv.status).to eq("partially_paid") } }
    it("matches the SQL scope") do
      inv.save!
      travel_to(Time.zone.local(2026, 10, 16, 0, 0)) { expect(Invoice.overdue).to include(inv) }
    end
  end
  ```

- [ ] **Step 2: Write failing service specs for `Issue`.**
  - It assigns a reference like `INV-2610-00001`.
  - It sets `bill_to` to the unit's current owner.
  - It fires `invoice.issued` to unit recipients with `bills_view`, unless `notify: false`.
  - It audits `invoice.created`.
  - A zero or negative amount is invalid.
  - A `maintenance_sinking` invoice for a taman that has a `sinking_fund` payout route is invalid: "This taman pays its sinking fund into a separate account. Issue maintenance and sinking fund as separate invoices." The Strata Management Act 2013 requires the two funds in separate accounts, so the money can't arrive as one payment.

- [ ] **Step 3: Write failing service specs for `Void`.**
  - Voiding needs a reason.
  - An invoice with payments can't be voided. The error reads: "Refund or reallocate the RM 92.50 paid first."
  - Voiding audits `invoice.voided`.

- [ ] **Step 4: Write failing request specs for the Invoices page.**
  - Tabs: All, Due, Overdue, Partially paid, Paid, Void.
  - Filters: taman, category, period, due date range.
  - Search: reference, unit, owner name.
  - Columns: invoice, unit, owner, category, period, amount, paid, due, status.
  - CSV export.
  - The "New invoice" drawer contains:
    - a unit picker (search);
    - category;
    - description;
    - amount as an RM field;
    - due date, defaulting to issue date + 14 days.
  - Check permissions with `"a permission-gated page", :billing, :view` and `:edit` for create.
  - Include the tenant isolation example.

- [ ] **Step 5: Write a failing PDF spec.**
  - `InvoicePdf.new(invoice).render` contains the reference, unit, `RM 185.00`, the due date, the taman name and the bank transfer instructions.
  - Assert with `PDF::Inspector`, which needs the `pdf-inspector` gem in the test group.

- [ ] **Step 6: Run the specs.** Expected: FAIL.

- [ ] **Step 7: Implement it.**
  - Write the model, services, page and PDF.
  - `Invoice` includes `Payable`:
    - `amount_due_cents = amount_cents - paid_cents`;
    - `apply_payment!(alloc)` increments `paid_cents` under `lock!`.
    - `payout_purpose` is `:sinking_fund` for `sinking_fund` invoices and `:default` otherwise (contracts §6).
  - Seed by porting `INVOICES` from `admin/data.js`: Sep and Oct maintenance for every unit, plus extras, with the same status mix.
  - Damai Jaya is strata, so its invoices are issued as two: `maintenance` for the unit fee, and `sinking_fund` for 10% of it.

- [ ] **Step 8: Run the specs.** Expected: PASS.

- [ ] **Step 9: Commit:** `git commit -m "Add invoices with computed status, Invoices page and PDF"`.

### T06.2 · Invoice schedules

**Files:**
- Create:
  - the migration
  - `app/models/invoice_schedule.rb`
  - `app/services/invoices/run_schedule.rb`
  - `app/jobs/invoices/run_schedules_job.rb`
  - schedule views under the Invoices page "Schedules" tab
- Test:
  - `spec/services/invoices/run_schedule_spec.rb`
  - `spec/requests/admin/invoice_schedules_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - A monthly schedule with `next_run_on` 1 Nov creates one invoice per target unit on 1 Nov KL. It then sets `next_run_on` to 1 Dec.
  - Running twice for the same period creates no duplicates (unique index). The second run is a no-op.
  - Amount modes:
    - `flat` uses `amount_cents`;
    - `per_sqft` uses `built_up_sqft × rate`, rounded half-up to the sen;
    - `unit_fee` uses `unit.monthly_fee_cents`.
  - `day_of_month: 31` in February runs on the 28th or 29th.
  - A paused schedule doesn't run.
  - Quarterly and yearly schedules advance correctly.
  - Vacant units are included. Owners still pay maintenance.
  - A `maintenance_sinking` schedule can't be saved for a taman with a `sinking_fund` route, for the same reason as T06.1. Seed Damai Jaya with two schedules, maintenance and sinking fund.
  - The job sends one `invoice.issued` per unit. Notifications go out in batches of 500 via `perform_all_later`.
  - The admin "Run now" button needs `billing: full` and audits `schedule.run`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Seed schedules from `SCHEDULES` in `admin/data.js`.
  - Run the job daily at 00:10 KL via `config/recurring.yml`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add recurring invoice schedules"`.

### T06.3 · Bulk invoices

**Files:**
- Create:
  - `app/services/invoices/bulk.rb`
  - `app/controllers/admin/invoice_batches_controller.rb`
  - views, with `new` showing paste/upload and preview
  - `app/javascript/controllers/bulk_preview_controller.js`
- Test:
  - `spec/services/invoices/bulk_spec.rb`
  - `spec/system/admin/bulk_invoices_spec.rb`

- [ ] **Step 1: Write failing parser specs.** Port all 10 cases from `checkBulkParse()` in `admin/pages2.js`, keeping the exact inputs and expected results. They include:
  - tab-separated paste from Excel;
  - comma CSV with quoted fields;
  - a header row detected and skipped;
  - `RM 1,050.00` and `1050` both parse to 105000;
  - an unknown unit gives the error "Unit not found in your tamans";
  - a unit from another company's taman also gives "Unit not found in your tamans" (Review Focus 1);
  - a duplicate unit + description within the paste gets a warning, not an error;
  - a missing amount is an error;
  - a past due date is an error: "Due date is in the past";
  - dates in `15/10/2026`, `2026-10-15` and `15 Oct 2026` formats all parse.

- [ ] **Step 2: Write failing create specs.**
  - `create!` makes all invoices and one batch in a single transaction, or nothing.
  - It audits `invoice.batch_created` with the count and total.
  - Notifications go out after commit.
  - The template download (`GET /admin/invoice_batches/template.csv`) has the headers `unit,category,description,amount,due_date` and 2 example rows.

- [ ] **Step 3: Write a failing system spec** at 1440px and 390px.
  - Paste 3 valid rows and 1 invalid row. The preview shows 3 ✓ and 1 ✗ with the reason.
  - "Create 3 invoices" stays disabled until the invalid row is removed or "Skip invalid rows" is ticked.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement it.**
  - Server-side parse on every change: debounce 400ms and post to `preview`, which returns a Turbo Frame.
  - The server is the only validator. Don't duplicate parsing in JavaScript.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit:** `git commit -m "Add bulk invoice creation from paste or CSV"`.

### T06.4 · Payment gateway, checkout and webhooks (Review Focus 2)

**Gateway:** Billplz, using each customer's own Billplz accounts (ADR-011a). Build and test against `Payments::Gateways::Fake` first, then add `Payments::Gateways::Billplz` in Step 8. Staging uses Billplz sandbox accounts (`www.billplz-sandbox.com`).

This task creates `payout_accounts` and `payout_routes`, so payments can be routed before the Settings page for them ships in M13 T13.2. Until then, staging accounts are added from the Rails console with `PayoutAccount.create!` and `PayoutRoutes::Open.call`.

**Files:**
- Create:
  - migrations for `payout_accounts`, `payout_routes`, `payments`, `payment_allocations`, `payment_events`
  - `app/models/{payout_account,payout_route,payment,payment_allocation,payment_event}.rb`
  - `app/services/payout_routes/open.rb`
  - `app/services/payments/{checkout,settle,gateway}.rb`
  - `app/services/payments/gateways/{fake,billplz}.rb`
  - `app/jobs/payments/poll_pending_job.rb`
  - `app/controllers/webhooks/payments_controller.rb`
  - `app/controllers/payments/returns_controller.rb`
  - `app/controllers/api/v1/payments_controller.rb`
- Test:
  - `spec/models/payout_route_spec.rb`
  - `spec/services/payments/checkout_spec.rb`
  - `spec/services/payments/settle_spec.rb`
  - `spec/requests/webhooks/payments_spec.rb`
  - `spec/requests/api/v1/payments_spec.rb`
  - `spec/services/payments/gateways/billplz_spec.rb`
  - `spec/jobs/payments/poll_pending_job_spec.rb`

- [ ] **Step 1: Write failing routing and checkout specs.**
  - **Routing**
    - `PayoutRoute.for(taman)` returns the route live today.
    - `purpose: :sinking_fund` or `:deposits` falls back to `:default` when the taman has no route for it.
    - A route that ended yesterday isn't returned. A taman with no route raises `Payments::NotSetUp`.
    - Two overlapping routes for one taman and purpose are rejected by the database constraint.
    - `PayoutRoutes::Open` calls `gateway.create_collection("Taman Desa Harmoni")` (Billplz: `POST /api/v3/collections` with `title`) and stores the returned id on the route.
  - Checkout for two open invoices of one unit creates one `pending` payment with two allocations. The amount equals the sum of `amount_due_cents`. It returns the gateway `redirect_url`.
  - Paying an invoice of a unit the user doesn't occupy raises `ActiveRecord::RecordNotFound`.
  - A sub-tenant without `bills_pay` gets 403 `scope_missing`.
  - A paid or void invoice can't be paid. The error is 409 "This bill is already paid."
  - An invoice with a `pending` payment created within the last 15 minutes gets 409 "A payment for this bill is already in progress. Check again in a few minutes."
  - Every payment records its `payout_route`. A sinking-fund invoice uses the taman's sinking-fund route.
  - Payables from two tamans, or routed to two different payout accounts (a strata unit's maintenance and sinking fund), give 422 `mixed_payout_accounts`: "These bills go to different accounts. Pay them one group at a time."
  - A taman without a payout route gives 422 `payout_not_set_up`: "Online payment isn't set up for this taman yet. Contact your management office."
  - The amount sent to the gateway equals the sum of the dues. No fee is ever added.

- [ ] **Step 2: Write failing settle and webhook specs.** This covers Review Focus 2.

  ```ruby
  RSpec.describe "Payment webhooks", type: :request do
    let(:payment) { create(:payment, :pending, amount_cents: 18_500, allocations: [[invoice, 18_500]]) }
    let(:invoice) { create(:invoice, amount_cents: 18_500) }
    let(:body) { Payments::Gateways::Fake.webhook_body(provider_ref: payment.provider_ref, event_id: "evt_1", status: "succeeded", amount_cents: 18_500) }
    let(:headers) { Payments::Gateways::Fake.signed_headers(body) }

    it "settles exactly once when the same webhook arrives twice" do
      2.times { post "/webhooks/payments/fake", params: body, headers: }
      expect(response).to have_http_status(:ok)
      expect(payment.reload.status).to eq("succeeded")
      expect(invoice.reload.paid_cents).to eq(18_500)
      expect(Receipt.where(payment:).count).to eq(1)
      expect(Notification.where(event_key: "payment.succeeded").count).to eq(1)
    end

    context "under concurrency" do
      include_context "concurrency"
      it "settles exactly once when two different events race" do
        event = Payments::GatewayEvent.new(event_id: "#{payment.provider_ref}:paid", provider_ref: payment.provider_ref, status: :succeeded, amount_cents: 18_500, raw: {})
        2.times.map do
          Thread.new { ActiveRecord::Base.connection_pool.with_connection { Payments::Settle.call(Payment.find(payment.id), event:) } }
        end.each(&:join)
        expect(invoice.reload.paid_cents).to eq(18_500)
        expect(Receipt.where(payment:).count).to eq(1)
      end
    end

    it "rejects a bad signature with 401 and changes nothing" do
      post "/webhooks/payments/fake", params: body, headers: { "X-Signature" => "nope" }
      expect(response).to have_http_status(:unauthorized)
      expect(payment.reload.status).to eq("pending")
    end

    it "marks an amount mismatch as unmatched instead of paying" do
      short = Payments::Gateways::Fake.webhook_body(provider_ref: payment.provider_ref, event_id: "evt_3", status: "succeeded", amount_cents: 10_000)
      post "/webhooks/payments/fake", params: short, headers: Payments::Gateways::Fake.signed_headers(short)
      expect(payment.reload.status).to eq("unmatched")
      expect(invoice.reload.paid_cents).to eq(0)
    end

    it "marks a payment whose invoice was paid meanwhile as unmatched for refund" do
      invoice.update!(paid_cents: 18_500)
      post "/webhooks/payments/fake", params: body, headers: headers
      expect(payment.reload.status).to eq("unmatched")
      expect(payment.note).to include("already paid")
    end
  end
  ```

- [ ] **Step 3: Write failing API specs.**
  - `POST /api/v1/payments` without `Idempotency-Key` returns 400.
  - Two posts with the same key create one payment (Review Focus 2).
  - `GET /api/v1/payments/:id` returns `status`, `amount`, `receipt` (once succeeded) and `allocations`.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement `Payments::Settle`.**

  ```ruby
  module Payments
    class Settle
      def self.call(payment, event:)
        payment.with_lock do
          return payment if payment.succeeded? || payment.unmatched? || payment.refunded?
          return payment.update!(status: "failed", failure_reason: event.raw["reason"]) if event.status == :failed
          return payment.update!(status: "unmatched", note: "Gateway amount #{Money.format(event.amount_cents)} differs from #{Money.format(payment.amount_cents)}") if event.amount_cents != payment.amount_cents
          payables = payment.allocations.map { |a| [a, a.payable.lock!] }
          if payables.any? { |a, p| p.amount_due_cents < a.amount_cents }
            return payment.update!(status: "unmatched", note: "Bill already paid by another payment; refund needed")
          end
          payables.each { |a, p| p.apply_payment!(a) }
          payment.update!(status: "succeeded", paid_at: Time.current)
          receipt = Receipt.create!(payment:, reference: Reference.next!(:receipt, scope: payment.organization_id), issued_at: Time.current)
          ActiveRecord.after_all_transactions_commit do
            Receipts::RenderPdfJob.perform_later(receipt)
            Notifier.deliver("payment.succeeded", record: payment)
          end
        end
        payment
      end
    end
  end
  ```

- [ ] **Step 6: Implement the webhook controller.**
  1. Load the payout account from the path, then call `account.gateway.verify_webhook!(request)`, so the signature is checked with that customer's X Signature Key. When it returns `nil` (an update Billplz sends that isn't a payment result), answer 200 and stop.
  2. Run `PaymentEvent.create_or_find_by!(provider:, provider_event_id: event.event_id)`, and return 200 immediately if `processed_at` is set.
  3. Find the payment by `provider_ref` **within that payout account's routes** and call `Settle`. A bill id that belongs to a different account is treated as unknown, so one customer's keys can never settle another customer's payment.
  4. Set `processed_at`.
  5. Return 200.

  An unknown `provider_ref` is stored with `payment_id: nil`. It shows on Reconciliation as unmatched money (M06 T06.5).

- [ ] **Step 7: Implement `Payments::Gateways::Fake`.**
  - It works in development, test and staging.
  - Its `redirect_url` points to a local page with "Pay" and "Fail" buttons. Each button posts a signed webhook to the app.

- [ ] **Step 8: Write the failing Billplz adapter specs** (WebMock; no real calls).
  - **`create_checkout(payment)`:**
    - It POSTs to `<host>/api/v3/bills` with Basic auth (API secret key as username).
    - The form carries:
      - `collection_id`: the payment's route collection;
      - `email` (or `mobile` in `60XXXXXXXXX` form when there is no email);
      - `name`, `description` (≤ 200 chars);
      - `amount`: exactly `payment.amount_cents`, with no fee added (ADR-011a);
      - `callback_url`: `/webhooks/payments/billplz/<payout_account_id>`;
      - `redirect_url`: `/payments/:id/return`;
      - `reference_1_label: "Payment"` and `reference_1: payment.reference`.
    - It returns `{ provider_ref: <bill id>, redirect_url: <bill url> }`.
  - **`verify_webhook!(request)`:**
    - A callback whose `x_signature` matches returns a `GatewayEvent`:
      - `event_id` is `"#{id}:#{state}"`;
      - `status` is `:succeeded` when `paid == "true"`;
      - `amount_cents` is `paid_amount`.
    - A wrong signature raises `Payments::InvalidSignature`.
    - A callback with `paid == "false"` and `transaction_status == "failed"` returns `:failed`. Any other unpaid callback returns `nil`, which the controller answers with 200 and ignores.
    - Use the worked X Signature example from Billplz's API reference as a fixed test vector, so the spec doesn't just repeat the implementation.
  - **`create_collection(title)`** POSTs to `/collections` and returns the new collection id.
  - **Errors:** a Billplz 401 marks the payout account `error` with "Billplz rejected the API key" and fires `payout_account.error`. A Billplz 5xx or timeout on create raises `Payments::ProviderError`. The API maps it to 502 `payment_provider_error` with "The payment service didn't respond. Try again in a minute."
  - **`PollPendingJob`:** runs every 5 minutes for online payments still `pending` after 10 minutes, using each payment's own payout account.
    - It calls `GET /bills/:id`. A paid bill settles through `Settle` with the same `event_id` as the callback would use, so a late callback is a no-op.
    - Payments pending for 24 hours become `failed` with "Payment not completed". The job deletes the Billplz bill (`DELETE /bills/:id`) so it can't be paid afterwards.
  - **Channel:** after settling, `GET /bills/:id/transactions` fills `payments.channel` from the transaction's reported payment channel. A failure there leaves `channel` blank and never fails the payment.

- [ ] **Step 9: Implement `Payments::Gateways::Billplz`.**

  ```ruby
  module Payments
    module Gateways
      class Billplz
        HOSTS = { live: "https://www.billplz.com/api/v3", sandbox: "https://www.billplz-sandbox.com/api/v3" }.freeze

        def initialize(account)
          @account = account
          @api_key = account.credentials.fetch("api_key")
          @x_key = account.credentials.fetch("x_signature_key")
          @host = HOSTS.fetch(account.sandbox? ? :sandbox : :live)
        end

        def create_collection(title) = request(:post, "/collections", { title: }).fetch("id")

        def create_checkout(payment)
          payer = payment.payer
          create_bill(collection_id: payment.payout_route.collection_id, name: payer.name.presence || "Resident",
                      email: payer.email, mobile: payer.phone, amount_cents: payment.amount_cents,
                      description: payment.allocations.map { _1.payable.payable_label }.join(", "),
                      reference: payment.reference,
                      redirect_url: Rails.application.routes.url_helpers.payment_return_url(payment))
        end

        # Also used by M15 for Tamanly's own invoices to customers
        def create_bill(collection_id:, name:, email:, mobile:, amount_cents:, description:, reference:, redirect_url:)
          form = { collection_id:, name:, amount: amount_cents, description: description.truncate(200),
                   callback_url: @account.callback_url, redirect_url:,
                   reference_1_label: "Payment", reference_1: reference }
          email.present? ? form[:email] = email : form[:mobile] = mobile.to_s.delete_prefix("+")
          bill = request(:post, "/bills", form)
          { provider_ref: bill.fetch("id"), redirect_url: bill.fetch("url") }
        end

        def verify_webhook!(request)
          params = request.request_parameters.to_h
          raise InvalidSignature unless ActiveSupport::SecurityUtils.secure_compare(signature(params), params["x_signature"].to_s)
          status = if params["paid"] == "true" then :succeeded
                   elsif params["transaction_status"] == "failed" then :failed
                   end
          return nil unless status
          GatewayEvent.new(event_id: "#{params['id']}:#{params['state']}", provider_ref: params["id"], status:,
                           amount_cents: params["paid_amount"].to_i, raw: params)
        end

        def fetch(bill_id) = request(:get, "/bills/#{bill_id}")
        def cancel(bill_id) = request(:delete, "/bills/#{bill_id}")

        private

        # Billplz X Signature: "key" + "value" for every field except x_signature,
        # sorted ascending (case-insensitive), joined with "|", HMAC-SHA256 with the X Signature Key.
        def signature(params)
          source = params.except("x_signature").map { |k, v| "#{k}#{v}" }.sort_by(&:downcase).join("|")
          OpenSSL::HMAC.hexdigest("SHA256", @x_key, source)
        end

        def request(verb, path, form = nil)
          uri = URI("#{@host}#{path}")
          req = { post: Net::HTTP::Post, get: Net::HTTP::Get, delete: Net::HTTP::Delete }.fetch(verb).new(uri)
          req.basic_auth(@api_key, "")
          req.set_form_data(form) if form
          res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { _1.request(req) }
          raise Unauthorized, "Billplz rejected the API key" if res.code == "401"
          raise ProviderError, "Billplz #{res.code}" unless res.is_a?(Net::HTTPSuccess)
          res.body.present? ? JSON.parse(res.body) : {}
        rescue Net::OpenTimeout, Net::ReadTimeout, SocketError => e
          raise ProviderError, e.message
        end
      end
    end
  end
  ```

  - `Payments::Gateway.for(account)` returns `Gateways::Billplz.new(account)` or `Gateways::Fake.new(account)` from `account.provider`.
  - The adapter only needs an account object that answers `credentials`, `sandbox?` and `callback_url`. `PayoutAccount#callback_url` is `billplz_webhook_url(self)`. M15 passes Tamanly's own account the same way.
  - `Payments::Unauthorized` is caught in one place (`PayoutAccount#gateway` wrapper), which marks the account `error` and notifies.
  - Schedule `PollPendingJob` in `config/recurring.yml`.
  - Seed four payout accounts with the `fake` provider, after `REFUND_ACCOUNTS` in `admin/data.js`:
    - "Lestari FM client account · Maybank ••• 2210" (default for Bukit Indah and Melati Permai);
    - "Desa Harmoni JMB · CIMB ••• 8841" (default for Desa Harmoni);
    - "Damai Jaya MC · Public Bank ••• 3307" (default for Damai Jaya);
    - "Damai Jaya MC sinking fund · Public Bank ••• 3315" (Damai Jaya's sinking-fund route).

- [ ] **Step 10: Run the specs.** Expected: PASS.

- [ ] **Step 11: Commit:** `git commit -m "Add Billplz checkout, signed callbacks and pending-payment poller"`.

### T06.5 · Bank-transfer slips and the reconciliation board

**Files:**
- Create:
  - `app/services/payments/{verify_slip,reject_slip,match,record_manual}.rb`
  - `app/controllers/admin/payments_controller.rb` (the Reconciliation page)
  - `app/queries/admin/payments_query.rb`
  - views
- Test:
  - `spec/services/payments/verify_slip_spec.rb`
  - `spec/services/payments/match_spec.rb`
  - `spec/requests/admin/payments_spec.rb`
  - `spec/system/admin/reconciliation_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Slip upload** (`POST /api/v1/payments`, method `bank_transfer`):
    - Creates a payment with status `receipt_to_verify` and the slip attached.
    - Fires `payment.receipt_uploaded` to the staff bell.
    - The invoice stays unpaid until verified.
  - **Verify** (staff, `billing: edit`):
    - Calls `Settle` with a synthetic event.
    - Audits `payment.slip_verified`.
    - The resident gets `payment.succeeded`.
  - **Reject:**
    - Needs a reason.
    - Sets status `failed` and fires `payment.receipt_rejected` with the reason.
    - Audits `payment.slip_rejected`.
  - **Match an unmatched payment:**
    - Staff choose invoices whose dues add up to the amount.
    - If the amount is smaller, it partially pays the oldest first.
    - If the amount is larger, it's refused: "Allocations exceed the payment by RM 20.00."
    - Audits `payment.matched`.
  - **Record manual payment** (cash or cheque at the office):
    - Creates a `succeeded` payment directly.
    - Audits `payment.recorded`.
  - **Reconciliation page** (`admin/#/reconciliation`):
    - Tabs: Unmatched, Receipt to verify, Matched, Failed, All.
    - Filters: taman, payout account, method (online, bank transfer, cash, cheque), channel, date.
    - Search: reference, payer, provider ref.
    - The drawer shows the slip image or PDF inline.
    - Counts in the sidebar come from the registry.
    - Worklist items for slips older than 1 working day.
    - Include the tenant isolation example.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed `PAYMENTS` from `admin/data.js`, using the same status mix.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add slip verification and reconciliation board"`.

### T06.6 · Resident billing API and receipts

**Files:**
- Create:
  - the receipts migration and model
  - `app/pdfs/receipt_pdf.rb`
  - `app/jobs/receipts/render_pdf_job.rb`
  - `app/controllers/api/v1/{billing,invoices,receipts}_controller.rb`
  - serializers
- Test:
  - `spec/requests/api/v1/invoices_spec.rb` (rswag)
  - `spec/requests/api/v1/receipts_spec.rb`
  - `spec/requests/api/v1/billing_summary_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **`GET /invoices`** lists the current unit's invoices, open first, then paid. Each item has:
    - `reference`, `description`, `amount`, `paid`, `due`;
    - `pay_group { id, label }`: the payout account the bill is paid into. The app pays one group at a time, so a strata unit sees "Maintenance" and "Sinking fund" as two Pay buttons;
    - `status` (computed);
    - `due_on`, `period`.
  - **`GET /invoices/:id`** includes:
    - `can_pay`, which is false for a sub-tenant with only `bills_view` (the E5 screen);
    - `pay_methods`: `["online", "bank_transfer"]` (online means the Billplz page);
    - `pdf_url`, a 5-minute signed URL.
  - **`GET /billing/summary`** returns, for every unit where I hold `bills_view`:
    - `unit`, `taman`;
    - `due`, `overdue`, `next_due_on`.
    - Aisyah sees 3 units.
  - **Receipts:**
    - Listed newest first.
    - The PDF has the receipt number, the payment reference, the method, each invoice paid and the total.
    - Another unit's receipt returns 404.
  - **Transfer instructions** return the bank details of the taman's payout account for the requested purpose (`default` or `sinking_fund`), with the payment reference to quote.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add resident billing API and receipts"`.

### T06.7 · Reminders and late fees (Review Focus 5)

**Files:**
- Create:
  - the `billing_settings` migration and model
  - `app/services/billing/{remind,apply_late_fees}.rb`
  - `app/jobs/billing/daily_job.rb`
  - `app/controllers/admin/billing_settings_controller.rb`, which serves the Late fees & reminders page
- Test:
  - `spec/services/billing/remind_spec.rb`
  - `spec/services/billing/apply_late_fees_spec.rb`
  - `spec/requests/admin/billing_settings_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Due-soon reminder.** With `reminders: [{ offset_days: -7 }, { offset_days: 0 }, { offset_days: 3 }]` and due date 15 Oct:
    - `invoice.due_soon` goes out on 8 Oct and on 15 Oct.
    - `invoice.overdue` goes out on 18 Oct.
    - Each goes out once only, tracked in `invoices.reminders_sent` (jsonb list of offsets).
  - **Late fee, percent.** With `grace_days: 7`, rate 10%, cap RM 100 and an RM 185 invoice due 15 Oct:
    - Nothing is charged until 22 Oct 23:59 KL.
    - On 23 Oct 00:05 KL, one `late_fee` invoice of RM 18.50 is created with `source_invoice_id` set.
    - Running again creates nothing (unique index).
  - **Cap.** An RM 2,000 invoice at 10% charges RM 100.00, not RM 200.00.
  - **Late fee, flat.** A flat fee of RM 10 charges exactly RM 10.00.
  - **Out of scope.** Categories outside `late_fee_categories` get no fee. Late-fee invoices never get a late fee themselves.
  - **Paid invoices.** An invoice paid on 20 Oct gets no fee and no overdue reminder.
  - **Settings page** (`admin/#/late-fees`):
    - Edit is per taman.
    - The reminder table has a checkbox for each channel.
    - A sentence previews the rule: "A RM 185.00 bill due 15 Oct gets RM 18.50 added on 23 Oct."
    - Audits `billing_settings.updated`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Run `Billing::DailyJob` at 00:05 KL. It calls `Remind` then `ApplyLateFees` for each taman.
  - Seed the settings from `LATE_FEES` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add billing reminders and late fees"`.

### T06.8 · Deposit escrow ledger

**Files:**
- Create:
  - the migration
  - `app/models/escrow_entry.rb`
  - `app/services/escrow.rb`
  - `app/controllers/admin/escrow_controller.rb`
  - views
- Test:
  - `spec/services/escrow_spec.rb`
  - `spec/requests/admin/escrow_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Collect, deduct, refund.** `collect!` RM 1,000, then `deduct!` RM 250, then `refund!` RM 750 leaves the balance at 0.
  - **Over-deduction.** `deduct!` of more than the balance raises `Escrow::Insufficient`: "Deductions can't exceed the RM 1,000.00 held."
  - **Concurrent deductions.** Two at once can't overdraw. The service locks the source row.
  - **Forfeit.** `forfeit!` takes the whole remaining balance.
  - **Append-only.** Entries can't be changed: `readonly?` once persisted.
  - **Escrow page** (`admin/#/escrow`):
    - Totals per taman: collected, held, refunded and forfeited this month.
    - A list of held deposits by source (permit or booking): days held, balance.
    - A ledger tab with every entry and CSV export.
    - Needs `deposits_refunds: view`.
    - Include the tenant isolation example.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

  ```ruby
  module Escrow
    class Insufficient < StandardError; end
    module_function

    def balance(source) = EscrowEntry.where(source:).sum(:amount_cents)

    def collect!(source, amount_cents:, payment:) = entry!(source, "collected", amount_cents, payment:)

    def deduct!(source, amount_cents:, reason:)
      source.with_lock do
        held = balance(source)
        raise Insufficient, I18n.t("escrow.insufficient", held: Money.format(held)) if amount_cents > held
        entry!(source, "deduction", -amount_cents, reason:)
      end
    end

    def refund!(source, amount_cents:, payout_ref:, paid_to:)
      source.with_lock do
        raise Insufficient, I18n.t("escrow.insufficient", held: Money.format(balance(source))) if amount_cents > balance(source)
        entry!(source, "refund", -amount_cents, payout_ref:, paid_to:)
      end
    end

    def forfeit!(source, reason:) = source.with_lock { entry!(source, "forfeit", -balance(source), reason:) }

    def entry!(source, kind, cents, **attrs)
      EscrowEntry.create!(source:, taman: source.taman, kind:, amount_cents: cents, recorded_by: Current.user, **attrs)
    end
  end
  ```

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add deposit escrow ledger"`.

### T06.9 · Statements, owner portfolios and exports

**Files:**
- Create:
  - `app/controllers/admin/statements_controller.rb`
  - `app/controllers/admin/portfolios_controller.rb`
  - `app/pdfs/statement_pdf.rb`
  - `app/services/billing/statement.rb`
  - views
- Test:
  - `spec/services/billing/statement_spec.rb`
  - `spec/requests/admin/statements_spec.rb`
  - `spec/requests/admin/portfolios_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **`Billing::Statement.new(unit:, from:, to:)`** returns:
    - the opening balance;
    - lines: invoices as debits, allocations as credits, in date order;
    - the closing balance.
    - The opening plus all lines equals the closing balance.
  - **Statements page** (`admin/#/statements`):
    - Pick a scope: a unit, an owner across units, or a whole taman (summary per unit). Also pick the date range.
    - Download as CSV or PDF.
    - A taman-wide PDF for 1,406 units is generated in a background job and emailed. Show "We'll email the PDF to you when it's ready".
    - Audits `statement.exported`.
  - **Owner portfolios** (`admin/#/portfolios`):
    - Owners with units in this organisation, with unit count, tamans, due and overdue totals.
    - The drawer shows every unit with its balance and a statement link.
    - Owners who also hold units under **other** companies show only this organisation's units (Review Focus 1).
  - **Permissions:** `billing: view` is required.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add statements and owner portfolios"`.

## Module done when

- [ ] A resident can pay through the Fake gateway on staging, gets a receipt push, and the invoice turns Paid on the dashboard within 5 s.
- [ ] Review Focus 2 and Review Focus 5 specs pass.
- [ ] The seeded Oct 2026 numbers match the prototype's Billing pages within ±2% (collections rate, overdue total).

## Progress log

| Date | Who | Note |
|---|---|---|
