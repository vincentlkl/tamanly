# M02 · Admin shell & UI kit

**Status:** Not started · **Owner:** — · **Wave:** 1 · **Depends on:** M00. Use M01 for real sign-in; until then, stub `Current` in specs.

**Goal:** Port the prototype dashboard's frame and building blocks into Rails, so every admin module only writes queries, forms and page content. The frame is the layout, grouped sidebar, scope switcher, bell, ⌘K palette and overview worklist. The building blocks are the index engine, drawer, forms, chips, tiles and charts.

**Read first:**
- `../../../../DESIGN.md`, section "Web admin console"
- `../../../../admin/ui.css`, which holds the tokens and components to port
- `../../../../admin/app.js`: `NAV`, `navHTML`, `ixHTML`, `fitIx`, `F()`, `drawer`, `toast`, the palette, `vbars`/`hbars`
- `../contracts.md` §13

**Feature coverage:**

| Where | Feature | Covered here |
|---|---|---|
| Web | Multi-taman & multi-property admin console | The scope switcher |
| Web | Filter and search on every index page | The shared engine (user request) |
| Web | Grouped sidebar with sub-menus | All (user request) |
| Web | Responsive down to phone width | All (user request) |

**Prototype references:**
- `admin/` at 1440px, 1024px and 390px
- `admin/mobile.html`: every section at phone width

## Scope

**In:**
- Tailwind tokens and component CSS
- `layouts/admin`
- Sidebar and topbar
- `Admin::Registry`
- `Ui::` ViewComponents
- Stimulus controllers
- The ⌘K search endpoint
- The overview page frame
- 403/404 pages

**Out:**
- Module pages and their data
- The analytics charts' data (M12)
- The bell's notification data (M10). The bell renders the `Notification` list once M10 lands, and an empty state before that.

## Components (one file each in `app/components/ui/`)

| Component | Prototype source | Notes |
|---|---|---|
| `Ui::IndexComponent` | `ixHTML` + `fitIx` | Search, filter selects, segmented tabs, sort headers, pager, CSV link, card fallback |
| `Ui::DrawerComponent` | `drawer()`, `.drawer` | Native `<dialog>`: side sheet ≥640px, bottom sheet below. Actions are pinned at the bottom |
| `Ui::ChipComponent` | `chip()`, `.chip` | Maps a status string to a tone. A central `Ui::ChipComponent::TONES` hash covers every status in `contracts.md` |
| `Ui::TileComponent` | `.tile` | KPI figure, label, delta and an optional link |
| `Ui::PanelComponent` | `.panel` | Titled section with optional actions |
| `Ui::EmptyComponent` | Empty states in `pages.js` | Icon, sentence and one action |
| `Ui::BarsComponent` | `vbars`, `hbars` | Server-rendered SVG/CSS bars, no chart library |
| `Ui::TicketComponent` | `.ticket` / `.tear` | Pass and permit tickets (M04, M05) |
| `Ui::FormBuilder` | `F()` | Not a component: a `FormBuilder` subclass with labels, hints, inline errors and `show_when:` |

Helpers in `Ui::Helpers`:
- `icon(name, class:)` renders a Material Symbols span.
- `rm(cents)` comes from M00.
- `when_label(time)` gives "Today 10:42", "Yesterday", "Fri 2 Oct", ported from `dWhen`.
- `ago(time)`.

## Stimulus controllers (`app/javascript/controllers/`)

| Controller | Job |
|---|---|
| `nav` | Opens and closes the drawer sidebar below 1024px, toggles groups, and remembers open groups in `localStorage` (inside try/catch) |
| `index-fit` | Switches the index from table to cards when the table is wider than its panel (ResizeObserver) |
| `index-filters` | Submits the filter form on change (Turbo Frame `index`), debounces search by 250ms, keeps the URL in sync |
| `drawer` | Opens the `<dialog>` when the `drawer` Turbo Frame loads, closes on success, returns focus |
| `palette` | Opens on ⌘K or Ctrl+K, fetches `/admin/search`, handles arrow keys and Enter |
| `show-when` | Shows or hides form fields from another field's value |
| `toast` | Auto-dismisses flash toasts after 5s, pauses on hover |
| `popover` | Wraps the native Popover API for the scope switcher and bell |

