# M04 · Gate & security operations

**Status:** Not started · **Owner:** — · **Wave:** 3 · **Depends on:** M03, M10. M02 for the admin pages and M11 for the API.

**Goal:** Cover the guardhouse end to end:
- Residents pre-register visitors and share a QR pass.
- Guards check a pass and get a 3-second verdict, admit or refuse, register walk-ins that the resident approves from their phone, log deliveries, raise incidents and hand over shifts.
- Management configures pass rules, runs the roster and audits every visit.

**Read first:**
- `../contracts.md` §7 (gate verdicts) and §11 (streams)
- `../decisions.md` ADR-010
- Review Focus 5
- `PRODUCT.md`, principle 2: "The guardhouse is a 3-second interaction"

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Tasks |
|---|---|---|
| Mobile | Visitor pre-registration | T04.2 |
| Mobile | Generate / show visitor QR for gate entry | T04.2 |
| Mobile | Security: scan QR, admit / deny, visitor log (mobile-first for guards) | T04.3, T04.4, T04.7 |
| Mobile | Emergency / SOS contacts for the taman | T04.10 |
| Mobile | Push for visitor arrival | T04.4 |
| Web | Visitor registry (search, filter, audit trail) | T04.8 |
| Web | QR policy config (validity window, guest limits) | T04.1 |
| Web | Security team roster & shift notes | T04.9 |
| Web | Incident / log reporting | T04.10 |
| Shared | Visitor QR: generate / show / scan; configure & audit | All tasks |

Contractor checks at the gate ("verify contractor / vendor permits") plug into `Gate::Check` from M05 T05.5.

**Prototype references:**
- `security/`: the whole guard console; source in `security/guard.js`
- Admin pages:
  - `admin/#/visitors`
  - `admin/#/roster`
  - `admin/#/incidents`
  - `admin/#/qr-policy`
- Storyboard screens:
  - C1 Visitors
  - C2 Pre-register visitor
  - C3 Visitor QR pass
  - C4 Emergency / SOS
  - C5 Guard home
  - C6 Scan pass
  - C7 Visitor verdict
  - C9 Gate log

## Data model

**`qr_policies`**: one row per taman.

| Column | Default |
|---|---|
| `taman_id` | Unique |
| `validity_hours` | 4 |
| `max_guests` | 4 |
| `passes_per_unit_per_day` | 10 |
| `overnight_allowed` | true |
| `max_nights` | 3 |
| `delivery_minutes` | 30 |
| `require_plate` | true |
| `require_ic` | false |
| `same_day_only` | false |
| `overstay_grace_minutes` | 30 |

**`stations`**

| Column | Notes |
|---|---|
| `taman_id` | |
| `name` | "Main gate", "Lobby A/B" |
| `kind` | `gate` / `lobby` / `patrol` |
| `active` | Boolean |

**`station_devices`**

| Column | Notes |
|---|---|
| `station_id` | |
| `label` | |
| `token_digest` | Unique |
| `pairing_code_digest` | |
| `pairing_expires_at` | |
| `paired_at` | |
| `last_seen_at` | |
| `revoked_at` | |

**`visitor_passes`**

| Column | Notes |
|---|---|
| `taman_id`, `unit_id` | |
| `created_by_id` | A user, or a guard for walk-ins |
| `kind` | `guest` / `delivery` / `ehailing` / `service` / `walkin` |
| `visitor_name`, `visitor_phone`, `visitor_ic_last4` | |
| `plate` | |
| `guests_count` | |
| `valid_from`, `valid_until` | |
| `multi_entry` | Boolean |
| `code` | char 6 |
| `token` | Unique |
| `status` | `expected` / `inside` / `checked_out` / `denied` / `expired` / `revoked` / `no_show` / `overstayed` |
| `admitted_at`, `checked_out_at` | |
| `note` | |

Indexes:
- Unique `[taman_id, code]` where `status IN ('expected','inside')`.
- `[taman_id, valid_from]`.
- Trigram index on `visitor_name` and `plate`.

