# Shared contracts

These names, signatures and formats are shared across modules. Code against them even when the owning module hasn't landed yet: write a stub with the same signature, and mark it in your progress log. To change any of them, follow step 7 of the agent protocol in `README.md`.

## 1. Request context: `Current`

Owner: **M01 T01.5**

```ruby
# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :session      # Session (admin cookie sessions)
  attribute :api_token    # ApiToken (mobile requests)
  attribute :user         # User
  attribute :organization # Organization (staff and guards only; nil for residents)
  attribute :staff_membership # StaffMembership (staff and guards only); memoises permission rows per request
  attribute :taman_ids    # Array<String> of taman UUIDs this request may touch
  attribute :occupancy    # Occupancy (mobile: the unit picked with X-Unit-Id; nil for staff)
  attribute :station      # Station (guard console on a paired device)
  attribute :ip, :user_agent, :request_id
end
```

How each surface fills it:

| Surface | `user` | `organization` | `taman_ids` |
|---|---|---|---|
| `/admin` | From the session | The staff member's organisation | Their accessible tamans, narrowed by the scope switcher (`params[:taman]` or the cookie `tm_scope`) |
| `/security` | The guard who entered the PIN | The station's organisation | `[station.taman_id]` |
| `/api/v1`, resident | From the token | nil | Tamans of their active occupancies |
| `/api/v1`, guard | From the token | The guard's organisation | The guard's assigned tamans |
| `/api/v1`, staff | From the token | The staff member's organisation | As on `/admin`, without the switcher |

On `/api/v1` for residents, `occupancy` is set from the `X-Unit-Id` header (`contracts §8`).

## 2. Tenancy

Owner: **M01 T01.5**

```ruby
# app/models/concerns/taman_scoped.rb
module TamanScoped
  extend ActiveSupport::Concern
  included do
    belongs_to :taman
    scope :in_scope, -> { where(taman_id: Current.taman_ids) }
  end
end
```

- Every tenant-owned model includes `TamanScoped`. Index queries start from `Model.in_scope`, or from a Pundit `policy_scope`, which must call `in_scope`. Never use `Model.all`.
- Member lookups (`show`, `update`) use `policy_scope(Model).find(params[:id])`. A record from another tenant raises `ActiveRecord::RecordNotFound`, which renders 404.
- `Access.taman_ids_for(user, organization:)` returns the staff member's accessible taman ids:
  - all tamans of the organisation when `staff_membership.all_tamans`;
  - otherwise the assigned tamans.
- `Access.resident_taman_ids(user)` returns tamans with an active occupancy.

Shared spec. Every resource request spec includes this:

```ruby
# spec/support/shared_examples/tenant_isolation.rb
RSpec.shared_examples "a tenant-isolated endpoint" do |method:, path:|
  # Requires let(:foreign_record): a record of the same kind in another organisation
  # Requires let(:auth_headers) for API specs, or sign_in_as(staff) for admin specs
  it "returns 404 for another tenant's record" do
    public_send(method, instance_exec(&path), headers: try(:auth_headers) || {})
    expect(response).to have_http_status(:not_found)
    expect(response.body).not_to include(foreign_record.try(:reference) || foreign_record.id)
  end
end
```

## 3. Roles, permission keys and levels

Owner: **M01 T01.6**

- **Staff roles** (`staff_memberships.role`): `portfolio_admin`, `taman_manager`, `billing_ops`, `security_lead`, `guard`.
  - Guards are staff memberships with role `guard`, assigned to tamans through `staff_taman_assignments` like everyone else.
  - Guards never get an `/admin` session (`StaffMembership#admin?` is false for them). They use `/security` and the mobile guard mode.
- **Occupant relationships** (`occupancies.relationship`): `owner`, `tenant`, `sub_tenant`.

Levels, ordered:

```ruby
Permissions::LEVELS = { none: 0, view: 1, edit: 2, full: 3 }.freeze
```

Module keys. These are fixed: other modules reference them in policies.