## Interfaces

**Produces:**
- `contracts.md` §13
- The components and controllers above
- `layouts/admin`
- `Admin::IndexQuery`

```ruby
# Base for every index query
class Admin::IndexQuery
  # Subclasses declare:
  #   self.searchable = %w[reference name phone]          # ILIKE across these (joins allowed via "units.name")
  #   self.filters    = { status: ->(rel, v) { rel.where(status: v) }, taman: ->(rel, v) { rel.where(taman_id: v) } }
  #   self.sorts      = { "newest" => { created_at: :desc }, "amount" => { amount_cents: :desc } }, default "newest"
  def initialize(relation, params) ...
  def call # => relation with search, filters, sort applied (not paginated)
  def active_filters # => Hash for chips "Status: Overdue ×"
end
```

**Consumes:**
- `Current` and `Permissions` (M01)
- `Notification` (M10, optional)

## Tasks

### T02.1 · Tokens, base CSS and the admin layout

**Files:**
- Modify: `app/assets/tailwind/application.css`
- Create:
  - `app/views/layouts/admin.html.erb`
  - `app/views/admin/shared/_sidebar.html.erb`
  - `app/views/admin/shared/_topbar.html.erb`
  - `app/components/ui/helpers.rb`
  - `app/javascript/controllers/nav_controller.js`
- Test:
  - `spec/system/admin/shell_spec.rb`
  - `spec/components/ui/helpers_spec.rb`

- [ ] **Step 1: Port the theme tokens.** Copy the `@theme` block from `admin/index.html` into `application.css`: indigo, indigo-tint, lav, coral, coral-ink, sun, cream, ink, muted, line, ok-ink, bad-ink and the font. Then copy every rule from `admin/ui.css` below it, keeping `@layer theme, base, components, utilities;` and `.grid > * { min-width: 0; }`.

- [ ] **Step 2: Load fonts and the favicon.**
  - Add Inter and Material Symbols Rounded from Google Fonts in the layout `<head>`.
  - Add `<meta name="robots" content="noindex">` on admin pages.
  - Use `logo.jpg` as the favicon until an SVG mark exists.

- [ ] **Step 3: Write a failing system spec.** At 1440px the sidebar is visible and 288px wide. At 390px it's hidden and "Open menu" opens it as a drawer with a scrim, Esc closes it, and the page has no horizontal scroll (`document.documentElement.scrollWidth <= 390`).

- [ ] **Step 4: Run it.** Expected: FAIL.

- [ ] **Step 5: Build the layout** from `shellHTML()`:
  - indigo sidebar with logo and organisation name;
  - nav list (empty until T02.2);
  - user footer with sign out;
  - topbar;
  - cream `main` sheet with `rounded-t-[28px]`;
  - flash toasts region.

  Write `nav_controller.js` for the drawer behaviour.

- [ ] **Step 6: Write the helper specs.**
  - `icon("close")` renders `<span class="ms" aria-hidden="true">close</span>`.
  - `when_label` covers today, yesterday, within 6 days, and older.

  Implement the helpers.

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Port admin tokens and layout"`.

### T02.2 · Grouped sidebar and the admin registry

**Files:**
- Create:
  - `app/models/admin/nav.rb`
  - `app/models/admin/registry.rb`
  - `app/models/admin/hit.rb`
  - `app/models/admin/work_item.rb`
  - `app/channels/` (Turbo Streams only, no custom channel)
- Modify: `app/views/admin/shared/_sidebar.html.erb`
- Test:
  - `spec/models/admin/nav_spec.rb`
  - `spec/models/admin/registry_spec.rb`
  - `spec/system/admin/nav_spec.rb`

