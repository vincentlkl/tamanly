# M13 · Settings & integrations

**Status:** Not started · **Owner:** — · **Wave:** 4 · **Depends on:** M01, M03, M06 (payout accounts and routes). The real adapters plug into M10 (email) and M04 (gate webhook).

**Goal:** Each company sets up its tamans' profile and branding, connects its own Billplz payout accounts and email sender, optionally sends gate events to boom-gate controllers, and reads a searchable audit log of everything staff did.

**Read first:**
- `../contracts.md` §4 (audit)
- `../decisions.md`: ADR-011a (Billplz), ADR-012 (no SMS), ADR-018

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | Branding (logo, colors), taman profile | All |
| Web | Integrations (payment gateway, SMS) | Billplz payout accounts and email (T13.2). SMS is dropped by decision (ADR-012) |
| Web | Audit log of admin actions | All (the page; data comes from M01 T01.7) |
| Mobile | Support / help | All (T13.5) |
| Out of scope | Hardware gate controller firmware | Integration hooks only, delivered by T13.3 |

**Prototype references:**
- `admin/#/profile`: profile, branding and the live resident-app preview
- `admin/#/integrations`
- `admin/#/audit`
- `INTEGRATIONS` and `BRANDING` in `admin/data.js`

## Data model

**`tamans`** gains: `primary_color`, `accent_color`, and an attached `logo`.

**`integrations`**

| Column | Notes |
|---|---|
| `organization_id` | |
| `kind` | `email` / `gate_webhook` |
| `provider` | |
| `status` | `connected` / `error` / `not_set_up` |
| `settings` | jsonb, non-secret |
| `credentials` | Encrypted text, using `encrypts :credentials` |
| `last_checked_at` | |
| `last_error` | |

Unique on `[organization_id, kind]`.

Payments don't use this table. `payout_accounts` and `payout_routes` belong to M06 (ADR-011a), and this module adds their settings page.

**`gate_webhooks`**

| Column | Notes |
|---|---|
| `station_id` | |
| `url` | |
| `secret` | Encrypted |
| `events` | `text[]` |
| `active` | |

**`gate_webhook_deliveries`**

| Column | Notes |
|---|---|
| `gate_webhook_id` | |
| `gate_event_id` | |
| `status` | |
| `response_code` | |
| `attempts` | |
| `last_error` | |

## Interfaces

**Produces:**

```ruby
Integration.for(organization, :email)      # => Integration | nil
PayoutAccounts::Connect.call(organization:, label:, api_key:, x_signature_key:, sandbox:, bank_name:, bank_account_name:, bank_account_no:)  # => PayoutAccount
PayoutAccounts::Repoint.call(taman:, purpose:, to:, on:, by:)  # ends the live route on `on`, opens the new one, cancels open bills on the old account
OrganizationMailer settings                # per-org SMTP via ActionMailer delivery_method_options
GateWebhooks::DeliverJob                   # subscribes to GateEvent after_create_commit
```

**Consumes:**
- `AuditEvent` (M01)
- `Taman` (M03)
- `GateEvent` (M04)
- the adapter interfaces from M01, M06 and M10

## Tasks

### T13.1 · Taman profile and branding

**Files:**
- Create:
  - the migration
  - `app/controllers/admin/profiles_controller.rb`
  - views, including `_app_preview.html.erb`
  - `app/javascript/controllers/brand_preview_controller.js`
- Modify: `app/serializers/api/v1/property_serializer.rb` (`branding`)
- Test:
  - `spec/requests/admin/profiles_spec.rb`
  - `spec/models/taman_branding_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Profile edits.** The profile page edits name, short name, address, phone, email, gates count and manager. Every change is audited as `taman.updated`.
  - **Logo upload.**
    - Accepts PNG, SVG or JPEG up to 2 MB.
    - Creates a square variant for the app.
  - **Colour rules.**
    - Colours must be hex.
    - The primary colour must reach 4.5:1 contrast against white. Otherwise the error is "Text on this colour would be hard to read. Pick a darker shade."
  - **Live preview.** The resident-app preview updates as the colours change. It is the same component the prototype shows.
  - **API.** `GET /api/v1/properties` returns `branding { primary, accent, logo_url }` from these columns.
  - **Permissions.** Editing needs `settings: edit`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Compute contrast with WCAG relative luminance, in about 10 lines of Ruby. No gem.
  - Seed from `BRANDING` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add taman profile and branding"`.

