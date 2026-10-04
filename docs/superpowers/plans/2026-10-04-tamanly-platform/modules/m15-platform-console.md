# M15 · Platform console & subscriptions

**Status:** Not started · **Owner:** — · **Wave:** 4 · **Depends on:** M01, M02 (UI kit), M06 (Billplz adapter, payout accounts and their status), M10 (Notifier)

**Goal:** Give Tamanly's own staff a console to run the business:
- onboard management companies as customers;
- put each customer on a plan;
- invoice every customer monthly for the subscription plus a per-payment fee;
- collect those invoices into Tamanly's own Billplz account;
- suspend customers who don't pay, without ever cutting off their residents or guards.

**Read first:**
- `../decisions.md`: ADR-025 (service provider model) and ADR-011a (payout accounts)
- `../contracts.md`:
  - §1, the `/platform` row
  - §3, platform operators
  - §9, `platform_invoice`
  - §10, the `platform.*` events

**Feature coverage:** this module isn't in FEATRURES.md. It comes from the business-model decision of 2026-10-04: Tamanly is the service provider and management companies subscribe.

**Prototype references:** none. Build it with the M02 UI kit so it looks like the admin console, with "Tamanly platform" in the sidebar header and a neutral indigo-tint top bar, so operators never confuse it with a customer's dashboard.

## Data model

**`users`**: add `platform_role` (`operator` or null).

**`plans`**

| Column | Notes |
|---|---|
| `name` | e.g. "Standard" |
| `price_per_unit_cents` | Monthly, per unit |
| `minimum_monthly_cents` | |
| `per_payment_fee_cents` | Charged per online resident payment (ADR-025) |
| `trial_days` | |
| `active` | |

**`subscriptions`**: one per customer.

| Column | Notes |
|---|---|
| `organization_id` | Unique |
| `plan_id` | |
| `status` | `trial` / `active` / `past_due` / `suspended` / `cancelled` |
| `trial_ends_on`, `started_on`, `cancelled_on`, `suspended_at` | |
| `price_per_unit_cents`, `minimum_monthly_cents`, `per_payment_fee_cents` | Overrides; null means use the plan |
| `billing_email` | |
| `notes` | |

**`platform_invoices`**

| Column | Notes |
|---|---|
| `reference` | `TML-2611-0003` |
| `organization_id` | |
| `period_on` | First day of the month billed |
| `lines` | jsonb `[{ kind, description, quantity, unit_cents, amount_cents }]`; `kind` is `subscription` / `payment_fees` / `adjustment` |
| `amount_cents`, `paid_cents` | |
| `issued_on`, `due_on` | |
| `voided_at` | |
| `provider_ref` | The Billplz bill on Tamanly's own account |
| `paid_at` | |
| `paid_by_method` | `online` / `bank_transfer` |

Constraints and computed fields:
- Unique `[organization_id, period_on]`.
- Status is computed like M06 invoices (`due` / `overdue` / `paid` / `void`).

**`payment_events`** (from M06): add a nullable `platform_invoice_id`. Platform callbacks are stored with `provider: "billplz_platform"`, so they're deduplicated the same way.

**`audit_events`** (from M01): make `organization_id` nullable, for platform-wide actions such as editing a plan. Actions taken on a customer keep that customer as the organisation.

## Interfaces

**Produces:**

```ruby
Platform::BaseController                        # requires users.platform_role == "operator"; 404 for everyone else
Platform::Onboard.call(name:, registration_no:, email_domain:, plan:, admin_name:, admin_email:, by:)  # => Organization (with subscription in trial, first portfolio admin invited)
Platform::Pricing.for(subscription, month:)     # => Platform::Pricing::Quote(units:, subscription_cents:, payments:, payment_fee_cents:, total_cents:)
Platform::InvoiceRun.call(month:)               # idempotent; one platform invoice per billable customer
Platform::Billing.account                       # Tamanly's own Billplz account object (credentials, sandbox?, callback_url, collection_id)
Platform::Dunning.call(on: Date.current)        # reminders, past_due, suspension, reactivation
Organization#suspended_for_billing?             # admin writes are blocked when true (except paying)
```

**Consumes:**
- From M01: `Staff::Invite`, `AuditEvent`, `Reference`
- From M06: `Payments::Gateways::Billplz#create_bill`, `#verify_webhook!`, `PaymentEvent`, and `Payment` (to count online payments)
- From M10: `Notifier`
- From M06: `PayoutAccount#status`, which M13's checks keep up to date