- [ ] **Step 1: Port `NAV`.** Copy it from `admin/app.js` lines 18–53 into `Admin::Nav::GROUPS`. Each item has `label_key`, `path` (a route helper name), `module_key`, `icon`, and `live:` for "On site now".

  ```ruby
  GROUPS = [
    { id: :overview, icon: "space_dashboard", path: :admin_root_path, module_key: nil },
    { id: :props, icon: "holiday_village", items: [
      { key: :tamans, path: :admin_tamans_path, module_key: :properties },
      { key: :units, path: :admin_units_path, module_key: :properties },
      { key: :occupants, path: :admin_occupants_path, module_key: :properties }] },
    # Port the other 9 groups one-to-one from admin/app.js lines 22-52, same order, labels and icons:
    # people (users, roles), security (visitors, onsite live, roster, incidents, qr-policy),
    # permits (permits, refunds, enforcement, permit-types), billing (invoices, reconciliation, escrow,
    # portfolios, late-fees, statements), facilities (facilities, bookings, booking-rules, utilization),
    # market (listings, reports, market-policy), comms (announcements, broadcasts, templates),
    # analytics (single item), settings (profile, integrations, audit).
    # module_key per item follows contracts.md section 3 (e.g. escrow and refunds -> :deposits_refunds).
  ].freeze
  ```

- [ ] **Step 2: Write failing nav specs.**
  - Items whose route helper doesn't exist yet are skipped. This lets modules land in any order.
  - Items whose `module_key` is `none` for the user are hidden.
  - A group with no visible items is hidden.
  - A Billing ops user sees Billing, Permits → Inspections & refunds, and Analytics, but not Users.

- [ ] **Step 3: Write failing registry specs.**
  - `Admin::Registry.count("permits") { 3 }` makes the badge show 3.
  - A count block raising an error is logged and shows no badge; the page still renders.
  - A count for a module at `none` is never called.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the nav and registry.**
  - Nav: `Admin::Nav.for(user)` returns visible groups with counts.
  - Registry: `Admin::Registry` keeps three hashes, with a `reset!` for specs.
  - A group header shows the summed badge when collapsed, like the prototype. The live item shows a green dot and a count.
  - Mark the active item with `aria-current="page"` from `request.path`.

- [ ] **Step 6: Push live counts.** `Admin::CountsBroadcastJob.perform_later(organization_id)` re-renders the sidebar counts partial to `[organization, :counts]`. Modules call `Admin::Counts.touch(organization)` after a write that changes a count; it is debounced to once per 5s per organisation using `Rails.cache` (Solid Cache).

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Add grouped sidebar and admin registry"`.

### T02.3 · Topbar: scope switcher, bell and user menu

**Files:**
- Create:
  - `app/views/admin/shared/_scope_switcher.html.erb`
  - `app/views/admin/shared/_bell.html.erb`
  - `app/javascript/controllers/popover_controller.js`
- Test: `spec/system/admin/topbar_spec.rb`

- [ ] **Step 1: Write failing system specs.**
  - The scope switcher lists "All tamans" plus each accessible taman, with unit counts.
  - Picking "Bukit Indah" reloads the page with only Bukit Indah data. It uses `PATCH /admin/scope` from M01 T01.5.
  - A taman manager with one taman sees the switcher as a static label.
  - The bell shows "You're all caught up" when there are no notifications.
  - At 390px the switcher becomes an icon button and still works.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it from the prototype `topBar()`.**
  - Popovers use `popover="auto"` with anchored positioning, as in the prototype.
  - The topbar links "Guard console" (`/security`) for users with `guard_ops` view.

- [ ] **Step 4: Render the bell list.** When `Notification` is defined (M10), it lists the latest 8 for `Current.user` with an unread dot and "Mark all read". The badge uses `[user, :bell]` streams.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add scope switcher, bell and user menu"`.

### T02.4 · Index engine

