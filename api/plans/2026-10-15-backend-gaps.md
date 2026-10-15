# Backend gaps for the mobile app — Implementation Plan (P05)

> **For agentic workers:** use superpowers:executing-plans and `ponytail:ponytail` (level **full**). Tick a step only after you've done it and seen the expected result. Shortest working diff. Business logic in services. Never push.

**Goal:** Build the API routes that the refined design needs but `feature/mobile-api` lacks (`plan/api/runs/guide_review.md`, "API endpoint gaps"). They are: the unit statement PDF, the gate-log CSV, guard permit show/deny, sub-tenant access requests, resident incidents, the permit refund account, and listing photos. `POST /uploads` and `POST /auth/firebase` are **not** built (the design dropped them). `GET /invites?code=` is **not** built either (D7).

**Architecture:**
- **Reuse before writing.** The statement PDF is `Finance::ArAging.detail` + `ArAgingStatementPdf`. The gate CSV reuses the `GateEventsController#index` scope and `Billing::ExportStatement.csv_line`. Guard permit show is `Gate::Check.for_permit` + `Guard::VerdictSerializer`. Resident incidents call `Gate::ReportIncident`.
- **Three new services**, one per new state change: `Gate::Admit.deny_contractor!` (a method on the existing class), `Properties::RequestAccess`, `Permits::SaveRefundAccount`. Listing photos go through the existing `Listings::Save`.
- **One migration:** the refund account columns on `permits`. Listing photos need no migration (Active Storage).
- **No new tables.** An access request is a notification to the host, not a stored row (D4).