### T13.2 · Payout accounts and email

**Files:**
- Create:
  - the `integrations` migration and `app/models/integration.rb`
  - `app/controllers/admin/payout_accounts_controller.rb`
  - `app/controllers/admin/payout_routes_controller.rb`
  - `app/controllers/admin/integrations_controller.rb` (email and gate webhook)
  - `app/services/payout_accounts/{connect,check,repoint}.rb`
  - views
- Modify: `app/mailers/application_mailer.rb`
- Test:
  - `spec/services/payout_accounts/connect_spec.rb`
  - `spec/services/payout_accounts/repoint_spec.rb`
  - `spec/requests/admin/payout_accounts_spec.rb`
  - `spec/requests/admin/integrations_spec.rb`

- [ ] **Step 1: Write the failing payout-account specs.**
  - **Payout accounts page** (Settings → Payout accounts). It lists each account with:
    - label;
    - bank (masked, "Public Bank ••• 3307");
    - sandbox or live;
    - status;
    - the tamans and purposes routed to it.
  - **Connecting an account** asks for:
    - label;
    - Billplz API secret key and X Signature Key;
    - sandbox switch;
    - the bank name, account name and account number the Billplz account pays out to. These are shown to residents for manual transfers.

    `PayoutAccounts::Connect` checks the API key with a read-only Billplz call (listing collections) and saves the account as `connected`. A rejected key fails with "Billplz didn't accept this API key. Copy it again from Billplz → Settings → Keys & Integration."
  - **Secrets are write-only.** The form shows "••••••• (saved)" and never sends a key back. Saving is audited as `payout_account.connected` or `payout_account.updated`, listing which keys changed but never their values.
  - **Routing a taman**: on the taman's page, pick the account for `default`, and optionally for `sinking_fund` and `deposits`.
    - Opening a route creates its Billplz collection (`PayoutRoutes::Open` from M06).
    - A strata taman without a `sinking_fund` route shows the warning "Strata law needs the sinking fund in its own bank account. Add a sinking fund payout account."
  - **Cut-over** (`PayoutAccounts::Repoint`): staff pick the new account and a start date, for example when the developer hands over to the owners' body or the taman changes management company.
    - The old route ends on that date, and the new route starts.
    - Online payments still `pending` on the old route have their Billplz bills cancelled (`gateway.cancel`). They're marked `failed` with "The payee for this taman changed. Pay again." and the payer gets `payment.failed`.
    - Paid history is untouched.
    - Audited as `payout_route.repointed`, with the old and new account labels.
  - **Disconnecting** an account is refused while any route uses it: "Move Taman Bukit Indah to another account first."
  - **Health:** an account goes to `error` after a 401 from Billplz, or after 3 callbacks in a row fail the signature check (the X Signature Key can only be proven by a real callback). `payout_account.error` then notifies portfolio admins and puts "Fix payout account" on their worklist.
  - **Permissions:** connecting, routing and cut-over need `settings: full`. Viewing needs `settings: view`.
- [ ] **Step 2: Write the failing email integration specs.**
  - The Integrations page shows email and gate-webhook cards with their status.
  - "Test" sends a mail to the current user through the organisation's SMTP settings.
  - Notification emails go out from that sender when configured, and from `notices@tamanly.app` otherwise.
- [ ] **Step 3: Run them.** Expected: FAIL.
- [ ] **Step 4: Implement it.**
  - Set up Active Record encryption keys: `bin/rails db:encryption:init`, stored in credentials.
  - The M10 delivery-health partial renders on the Integrations page when present.
- [ ] **Step 5: Run the specs.** Expected: PASS.
- [ ] **Step 6: Commit:** `git commit -m "Add payout accounts page with cut-over, and email integration"`.

### T13.3 · Gate controller webhook

**Files:**
- Create:
  - migrations
  - `app/models/{gate_webhook,gate_webhook_delivery}.rb`
  - `app/jobs/gate_webhooks/deliver_job.rb`
  - admin UI on the Integrations page