**Files:**
- Create:
  - `app/components/ui/index_component.rb` and `.html.erb`
  - `app/queries/admin/index_query.rb`
  - `app/controllers/concerns/admin/indexable.rb`
  - `app/javascript/controllers/index_fit_controller.js`
  - `app/javascript/controllers/index_filters_controller.js`
- Test:
  - `spec/queries/admin/index_query_spec.rb`
  - `spec/components/ui/index_component_spec.rb`
  - `spec/system/admin/index_engine_spec.rb`, using a test-only route with a dummy model

**Interfaces produced:**

```ruby
# In a controller:
include Admin::Indexable
def index
  @index = index_for(policy_scope(Invoice), Admin::InvoicesQuery, columns: InvoicesColumns)
  respond_to { |f| f.html; f.csv { send_index_csv(@index, filename: "invoices") } }
end

# Columns are declared once and used for table, cards and CSV:
InvoicesColumns = [
  Ui::Col.new(:reference, label: "Invoice", primary: true),
  Ui::Col.new(:unit,      label: "Unit", value: ->(i) { i.unit.name }),
  Ui::Col.new(:amount,    label: "Amount", value: ->(i) { rm(i.amount_cents) }, csv: ->(i) { i.amount_cents / 100.0 }, align: :right),
  Ui::Col.new(:status,    label: "Status", chip: true),
  Ui::Col.new(:due_on,    label: "Due", hide_below: "2xl")
]
```

- [ ] **Step 1: Write failing query specs.**
  - Search is case-insensitive across `searchable` columns.
  - Unknown filter keys are ignored. An unknown sort falls back to the default (no SQL injection through `sort`).
  - Filters combine with AND.
  - `active_filters` returns labels for chips.

- [ ] **Step 2: Write failing component specs.**
  - It renders a table with sortable headers.
  - It renders a hidden card list from the same rows. Card fields use `data-label` and show the primary column on top and the chip on the right.
  - The pager shows "1–25 of 412".
  - The CSV link keeps the current filters.
  - The empty state reads "No invoices match these filters" with a "Clear filters" link.

- [ ] **Step 3: Write a failing system spec.**
  - At 1024px with a 9-column table, `index-fit` switches to cards.
  - At 1440px it shows the table.
  - Typing in search updates the results and the URL without a full reload.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement `Admin::IndexQuery`, the component and the concern.**
  - Pagination uses Pagy, 25 per page.
  - CSV streams with `CSV.generate`, in batches of 1,000.

- [ ] **Step 6: Port `fitIx` to `index_fit_controller.js`.**

  ```js
  import { Controller } from "@hotwired/stimulus"
  export default class extends Controller {
    static targets = ["table"]
    connect() { this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.element); this.fit() }
    disconnect() { this.ro?.disconnect() }
    fit() {
      this.element.classList.remove("as-cards")
      if (this.tableTarget.scrollWidth > this.element.clientWidth + 1) this.element.classList.add("as-cards")
    }
  }
  ```

  In CSS, `.as-cards table { display: none }` and `.as-cards .cardview { display: grid }`, ported from `ui.css`.

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Add index engine with card fallback and CSV export"`.

### T02.5 · Drawer, forms and toasts

**Files:**
- Create:
  - `app/components/ui/drawer_component.rb` and `.html.erb`
  - `app/helpers/ui/form_builder.rb`
  - `app/javascript/controllers/drawer_controller.js`
  - `app/javascript/controllers/show_when_controller.js`
  - `app/javascript/controllers/toast_controller.js`
- Test:
  - `spec/helpers/ui/form_builder_spec.rb`
  - `spec/system/admin/drawer_spec.rb`

**Pattern every module follows:**
- "New invoice" links with `data-turbo-frame="drawer"`.
- The `new` action renders inside `<turbo-frame id="drawer">`, which opens the dialog.
- On a valid `create`, the action responds with `turbo_stream` actions in this order:
  1. close the drawer;
  2. replace the index frame;
  3. show a toast.