**Source:** Vincent, 2026-10-15, after `plan/api/runs/guide_review.md`. Contract: `plan/api/endpoints.yml` + `swagger/v1/swagger.yaml`.

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Statement PDF = the AR aging statement for one unit.** `GET /billing/statement/pdf` renders `ArAgingStatementPdf.new(taman:, details: [Finance::ArAging.detail(unit: Current.unit)], generated: Time.current)` inline, like `ReceiptsController#pdf`. The figures match the admin's AR aging exactly. No date range; it is "as of today" (AR plan D4). |
| D2 | **Gate CSV = the C9 list, unpaged.** Same `date`/`filter`/`q` as `GET /guard/gate_events`, one KL day, newest first. Columns `In,Out,Name,Type,Plate,Unit,Gate,Status,Reason,Guard` (guide 05:156). |
| D3 | **Guard permit deny writes a gate row, not a permit status.** `Permit::TRANSITIONS` has no "denied at gate" state, and a refused entry today must not reject the permit. `deny_contractor!` creates a `VisitorEntry` (`visit_type: "contractor"`, `status: "Denied"`, `permit:`, `deny_reason:`). That row then appears in C9 under "Denied" and "Contractors". |
| D4 | **Access request = a notification, no table.** A sub-tenant asks for scopes. The host (`occupancy.invited_by`, else the unit's active owner/tenant occupants) gets a `Notification` (category `account`) whose deep link opens G2 for that sub-tenant. They grant it with the existing `PATCH /units/:unit_id/sub_tenants/:id` (`Properties::UpdateOccupantScopes`). The 3-a-day limit is a rack-attack throttle. <br>ponytail: there's no request inbox or "pending" state; add a table only if hosts need to see or deny requests in a list. |
| D5 | **Resident incidents reuse the guard path.** `Gate::ReportIncident` with `severity: "low"`, `location: unit name`, `reported_by: "<name> (<unit>)"`. Categories get five resident keys (D9). No photo in v1: `Incident` has no attachment, and the guard route already rejects `photos` (`api.gate.photos_unavailable`). Any occupant of the unit may report, sub-tenants included. |
| D6 | **Refund account:** keep `permits.bank` as the bank name (the admin views print it). Add `refund_holder` and `refund_account_number`, the latter with `encrypts` (Active Record encryption is already configured for `PayoutAccount`). The API never returns the full number, only `number_last4`. Edits are refused once `refund_paid_at` is set or the decision is `Forfeited`. |
| D7 | **`GET /invites?code=` is not built.** Verified: `InvitesController#index` ignores params and lists `Current.user.occupancies.open_invites` on active tamans, which are invites addressed to the signed-in account. P01 (`2026-10-15-invite-only-signup.md` D4) dropped typed codes. Nothing to build. |
| D8 | **Listing photos + kind/condition (Vincent locked):** `has_many_attached :photos` on `Listing`, at most 6, images only, checked by `Permits::Upload.check(images: true)`. Multipart `photos[]` on create and update. On update, `photos[]` replaces all photos and `keep_photo_ids[]` keeps the listed ones. Add `kind` (`sell service free wanted`, default `sell`) and `condition` (`new like_new good fair`, nullable). Price 0 for `free`/`wanted`. |
| D9 | **Incident categories:** add `Streetlight`, `Gate & access`, `App problem`, `Other` to `Incident::CATEGORIES` (`Noise` already exists). The resident route accepts only `RESIDENT_CATEGORIES = %w[streetlight gate_access noise app_problem other]`. The admin form gains them for free. |
| D10 | **Build order:** these become modules **A11** (guard), **A12** (resident billing + permits), and **A13** (incidents + marketplace). Each module is its own build plus review pass, like A05–A10. |

## Global Constraints

- Read `tamanly_backend/docs/AGENT_CONVENTIONS.md` first. API routes inherit `Api::V1::BaseController` (headers, errors, Pundit). Guard routes inherit `Api::V1::Guard::BaseController` (taman by `X-Taman-Id`, `acts_as_tenant`).
- **No SMS anywhere.** No new SMS/phone OTP code, copy or columns.
- **UUID PKs; money in `*_cents`**, rendered with `Money.json`. **Business logic in services**; controllers fetch params, call one service, render.
- **Tenant = taman.** Resident routes resolve through `Current.unit` (`requires_unit`). Guard routes resolve through `acts_as_tenant`, so another taman's id is a 404.
- **Audit** every state change: `AuditEvent.record!(action: "domain.verb", target:)`. Never put an account number in metadata.
- **Tests:** rspec request specs + rswag under `spec/requests/api/v1/`. Each endpoint needs a happy path, 401, 403/422, and another unit's/taman's id → 404. Regenerate with `bundle exec rake rswag:specs:swaggerize`. Run from `tamanly_backend/`.
- **Migrations** start at `20261016100100` (P03 owns `20261016100000`) and step by 100.
- **Never** `git push`, `db:seed`, `db:reset` or `db:drop`. Commit once per module, after the review is green. End each commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Permitted edits to protected files (this plan only)

| File | Permitted edit |
|---|---|
| `config/routes.rb` | the routes listed in Tasks 1–6, inside `namespace :api / :v1`, nothing else |

`config/initializers/rack_attack.rb` is not protected. It gets two throttles: `access_requests/create` (3 per 24 h per user) and `incidents/create` (10 per hour per user).

## Endpoints

| # | Route | Auth | Service | Response | Module |
|---|---|---|---|---|---|
| 1 | `GET /api/v1/billing/statement/pdf` | unit, `bills_view` | `Finance::ArAging.detail` + `ArAgingStatementPdf` | `200 application/pdf`, `statement-<unit>-<date>.pdf` | A12 |
| 2 | `GET /api/v1/guard/gate_events/csv?date=&filter=&q=` | guard | `Gate::LogCsv` (new, ~15 lines) | `200 text/csv`, `gate-log-<taman>-<date>.csv` | A11 |
| 3a | `GET /api/v1/guard/permits/:id` | guard | `Gate::Check.for_permit` | `200 {data: verdict}` (with `permit`) | A11 |
| 3b | `POST /api/v1/guard/permits/:id/deny {reason, gate}` | guard | `Gate::Admit.deny_contractor!` | `200 {data: guard_permit}`; `422` no reason | A11 |
| 4 | `POST /api/v1/access_requests {scopes:[…]}` | unit, sub-tenant only | `Properties::RequestAccess` | `202`, no body; `403` owner/tenant; `422` already held/unknown scope; `429` | A12 |
| 5 | `POST /api/v1/incidents {title, category, description}` | unit | `Gate::ReportIncident` | `201 {data: incident}`; `422`; `429` | A13 |
| 6 | `PATCH /api/v1/permits/:id {refund_account:{bank,holder,number}}` | unit, `PermitPolicy` | `Permits::SaveRefundAccount` | `200 {data: permit}`; `422` | A12 |
| 7 | `POST/PATCH /api/v1/listings` multipart `photos[]` (+`keep_photo_ids[]`) | unit, `ListingPolicy` | `Listings::Save` | listing with `photos: [{id,url}]`, card `cover_url` | A13 |
| — | `GET /api/v1/invites?code=` | — | — | not built (D7) | — |

## File map

**Create**

| Path | Responsibility |
|---|---|
| `db/migrate/20261016100100_add_refund_account_to_permits.rb` | `refund_holder`, `refund_account_number` (string, encrypted) |
| `db/migrate/20261016100200_add_listing_kind_condition.rb` | `listings.kind`, `listings.condition` |
| `app/services/gate/log_csv.rb` | gate rows → CSV string |
| `app/services/properties/request_access.rb` | validate the scopes, notify the host(s), audit |
| `app/services/permits/save_refund_account.rb` | validate, save, audit |
| `app/serializers/incident_serializer.rb` | `{id, reference, title, category, severity, status, location, created_at}`, shared by the guard and resident routes |
| `app/controllers/api/v1/access_requests_controller.rb`, `incidents_controller.rb` | thin controllers |
| `spec/requests/api/v1/{billing_statement,guard_gate_csv,access_requests,incidents}_spec.rb` | new request + rswag specs |

**Modify:** `config/routes.rb`; `config/initializers/rack_attack.rb`; `app/models/{permit,listing,incident}.rb`; `app/services/gate/admit.rb`; `app/services/listings/save.rb`; `app/controllers/api/v1/{billing,permits,listings}_controller.rb`; `app/controllers/api/v1/guard/{permits,gate_events,incidents}_controller.rb`; `app/serializers/{permit_serializer,listing_serializer}.rb`; `app/views/admin/permits/show.html.erb` (holder + `····last4`); `config/locales/{en,ms}/*.yml` (new messages); `spec/requests/api/v1/{guard_permits,permits,listings}_spec.rb`; `spec/factories.rb` if needed; `swagger/v1/swagger.yaml` (regenerated); `plan/api/endpoints.yml` (8 rows); `plan/api/README.md` (modules table A11–A13).

---

## Tasks

### Task 0: Contract rows

- [ ] Add these rows to `plan/api/endpoints.yml` with `api_md_line: null`, `status: todo` and `source: P05`:
  - `GET /api/v1/billing/statement/pdf` (A12)
  - `GET /api/v1/guard/gate_events/csv` (A11)
  - `GET /api/v1/guard/permits/:id` (A11)
  - `POST /api/v1/guard/permits/:id/deny` (A11)
  - `POST /api/v1/access_requests` (A12)
  - `POST /api/v1/incidents` (A13)
  - `PATCH /api/v1/permits/:id` (A12)
  - a note on `POST`/`PATCH /api/v1/listings`: `photos[]` (A13)

  Don't run `gen.rb`: it overwrites status.
- [ ] Add A11–A13 to the README modules table, with build/review model per the current policy.

### Task 1 (A11): Guard permit show + deny

- [ ] Routes: in `namespace :guard`, change `resources :permits, only: []` to `only: :show`, and add `post :deny` to its member block. `get "permits/today"` stays declared first (`routes.rb:144`).
- [ ] `Guard::PermitsController#show`: `render_data(::Guard::VerdictSerializer.call(Gate::Check.for_permit(permit, taman:), taman:))`.
- [ ] `#deny`: `Gate::Admit.deny_contractor!(permit, reason: text(:reason, max: 500), gate: gate_name)`, then `render_data(row)`.
- [ ] `Gate::Admit.deny_contractor!(permit, reason:, gate: nil, at: Time.current)`:
  - a blank reason gives the same `422` as `deny!`;
  - otherwise, inside `permit.with_lock`, create the denied `VisitorEntry` (D3: `name: contractor_name`, `host_name`, `in_at: at`, `gate`, `guard_name`, `reference: Reference.next!(:visitor, scope: permit.taman)`, `via: "Contractor pass"`);
  - audit `gate.contractor_denied` with `{permit_id:, reason:}`.
- [ ] Specs (`guard_permits_spec.rb`):
  - show returns `code`/`actions`/`permit` for a live permit and `outside_hours` when it applies;
  - another taman's permit → 404;
  - deny without a reason → 422;
  - deny → 200 and `GET gate_events?filter=denied` lists it with `deny_reason`;
  - the permit status is unchanged.
- [ ] rswag `tags "Guard"`. Then swaggerize.

### Task 2 (A11): Gate-log CSV

- [ ] Route: `get "gate_events/csv", to: "gate_events#csv"` (no clash: `gate_events` has no `:id` route).
- [ ] `GateEventsController`: pull `search(Gate::Window.logged_on(date).where(filter))` into a private `rows` used by both actions. `#csv`:
  ```ruby
  send_data Gate::LogCsv.call(rows.includes(:unit).order(in_at: :desc).limit(Gate::LogCsv::MAX)),
            filename: "gate-log-#{taman.name.parameterize}-#{date.iso8601}.csv", type: "text/csv"
  ```
- [ ] `Gate::LogCsv`:
  - the `HEADER` from D2, then one line per entry via `Billing::ExportStatement.csv_line`;
  - times in KL as `%H:%M`; Type is `visit_type_display`; Status is the display string;
  - `MAX = 5_000`. ponytail: one gate's day is well under this; page it if a mega-taman ever hits it.
- [ ] Specs: header + one row; `filter=denied` narrows; bad `date` → 422 (JSON envelope); no guard membership → 403.

### Task 3 (A12): Statement PDF

- [ ] Route: `get "billing/statement/pdf", to: "billing#statement_pdf"`.
- [ ] `BillingController`:
  - change to `requires_unit only: %i[transfer_instructions statement_pdf]`;
  - add `require_scope :bills_view, only: :statement_pdf`;
  - the action builds `detail = Finance::ArAging.detail(unit: Current.unit)`, then `send_data ArAgingStatementPdf.new(taman: Current.unit.taman, details: [detail], generated: Time.current).render, filename: "statement-#{Current.unit.name.parameterize}-#{Date.current.iso8601}.pdf", type: "application/pdf", disposition: "inline"`.
- [ ] Specs:
  - 200 with `%PDF` and `Content-Type` for an owner with an open invoice;
  - a sub-tenant without `bills_view` → 403 `scope_missing`;
  - another unit's id in `X-Unit-Id` → 404/403 per `UnitContext`;
  - an empty unit still renders "Nothing outstanding." (use pdf-inspector if it's in the bundle, else check the bytes are non-empty).

### Task 4 (A12): Access requests

- [ ] Route: `resources :access_requests, only: :create`.
- [ ] `AccessRequestsController#create`, with `requires_unit`:
  - `Properties::RequestAccess.call(occupancy: Current.occupancy, scopes: Array(params[:scopes]))`, then `head :accepted`;
  - rescue `Properties::Error` → `422 validation_failed`, `details: {scopes: [msg]}`.
- [ ] `Properties::RequestAccess`:
  - not `sub_tenant?` → `Api::Error.new(:forbidden)`;
  - unknown scope (not in `Occupancy` scopes check list) → error;
  - `(scopes - occupancy.scopes).empty?` → error "You already have that access.";
  - recipients = `[occupancy.invited_by]`, compacted, or the unit's active owner/tenant users;
  - for each recipient, `user.notifications.create!(unit:, category: :account, title: "Access request", body: "<name> asks for <labels>.", deep_link: "tamanly://me/properties/#{unit.id}/sub_tenants/#{occupancy.id}")`;
  - audit `occupancy.access_requested` with `{scopes:}`.
  - Push: if `Bookings::Decide`'s in-app row is all the app gets today, match it. FCM delivery follows A10's notification push when one exists (see Q4).
- [ ] rack-attack `access_requests/create`: 3 per 24 h, keyed by `api_user_id(req)` on POST to that path.
- [ ] Specs: sub-tenant → 202 and the host has one notification; owner → 403; same scopes again → 422; unknown scope → 422; no `X-Unit-Id` → 422.

### Task 5 (A12): Permit refund account

- [ ] Migration `20261016100000`: `add_column :permits, :refund_holder, :string` and `add_column :permits, :refund_account_number, :string`. Model: `encrypts :refund_account_number`.
- [ ] Route: `resources :permits, only: %i[index show create update]`.
- [ ] `PermitsController#update`: `Permits::SaveRefundAccount.call(permit: find_permit, params: params.require(:refund_account))`, then `render_data(PermitSerializer.detail(permit))`.
- [ ] `Permits::SaveRefundAccount`:
  - `bank` (≤ 80, squished), `holder` (≤ 120) and `number` (digits after stripping spaces/dashes, 6–20) are all required, else `422` "Fill in the bank, the account holder and the account number.";
  - `refund_paid_at` or `Forfeited` → `422` "The deposit has already been refunded.";
  - `permit.update!(bank:, refund_holder:, refund_account_number:)`;
  - audit `permit.refund_account_updated` (no number).
- [ ] `PermitSerializer.detail`: add `refund_account: permit.bank && { bank:, holder:, number_last4: number&.last(4) }`.
- [ ] Admin `permits/show.html.erb:72`: "Refunds go to <bank> · <holder> ····<last4>".
- [ ] Specs:
  - 200 and the response has `number_last4` and no full number;
  - the DB value is ciphertext (`Permit.connection.select_value` ≠ number);
  - missing holder → 422; after a refund is paid → 422;
  - a sub-tenant → 403; another tenancy's permit → 404.

### Task 6 (A13): Resident incidents

- [ ] `Incident::CATEGORIES`: append the D9 labels. Add `RESIDENT_CATEGORIES`.
- [ ] Extract `IncidentSerializer.call(incident)` from the guard controller's inline hash, and make the guard controller use it (no behaviour change; `guard_ops_spec` stays green).
- [ ] Route: `resources :incidents, only: :create` (top level, not guard).
- [ ] `IncidentsController#create`, with `requires_unit`:
  - category ∈ `RESIDENT_CATEGORIES` else 422;
  - title required (≤ 120); description ≤ 2000;
  - `photos` present → the guard's 422 `photos_unavailable`;
  - `Gate::ReportIncident.call!(taman: Current.unit.taman, params: {…D5…})`;
  - `201 {data: IncidentSerializer}`.
- [ ] rack-attack `incidents/create`: 10 per hour per user.
- [ ] Specs: 201 with `INC-` reference and `severity: "low"`; guard-only category → 422; no title → 422; the incident is in `Incident.where(taman: unit.taman)` and in no other taman.

### Task 7 (A13): Listing photos

- [ ] `Listing`: `has_many_attached :photos`. `Listings::Save` gets a `MAX_PHOTOS = 6` constant and a private `attach_photos(listing, params)`:
  - each upload goes through `Permits::Upload.check(it, name: "Photo", images: true)`, and the first error → `RecordInvalid` on `:photos`;
  - on update: purge the attachments not in `keep_photo_ids[]`, then attach the new ones;
  - kept + new > 6 → 422.
- [ ] `ListingSerializer`:
  - card gets `cover_url`;
  - detail gets `photos: listing.photos.map { { id: it.id, url: blob_url(it) } }`;
  - `blob_url` = `Rails.application.routes.url_helpers.rails_blob_url(it, **ActionMailer::Base.default_url_options)`, the same options as `PermitSerializer`'s `pass_url`;
  - `includes(photos_attachments: :blob)` on index.
- [ ] Specs:
  - multipart create with 2 PNGs → 201 with 2 `photos`;
  - 7 photos → 422; a PDF → 422;
  - update with `keep_photo_ids` of one plus one new photo → 2;
  - another seller's listing → 404.
- [ ] `kind`/`condition`: **build now** — columns + enums; serializer fields; validate; free/wanted → price 0.

### Task 8: Close-out

- [ ] `bundle exec rspec spec/requests/api/v1` and `bin/rails test` are both green.
- [ ] Swaggerize. Every new row in `endpoints.yml` is set to `reviewed` after the review pass.
- [ ] Hand-off note: the routes that P04 and the guides can now use (C8 show/deny, C9 export, E2 statement, E5, D4 refund account, G4 report, B3/B4 photos).

---

## Cross-links (not duplicated here)

| Plan | What it adds to the API | Module |
|---|---|---|
| P02 `2026-10-15-visitor-categories.md` Task 3 | `GET /api/v1/visitor_categories` (`{id,name,base}`); pass create takes `category_id` | A04 fix |
| P03 `2026-10-15-booking-limit.md` D5 | `GET /facilities/:id`: `booking_limit`, `booking_limit_period`, `quota{used,limit,period,resets_on}`; `per_month` dropped | A08 fix |
| P04 `2026-10-15-single-app-guard-role.md` Task 1 | `POST /guard/walkins` notifies the host and exposes `visitor_pass_id` | A05 fix |
| P04 D5 | says C8 starts from the `checks` verdict and C9 has no CSV. **Once A11 lands, those two lines are stale**: C8 uses `GET guard/permits/:id`, and C9 gets Export. | — |
| P01 `2026-10-15-invite-only-signup.md` D4 | rules out `GET /invites?code=` (this plan D7) | — |

## Open questions

| # | Question | Default if no answer |
|---|---|---|
| Q1 | The statement PDF prints "To: <owner name>". Should a sub-tenant with `bills_view` see the owner's name (PDPA; receipts hide the payer)? | Yes for owners/tenants. For sub-tenants, print "To: The owner" (pass a flag like `ReceiptPdf`'s `show_payer`). |
| Q2 | Should guard permit deny also count toward a stop-work or notify the resident? | No. It's a gate row only (D3). The resident sees nothing. |
| Q3 | Listing `kind`/`condition` | **Locked: build in A13** (Vincent). |
| Q4 | Access-request and incident pushes: is the in-app inbox enough until A10's FCM per-row push exists? | Yes. In-app `Notification` rows only, like `Bookings::Decide`. |
| Q5 | Resident incident photo (design G4 "optional photo"): add `has_many_attached :photos` to `Incident` for guards and residents together? | Not now. 422 `photos_unavailable`, same as the guard route. |
| Q6 | Should permit create accept `refund_account` too, instead of only `bank`? | No. Create keeps `bank`; D4 edits through PATCH. |