## Routes

| Surface | Path | Purpose |
|---|---|---|
| Platform | `/platform` | Dashboard |
| Platform | `/platform/customers`, `/platform/customers/:id` | Customers and onboarding |
| Platform | `/platform/plans` | Plans |
| Platform | `/platform/invoices` | All platform invoices |
| Customer admin | `/admin/subscription` | Settings → "Tamanly subscription": plan, this month's estimate, invoices with a Pay button |
| Webhook | `POST /webhooks/payments/billplz/platform` | Callbacks for Tamanly's own Billplz account |

## Tasks

### T15.1 · Operator access and the platform shell

**Files:**
- Create:
  - migrations: `users.platform_role`; `audit_events.organization_id` becomes nullable
  - `app/controllers/platform/base_controller.rb`
  - `app/views/layouts/platform.html.erb`
  - `app/controllers/platform/dashboard_controller.rb` (placeholder page; T15.6 fills it)
  - `lib/tasks/platform.rake` (`platform:grant_operator[email]`)
- Test: `spec/requests/platform/access_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Access:**
    - A signed-in operator gets 200 on `/platform`.
    - A customer's staff member, a resident token, or a signed-out visitor gets 404. The console doesn't reveal that it exists.
    - An operator without a staff membership gets 403 on `/admin`. Operators don't use customers' dashboards.
  - **2FA:** once M14 T14.1 lands, an operator without two-factor set up is sent to set it up first. Tag the spec `:requires_m14` until then.
  - **Audit:** operator actions are audited with `actor` = the operator, and `organization` = the customer acted on, or nil for platform-wide changes.
  - **Granting the role:** `bin/rails "platform:grant_operator[ops@tamanly.my]"` sets the role and is the only way to grant it. There is no UI for granting operators.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** The layout reuses the M02 components, with its own nav: Dashboard, Customers, Plans, Invoices.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add platform operator access and console shell"`.

### T15.2 · Customers and onboarding

**Files:**
- Create:
  - `app/services/platform/onboard.rb`
  - `app/controllers/platform/customers_controller.rb`
  - `app/queries/platform/customers_query.rb`
  - views
- Test:
  - `spec/services/platform/onboard_spec.rb`
  - `spec/requests/platform/customers_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Onboarding.** `Platform::Onboard` runs in one transaction. It:
    - creates the organisation;
    - creates the subscription in `trial`, with `trial_ends_on` set to today plus the plan's trial days;
    - invites the first portfolio admin through `Staff::Invite`;
    - audits `customer.onboarded`.

    A duplicate email domain fails with "Another customer already uses lestarifm.my."
  - **Customers list:**
    - Columns: company, status, plan, tamans, units, payout accounts (connected / with errors), this month's estimate, last invoice status.
    - Search by name, SSM number or email domain. Filter by status.
  - **Customer page:**
    - Subscription details and overrides.
    - Tamans and unit counts.
    - Payout accounts with their health, read-only (`payout_accounts.status`).
    - Invoices.
    - Internal notes.
    - Actions: suspend, reactivate, cancel. Each needs a reason and is audited.
  - **Privacy:** the customer page never shows residents' names, phones or payments. It shows counts and totals only.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** In development, seed one operator (`ops@tamanly.my` / `password1234`) and put Lestari FM on the Standard plan, active.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add customer onboarding and customer pages"`.

### T15.3 · Plans and pricing

**Files:**
- Create:
  - migrations and models for `plans` and `subscriptions`
  - `app/services/platform/pricing.rb`
  - `app/controllers/platform/plans_controller.rb`
  - subscription edit views on the customer page
- Test:
  - `spec/services/platform/pricing_spec.rb`
  - `spec/requests/platform/plans_spec.rb`

