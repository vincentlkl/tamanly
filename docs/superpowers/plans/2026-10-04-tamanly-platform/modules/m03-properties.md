# M03 · Properties & occupancy

**Status:** Not started · **Owner:** — · **Wave:** 2 · **Depends on:** M01, M02, M11

**Goal:** Model tamans, blocks, units and who occupies them, which decides what every resident can see and who gets notified. This module also delivers:
- the admin Properties pages;
- the property switcher and linking flows for the app;
- sub-tenant invites with scopes;
- the taman directory.

**Read first:**
- Review Focus 1 and 4
- `../contracts.md` §2 and §3 (occupant scopes)
- `../decisions.md` ADR-003

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | CRUD for tamans, blocks, units | All |
| Web | Assign owners, tenants, sub-tenants | All |
| Web | Unit status (occupied, vacant, under notice) | All |
| Web | Multi-taman & multi-property admin console | Data half |
| Mobile | Multi-property switcher | All |
| Mobile | Invite / accept sub-tenant access with limited scopes | All |
| Mobile | Linked properties & roles | All |
| Mobile | Directory of facilities and services | Services half; facilities come from M07 |
| Mobile | Sign in / register | Linking a property after first sign-in |

**Prototype references:**
- `admin/#/tamans`
- `admin/#/units`
- `admin/#/occupants`
- Storyboard:
  - A3 Choose role
  - A4 Verify & link property
  - A5 Property switcher
  - A6 Invite sub-tenant
  - A7 Accept invite
  - B1 Directory
  - G2 Properties & roles

## Data model