**`gate_events`**: append-only.

| Column | Notes |
|---|---|
| `taman_id`, `station_id` | |
| `guard_membership_id` | |
| `visitor_pass_id` | Nullable |
| `permit_id` | Nullable, set by M05 |
| `kind` | `admit` / `deny` / `exit` / `delivery` / `walkin_request` / `walkin_reply` |
| `reason` | |
| `plate` | |
| `people_count` | |
| `occurred_at` | |
| `metadata` | jsonb |

**`walkin_requests`**

| Column | Notes |
|---|---|
| `taman_id`, `unit_id`, `station_id` | |
| `guard_membership_id` | |
| `visitor_name`, `visitor_phone`, `plate` | |
| `purpose` | |
| `people_count` | |
| `status` | `waiting` / `approved` / `declined` / `expired` / `answered_by_phone` |
| `answered_by_id` | |
| `answered_at` | |
| `visitor_pass_id` | Created when approved |

**`guard_shifts`**

| Column | Notes |
|---|---|
| `taman_id` | |
| `staff_membership_id` | |
| `on_date` | |
| `shift` | `day` / `night` / `off` |
| `station_id` | The post |

Unique `[staff_membership_id, on_date]`.

**`shift_notes`**

| Column | Notes |
|---|---|
| `taman_id`, `station_id` | |
| `author_membership_id` | |
| `body` | |
| `handover` | Boolean |
| `created_at` | |

**`incidents`**

| Column | Notes |
|---|---|
| `reference` | |
| `taman_id` | |
| `category` | `security` / `safety` / `noise` / `parking` / `damage` / `other` |
| `severity` | `low` / `medium` / `high` |
| `status` | `open` / `investigating` / `closed` |
| `title`, `location`, `description` | |
| `occurred_at` | |
| `reported_by_id` | A user |

Incidents can attach photos.

**`incident_updates`**

| Column | Notes |
|---|---|
| `incident_id` | |
| `author_id` | |
| `body` | |
| `status_to` | |
| `created_at` | |

**`sos_alerts`**

| Column | Notes |
|---|---|
| `taman_id`, `unit_id` | |
| `raised_by_id` | |
| `message` | |
| `lat`, `lng` | |
| `status` | `open` / `acknowledged` / `resolved` |
| `acknowledged_by_id`, `acknowledged_at` | |
| `resolved_at` | |

`staff_memberships.pin_digest` already exists from M01. Guards set their PIN with `has_secure_password :pin, validations: false`.

## Interfaces

**Produces:**
- contracts §7: `Gate::Check`, `Gate::Verdict`, `Gate::Check.register`
- The `[taman, :gate]` and `[station, :queue]` streams

```ruby
VisitorPasses::Create.call(occupancy:, params:)        # => VisitorPass; raises ActiveRecord::RecordInvalid with policy errors
Gate::Admit.call(pass, station:, guard:, people_count:, plate_confirmed:)  # => GateEvent; notifies visitor.arrived
Gate::Deny.call(subject, station:, guard:, reason:)    # subject: VisitorPass | Permit
Gate::CheckOut.call(pass, station:, guard:)
Walkins::Request.call(station:, guard:, unit:, params:) # => WalkinRequest; pushes visitor.walkin_request
Walkins::Reply.call(request, user:, approve:)           # => WalkinRequest; approve creates a single-entry VisitorPass
Roster.on_duty(taman, at: Time.current)                 # => Array<StaffMembership> (night shift spans midnight)
Notifications::Recipients.on_duty_guards(taman)         # real implementation replaces the M10 stub
Pass::Code.generate(taman)  / Pass::Code.normalize(str) # Crockford base32, 6 chars
```

**Consumes:**
- M01: `Current`, `Permissions` (`visitor_registry`, `qr_policy`, `guard_ops`), `AuditEvent`
- M03: `Occupancy#allows?(:visitor_passes)`, `Unit#recipients`, `DirectoryEntry.emergency`
- M10: `Notifier`
- M11: `UnitContext`, `Idempotent`