- Test:
  - `spec/jobs/gate_webhooks/deliver_job_spec.rb`
  - `spec/requests/admin/gate_webhooks_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Delivery.** An admit or deny `GateEvent` at a station with an active webhook POSTs this JSON:

    ```json
    {
      "event": "gate.admit",
      "station": { "id": "…", "name": "…" },
      "plate": "…",
      "people_count": 1,
      "occurred_at": "…",
      "pass": { "kind": "guest", "code": "…" }
    }
    ```

    The request carries `X-Tamanly-Signature: sha256=<hex HMAC of body with secret>` and `X-Tamanly-Timestamp`.
  - **Retries.**
    - A non-2xx response retries with backoff up to 5 times, then marks the delivery failed.
    - 3 consecutive failures set the integration status to `error` and add a staff bell item.
  - **Privacy.** No visitor name or phone number is ever sent. Plates and codes only.
  - **Test event.** "Send test event" posts a `gate.test` payload.
  - **Receiver docs.** The page shows sample code for verifying the signature.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add signed gate controller webhooks"`.

### T13.4 · Audit log page

**Files:**
- Create:
  - `app/controllers/admin/audit_events_controller.rb`
  - `app/queries/admin/audit_events_query.rb`
  - views
- Test: `spec/requests/admin/audit_events_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Audit log page** (`admin/#/audit`):
    - Filters: area (the prefix of the action key), actor, taman and date range.
    - Search: the target label.
    - Columns: when, actor, action (translated label), target (linked when the record still exists), taman and IP.
  - **Drawer.** It shows the metadata as a readable before/after list.
  - **CSV export.** Exporting writes its own audit row, `audit.exported`.
  - **Isolation.** Only the organisation's own events are shown. A taman manager sees only their tamans' events plus organisation-wide events they performed themselves.
  - **Permissions.** The page needs `settings: view`.
  - **Speed.** 50,000 events paginate in under 300 ms, using the `[organization_id, created_at]` index.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed 90 events from `AUDIT` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add audit log page"`.

### T13.5 · Help & support (storyboard G4)

**Files:**
- Create:
  - migrations and models for `help_articles` and `support_requests`
  - `app/controllers/admin/help_articles_controller.rb`
  - `app/controllers/api/v1/help_controller.rb`
  - views (a "Help articles" tab on the Taman profile page)
- Test: `spec/requests/api/v1/help_spec.rb`, `spec/requests/admin/help_articles_spec.rb`

**Tables:**
- `help_articles`: `organization_id`, `title_en`, `title_ms`, `body_en`, `body_ms`, `position`, `published`.
- `support_requests`: `taman_id`, `unit_id`, `user_id`, `category` (`app_problem` / `billing` / `access` / `other`), `message`, `app_version`, `device`, `status` (`open` / `closed`).

- [ ] **Step 1: Write failing specs.**
  - **`GET /api/v1/help`** (requires `X-Unit-Id`) returns:
    - published articles in the user's locale, falling back to EN;
    - `contacts` for the management office: phone, email, and a WhatsApp link built from the taman profile;
    - `privacy_url`.
  - **`POST /api/v1/help/requests`**:
    - Creates a `support_request`.
    - Fires `support.requested`, which reaches the staff bell and emails the taman's address.
    - Answers "Thanks. The management office will reply by phone or email within 2 working days."
    - Rate limit: 5 per user per day.
  - **Admin:**
    - Staff with `settings: edit` add, edit, reorder and unpublish articles.
    - Support requests are listed on the same tab, where staff can close them.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the models, endpoints and admin tab.** Seed 6 articles in both languages:
  - "Linking your unit"
  - "Adding a sub-tenant"
  - "Visitor passes"
  - "Paying bills"
  - "Permit deposits"
  - "Booking facilities"

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add help articles and support requests"`.

## Module done when

- [ ] A new company can connect its own Billplz sandbox account, route a taman to it, and take a sandbox payment that settles through its own collection, from the dashboard alone.
- [ ] Repointing a taman to a new account cancels open bills on the old one, and the next payment goes to the new account.
- [ ] Every admin write performed while testing M01–M13 appears in the audit log with a readable label in EN and BM.

## Progress log

| Date | Who | Note |
|---|---|---|
