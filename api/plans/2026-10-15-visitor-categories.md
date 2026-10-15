# Visitor Categories (PM-defined) — Plan (P02)

> **For agentic workers:** use superpowers:executing-plans; tick `- [ ]` boxes as you go. Invoke `ponytail:ponytail` (full) first. Backend + admin + API contract + Flutter guide. Short, clean Rails; logic in services.

**Goal:** Property management (the organization) maintains its own list of visitor categories ("Guest", "Delivery", "Contractor", "Cleaner", …). The admin console, the resident API and the app all read that list. A resident creates a pass with `category_id`. "Contractor" stops being a missing hardcoded kind and becomes a seeded row the PM can rename or switch off.

**Today (verified 2026-10-15):**
- `app/services/visitor_passes/create.rb:6`: `KINDS = %w[guest delivery ehailing service]`. `SHORT` (`delivery ehailing`) uses `delivery_validity_minutes`, `PLATED` (`guest service`) applies `require_plate`, and `nights` is only for `kind == "guest"` (`:75`). Anything else is a 422.
- `app/models/visitor_entry.rb:14`: the `visit_type` enum `guest delivery ehailing contractor service walkin` (string values `"Guest"`… `"Walk-in"`, column `visitor_entries.visit_type`, default `"Guest"`). System code depends on these values:
  - `Gate::Admit` (`app/services/gate/admit.rb:45`) writes `contractor` for permit workers.
  - `Walkins::Reply` (`:18`) writes `walkin`, and `Gate::LogDelivery` (`:6`) writes `delivery`.
  - `Admin::OnsiteController:11,36`, `Gate::Board:17` and `Api::V1::Guard::GateEventsController:8` filter on `contractor`.
  - `Gate::Check:166` labels via `api.gate.kinds.*` (`config/locales/en/api_guard.yml:62`).
- `VisitorPassSerializer.fields` returns `kind: pass.visit_type`. Guard serializers reuse it.
- `Admin::VisitorsController` is the registry (`index`/`show`). `TYPE_OPTS` is hardcoded at `:7`. There is no category CRUD and no `VisitorCategory` model.
- Pattern to copy: `MarketCategory` (`app/models/market_category.rb`, org-owned, `open` flag, unique `[organization_id, name]`), its admin page `Admin::MarketPoliciesController` (prototype `ROUTES['market-policy']`, `plan/admin/pages2.js:832`) and its API `Api::V1::MarketCategoriesController#index` (`requires_unit`, read from `Current.unit.taman.organization`). `PermitType` follows the same org-owned pattern.
- Prototype `plan/admin/` has **no** visitor-category page (grep `pages.js`/`pages2.js`). The closest UI is the market categories table.

## Architecture

A new org-owned table `visitor_categories` stores a PM-editable `name` plus a **`base`**, one of `guest delivery ehailing service contractor`. The base is the behaviour template: window, plate rule, overnight, guard icon/label. `visitor_entries` gains a nullable `visitor_category_id`. `visit_type` stays the system enum and is written from `category.base`, so the gate, the onsite board, guard filters and reports keep working untouched. `walkin` is never a base (guard-only). Residents and the admin see `category.name`, while code branches on `visit_type`.

## Decisions

| # | Decision |
|---|---|
| D1 | **Org scope, no `taman_id`.** AGENT_CONVENTIONS §3 lists permit types and market categories as org-owned config. Visitor categories are the same kind of setting ("what kinds of visitor exist"), and the per-taman knobs (minutes, hours, plates) already live on the per-taman `QrPassPolicy`. Load with `organization.visitor_categories`, never `in_scope`. |
| D2 | **Behaviour = `base` from a fixed list of 5** and not free-form flags. This is the shortest diff: `Create` swaps `KINDS.include?(kind)` for a category lookup and keeps `SHORT`/`PLATED`/guest-only nights keyed on `base`. `PLATED` gains `contractor`. ponytail: fixed bases; per-category flags (`short`, `needs_plate`, `overnight`) can be added if a PM needs a combination no base covers. |
| D3 | **Seeded defaults per org** (idempotent, by name): Guest/guest, Delivery/delivery, E-hailing/ehailing, Service/service, **Contractor/contractor**. They are seeded by the backfill migration, `db/seeds/04_security.rb` and `Superadmin` org creation (`app/services/superadmin.rb:10`). |
| D4 | **Create takes `category_id` (UUID) only**, with no slug column: names are editable, and a slug would drift or need its own uniqueness rules. `kind` is no longer accepted. The app isn't released and still runs on `FakeApi`, so no compat shim is needed. An unknown, inactive or other-org id is `422 validation_failed` with `details.category_id`. |
| D5 | **No hard delete once used.** `active: false` hides a category from the app and from new passes; old passes keep their FK. Delete is allowed only while no entry references it (`restrict_with_error`). |
| D6 | **Serializer:** keep `kind` (= `visit_type`, for icons/guard) and add `category: {id, name}`. The app labels with `category.name` and falls back to `kind`. |
| D7 | Admin page is new and has no prototype source. It is ported from the `market-policy` categories table so the visuals match (fidelity note below). |
| D8 | No SMS. No money columns. UUID PKs. The audit uses `visitor_category.created/updated` via `AuditEvent.record!`. |