## API endpoints

**Resident** (needs `X-Unit-Id` and the `visitor_passes` scope):

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/visitor_passes?status=upcoming\|past` | C1 |
| POST | `/api/v1/visitor_passes` (idempotent) | C2 |
| GET | `/api/v1/visitor_passes/:id` | C3. Includes `qr_payload` (`tamanly://pass/<token>`), `code`, `share_url` |
| DELETE | `/api/v1/visitor_passes/:id` | Revoke |
| POST | `/api/v1/walkin_requests/:id/reply` | `{ approve: true\|false }`, from the push action |
| GET | `/api/v1/emergency_contacts` | C4 |
| POST | `/api/v1/sos` | C4, `{ message, lat, lng }` |

**Guard** (needs an active `guard` membership; `station_id` param on writes):

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/guard/home` | C5: stations, today's expected count, inside count, latest events, open SOS |
| POST | `/api/v1/guard/checks` | C6: `{ code, station_id }` returns a verdict |
| POST | `/api/v1/guard/visitor_passes/:id/admit` | C7 |
| POST | `/api/v1/guard/visitor_passes/:id/deny` | C7 |
| POST | `/api/v1/guard/visitor_passes/:id/check_out` | |
| GET | `/api/v1/guard/arrivals` | Expected today, KL date |
| GET | `/api/v1/guard/gate_events` | C9 |
| GET | `/api/v1/guard/units?q=` | Unit lookup for walk-ins (unit name and occupant first names only) |
| POST | `/api/v1/guard/units/:id/call` | Returns the host's phone; audited `host.called` |
| POST / GET | `/api/v1/guard/walkins`, `/api/v1/guard/walkins/:id` | |
| POST | `/api/v1/guard/deliveries` | |
| POST | `/api/v1/guard/incidents` | |
| POST | `/api/v1/guard/shift_notes` | |
| POST | `/api/v1/guard/sos/:id/acknowledge` | |

**Public:** `GET /p/:token` is the share page for a pass. It shows the ticket (visitor name, taman, valid window, QR) and **not** the unit or host name. It is `noindex`.

## Tasks

### T04.1 · QR pass policy and stations

**Files:**
- Create:
  - migrations and models for `qr_policies`, `stations`, `station_devices`
  - `app/controllers/admin/qr_policies_controller.rb`
  - `app/controllers/admin/stations_controller.rb`
  - views
  - `db/seeds/04_security.rb`
- Test:
  - `spec/requests/admin/qr_policies_spec.rb`
  - `spec/requests/admin/stations_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - The QR policy page (`admin/#/qr-policy`) shows one policy per taman in scope.
  - Edit needs `qr_policy: edit` and is audited as `qr_policy.updated`, with the before/after diff in metadata.
  - Validation: `validity_hours` must be 1–24, `max_guests` 1–20, and `max_nights` 1–14.
  - Stations: CRUD on the same page under "Gates and posts".
  - "Pair a device" creates a 6-digit pairing code that is valid for 10 minutes and shown once.
  - Revoking a device is audited as `station.device_revoked`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Port the form layout from the prototype `qr-policy` page.
  - Seed a policy per taman from `QR_POLICY` in `admin/data.js`.
  - Seed stations from `POSTS` (Main gate, Back gate, Lobby A/B, Lobby C, Car park gate).

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add QR pass policy and stations"`.

### T04.2 · Visitor passes for residents (Review Focus 5)

**Files:**
- Create:
  - migration and `app/models/visitor_pass.rb`
  - `app/lib/pass/code.rb`
  - `app/services/visitor_passes/create.rb`
  - `app/controllers/api/v1/visitor_passes_controller.rb`
  - `app/serializers/api/v1/visitor_pass_serializer.rb`
  - `app/controllers/passes_controller.rb` (public `/p/:token`)
  - `app/views/passes/show.html.erb`
- Test:
  - `spec/lib/pass/code_spec.rb`
  - `spec/services/visitor_passes/create_spec.rb`
  - `spec/requests/api/v1/visitor_passes_spec.rb` (rswag)
  - `spec/requests/passes_spec.rb`