**`tamans`** (add to M01's table):

| Column | Notes |
|---|---|
| `address`, `postcode`, `state` | |
| `phone`, `email` | |
| `gates_count` (int) | |
| `manager_membership_id` | FK → staff_memberships |
| `units_count` | Counter cache |

**`blocks`**:

| Column | Notes |
|---|---|
| `taman_id` | |
| `name` | "Jalan Harmoni 3", "Block A" |
| `position` | |

Unique `[taman_id, name]`.

**`units`**:

| Column | Notes |
|---|---|
| `taman_id`, `block_id` | |
| `name` | "No. 12, Jalan Harmoni 3", "A-03-07" |
| `kind` | "Double-storey terrace", "Condo 3R2B" |
| `built_up_sqft` | |
| `monthly_fee_cents` | |
| `status` | `occupied` / `vacant` / `under_notice` |
| `notes` | |

Unique `[taman_id, name]`, plus a trigram index on `name`.

**`occupancies`**:

| Column | Notes |
|---|---|
| `unit_id`, `taman_id`, `user_id` | `user_id` is null while invited by phone |
| `relationship` | `owner` / `tenant` / `sub_tenant` |
| `status` | `invited` / `active` / `ending` / `ended` / `declined` |
| `starts_on`, `ends_on` | |
| `scopes` | `text[]`, default `{}` |
| `invited_phone`, `invited_name`, `invited_by_id` | `invited_by_id` is a user |
| `invite_expires_at` | |
| `ended_reason` | |

Constraints:
- Unique `[unit_id, user_id, relationship]` where `status IN ('invited','active','ending')`.
- Check: `scopes <@ ARRAY['bills_view','bills_pay','visitor_passes','facility_booking']`.

**`link_requests`**:

| Column | Notes |
|---|---|
| `user_id`, `taman_id` | |
| `unit_id` | Nullable until staff match it |
| `unit_label` | What the resident typed |
| `relationship` | `owner` / `tenant` |
| `status` | `pending` / `approved` / `rejected` |
| `reviewed_by_id`, `reviewed_at` | |
| `reason` | |

It also has an attached `proof` (Active Storage; SPA, tenancy agreement or utility bill).

**`directory_entries`**:

| Column | Notes |
|---|---|
| `taman_id` | |
| `category` | `management` / `security` / `maintenance` / `utilities` / `health` / `education` / `worship` / `transport` / `other` |
| `name`, `phone`, `hours`, `note` | |
| `position` | |
| `emergency` | Boolean, default false. Emergency entries also appear on the resident SOS screen (C4, M04 T04.10) and the guard console |

## Interfaces

**Produces:**

```ruby
Occupancy.active                                  # status IN (active, ending) AND (ends_on IS NULL OR ends_on >= Date.current)
Occupancy#allows?(scope)                          # owners/tenants: true; sub-tenants: scopes.include?(scope.to_s)
Unit#recipients(scope: nil)                       # => Array<User> with an active occupancy (and the scope, when given) - used by Notifier resolvers
User#occupancies / User#units
Api::V1::UnitContext                              # concern: sets Current.occupancy from X-Unit-Id; `require_unit!(scope = nil)` renders 422 unit_required / 403 scope_missing
Api::V1::PropertySerializer
Occupancies::Assign.call(unit:, relationship:, phone:, name:, scopes: [], starts_on:, ends_on: nil, by:)  # => Occupancy (active if user exists and by staff; invited otherwise)
Occupancies::End.call(occupancy, on:, reason:)
Occupancies::InviteMessage.call(occupancy)        # => { text:, share_url: "https://wa.me/60123456789?text=..." } (no SMS; ADR-012)
```

`Access.resident_taman_ids(user)` is contracts §2; it is implemented here.

**Consumes:**
- M01: `Current`, `Permissions`, `AuditEvent`
- M02: index engine and drawer
- M11: base controller and serializers
- `Notifier.deliver` from M10 for `occupancy.invited`, `occupancy.invite_accepted`, `occupancy.link_approved` and `occupancy.link_rejected`. Until M10 lands, stub it as a no-op `Notifier` and record that in the progress log.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/properties` | My units: unit, taman, relationship, scopes, branding colours |
| GET | `/api/v1/tamans?q=` | Pick a taman when linking. Returns name and city only, minimum 3 characters, active organisations only |
| GET | `/api/v1/invites` | Pending invites for my phone (A7) |
| POST | `/api/v1/invites/:id/accept` | Accept an invite → active occupancy |
| POST | `/api/v1/invites/:id/decline` | Decline an invite |
| GET / POST | `/api/v1/link_requests` | Request to link a unit (A4). Multipart with `proof`. Idempotent |
| GET | `/api/v1/units/:unit_id/sub_tenants` | Sub-tenants of a unit I own or rent |
| POST | `/api/v1/units/:unit_id/sub_tenants` | Invite a sub-tenant: `{ phone, name, scopes[] }`. Returns the invite plus `share_url` (WhatsApp) |
| PATCH | `/api/v1/units/:unit_id/sub_tenants/:id` | Change a sub-tenant's scopes |
| DELETE | `/api/v1/units/:unit_id/sub_tenants/:id` | Revoke a sub-tenant |
| GET | `/api/v1/directory` | Services for the current unit's taman (`X-Unit-Id`) |

## Tasks

### T03.1 · Tamans, blocks and units models, plus the Tamans page

**Files:**
- Create:
  - migrations for `blocks` and `units`, plus the `tamans` additions
  - `app/models/{block,unit}.rb`
  - `app/policies/{taman,unit}_policy.rb` (`MODULE_KEY = :properties`)
  - `app/controllers/admin/tamans_controller.rb`
  - views
  - `db/seeds/03_properties.rb`
- Test:
  - `spec/models/unit_spec.rb`
  - `spec/requests/admin/tamans_spec.rb`

- [ ] **Step 1: Write the failing model specs.**
  - `Unit` includes `TamanScoped`.
  - `name` is unique per taman.
  - `block` must belong to the same taman. A validation message reads "Block is in a different taman."
  - `status` is an enum.
  - The `units_count` counter on `Taman` works.

- [ ] **Step 2: Write the failing request specs for `/admin/tamans`.**
  - Index lists only the organisation's tamans and shows units, occupancy % and manager.
  - Create needs `properties: full` and is audited as `taman.created`.
  - Edit is audited as `taman.updated`.
  - Include `it_behaves_like "a tenant-isolated endpoint"` for show.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement migrations, models, policies, the controller and views.**
  - Use the M02 index and drawer.
  - The edit form groups fields as in the prototype `#/tamans` drawer.

- [ ] **Step 5: Seed the data.**
  - Port the unit generation from `admin/data.js` lines 40–58.
  - Use the same blocks, names, kinds, sqft and fees, with `SeedKit` for randomness.
  - Expected counts: 412 + 268 + 540 + 186 = 1,406 units.

- [ ] **Step 6: Run the specs and seed.** Run the specs, then `bin/rails db:seed`. Expected: PASS, and `Unit.count == 1406`.

- [ ] **Step 7: Commit** with `git commit -m "Add tamans, blocks and units with Tamans page"`.

### T03.2 · Blocks & units page, with CSV import

**Files:**
- Create:
  - `app/controllers/admin/units_controller.rb`
  - `app/queries/admin/units_query.rb`
  - `app/services/units/import.rb`
  - views, including `import.html.erb`
- Test:
  - `spec/requests/admin/units_spec.rb`
  - `spec/services/units/import_spec.rb`
  - `spec/system/admin/units_spec.rb`

**Prototype:** `admin/#/units`.

| Element | Contents |
|---|---|
| Filters | Taman, block, status, kind |
| Search | Unit name, owner name |
| Columns | Unit, block, kind, sqft, monthly fee, owner, tenant, status |
| Drawer | Unit facts, current occupants, recent invoices (M06 slot), permits (M05 slot) |

- [ ] **Step 1: Write the failing request specs.**
  - Filters and search work, including search by owner name.
  - Create, edit and delete:
    - Delete needs `full`.
    - Delete is refused when the unit has occupancies or invoices. The message reads "This unit has history. Mark it vacant instead."
  - Status change is audited as `unit.status_changed`.
  - Include the tenant isolation shared example.

- [ ] **Step 2: Write the failing import specs.**
  - `Units::Import.call(taman:, csv:)` expects headers `block,unit,kind,sqft,monthly_fee`.
  - It creates missing blocks.
  - It is dry-run first: `preview: true` returns per-row results without writing.
  - A row with a duplicate name, an unknown kind or a non-numeric fee is reported with its line number.
  - Nothing is written if any row fails, unless `skip_invalid: true`.
  - 1,000 rows import in under 5 s.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the controller, query and import service.**
  - The import UI copies the bulk-invoice pattern (`admin/pages2.js`, `bulkParse`):
    - paste or upload;
    - per-row check list;
    - "Create 412 units" button, disabled until valid.

- [ ] **Step 5: Run the specs.** Expected: PASS. Then run the system spec at 390px: cards render, and the filters scroll sideways.

- [ ] **Step 6: Commit** with `git commit -m "Add blocks and units page with CSV import"`.

### T03.3 · Occupancies, unit status and the Occupants page

**Files:**
- Create:
  - occupancy migration and `app/models/occupancy.rb`
  - `app/services/occupancies/{assign,end}.rb`
  - `app/controllers/admin/occupants_controller.rb`
  - `app/queries/admin/occupants_query.rb`
  - `app/jobs/occupancies/expire_job.rb`
  - views
- Test:
  - `spec/models/occupancy_spec.rb`
  - `spec/services/occupancies/assign_spec.rb`
  - `spec/services/occupancies/end_spec.rb`
  - `spec/models/unit_recipients_spec.rb`
  - `spec/requests/admin/occupants_spec.rb`

- [ ] **Step 1: Write the failing specs** (Review Focus 4).

  ```ruby
  RSpec.describe Unit, "#recipients" do
    let(:unit) { create(:unit) }
    let!(:owner)  { create(:occupancy, unit:, relationship: "owner").user }
    let!(:tenant) { create(:occupancy, unit:, relationship: "tenant").user }
    let!(:sub)    { create(:occupancy, unit:, relationship: "sub_tenant", scopes: %w[visitor_passes]).user }
    let!(:former) { create(:occupancy, unit:, relationship: "tenant", status: "ended", ends_on: 1.day.ago).user }

    it "includes everyone active when no scope is given" do
      expect(unit.recipients).to contain_exactly(owner, tenant, sub)
    end
    it "drops sub-tenants without the scope" do
      expect(unit.recipients(scope: :bills_view)).to contain_exactly(owner, tenant)
    end
    it "drops a tenancy whose end date has passed even if the status job has not run" do
      o = create(:occupancy, unit:, relationship: "tenant", status: "ending", ends_on: Date.yesterday)
      expect(unit.recipients).not_to include(o.user)
    end
  end
  ```

- [ ] **Step 2: Write the failing service specs.**
  - `Assign` by staff:
    - A known phone gets an `active` occupancy.
    - An unknown phone gets `invited`. There is no SMS (ADR-012), so the drawer shows a "Share on WhatsApp" button.
      - The button opens `https://wa.me/<digits>?text=<message>` on the staff member's own device.
      - The message is prefilled in the invitee's language when known, else EN: "You've been added to <unit>, <taman> on Tamanly. Get the app and sign in with this number: <app link>".
      - `Occupancies::InviteMessage.call(occupancy)` returns `{ text:, share_url: }` for both the drawer and the API.
    - The invite stays waiting until that phone number signs in. A known user also gets the `occupancy.invited` push.
    - The first owner or tenant of a vacant unit sets the unit to `occupied`.
  - `End`:
    - With a future `on`, it sets `ending` and the unit to `under_notice`, but only when no other tenant stays.
    - With today's date, it sets `ended`.
    - Ending the last occupancy sets the unit to `vacant`.
    - Ending a tenant's tenancy also ends the sub-tenants they granted (`invited_by_id`).
  - `Occupancies::ExpireJob`, which runs daily at 00:05 KL, moves `ending` to `ended` once `ends_on` has passed and applies the same unit status rules.
  - Every change is audited:
    - `occupancy.assigned`
    - `occupancy.ended`
    - `occupancy.scopes_changed`

- [ ] **Step 3: Write the failing request specs for `/admin/occupants`.**
  - Tabs: Owners, Tenants, Sub-tenants, Link requests (M03 T03.5).
  - The assign drawer searches existing users by phone, or invites a new person by phone and name.
  - The scopes editor applies to sub-tenants only.
  - Include the tenant isolation shared example.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement it.**
  - `Occupancy.active` is the SQL scope from Interfaces.
  - `Unit#recipients` is `User.where(id: occupancies.active.select(:user_id))`, filtered in Ruby by `allows?` when a scope is given.
  - Add `Access.resident_taman_ids(user)`.

- [ ] **Step 6: Seed the occupancies.**
  - Port them from `admin/data.js` lines 60–90 (`OCC`).
  - Map statuses: `Invite pending` → `invited`, `Ending` → `ending`.
  - Make Nurul Aisyah's 3 units the demo resident, phone `+60123450001`.
  - Add `Occupancies::ExpireJob` to `config/recurring.yml`.

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Add occupancies, unit status rules and Occupants page"`.

### T03.4 · Property switcher API and unit context

**Files:**
- Create:
  - `app/controllers/concerns/api/v1/unit_context.rb`
  - `app/controllers/api/v1/properties_controller.rb`
  - `app/serializers/api/v1/property_serializer.rb`
- Modify:
  - `app/serializers/api/v1/me_serializer.rb` (`properties`, `modes`)
  - `app/services/access.rb`
- Test:
  - `spec/requests/api/v1/properties_spec.rb` (rswag)
  - `spec/requests/api/v1/unit_context_spec.rb`

- [ ] **Step 1: Write the failing specs.**
  - `GET /properties` returns active occupancies across organisations. Aisyah sees 3 units in 2 tamans.
  - Each entry has:
    - `unit { id, name, block }`
    - `taman { id, name, short_name, branding { primary, accent, logo_url } }`
    - `relationship`
    - `scopes` (all four for owners and tenants)
    - `since`
  - An ended occupancy is excluded.
  - In the test-only `GET /api/v1/ping/unit` with `require_unit!`:
    - no `X-Unit-Id` → 422 `unit_required`;
    - a unit the user doesn't occupy → 404 `not_found`;
    - a valid unit sets `Current.occupancy` and `Current.taman_ids == [unit.taman_id]`.
  - In the test-only `GET /api/v1/ping/bills` with `require_unit!(:bills_view)`, a sub-tenant without the scope gets 403 `scope_missing` with the message "Your access to this unit doesn't include bills. Ask <granter name>."
  - `me.modes` includes `resident` when the user has an active occupancy.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

  ```ruby
  module Api::V1::UnitContext
    extend ActiveSupport::Concern
    private
    def require_unit!(scope = nil)
      id = request.headers["X-Unit-Id"].presence or return render_error(:unit_required, I18n.t("api.errors.unit_required"), status: 422)
      occ = Occupancy.active.where(user: Current.user).find_by(unit_id: id) or raise ActiveRecord::RecordNotFound
      return render_error(:scope_missing, I18n.t("api.errors.scope_missing", name: occ.invited_by&.name), status: 403) if scope && !occ.allows?(scope)
      Current.occupancy = occ
      Current.taman_ids = [occ.taman_id]
    end
  end
  ```

  Branding columns come from M13. Until M13 lands, return the brand defaults `#3D2B6B` and `#E87A6B`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add property switcher API and unit context"`.

### T03.5 · Linking a property and sub-tenant invites

**Files:**
- Create:
  - link request migration and model
  - `app/controllers/api/v1/{invites,link_requests,sub_tenants,tamans}_controller.rb`
  - `app/services/link_requests/review.rb`
  - `app/views/admin/occupants/_link_requests.html.erb`
- Test:
  - `spec/requests/api/v1/invites_spec.rb`
  - `spec/requests/api/v1/link_requests_spec.rb`
  - `spec/requests/api/v1/sub_tenants_spec.rb`
  - `spec/requests/admin/link_requests_spec.rb`

- [ ] **Step 1: Write the failing invite specs.**
  - `GET /invites` lists `invited` occupancies whose `invited_phone` equals my phone and that haven't expired (14 days).
  - Accept sets `user_id` and `active`, and notifies the inviter (`occupancy.invite_accepted`).
  - Decline sets `declined`.
  - Someone else's invite returns 404.

- [ ] **Step 2: Write the failing sub-tenant specs.**
  - An owner or tenant can invite with a subset of scopes. An empty scopes list → 422 "Pick at least one thing they can do."
  - The response includes `share_url` from `Occupancies::InviteMessage`, so the app can open WhatsApp with the invite text (A6). The invitee sees the invite on first sign-in with that number (A7).
  - A sub-tenant can't invite others → 403.
  - PATCH scopes is audited as `occupancy.scopes_changed` (actor is the resident).
  - DELETE ends the occupancy today.
  - A unit I don't occupy → 404.

- [ ] **Step 3: Write the failing link-request specs.**
  - POST needs `taman_id`, `unit_label`, `relationship` and `proof` (PDF/JPEG/PNG/HEIC, ≤10 MB).
  - It creates a `pending` request and puts "Link requests" on the staff worklist (`Admin::Registry.worklist(:link_requests)`).
  - Staff approve by picking the matching unit, which creates an active occupancy and notifies `occupancy.link_approved`. Approval is audited as `link_request.approved`.
  - Rejecting needs a reason, which is sent to the resident (`occupancy.link_rejected`).
  - A second pending request for the same unit label by the same user → 409 `conflict`.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the controllers and `LinkRequests::Review`.**
  - The `tamans` search endpoint returns only `name` and `city`, so people can't enumerate unit lists.
  - Register the worklist provider and the sidebar count for "Occupants" (pending link requests).

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add property linking and sub-tenant invites"`.

### T03.6 · Taman directory

**Files:**
- Create:
  - directory migration and model
  - `app/controllers/admin/directory_entries_controller.rb`, nested under tamans
  - `app/controllers/api/v1/directory_controller.rb`
- Test:
  - `spec/requests/admin/directory_entries_spec.rb`
  - `spec/requests/api/v1/directory_spec.rb`

- [ ] **Step 1: Write the failing specs.**
  - Staff with `properties: edit` manage entries on the taman page's "Directory" tab and can reorder them.
  - `GET /api/v1/directory` with `X-Unit-Id` returns entries grouped by category, in position order, plus `facilities_url: "/api/v1/facilities"` so the app can show bookable facilities (M07).
  - Phone numbers are returned as E.164 plus a display form.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Reorder with Stimulus drag handles, falling back to up/down buttons for keyboard users.
  - Seed 6 entries per taman: management office, guardhouse, nearest clinic, TNB, Air Selangor, nearest mosque/temple/church.
  - Also seed the four emergency entries from `SOS` in `admin/data.js` with `emergency: true`: Guardhouse, Management office, Police (PDRM) 999, Fire and rescue (Bomba) 994.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add taman directory"`.

## Module done when

- [ ] Seeds load 1,406 units with occupants that match the prototype's counts within ±2%.
- [ ] Aisyah, signing in by phone (Firebase test number), sees her 3 properties and can switch between them. A staff member of another company can't open any of them.
- [ ] Review Focus 4's recipients specs pass.

## Progress log

| Date | Who | Note |
|---|---|---|