- [ ] **Step 1: Write failing pricing specs.**

  ```ruby
  RSpec.describe Platform::Pricing do
    let(:plan) { create(:plan, price_per_unit_cents: 80, minimum_monthly_cents: 30_000, per_payment_fee_cents: 50) }
    let(:org)  { create(:organization) }
    let(:sub)  { create(:subscription, organization: org, plan:, status: "active") }

    it "charges units at the start of the month plus a fee per succeeded online payment in the month" do
      create_units(org, 1_406)                 # helper: units across the org's tamans
      create_online_payments(org, 900, in: Date.new(2026, 10, 1).all_month, status: "succeeded")
      create_online_payments(org, 40, in: Date.new(2026, 10, 1).all_month, status: "failed")
      create_slip_payments(org, 30, in: Date.new(2026, 10, 1).all_month)
      q = described_class.for(sub, month: Date.new(2026, 10, 1))
      expect(q.units).to eq(1_406)
      expect(q.subscription_cents).to eq(112_480)   # 1,406 x RM 0.80
      expect(q.payments).to eq(900)                  # failed and bank-transfer payments are not counted
      expect(q.payment_fee_cents).to eq(45_000)      # 900 x RM 0.50
      expect(q.total_cents).to eq(157_480)
    end

    it "applies the monthly minimum to the subscription part" do
      create_units(org, 100)
      expect(described_class.for(sub, month: Date.new(2026, 10, 1)).subscription_cents).to eq(30_000)
    end

    it "uses per-customer overrides" do
      sub.update!(price_per_unit_cents: 60)
      create_units(org, 1_000)
      expect(described_class.for(sub, month: Date.new(2026, 10, 1)).subscription_cents).to eq(60_000)
    end

    it "charges no subscription during the trial but still counts payment fees" do
      sub.update!(status: "trial", trial_ends_on: Date.new(2026, 10, 31))
      create_units(org, 500)
      create_online_payments(org, 10, in: Date.new(2026, 10, 1).all_month, status: "succeeded")
      q = described_class.for(sub, month: Date.new(2026, 10, 1))
      expect([q.subscription_cents, q.payment_fee_cents]).to eq([0, 500])
    end
  end
  ```

- [ ] **Step 2: Write failing plan page specs.**
  - Plans can be created and edited, and are audited as `plan.updated`.
  - A plan used by customers can't be deleted, only deactivated.
  - Changing a plan's price affects the next invoice run, never issued invoices.
  - The customer page shows a live estimate: "1,406 units × RM 0.80 = RM 1,124.80 · 900 online payments × RM 0.50 = RM 450.00".

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement it.**
  - Add the spec helpers `create_units`, `create_online_payments` and `create_slip_payments` in `spec/support/platform_helpers.rb`, as thin wrappers over the M03 and M06 factories.
  - Count units in the customer's active tamans at 00:00 KL on the first of the month.
  - Count online payments with `status: "succeeded"` and `paid_at` within the month, in KL time.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit:** `git commit -m "Add plans, subscriptions and pricing"`.

### T15.4 · Monthly invoices and collection