- [ ] **Step 1: Write failing code specs.**
  - `Pass::Code.generate(taman)` returns 6 characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
  - `normalize(" ab-c1o0 ")` returns `"ABC100"`. It uppercases, strips spaces and dashes, and maps O→0 and I/L→1.
  - A collision with an active pass in the same taman retries.

- [ ] **Step 2: Write failing service specs.**

  ```ruby
  RSpec.describe VisitorPasses::Create do
    let(:occ) { create(:occupancy, relationship: "owner") }
    let!(:policy) { create(:qr_policy, taman: occ.taman, validity_hours: 4, max_guests: 4, passes_per_unit_per_day: 10) }

    it "runs a 4-hour pass made at 23:30 KL until 03:30 the next day" do
      travel_to Time.zone.local(2026, 10, 3, 23, 30) do
        pass = described_class.call(occupancy: occ, params: { kind: "guest", visitor_name: "Tan Wei Ming", guests_count: 2, plate: "WXY 1234" })
        expect(pass.valid_until).to eq(Time.zone.local(2026, 10, 4, 3, 30))
      end
    end
    it "rejects more guests than the policy allows" do
      expect { described_class.call(occupancy: occ, params: { kind: "guest", visitor_name: "A", guests_count: 5, plate: "W 1" }) }
        .to raise_error(ActiveRecord::RecordInvalid, /up to 4 guests/)
    end
    it "requires a plate when the policy says so" do
      expect { described_class.call(occupancy: occ, params: { kind: "guest", visitor_name: "A", guests_count: 1 }) }
        .to raise_error(ActiveRecord::RecordInvalid, /plate/i)
    end
    it "caps passes per unit per KL day" do
      travel_to Time.zone.local(2026, 10, 3, 0, 30) do
        10.times { described_class.call(occupancy: occ, params: { kind: "delivery", visitor_name: "Rider" }) }
        expect { described_class.call(occupancy: occ, params: { kind: "delivery", visitor_name: "Rider" }) }
          .to raise_error(ActiveRecord::RecordInvalid, /10 passes today/)
      end
    end
    it "allows overnight passes up to max_nights" do
      p = described_class.call(occupancy: occ, params: { kind: "guest", visitor_name: "A", guests_count: 1, plate: "W 1", nights: 3 })
      expect(p.multi_entry).to be(true)
      expect { described_class.call(occupancy: occ, params: { kind: "guest", visitor_name: "A", guests_count: 1, plate: "W 1", nights: 4 }) }
        .to raise_error(ActiveRecord::RecordInvalid, /3 nights/)
    end
  end
  ```

  Pass validity rules:
  - Delivery passes last `delivery_minutes`.
  - Guest passes start at the given `arrive_at` (default now) and last `validity_hours`.
  - Overnight passes end at 12:00 noon KL on the last night's next day.

- [ ] **Step 3: Write failing request specs.**
  - A sub-tenant without `visitor_passes` gets 403 `scope_missing`.
  - Create is idempotent (Review Focus 2 pattern).
  - Show includes `qr_payload`, `code`, `share_url` and `status`.
  - Revoke sets `revoked`. Revoking an `inside` pass gets 409 `invalid_transition`, with "The visitor is already inside. Ask the guardhouse to check them out."
  - `GET /p/:token` renders the ticket without the unit or host name and has the `noindex` meta. An unknown token gets 404.
  - Include the tenant-isolated shared example.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the model, service, controller, serializer and share page.**
  - QR images on the share page come from `RQRCode::QRCode.new(payload).as_svg(module_size: 6)`.
  - Port the C3 ticket look with `Ui::TicketComponent`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add visitor passes with policy rules and share page"`.

### T04.3 · Gate verdict engine

**Files:**
- Create:
  - `app/services/gate/check.rb`
  - `app/services/gate/verdict.rb`
  - `app/services/gate/visitor_pass_rule.rb`
  - `config/initializers/gate.rb`
  - `config/locales/{en,ms}/gate.yml`