## Global Constraints

- Never push; commit only when Vincent asks. Conventions: `tamanly_backend/docs/AGENT_CONVENTIONS.md`.
- **Scoped exception (Vincent locked):** builder may edit `config/routes.rb` only for the visitor-categories API + admin routes listed in this plan. `db/seeds.rb` still report-only unless a seeds partial is listed. `db/seeds/04_security.rb` may be edited.
- **Onsite Contractor board (Vincent locked):** `Admin::OnsiteController` and `Gate::Board` contractor filters add `permit_id: present` so resident-created Contractor passes do not appear as permit workers.
- Contract: add 1 row to `plan/api/endpoints.yml` (module A04) and regenerate `swagger/v1/swagger.yaml` (`rails rswag`). Request specs are rspec + rswag in `spec/requests/api/v1/`.
- Migration prefix: next free after `20261015200000`, one migration per table group.

## File map

| File | Change |
|---|---|
| `db/migrate/2026101521xxxx_create_visitor_categories.rb` | table + `visitor_entries.visitor_category_id` FK + seed/backfill |
| `app/models/visitor_category.rb` | new: `belongs_to :organization`, `has_many :visitor_entries, dependent: :restrict_with_error`, `BASES`, `scope :active` |
| `app/models/organization.rb` | `has_many :visitor_categories, dependent: :destroy` |
| `app/models/visitor_entry.rb` | `belongs_to :visitor_category, optional: true` |
| `app/services/visitors/seed_categories.rb` | new: `DEFAULTS`, `call(organization)` (find_or_create_by name) |
| `app/services/visitors/save_category.rb` | new: create/update/toggle + audit |
| `app/services/visitor_passes/create.rb` | `category_id` lookup, `base` replaces `kind` |
| `app/services/superadmin.rb` | call `Visitors::SeedCategories` after org create |
| `app/serializers/visitor_pass_serializer.rb` | `category: {id, name}` |
| `app/serializers/visitor_category_serializer.rb` | new: `{id, name, base}` |
| `app/controllers/api/v1/visitor_categories_controller.rb` | new: `index` |
| `app/controllers/admin/visitor_categories_controller.rb` + `app/views/admin/visitor_categories/index.html.erb` | new admin page |
| `app/controllers/admin/visitors_controller.rb` | `TYPE_OPTS` → org categories, filter on `visitor_category_id` |
| `app/services/admin/nav.rb` | Security → "Visitor categories" (`visitor-categories`) |
| `db/seeds/04_security.rb` | call `Visitors::SeedCategories`; set `visitor_category` on demo passes |
| `spec/requests/api/v1/visitor_categories_spec.rb`, `visitor_passes_spec.rb` | new + updated |
| `test/controllers/admin/visitor_categories_controller_test.rb` | minitest, like other admin pages |
| `plan/api/endpoints.yml`, `swagger/v1/swagger.yaml` | new row; regenerated |
| `tamanly_app/docs/plans/mobile-app/04-visitors-sos.md` | M4, M5, M15, fixtures, l.755 chips |

## Tasks

### Task 1: Data model + migration