| Key | Prototype label | Owner module |
|---|---|---|
| `properties` | Properties & units | M03 |
| `users_roles` | Users & roles | M01 |
| `visitor_registry` | Visitor registry | M04 |
| `qr_policy` | QR pass policy | M04 |
| `guard_ops` | Guard roster & incidents | M04 |
| `permit_review` | Permit review | M05 |
| `deposits_refunds` | Deposits & refunds | M05 / M06 |
| `contractor_enforcement` | Contractor enforcement | M05 |
| `billing` | Invoices & reconciliation | M06 |
| `facilities` | Facilities | M07 |
| `marketplace` | Marketplace moderation | M08 |
| `communications` | Communications | M09 |
| `analytics` | Analytics | M12 |
| `settings` | Settings & audit | M13 |

Default levels per staff role. They are copied into `role_permissions` when an organisation is created. Columns follow the table order above.

```ruby
Permissions::DEFAULTS = {
  portfolio_admin: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  taman_manager:   [3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 3, 3, 1, 1],
  billing_ops:     [1, 0, 0, 0, 0, 1, 3, 0, 3, 1, 0, 1, 1, 0],
  security_lead:   [1, 0, 3, 2, 3, 1, 0, 2, 0, 1, 0, 1, 1, 0],
  guard:           [0, 0, 2, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0]
}.freeze
```

API:

```ruby
Permissions.level(user, module_key, taman)          # => :none | :view | :edit | :full
Permissions.allows?(user, module_key, level, taman) # => true when level(user, ...) >= level
```

Taman overrides win over role defaults. Organisation-wide pages pass `taman: nil`. The result is then the highest level across the user's accessible tamans.

Policy base:

```ruby
class ApplicationPolicy
  # Subclasses set MODULE_KEY = :billing
  def index?   = allowed?(:view)
  def show?    = allowed?(:view)
  def create?  = allowed?(:edit)
  def update?  = allowed?(:edit)
  def destroy? = allowed?(:full)
  private
  def allowed?(level) = Permissions.allows?(user, self.class::MODULE_KEY, level, record.try(:taman))
end
```

Occupant scopes (`occupancies.scopes`, a string array, sub-tenants only): `bills_view`, `bills_pay`, `visitor_passes`, `facility_booking`. Owners and tenants implicitly hold all four. Check with `occupancy.allows?(:bills_pay)`.

## 4. Audit

Owner: **M01 T01.7**

```ruby
AuditEvent.record!(action:, target:, taman: target.try(:taman), metadata: {})
# action: dotted key, e.g. "permit.approved", "invoice.batch_created", "user.role_changed"
# target: any AR record; stores target_type, target_id, target_label (record.try(:reference) || record.to_s)
# actor, organization, ip, user_agent come from Current
```

- The admin audit page shows `I18n.t("audit.actions.#{action}")`.
- Every admin write, and every staff action through the API, calls it from the domain service, not from the controller.
- Shared example: `it_behaves_like "an audited action", "permit.approved"`.

## 5. Notifications

Owner: **M10 T10.4**

```ruby
Notifier.deliver(event_key, record:, to: nil, params: {})
# event_key: a key in Notifications::Catalog (section 10)
# record:    the subject (Permit, Invoice, VisitorPass, ...) - used for deep links and recipient resolution
# to:        optional Array<User>; when nil, the catalog's recipient resolver decides
# params:    extra interpolation values for the templates
# Returns:   Array<Notification> (one per recipient, already filtered by preferences)
```

- It always writes an in-app `Notification` (the notification center) unless the event is `inbox: false`.
- Push, email and SMS are queued per channel according to the catalog defaults and the user's preferences. Mandatory events ignore the preference opt-out.
- Recipients are resolved **at send time** from active occupancies and staff assignments (Review Focus 4).
- Callers must call it after commit: use `after_commit` or call it outside the transaction.

Deep link format sent in the push `data` and stored on the notification:

```
tamanly://<area>/<id>     e.g. tamanly://permits/7b1c...  tamanly://invoices/...  tamanly://visitors/...
```

Staff events also store an admin path (`/admin/permits/<id>`) for the bell.

## 6. Payments

Owner: **M06**