- Test:
  - `spec/services/gate/check_spec.rb`
  - `spec/services/gate/visitor_pass_rule_spec.rb`

- [ ] **Step 1: Write failing specs.** These are the verdict table from the prototype's `judgeVisitor`:

  | Situation | tone | code | title | actions |
  |---|---|---|---|---|
  | Valid, expected, right taman | ok | admit | Admit | admit, refuse, check_plate (when plate set) |
  | 23:30 pass, checked at 02:00 next day | ok | admit | Admit | … |
  | Same pass checked at 03:31 | bad | expired | Pass expired | refuse, call_host |
  | `valid_from` more than 15 min ahead | sun | not_yet_valid | Not valid yet | refuse, call_host. Reason: "Valid from 18:00" |
  | Pass from another taman | bad | wrong_taman | Wrong taman | refuse. Reason: "This pass is for Taman Bukit Indah" |
  | Revoked | bad | revoked | Pass cancelled | refuse, call_host |
  | Single entry, already checked out | bad | used_up | Pass already used | refuse, call_host |
  | Currently inside | neutral | admit | Already inside | check_out. Reason: "Inside since 10:12" |
  | Unknown code | bad | unknown | No pass found | refuse. Reason: "Check the code or register a walk-in" |
  | QR payload `tamanly://pass/<token>` or URL `https://…/p/<token>` | Resolves the same as the code | | | |

  Also: titles and reasons follow `I18n.locale` (BM for a guard whose locale is `ms`).

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the check and the visitor-pass rule.**

  ```ruby
  module Gate
    class Check
      @resolvers = {}
      class << self
        def register(name, &block) = @resolvers[name] = block
        def call(input, station:, at: Time.current)
          raw = input.to_s.strip
          @resolvers.each_value do |r|
            v = r.call(raw, station:, at:)
            return v if v
          end
          Verdict.new(tone: :bad, code: :unknown, title: I18n.t("gate.unknown.title"),
                      reasons: [I18n.t("gate.unknown.reason")], subject: nil, actions: %i[refuse])
        end
      end
    end
  end
  ```

  `Gate::VisitorPassRule` extracts the token from `tamanly://pass/` or `/p/`. Otherwise it normalises the input as a code. It looks the pass up **without** taman scoping, so it can say "Wrong taman", and then applies the table above. It never reveals details of another taman's pass beyond that taman's name.

- [ ] **Step 4: Register the rule.** Add `Gate::Check.register(:visitor_pass) { |raw, station:, at:| Gate::VisitorPassRule.call(raw, station:, at:) }` in `config/initializers/gate.rb`, wrapped in `to_prepare`.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add gate verdict engine for visitor passes"`.

### T04.4 · Admit, deny, check out and gate events

**Files:**
- Create:
  - gate events migration and model
  - `app/services/gate/{admit,deny,check_out}.rb`
  - `app/jobs/visitor_passes/sweep_job.rb`
  - notification catalog entries in `config/initializers/notifications_security.rb`
- Test:
  - `spec/services/gate/admit_spec.rb`
  - `spec/services/gate/deny_spec.rb`
  - `spec/jobs/visitor_passes/sweep_job_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - Admit:
    - It sets the pass to `inside` and `admitted_at`, and creates a `gate_event(kind: "admit")`.
    - It fires `visitor.arrived` to the pass creator and to occupants with `visitor_passes`. The push title is "Visitor at the gate" and the body "Tan Wei Ming arrived at Main gate".
    - It broadcasts to `[taman, :gate]`.
    - Admitting with `require_plate` and `plate_confirmed: false` raises `Gate::PlateNotConfirmed`.
  - Deny:
    - It needs a reason from the list (the prototype's `denyReason` set), or free text.
    - It sets `denied` and logs a `deny` event.
    - It notifies the creator through `visitor.arrived` with a "turned away" body variant.
  - Check out sets `checked_out` (or back to `expected` for multi-entry passes) and logs an `exit` event.
  - The sweep job runs every 10 minutes:
    - `expected` passes past `valid_until` become `no_show`, with no notification.
    - `inside` passes past `valid_until + overstay_grace_minutes` become `overstayed` and fire `visitor.overstayed` once.
  - Concurrency: two guards admitting the same pass at once produce one admit event. Use `pass.with_lock`; the second guard gets `Gate::AlreadyInside`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the services.**
  - Register `visitor.arrived`, `visitor.overstayed` and `visitor.walkin_request` in the catalog, using contracts §10 rows and EN/BM templates.
  - Schedule the sweep job in `config/recurring.yml`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add admit, deny, check-out and visitor sweep"`.

