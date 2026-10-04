# M08 · Marketplace

**Status:** Not started · **Owner:** — · **Wave:** 3 · **Depends on:** M03, M10. Also M02 and M11.

**Goal:** Residents buy, sell and offer services inside their own taman. Management moderates listings and reports and sets the category rules.

**Read first:** `../contracts.md` §3 (permission key `marketplace`) and §10 (the `listing.*` events).

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered |
|---|---|---|
| Mobile | Marketplace browse & list (community buy/sell/services) | All |
| Web | Listing approval / takedown | All |
| Web | Category & policy settings | All |
| Web | Report handling | All |

**Prototype references:**
- Admin pages:
  - `admin/#/listings`
  - `admin/#/reports`
  - `admin/#/market-policy`
- Seed data in `admin/data.js`: `LISTING_SEED`, `MARKET_CATS`, `MARKET_POLICY`
- Storyboard screens: B2 Marketplace, B3 Listing detail, B4 Create listing

## Data model

**`market_categories`**

| Column | Notes |
|---|---|
| `organization_id` | |
| `name_en`, `name_ms` | |
| `enabled` | |
| `requires_approval` | |
| `position` | |

**`market_policies`**: one row per taman.

| Column | Default |
|---|---|
| `expiry_days` | 30 |
| `max_active_per_unit` | 5 |
| `auto_hide_reports` | 3 |
| `sub_tenants_can_post` | false |
| `prohibited_items` | text |

**`listings`**

| Column | Notes |
|---|---|
| `reference` | |
| `taman_id`, `unit_id` | |
| `seller_id` | |
| `category_id` | |
| `title`, `description` | |
| `price_cents` | Null when the price kind is `free` or `ask` |
| `price_kind` | `fixed` / `free` / `ask` |
| `status` | `pending_approval` / `live` / `sold` / `expired` / `taken_down` / `rejected` |
| `hidden_at` | Set on auto-hide |
| `expires_at` | |
| `reports_count` | |
| `moderated_by_id` | |
| `moderation_reason` | |

Listings carry up to 6 attached `photos`.

**`listing_reports`**

| Column | Notes |
|---|---|
| `reference` | |
| `listing_id`, `taman_id` | |
| `reporter_id` | |
| `reason` | `scam` / `prohibited` / `offensive` / `wrong_category` / `other` |
| `note` | |
| `status` | `open` / `upheld` / `dismissed` |
| `handled_by_id`, `handled_at` | |

Unique `[listing_id, reporter_id]`.

## Interfaces

**Produces:**

```ruby
Listings::Publish.call(occupancy:, params:)      # => Listing (pending_approval or live)
Listings::Moderate.call(listing, action: :approve | :reject | :take_down | :restore, by:, reason: nil)
Listings::Report.call(listing, reporter:, reason:, note:)  # auto-hides at policy threshold; fires listing.reported
```

**Consumes:**
- `Occupancy` (M03)
- `Notifier` (M10)
- `AuditEvent` and `Permissions` (M01)

## API endpoints

All require `X-Unit-Id`. Listings are visible only within the unit's taman.

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/market/categories` | B2 |
| GET | `/api/v1/listings?q=&category_id=&mine=true` | B2 |
| GET | `/api/v1/listings/:id` | B3. Includes the seller's first name and `contact_url` (`https://wa.me/<digits>?text=<listing title>`) |
| POST | `/api/v1/listings` (multipart, idempotent) | B4 |
| PATCH | `/api/v1/listings/:id` | Edit (own listing; editing a live one in an approval category sends it back to `pending_approval`) |
| POST | `/api/v1/listings/:id/sold` | Mark sold |
| DELETE | `/api/v1/listings/:id` | Withdraw |
| POST | `/api/v1/listings/:id/reports` | Report |

## Tasks

### T08.1 · Listings and the resident API

**Files:**
- Create:
  - migrations and models for the four tables
  - `app/services/listings/{publish,report}.rb`
  - `app/controllers/api/v1/{listings,market_categories,listing_reports}_controller.rb`
  - serializers
  - `app/jobs/listings/expire_job.rb`
- Test:
  - `spec/services/listings/publish_spec.rb`
  - `spec/services/listings/report_spec.rb`
  - `spec/requests/api/v1/listings_spec.rb` (rswag)