```ruby
# Anything payable includes this concern
module Payable
  # Required: #amount_due_cents (Integer), #taman, #payable_label (String),
  #           #apply_payment!(allocation) - called inside the allocation transaction
end
# Includers: Invoice (M06), PermitCharge (M05: deposit and processing fee), BookingCharge (M07)

Payments::Checkout.start(payables:, user:, method:, idempotency_key:)
# method: "fpx" | "card" | "duitnow_qr" | "bank_transfer"
# => Payments::CheckoutResult(payment:, redirect_url: String | nil, instructions: Hash | nil)

Payments::Gateway               # adapter interface, one class per provider
  #create_checkout(payment) => { provider_ref:, redirect_url: }
  #verify_webhook!(request) => Payments::GatewayEvent(provider_ref:, status: :succeeded | :failed, amount_cents:, raw:)
  # raises Payments::InvalidSignature

Payments::GatewayEvent = Data.define(:provider_ref, :status, :amount_cents, :raw)
Payments::Settle.call(payment, event:)  # idempotent; allocates to payables, marks paid, issues receipt, notifies
```

Payment statuses:

| Status | Meaning |
|---|---|
| `pending` | Waiting on the gateway or a receipt |
| `succeeded` | Paid and allocated |
| `failed` | Gateway declined, or staff rejected the slip |
| `receipt_to_verify` | Bank-transfer slip uploaded, waiting on staff |
| `unmatched` | Money arrived with no payable linked |
| `refunded` | Money returned |

## 7. Gate verdicts

Owner: **M04 T04.3**

```ruby
Gate::Verdict = Data.define(:tone, :code, :title, :reasons, :subject, :actions)
# tone:    :ok | :bad | :warn | :neutral      (the console's band colours: ok-ink / bad-ink / sun / neutral)
# code:    :admit | :expired | :not_yet_valid | :wrong_taman | :used_up | :revoked | :blacklisted |
#          :outside_hours | :stop_work | :worker_limit | :plate_mismatch | :unknown
# title:   String (localized, e.g. "Admit", "Pass expired")
# reasons: Array<String> (localized lines under the title)
# subject: VisitorPass | Permit | nil
# actions: Array<Symbol> from [:admit, :refuse, :check_out, :call_host, :check_plate, :count_workers]

Gate::Check.call(code_or_token, station:, at: Time.current) # => Gate::Verdict

# Pass types plug in as resolvers, tried in order. M04 registers visitor passes, M05 registers contractor passes.
Gate::Check.register(:visitor_pass) { |code_or_token, station:, at:| ... } # => Gate::Verdict or nil when the code isn't theirs
```

The guard console (M04), the guard API (M04) and the gate controller webhook (M13) all use this one function.

## 8. API conventions

Owner: **M11**

**Base and versioning**
- Base path: `/api/v1`.
- JSON only, snake_case keys.
- The app sends `X-App-Version: 1.4.0`. Below `Setting.min_app_version` the API returns `426` with error code `upgrade_required`.

**Request headers**

| Header | Purpose |
|---|---|
| `Authorization: Bearer <access_token>` | Required except on `/auth/*` |
| `Accept-Language: en` or `ms` | Response language; defaults to the user's locale |
| `X-Unit-Id: <occupancy unit uuid>` | The property picked in the switcher. Required for unit-scoped resident endpoints, which answer `422 unit_required` without it |
| `Idempotency-Key: <uuid>` | Required on payment, booking, pass creation and permit submission |
| `X-Device-Id: <uuid>` | Stable install id. Links tokens to devices |