### T04.5 · Walk-ins and deliveries

**Files:**
- Create:
  - walk-in migration and model
  - `app/services/walkins/{request,reply}.rb`
  - `app/services/gate/delivery.rb`
  - `app/controllers/api/v1/walkin_requests_controller.rb`
- Test:
  - `spec/services/walkins/request_spec.rb`
  - `spec/services/walkins/reply_spec.rb`
  - `spec/requests/api/v1/walkin_requests_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `Request` creates a `waiting` request and a `walkin_request` gate event.
    - It pushes `visitor.walkin_request` with high priority and a 60 s TTL to occupants with `visitor_passes`.
    - The push data includes `walkin_request_id` and `actions: approve,decline`.
  - `Reply` with approve:
    - It creates a single-entry `walkin` pass valid for 30 minutes.
    - It sets the request to `approved` and broadcasts to `[station, :queue]`, so the guard console updates.
    - Only the first reply counts. A second reply gets 409 `conflict` with "Someone in your unit already answered."
  - `Reply` with decline sets `declined`.
  - After 2 minutes without a reply, the request is `expired` and the console offers "Call host". A job is enqueued at `wait: 2.minutes`.
  - A guard marking "Host said yes" or "Host said no" after a call sets `answered_by_phone`, records `answered_by_id` as the guard, and creates the pass when the answer is yes.
  - A delivery creates a `delivery` gate event and fires `visitor.arrived` with a "Parcel courier at the gate" body. No pass is needed.
  - The resident `reply` endpoint is scoped to units the user occupies: 404 otherwise.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the services and endpoint.** The console flow mirrors `regRefresh` in `security/guard.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add walk-in approval and delivery logging"`.

### T04.6 · Guard console, part 1: pairing, PIN sign-in, gate view and scan

**Files:**
- Create:
  - `app/controllers/security/base_controller.rb`
  - `app/controllers/security/{pairings,sessions,gate,checks,passes}_controller.rb`
  - `app/views/layouts/security.html.erb`
  - views under `app/views/security/`
  - `app/javascript/controllers/{pin_pad,scanner,sheet}_controller.js`
- Test:
  - `spec/requests/security/sessions_spec.rb`
  - `spec/system/security/gate_spec.rb`

**Port from:**
- `security/index.html` for the CSS: `.rail-item`, `.fab`, `.bbar`, `.btn-xl`, `.band` tones, `.sheet`, `.key`, `.dots`, `.viewfinder`
- `security/guard.js`: sign-in, the Gate view, `visitorSheet` and `scanSheet`

- [ ] **Step 1: Write failing request specs.**
  - Without a paired-device cookie, `/security` redirects to `/security/pair`.
  - The right pairing code sets a permanent signed cookie, `station_device`, and the code can't be reused.
  - Guard sign-in lists guards assigned to the station's taman, with on-duty guards first (`Roster.on_duty`) and others labelled "Rostered at <post>".
  - The right PIN starts a guard session: `session[:guard_membership_id]`, ending after 13 hours.
  - 5 wrong PINs lock that guard for 5 minutes, showing "Too many tries. Wait 5 minutes or ask your supervisor."
  - A revoked device is signed out on its next request.