- [ ] **Step 1: Write failing specs.**
  - **Publishing:**
    - A category that needs approval creates `pending_approval`. Others go `live` with `expires_at = now + expiry_days`.
    - The 6th active listing for a unit fails with "Your unit has 5 active listings. Mark one sold or remove it first."
    - A sub-tenant is refused unless `sub_tenants_can_post`: 403 `forbidden` with "Sub-tenants can't post in this taman's marketplace."
    - A disabled category is refused.
    - More than 6 photos is refused.
    - A photo over 10 MB, or one that isn't an image, is refused.
  - **Browsing:**
    - Only `live`, not-hidden listings from the unit's taman appear. Another taman's listing returns 404.
    - Search covers title and description.
  - **Contact:** `contact_url` is present only for listings in the viewer's taman. The seller's phone is never returned as a plain field.
  - **Reports:**
    - Reporting twice gives 409 "You've already reported this listing."
    - At `auto_hide_reports` open reports, `hidden_at` is set and staff get `listing.reported`.
    - A seller can't report their own listing.
  - **Expiry:** `ExpireJob` runs daily and sets `expired` on live listings past `expires_at`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed from `LISTING_SEED`, `MARKET_CATS` and `MARKET_POLICY` in `admin/data.js`. Register the `listing.*` events in the catalog with EN and BM templates.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add marketplace listings and resident API"`.

### T08.2 · Moderation: Listings and Reported listings pages

**Files:**
- Create:
  - `app/services/listings/moderate.rb`
  - `app/controllers/admin/{listings,listing_reports}_controller.rb`
  - queries and views
  - `config/initializers/admin_marketplace.rb`
- Test:
  - `spec/services/listings/moderate_spec.rb`
  - `spec/requests/admin/listings_spec.rb`
  - `spec/requests/admin/listing_reports_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Listings page** (`admin/#/listings`):
    - Tabs: Pending approval, Live, Hidden, Sold, Expired, Taken down.
    - Filters: taman, category.
    - Search: title, seller, reference.
    - Columns: listing (photo, title), category, price, seller and unit, posted, reports, status.
  - **Moderation actions:**
    - Approve sets `live` and fires `listing.approved`.
    - Reject needs a reason, sets `rejected` and fires a `listing.taken_down` variant.
    - Take down needs a reason, sets `taken_down` and fires `listing.taken_down`.
    - Restore clears `hidden_at`.
    - All four are audited as `listing.<action>`.
  - **Reported listings page** (`admin/#/reports`):
    - Open reports come first. Each shows the listing preview, reason, note and reporter.
    - "Uphold" takes the listing down and closes all of its open reports as `upheld`.
    - "Dismiss" closes the report, and restores the listing if it was auto-hidden and no open reports remain.
  - **Sidebar counts:** pending approvals and open reports.
  - **Worklist:** reports older than 24 h.
  - **Permissions:** `marketplace: edit` to act, `view` to see.
  - **Isolation:** include the tenant-isolated shared example.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add marketplace moderation pages"`.

### T08.3 · Categories & policy page

**Files:**
- Create:
  - `app/controllers/admin/market_policies_controller.rb`
  - `app/controllers/admin/market_categories_controller.rb`
  - views
- Test: `spec/requests/admin/market_policy_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Categories** (`admin/#/market-policy`):
    - Add, rename (EN and BM), reorder, enable or disable, and toggle "needs approval".
    - Disabling a category with live listings asks "12 live listings stay up until they expire. Hide them now?" with two choices.
  - **Policy:** edited per taman.
    - `expiry_days` must be 7–90.
    - `max_active_per_unit` must be 1–20.
    - `auto_hide_reports` must be 1–10.
    - The prohibited items text appears in the app on B4 as "Not allowed here".
  - **Audit:** changes are recorded as `market_policy.updated`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Return the prohibited items text in `GET /api/v1/market/categories` as `meta.prohibited_items`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add marketplace categories and policy settings"`.

## Module done when

- [ ] A resident posts a listing in an approval category. Staff approve it in the dashboard. The resident gets a push, and a neighbour in the same taman sees the listing while a resident of another taman does not.

## Progress log

| Date | Who | Note |
|---|---|---|