- [ ] `create_table :visitor_categories, id: :uuid`: `t.references :organization, type: :uuid, null: false, foreign_key: true`, `name` string null false, `base` string null false, `active` bool default true null false, `position` int default 0 null false, timestamps. Unique index `[organization_id, name]` (case-insensitive check in the model, as `MarketCategory` does).
- [ ] `add_reference :visitor_entries, :visitor_category, type: :uuid, foreign_key: true` (nullable: walk-ins and gate-logged deliveries may stay null).
- [ ] In the same migration, `up`: for each organization, insert the 5 defaults (SQL or `Visitors::SeedCategories`, but define the defaults inline so the migration doesn't depend on app code later). Then backfill:
  `UPDATE visitor_entries e SET visitor_category_id = c.id FROM tamans t, visitor_categories c WHERE e.taman_id = t.id AND c.organization_id = t.organization_id AND c.base = lower(replace(e.visit_type,'-',''))`. This maps `"E-hailing"` → `ehailing`, and `Walk-in` stays null. `down`: remove the column, drop the table.
- [ ] Model: `BASES = %w[guest delivery ehailing service contractor].freeze`, `validates :base, inclusion: { in: BASES }`, name presence + uniqueness `scope: :organization_id, case_sensitive: false`, `scope :active, -> { where(active: true) }`, `scope :ordered, -> { order(:position, :name) }`, `to_s = name`.
- [ ] `bin/rails db:migrate` and `bin/rails runner 'puts VisitorCategory.count'` boots.

### Task 2: Create pass by category (API)

- [ ] `VisitorPasses::Create#call`: `category = VisitorCategory.active.find_by(id: string(:category_id), organization_id: @unit.taman.organization_id)`, then `error(:category_id, "api.errors.required"/"api.errors.invalid")`. Rename `kind` locals to `base = category&.base`. `PLATED = %w[guest service contractor]`. `walk_in?` and `KINDS` are deleted (walkin is never a base). Pass `visit_type: base, visitor_category: category` to `VisitorEntry.issue!`. Audit metadata `{ category: category.name, base:, valid_until: }`.
- [ ] Guard the `find_by` against a malformed UUID: a non-UUID string must be 422, not 500. Use `find_by` with a `/\A\h{8}-/` check or rescue `ActiveRecord::StatementInvalid`. Postgres raises on a bad uuid cast, so pick one and spec it.
- [ ] `VisitorPassSerializer.fields`: add `category: pass.visitor_category && { id: pass.visitor_category_id, name: pass.visitor_category.name }`. Preload `:visitor_category` in `VisitorPassesController#passes`.
- [ ] Spec updates in `visitor_passes_spec.rb`: the rswag body schema is `required: %w[category_id visitor_name]`. Happy path with seeded Guest. Contractor category → `visit_type` `"contractor"`, and the plate is required when `require_plate`. Delivery category → minutes window. Inactive / other org / garbage id → 422 `details.category_id`. Old `kind` param → 422 (missing `category_id`).

### Task 3: List endpoint for the app

- [ ] `GET /api/v1/visitor_categories`: `Api::V1::VisitorCategoriesController < BaseController`, `require_scope :visitor_passes` (same gate as passes), `index`: `Current.unit.taman.organization.visitor_categories.active.ordered`, then `render_data(map { VisitorCategorySerializer.call(it) })`. The shape is `{id, name, base}`.
- [ ] Route line to report: `resources :visitor_categories, only: :index` under `api/v1` near `visitor_passes` (`config/routes.rb:70`).
- [ ] `spec/requests/api/v1/visitor_categories_spec.rb` (rswag): 200 lists the active categories of the unit's org in order, with no inactive rows and no other org's rows. 401 without a token, 403 without the `visitor_passes` scope, and 422 without `X-Unit-Id`.
- [ ] `plan/api/endpoints.yml`: add `GET /api/v1/visitor_categories`, module A04, `api_md_line: null`, status `todo` → `reviewed` after review. Run `rails rswag`.

### Task 4: Admin CRUD page

- [ ] **Fidelity note:** `plan/admin` has no source. Port the markup of `ROUTES['market-policy']`'s `ixHTML` categories table (`pages2.js:832-841`): `page_head("Visitor categories", sub: "What residents can pick when they register a visitor. Applies to all your tamans.")`, then a table with columns **Category** (bold name), **Behaves like** (`chip(base label, "mute")`), **Passes (30 d)** (`n`, `VisitorEntry.in_scope.where(created_at: 30.days.ago..).group(:visitor_category_id).count`) and **Shown to residents** (the `.sw` switch, posted like `MarketPoliciesController#update`'s toggle). Below or right: a `panel("New category")` form with Name + "Behaves like" `select` (`BASES` with labels from `api.gate.kinds`) + `btn btn-p`. Edit name/base inline via the same form on `?edit=<id>`. Keep the table → card split (`hidden md:block` / `md:hidden`).
- [ ] `Admin::VisitorCategoriesController < BaseController`, `page "visitor-categories"`: `index`, `create`, `update` (name/base/active), `destroy` (only when unused; else `alert` "In use, switch it off instead"). Each action makes one call to `Visitors::SaveCategory` / `destroy`, then redirects with `flash`. Lookups: `Current.organization.visitor_categories.find(params[:id])`. Gate the page with the same permission as `qr-policy`.
- [ ] Nav: `app/services/admin/nav.rb:15`: add `{ label: "Visitor categories", path: "visitor-categories" }` after "QR pass policy". Route line to report: `resources :visitor_categories, path: "visitor-categories", only: [:index, :create, :update, :destroy]`.
- [ ] Registry filter: `Admin::VisitorsController` builds "Type" options from `Current.organization.visitor_categories.ordered` (`[id, name]`) plus `["walkin", "Walk-in"]`. It filters `visitor_category_id` (or `visit_type: "walkin"`). `index.html.erb:4`/`show.html.erb:1` show `v.visitor_category&.name || v.visit_type_display`.
- [ ] Minitest controller test: list renders, create, toggle off hides it from the API, base change only affects new passes, delete-in-use is refused. Curl check `/admin/visitor-categories` = 200 per AGENT_CONVENTIONS.