- [ ] **Step 2: Write a failing system spec** at 1280×800 (guardhouse tablet) and 390×844.
  - Sign in, then the Gate view shows "Arriving today" (KL date) and "Inside now".
  - Tap "Scan" and type a code. The verdict sheet opens with a green "Admit" band.
  - For a plate-required pass, "Admit" stays disabled until "Plate matches" is ticked.
  - Tap Admit: a toast appears, the arrival moves to "Inside now", and a second browser session on the same taman sees it appear without a reload (Turbo Stream).
  - Every primary action is at least 56px tall. Every target is at least 48px.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the guard console, part 1.**
  - **Camera scanning:** the `scanner` Stimulus controller uses the native `BarcodeDetector` API when it's available. Otherwise it falls back to `<input inputmode="text" autocapitalize="characters">` for the 6-character code.
  - **Layout:** a navigation rail at ≥1024px and a floating bottom bar below that, as in the prototype.
  - **Verdict sheet:** the band wipe animation plays on first open only, and respects `prefers-reduced-motion`.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add guard console pairing, PIN sign-in and gate scan"`.

### T04.7 · Guard console, part 2, and the guard mobile API

**Files:**
- Create:
  - `app/controllers/security/{walkins,deliveries,log,me,incidents,sos,shift_notes}_controller.rb`
  - views
  - `app/controllers/api/v1/guard/*_controller.rb`
  - `app/serializers/api/v1/{verdict,gate_event,walkin}_serializer.rb`
- Test:
  - `spec/system/security/walkin_spec.rb`
  - `spec/requests/api/v1/guard/*_spec.rb` (rswag)

- [ ] **Step 1: Write a failing walk-in system spec for the console.**
  - Register a walk-in. The unit search shows unit names and occupant first names only.
  - "Send request" shows "Waiting for the host…".
  - A resident replying approve through the API turns the console sheet green with "Host approved. Admit."
  - When the request expires, the sheet offers "Call host". Calling reveals the number and records the audit event `host.called`.

- [ ] **Step 2: Write failing guard API specs.**
  - Every endpoint in the Guard table above has an rswag spec.
  - A resident token gets 403 on `/guard/*`.
  - A guard for Desa Harmoni gets 404 for a Bukit Indah pass.
  - `POST /guard/checks` returns the verdict as `{ tone, code, title, reasons, actions, subject: { type, id, visitor_name, unit_name, valid_until } }`.
  - `GET /guard/arrivals` at 00:30 KL lists that day's passes, not the previous day's (Review Focus 5).

- [ ] **Step 3: Write a failing system spec** for the Log view, the Me view (shift, station, end shift with a handover note), and the delivery sheet.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the views and the API controllers.**
  - Port the Log, Me, delivery and end-shift sheets from `guard.js`.
  - The API controllers call the same services as the console. No logic lives in controllers.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add walk-ins, log and shift views to guard console; add guard API"`.

### T04.8 · Visitor registry admin page and "Today at the gates"

**Files:**
- Create:
  - `app/controllers/admin/visitors_controller.rb`
  - `app/queries/admin/visitors_query.rb`
  - views
  - `app/views/admin/overview/_gates.html.erb`
  - `config/initializers/admin_security.rb`
- Test:
  - `spec/requests/admin/visitors_spec.rb`
  - `spec/system/admin/visitors_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Index** (`admin/#/visitors`):
    - Tabs: Today, Inside now, Upcoming, Past.
    - Filters: taman, type, gate, status, date range.
    - Search: visitor name, plate, unit, code.
    - Columns: visitor, type, unit, gate, guard, in, out, status.
    - CSV export.
  - **Drawer:** pass details plus an audit trail of every gate event and walk-in reply, with guard names and times.
  - **Permissions:** `visitor_registry: view` is needed. A Billing ops user gets 403 (`"a permission-gated page"`).
  - **Tenant isolation:** include the tenant-isolated shared example.
  - **Overview slot:**
    - Shows today's admitted, denied and inside counts per taman.
    - Shows the 5 latest events, live through `[taman, :gate]`.
    - Registers the sidebar count for "Visitor registry" (currently inside) and a search provider (visitor name, plate, code).

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the page and the overview slot.**
  - Seed the visitors by porting `VISITORS` from `admin/data.js` lines 62–90, mapping statuses one-to-one.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add visitor registry and gate overview"`.

