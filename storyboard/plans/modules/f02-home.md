# F02 · Home & community

**Status:** In progress · **Owner:** grok · **Depends on:** F00, F01

**Ponytail:** full. Home search filters the announcements already on screen. WhatsApp is `url_launcher`. No chat backend.

**Screens:** H0 Home, B1 Directory, B2 Marketplace, B3 Listing, B4 Create listing.

**APIs:** `GET /feed`, `GET /announcements/:id`, `GET /billing/summary`, `GET /directory`, market routes in [../api.md](../api.md).

## Tasks

### T02.1 · Home

**Files:**
- Create: `lib/home/home_page.dart`, `lib/home/announcement_page.dart`
- Modify: `lib/router.dart` so the Home tab is this page
- Test: `test/home/home_test.dart`

H0: indigo header, property chip (opens A5), bell with `me.unread_notifications`, greeting, search field, alert card, eight shortcuts (Visitors, Permits, Pay bills, Facilities, Market, Directory, SOS, More), bill card, bottom announcement strip. Pay bills and the bill card hide their pay action when `!session.allows('bills_pay')` (the card can still show the amount when `bills_view`). More opens a sheet with Help (F09) and language.

- [x] **Step 1: Widget test.** A summary of `RM 185.00` renders that string. A sub-tenant without `bills_pay` has no Pay now button. Typing "water" hides an announcement titled "Gotong-royong".

- [x] **Step 2: Run it.** Expected: FAIL.

- [x] **Step 3: Implement.** Shortcuts push the routes F03–F08 own. Until those pages exist, push a placeholder named with the screen code so this module does not block. Replace the placeholder in the owning module.

- [x] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T02.2 · Directory

**Files:**
- Create: `lib/home/directory_page.dart`
- Test: included in `test/home/home_test.dart` as a second test

B1: facilities, trusted services with call and WhatsApp, waste schedule. The Services tab opens this page.

- [ ] **Step 1: Widget test.** A service with a phone renders a call button whose `url_launcher` target is `tel:` plus that phone. Use an injected launcher function so the test does not open the dialer.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement B1 from `GET /directory`.** Group rows by `category` using the directory enum in `lib/enums.dart` (create that file in this step). An unknown category groups last and does not throw. Do not hardcode vendor names.

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T02.3 · Marketplace

**Files:**
- Create: `lib/home/market_page.dart`, `lib/home/listing_page.dart`, `lib/home/listing_form_page.dart`
- Test: `test/home/listing_form_test.dart`

B2 categories, grid, Sell. B3 seller is a resident, pickup note, WhatsApp via `contact_url`. B4 photos (`image_picker`), title, `price_kind` (`fixed` / `free` / `ask` from `lib/enums.dart`), and `price_cents`. `free` and `ask` send a null price. Submit is `POST /listings` with `idempotent: true`.

- [ ] **Step 1: Widget test.** Submitting the form with a title and a price calls `POST /api/v1/listings` once. Tapping submit twice while the first call is in flight still sends one request (the button disables, and the idempotency key is the same).

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement B2, B3, B4.** Price is sent as cents (integer). Display uses `formatted` from the response. Add `image_picker` if it is not in the project yet.

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

Home matches H0's structure, directory calls and WhatsApp open outside the app, and a listing can be created once per tap.