### Task 5: Seeds

- [ ] `Visitors::SeedCategories::DEFAULTS = [["Guest","guest"],["Delivery","delivery"],["E-hailing","ehailing"],["Service","service"],["Contractor","contractor"]]` with `position` = its index. `call(org)` does `find_or_create_by!(organization:, name:) { base:, position: }`.
- [ ] Call it from `Superadmin` after creating the org and from `db/seeds/04_security.rb` (before the demo visitors, around `:146`, setting `v.visitor_category` from the org's row by base).

### Task 6: Flutter guide (`04-visitors-sos.md`), C2 chips

- [ ] **M5 / l.755:** the chip row is built from `GET /visitor_categories` (load with the form; `ApiView` spinner on the chip row only). There is one `ChoiceChip` per row, labelled with `name`, with the icon from `kindIcon(base)`. The first chip is preselected. The body sends `category_id` (not `kind`). The hardcoded "Guest · Delivery · Ride-hailing · Service" list is removed.
- [ ] **Errors:** `fieldError(_error, 'category_id')` sits under the chips (for example when a category was switched off while the form was open). On that error, refetch the list.
- [ ] **M4 / M15:** card and C3 subtitle `category?.name ?? kindLabel(l, kind)`. `kindIcon` keeps switching on `kind` (= base) and adds `contractor` → `Icons.construction` (already there). The `visKind*` strings remain only as the fallback for rows without a category (walk-in, gate-logged).
- [ ] **Fixtures/FakeApi:** add `visitor_categories.index` (5 defaults with fake UUIDs). Add `category: {id, name}` to the pass fixtures. Create-pass tests post `category_id`.
- [ ] **Hide when empty:** if the list is empty (the PM switched everything off), C2 shows `EmptyState` "Your management hasn't set up visitor types yet" and no submit.
- [ ] Note in `guide_review.md` (C04 Contractor chip) that it is resolved by this plan.

### Task 7: Review + verify

- [ ] `bundle exec rspec spec/requests/api/v1/visitor_passes_spec.rb spec/requests/api/v1/visitor_categories_spec.rb spec/requests/api/v1/guard_*` green. The guard serializers now carry `category`.
- [ ] `bin/rails test test/controllers/admin` green; `rails rswag` regenerates without diff noise.
- [ ] Opus review pass (README model policy: A04 is Opus high).

## Open questions (for Vincent)

1. **Per-taman visibility?** D1 makes the list org-wide. If one taman must hide "E-hailing" (gated low-rise, for example), add a `taman_ids` array or a join table later. Not built now.
2. **Onsite "Contractor" board:** `Admin::OnsiteController` and `Gate::Board` treat every `visit_type == "contractor"` as a permit worker. A resident-invited Contractor pass (no permit) would now show there. Is that fine, or should those filters add `permit_id: present`?
3. **Is the base list enough?** Do PMs need to set the window (minutes vs hours) or the plate rule per category, instead of inheriting it from the 5 bases (D2)?
4. **Admin console labels:** should the registry "Type" column show the category name (planned) or keep the system type?
5. **Routes:** OK for the main session to add the two route lines (`routes.rb` is off-limits to build agents)?