### T04.9 · Guard roster and shift notes

**Files:**
- Create:
  - migrations and models for `guard_shifts` and `shift_notes`
  - `app/services/roster.rb`
  - `app/controllers/admin/roster_controller.rb`
  - views
  - `app/services/roster/generate.rb`
- Test:
  - `spec/services/roster_spec.rb`
  - `spec/requests/admin/roster_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `Roster.on_duty(taman, at:)`:
    - The day shift runs 07:00–19:00 KL.
    - The night shift runs 19:00 to 07:00 the next day. At 02:00 on Sun it includes guards rostered `night` on **Sat**.
  - `Roster::Generate.call(taman, from:, weeks:, pattern: %w[day day night night off off day])` fills shifts from the prototype's `BASE_ROTA` and keeps manual edits.
  - **Roster page** (`admin/#/roster`):
    - A week grid per taman, with guards as rows and days as columns.
    - Each cell edits `day` / `night` / `off` and the post.
    - On phones it becomes a day-by-day list.
  - **Shift notes:** a list per taman and station, newest first. Handover notes are pinned to the top for 12 hours.
  - **Permissions:** editing needs `guard_ops: edit`, and every change is audited as `roster.updated`.
  - `Notifications::Recipients.on_duty_guards(taman)` returns `Roster.on_duty(taman).map(&:user)`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the roster and pages.** Seed from `GUARDS`, `BASE_ROTA` and `SHIFT_NOTES` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add guard roster and shift notes"`.

### T04.10 · Incidents, SOS and emergency contacts

**Files:**
- Create:
  - migrations and models for `incidents`, `incident_updates`, `sos_alerts`
  - `app/controllers/admin/incidents_controller.rb`
  - `app/controllers/api/v1/{emergency_contacts,sos}_controller.rb`
  - `app/services/sos/raise.rb`
  - views
- Test:
  - `spec/requests/admin/incidents_spec.rb`
  - `spec/requests/api/v1/sos_spec.rb`
  - `spec/system/security/sos_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Incidents:**
    - Guards report from the console or API with category, severity, title, location, description and up to 5 photos.
    - Each report gets a reference `INC-####` and fires `incident.reported` (staff bell, plus a push to the security lead).
  - **Admin Incidents page** (`admin/#/incidents`):
    - Filters: status, severity, taman, date. Search: title, reference.
    - The drawer shows a timeline of updates. Adding an update can change the status.
    - Closing needs a resolution note.
    - Changes are audited as `incident.updated`.
  - **`GET /api/v1/emergency_contacts`** returns the taman's directory entries with `emergency: true`, plus the "Guardhouse" entry first.
  - **`POST /api/v1/sos`:**
    - It creates an `open` alert.
    - It fires `sos.raised`, high priority with SMS, to on-duty guards and staff with `guard_ops`.
    - It shows a full-width red banner on every guard console of that taman (Turbo Stream) until acknowledged.
    - It is rate-limited to 3 per user per 10 minutes.
  - **Acknowledge:** from the console or the guard API, it records the guard and the time. It fires `sos.acknowledged` to the resident: "The guardhouse has seen your alert and is on the way."

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed incidents from `INCIDENTS` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add incidents, SOS alerts and emergency contacts"`.

## Module done when

- [ ] The guardhouse script works end to end on a real tablet and phone:
  - The resident creates a pass, and the guard scans its QR from the resident's phone screen.
  - The verdict appears in under 1 s on staging, and the guard admits the visitor.
  - The resident gets a push within 5 s.
- [ ] A walk-in approved from the resident's lock-screen push turns the console green without a reload.
- [ ] Review Focus 5's visitor-pass and night-shift specs pass.

## Progress log

| Date | Who | Note |
|---|---|---|