**Success**

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "next_cursor": "eyJpZCI6...", "limit": 25 } }
```

**Error.** There is exactly one shape:

```json
{ "error": { "code": "validation_failed", "message": "Check the highlighted fields.", "details": { "plate": ["is not a Malaysian plate number"] } } }
```

**Error codes**

| HTTP | `code` |
|---|---|
| 400 | `bad_request` |
| 401 | `unauthorized`, `token_expired` |
| 403 | `forbidden`, `scope_missing` (sub-tenant without the scope) |
| 404 | `not_found` |
| 409 | `conflict`, `slot_taken`, `idempotency_conflict`, `invalid_transition` |
| 422 | `validation_failed`, `unit_required`, `otp_invalid`, `otp_expired` |
| 426 | `upgrade_required` |
| 429 | `rate_limited` |
| 502 | `payment_provider_error` |

**Formats**
- Times: ISO 8601 with offset, e.g. `"2026-10-03T10:42:00+08:00"`.
- Dates: `"2026-10-15"`.
- Money is sent both ways:

```json
"amount": { "cents": 105000, "formatted": "RM 1,050.00" }
```

**Serializers**
- Plain Ruby classes: `Api::V1::<Name>Serializer.new(record).as_json`.
- No serializer gem.

## 9. Reference formats

Owner: **M00 T00.3**

`Reference.next!(kind, scope:)` returns the next string, formatted as below, under a row lock.

| Kind | Format | Example | Counter scope |
|---|---|---|---|
| `permit` | `PMT-%04d` | PMT-2689 | Organisation |
| `invoice` | `INV-%<yymm>s-%05d` | INV-2610-00001 | Organisation and month |
| `payment` | `PAY-%05d` | PAY-88120 | Organisation |
| `booking` | `BK-%04d` | BK-5102 | Organisation |
| `incident` | `INC-%04d` | INC-0199 | Organisation |
| `notice` | `NTC-%03d` | NTC-031 | Organisation |
| `listing` | `LST-%04d` | LST-0412 | Taman |
| `report` | `RPT-%03d` | RPT-410 | Organisation |
| `announcement` | `ANN-%03d` | ANN-240 | Organisation |
| `broadcast` | `BRC-%03d` | BRC-120 | Organisation |
| `schedule` | `SCH-%02d` | SCH-05 | Organisation |
| `receipt` | `RCT-%<yymm>s-%05d` | RCT-2610-00012 | Organisation and month |

## 10. Notification event catalog

Owner: **M10 T10.4.** Rows are added by the module that fires them.

**Recipient terms.** "Occupants" means everyone with an active occupancy on the unit who holds the scope named in brackets (owners and tenants hold all scopes). "Staff (module)" means staff with at least `view` on that module key for the record's taman.

| Event key | Fired by | Recipients | Push | Email | SMS | Mandatory |
|---|---|---|:-:|:-:|:-:|:-:|
| `visitor.arrived` | M04 | The pass creator, plus occupants [visitor_passes] | ✓ | | | |
| `visitor.walkin_request` | M04 | Occupants [visitor_passes] | ✓ (high priority, 60 s TTL) | | | ✓ |
| `visitor.overstayed` | M04 | The pass creator | ✓ | | | |
| `occupancy.invited` | M03 | The invitee (by phone, SMS when not yet a user) | ✓ | | ✓ | ✓ |
| `occupancy.invite_accepted` | M03 | The inviter | ✓ | | | |
| `occupancy.link_approved` | M03 | The requester | ✓ | | ✓ | ✓ |
| `occupancy.link_rejected` | M03 | The requester | ✓ | | | ✓ |
| `invoice.issued` | M06 | Occupants [bills_view] | ✓ | ✓ | | |
| `invoice.due_soon` | M06 | Occupants [bills_view] | ✓ | ✓ | | |
| `invoice.overdue` | M06 | Occupants [bills_view] | ✓ | ✓ | ✓ | |
| `payment.succeeded` | M06 | The payer, plus the unit owner | ✓ | ✓ | | ✓ |
| `payment.failed` | M06 | The payer | ✓ | | | ✓ |
| `payment.receipt_rejected` | M06 | The payer | ✓ | | | ✓ |
| `payment.receipt_uploaded` | M06 | Staff (billing) | bell | | | |
| `booking.confirmed` | M07 | The booker | ✓ | | | |
| `booking.pending_approval` | M07 | Staff (facilities) | bell | | | |
| `booking.rejected` | M07 | The booker | ✓ | | | ✓ |
| `booking.cancelled_by_admin` | M07 | The booker | ✓ | | ✓ | ✓ |
| `booking.reminder` | M07 | The booker | ✓ | | | |
| `permit.submitted` | M05 | Staff (permit_review) | bell | | | |
| `permit.status_changed` | M05 | The applicant, plus the unit owner | ✓ | ✓ | | ✓ |
| `permit.docs_requested` | M05 | The applicant | ✓ | ✓ | | ✓ |
| `permit.deposit_verified` | M05 | The applicant | ✓ | | | ✓ |
| `permit.stop_work` | M05 | The applicant, plus staff (contractor_enforcement) | ✓ | | ✓ | ✓ |
| `permit.violation_notice` | M05 | The applicant | ✓ | ✓ | | ✓ |
| `permit.refund_paid` | M05 | The applicant | ✓ | ✓ | | ✓ |
| `announcement.published` | M09 | The audience | ✓ | per announcement | | |
| `listing.approved` | M08 | The seller | ✓ | | | |
| `listing.taken_down` | M08 | The seller | ✓ | | | ✓ |
| `listing.reported` | M08 | Staff (marketplace) | bell | | | |
| `incident.reported` | M04 | Staff (guard_ops) | bell + push to the security lead | | | |
| `sos.raised` | M04 | Staff (guard_ops), plus on-duty guards of the taman | ✓ (high priority) | | ✓ | ✓ |
| `sos.acknowledged` | M04 | The resident who raised it | ✓ (high priority) | | | ✓ |
| `support.requested` | M13 | Staff (settings) | bell | ✓ (taman email) | | |

**Column meanings**
- **bell:** the in-app notification for staff, shown in the dashboard bell (M02) and on mobile for staff (ADR-021).
- **Mandatory:** the user can't switch the event off. The preferences screen shows it as locked, with the reason.

## 11. Turbo Stream channels

| Stream name | Content | Owner |
|---|---|---|
| `[taman, :gate]` | Arrivals, admits, denies | M04 |
| `[organization, :onsite]` | Contractors on site, notices | M05 |
| `[organization, :counts]` | Sidebar counts | M02, which reads `Admin::Counts.for(user)` |
| `[station, :queue]` | Walk-in replies from residents | M04 |
| `[user, :bell]` | Staff bell | M10 |

## 12. Seeds

- `db/seeds.rb` loads `db/seeds/*.rb` in filename order. Each module adds `db/seeds/NN_<module>.rb` (e.g. `06_billing.rb`).
- Seeds are deterministic: `SEED_RNG = Random.new(20261003)`, and the clock is set to `Time.zone.local(2026, 10, 3, 10, 42)`.
- Seeds are idempotent: use `find_or_create_by!` on references.
- They mirror `admin/data.js`:
  - the organisation "Lestari Facility Management Sdn Bhd";
  - 4 tamans (Desa Harmoni, Bukit Indah, Damai Jaya, Melati Permai);
  - the same unit counts, names, statuses and amounts.
- Demo logins are printed at the end of seeding:
  - staff `meiling@lestarifm.my` / `password1234`;
  - resident phone `+60123450001`, whose OTP in development is always `123456`.

## 14. Admin registry: sidebar counts, ⌘K search, worklist

Owner: **M02 T02.2.** Modules register in `config/initializers/admin_<module>.rb` inside `Rails.application.config.to_prepare`.

```ruby
Admin::Registry.count("permits") { Permit.in_scope.needs_review.count }
# Key = the nav item path. The block runs with Current set. Return an Integer; 0 hides the badge.

Admin::Registry.search(:permits, label: "Permits") do |q|
  Permit.in_scope.search(q).limit(5).map { |p| Admin::Hit.new(title: p.reference, subtitle: p.unit.name, path: "/admin/permits/#{p.id}", icon: "assignment") }
end

Admin::Registry.worklist(:permits) do
  Permit.in_scope.needs_review.limit(10).map { |p| Admin::WorkItem.new(title: "Review #{p.reference}", detail: p.unit.name, path: "/admin/permits/#{p.id}", tone: :sun, due_at: p.submitted_at + 2.days) }
end
```

Value types:

```ruby
Admin::Hit      = Data.define(:title, :subtitle, :path, :icon)
Admin::WorkItem = Data.define(:title, :detail, :path, :tone, :due_at)   # tone: :bad | :sun | :neutral | :ok
```

The registry only calls blocks for modules where the user has `view` permission. Pass the key as `module_key:` when it differs from the nav group.

## 15. Shared spec helpers

Owner: **M00 T00.2** and **M01**

| Helper | Use |
|---|---|
| `sign_in_as(user)` | Admin request and system specs |
| `api_headers_for(user, unit: nil)` | API request specs; returns the Authorization and X-Unit-Id headers |
| `at_demo_clock { ... }` | Freezes time at Sat 3 Oct 2026 10:42 KL |
| `it_behaves_like "a tenant-isolated endpoint"` | §2 |
| `it_behaves_like "an audited action", key` | §4 |
| `it_behaves_like "a permission-gated page", module_key, level` | Checks that a user below the level gets 403 and one at the level gets 200 |
| `json_data` / `json_error` | Parse `response.body["data"]` / `["error"]` |
| `include_context "concurrency"` | Turns off transactional tests for a group so threads can share data; truncates afterwards (M00 T00.2) |