- On an invalid `create`, it re-renders the form with 422.

- [ ] **Step 1: Write failing form builder specs.**
  - `f.field :amount, as: :money` renders the label, an "RM" prefix and `inputmode="decimal"`.
  - Errors render under the field with `aria-describedby`.
  - `show_when: { field: :kind, is: "percent" }` adds the Stimulus data attributes.
  - The first field gets `autofocus`. This includes textareas, a bug fixed in the prototype.

- [ ] **Step 2: Write a failing system spec** using a dummy form.
  - The drawer opens as a side sheet at 1440px and a bottom sheet at 390px.
  - Submitting invalid data keeps it open with errors.
  - Valid data closes it, the list updates, and a toast "Saved" appears.
  - Esc closes it and focus returns to the trigger.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the drawer, form builder and controllers.**
  - Toasts render from `flash` and from a `turbo_stream.append "toasts"` helper: `toast_stream(message, tone: :ok)`.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add drawer, form builder and toasts"`.

### T02.6 · ⌘K command palette

**Files:**
- Create:
  - `app/controllers/admin/search_controller.rb`
  - `app/views/admin/search/index.html.erb`
  - `app/javascript/controllers/palette_controller.js`
- Test:
  - `spec/requests/admin/search_spec.rb`
  - `spec/system/admin/palette_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - `GET /admin/search?q=inv` returns nav pages matching "inv" ("Invoices") plus registry hits, grouped by label.
  - Hits come only from modules the user can view.
  - Results are limited to 5 per group.
  - An empty `q` shows the recent pages, stored in `session[:recent]`, maximum 5.
  - Pressing ⌘K (Mac) or Ctrl+K opens the palette. Arrow down and Enter navigate. Esc closes it.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Send the results HTML in a Turbo Frame.
  - Label the shortcut hint "⌘K" on Mac and "Ctrl K" elsewhere, using the `navigator.platform` check from `IS_MAC` in `helpers.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add command palette"`.

### T02.7 · Overview frame, error pages and shared display components

**Files:**
- Create:
  - `app/controllers/admin/overview_controller.rb`
  - `app/views/admin/overview/show.html.erb`
  - `app/views/admin/errors/{forbidden,not_found}.html.erb`
  - `app/components/ui/{chip,tile,panel,empty,bars,ticket}_component.rb` with their templates
- Test:
  - `spec/requests/admin/overview_spec.rb`
  - `spec/components/ui/chip_component_spec.rb`
  - `spec/components/ui/bars_component_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - The overview renders "Waiting on you" with registry worklist items sorted by `due_at`, overdue first and marked "Overdue".
  - With no items it shows "Nothing waiting on you".
  - The 403 page says "You don't have access to <page>. Ask your portfolio admin." and links back to the overview.
  - `Ui::ChipComponent.new("Overdue")` has the bad tone, `"Paid"` ok, `"Pending Review"` sun, and an unknown status neutral.
  - `Ui::BarsComponent` with values `[3, 0, 7]` renders 3 bars with heights proportional to the maximum and an accessible table fallback (`<table class="sr-only">`).

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the overview and components.**
  - Port the overview layout from the prototype `#/` page: the worklist first, then slots for "On site now" (M05) and "Today at the gates" (M04). Each slot renders only when its partial exists.
  - Port the components from `ui.css` and `pages.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Run a visual check.** Screenshot the overview at 390px, 1024px and 1440px against the prototype, attach the screenshots to the pull request, and fix any differences in spacing or type.

- [ ] **Step 6: Commit** with `git commit -m "Add overview worklist, error pages and display components"`.

## Module done when

- [ ] A blank module page using `Ui::IndexComponent` and `Ui::DrawerComponent` needs no custom CSS or JS.
- [ ] The shell has no horizontal scroll at 390px, and the sidebar, palette and drawers work by keyboard alone.
- [ ] Lighthouse accessibility on the overview scores ≥ 95.

## Progress log

| Date | Who | Note |
|---|---|---|
