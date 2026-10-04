# M13 · Settings & integrations

**Status:** Not started · **Owner:** — · **Wave:** 4 · **Depends on:** M01, M03. The real adapters plug into M06 (Billplz payments), M10 (email) and M04 (gate webhook).

**Goal:** Each company sets up its tamans' profile and branding, connects its own Billplz account and email sender, optionally sends gate events to boom-gate controllers, and reads a searchable audit log of everything staff did.

**Read first:**
- `../contracts.md` §4 (audit)
- `../decisions.md`: ADR-011a (Billplz), ADR-012 (no SMS), ADR-018

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | Branding (logo, colors), taman profile | All |
| Web | Integrations (payment gateway, SMS) | Billplz and email. SMS is dropped by decision (ADR-012) |
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
| `kind` | `payment` / `email` / `gate_webhook` |
| `provider` | |
| `status` | `connected` / `error` / `not_set_up` |
| `settings` | jsonb, non-secret |
| `credentials` | Encrypted text, using `encrypts :credentials` |
| `last_checked_at` | |
| `last_error` | |

Unique on `[organization_id, kind]`.

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
Integration.for(organization, :payment)    # => Integration | nil
Payments::Gateway.for(organization)        # => Payments::Gateways::Billplz built from the integration; replaces M06's credentials fallback
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

### T13.2 · Integrations: Billplz and email

**Files:**
- Create:
  - the migration
  - `app/models/integration.rb`
  - `app/controllers/admin/integrations_controller.rb`
  - views
  - `app/services/integrations/check.rb`
- Modify:
  - `app/services/payments/gateway.rb`
  - `app/mailers/application_mailer.rb`
- Test:
  - `spec/requests/admin/integrations_spec.rb`
  - `spec/services/integrations/check_spec.rb`
  - `spec/services/payments/gateway_for_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Integrations page.** It shows one card per kind with:
    - status
    - detail line, such as "Billplz · 4 collections · sandbox" or "notices@lestarifm.my · SPF and DKIM verified"
    - "Set up" / "Edit" / "Test" buttons
  - **Credentials.**
    - They are write-only. The form never echoes secrets back and shows "••••••• (saved)".
    - Saving is audited as `integration.updated`, with the secret keys listed but never their values.
  - **Test connection.** "Test" runs `Integrations::Check`:
    - Billplz: fetches each taman's collection (`GET /api/v3/collections/:id`) with the saved API key.
    - Email: sends a test mail to the current user.

    It records `status` and `last_error`, and is stubbed with WebMock in specs.
  - **Routing.**
    - **Billplz setup** asks for the API secret key, the X Signature Key and a sandbox switch.
      - On save, it creates one collection per taman (`POST /api/v3/collections` with the taman name as `title`), unless a collection id is already stored for that taman.
      - It stores the ids in `settings.collection_ids`, keyed by taman id. A taman added later gets its collection on the next save or from a "Create missing collections" button.
    - `Payments::Gateway.for(org)` builds the Billplz adapter from this integration. Without one, checkout returns 422 with "Online payment isn't set up for this taman yet. Pay by bank transfer instead."
    - The page shows the callback URL (`https://<host>/webhooks/payments/billplz`) for reference. Billplz receives it per bill, so nothing needs setting in the Billplz dashboard.
  - **Email sender.** Notification emails go out from the organisation's SMTP sender when configured.
  - **Permissions.** Editing needs `settings: full`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Set up Active Record encryption keys: `bin/rails db:encryption:init`, stored in credentials.
  - The M10 delivery-health partial renders on this page when present.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "Add per-organisation Billplz and email integrations"`.

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

- [ ] A new company can connect a Billplz sandbox account and its email sender from the dashboard alone, and a sandbox payment settles through its own collection.
- [ ] Every admin write performed while testing M01–M13 appears in the audit log with a readable label in EN and BM.

## Progress log

| Date | Who | Note |
|---|---|---|