**Files:**
- Create:
  - the migration and model for `platform_invoices`
  - `app/services/platform/{invoice_run,billing,settle}.rb`
  - `app/jobs/platform/invoice_run_job.rb`
  - `app/pdfs/platform_invoice_pdf.rb`
  - `app/controllers/webhooks/platform_payments_controller.rb`
  - `app/controllers/admin/subscriptions_controller.rb` (the customer's "Tamanly subscription" page)
  - `app/controllers/platform/invoices_controller.rb`
- Modify: `app/models/admin/nav.rb` (add "Tamanly subscription" under Settings, `module_key: :settings`)
- Test:
  - `spec/services/platform/invoice_run_spec.rb`
  - `spec/requests/webhooks/platform_payments_spec.rb`
  - `spec/requests/admin/subscriptions_spec.rb`

**Credentials:** `billplz_platform: { api_key:, x_signature_key:, collection_id:, sandbox: }`. This is Tamanly's own Billplz account. It never receives residents' money.

- [ ] **Step 1: Write failing specs.**
  - **The invoice run.** `InvoiceRun.call(month: 2026-10-01)` runs from a job at 02:00 KL on the 1st, for the previous month. For each customer in `trial`, `active` or `past_due`, it creates one invoice with:
    - lines from `Platform::Pricing`;
    - reference `TML-2611-####`;
    - due date 14 days later.
  - **Idempotency.** Running again creates nothing.
  - **Zero totals.** A customer whose total is RM 0.00 (trial with no payments) gets no invoice.
  - **Issuing.** Each new invoice fires `platform.invoice_issued`: a bell item and an email with the PDF to the customer's portfolio admins and `billing_email`.
  - **Paying online.** On `/admin/subscription`, a portfolio admin presses "Pay RM 1,574.80". Tamanly calls `create_bill` on `Platform::Billing.account`, with the callback at `/webhooks/payments/billplz/platform`, and redirects to Billplz.
  - **Callbacks.** A verified callback marks the invoice paid and is deduplicated through `payment_events`. A bad signature gets 401 and changes nothing.
  - **Bank transfer.** An operator can mark an invoice paid by bank transfer, with a reference. This is audited as `platform_invoice.marked_paid`.
  - **Voiding.** An operator can void an invoice with a reason. The run can then re-issue a corrected invoice for that month, once the void exists.
  - **Customer page.** `/admin/subscription` shows the plan, this month's estimate so far, and every invoice with its status and PDF. It needs `settings: view` to see and `settings: full` to pay.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - `Platform::Billing.account` returns a small `Data` object answering `credentials`, `sandbox?`, `callback_url` and `collection_id`. The M06 Billplz adapter accepts it without changes.
  - Schedule `InvoiceRunJob` in `config/recurring.yml`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add monthly platform invoices paid through Tamanly's Billplz account"`.

### T15.5 · Overdue reminders and suspension

**Files:**
- Create:
  - `app/services/platform/dunning.rb`
  - `app/jobs/platform/dunning_job.rb`
  - `app/controllers/concerns/admin/billing_hold.rb`, included in `Admin::BaseController`
  - `app/views/admin/shared/_billing_banner.html.erb`
- Test:
  - `spec/services/platform/dunning_spec.rb`
  - `spec/requests/admin/billing_hold_spec.rb`
  - `spec/requests/suspended_customer_residents_spec.rb`

- [ ] **Step 1: Write failing specs.** The thresholds count days past the due date, in KL time, and are settings on `Setting`:

  | Days overdue | What happens |
  |---|---|
  | 1 | `platform.invoice_overdue` reminder |
  | 7 | Reminder again, and the subscription becomes `past_due`. Every admin page shows a banner: "Your Tamanly invoice TML-2611-0003 is overdue. Pay it to keep full access." |
  | 30 | The subscription becomes `suspended` and `platform.suspended` fires |

  Other rules:
  - **Running daily.** The job runs every day and repeats nothing: each reminder goes out once.
  - **What suspension blocks.** Staff can still sign in, read pages, and pay on `/admin/subscription`. Every other admin write (POST, PATCH, DELETE) gets 423 with the banner.
  - **Never blocked** (Review Focus):
    - the resident API;
    - the guard console;
    - the guard API;
    - Billplz callbacks for residents' payments.

    A dedicated spec walks one write endpoint of each and expects success for a suspended customer.
  - **Reactivation.** Paying every overdue invoice sets the status back to `active` straight away. It is audited.
  - **Manual changes.** An operator can suspend or reactivate by hand (T15.2), with a reason.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Schedule `DunningJob` daily at 09:00 KL.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add overdue reminders and billing suspension"`.

### T15.6 · Platform dashboard

**Files:**
- Modify: `app/controllers/platform/dashboard_controller.rb`, `app/views/platform/dashboard/show.html.erb`
- Test: `spec/requests/platform/dashboard_spec.rb`

- [ ] **Step 1: Write failing specs.** The dashboard shows:
  - **Revenue:**
    - monthly recurring revenue: the sum of the current subscription parts;
    - payment fees billed last month;
    - invoices overdue, with the total.
  - **Customers** by status: trial, active, past due, suspended, cancelled. Trials ending in the next 7 days are listed by name.
  - **Activity:** online resident payments processed this month across all customers, as a count and a value. This is information only; the money sits in the customers' accounts.
  - **Payout accounts in `error`**, by customer, with a link to the customer page.
  - **Speed:** every number comes from one query each, and the page renders in under 300 ms with 200 customers.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it** with `Ui::TileComponent` and `Ui::IndexComponent`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add platform dashboard"`.

## Module done when

- [ ] An operator onboards a new customer and the customer's first admin receives the invitation. After the trial, the customer receives an invoice for the right amount and pays it through Tamanly's Billplz sandbox account. The invoice shows paid on both sides.
- [ ] A customer left 30 days overdue is suspended. Their residents can still pay bills and their guards can still admit visitors.

## Progress log

| Date | Who | Note |
|---|---|---|
