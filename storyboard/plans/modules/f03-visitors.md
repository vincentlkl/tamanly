# F03 · Visitors & SOS

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01

**Ponytail:** full. QR is `qr_flutter` from `qr_payload`. Share uses `share_plus`. SOS location is `geolocator` and nothing else (no map SDK). If location is denied, the POST still sends, with a null lat/lng and the selected unit's address in `message`.

**Screens:** C1 Visitors, C2 Pre-register, C3 QR pass, C4 SOS.

**APIs:** visitor_passes, emergency_contacts, sos. Scope `visitor_passes`.

## Tasks

### T03.1 · List and pre-register

**Files:**
- Create: `lib/visitors/visitors_page.dart`, `lib/visitors/register_page.dart`
- Modify: `lib/router.dart` — resident center button opens C1
- Test: `test/visitors/register_test.dart`

C1: upcoming, today, history. C2: type, plate, time window, guest count, multiple-entry, note. `POST /visitor_passes` idempotent.

- [ ] **Step 1: Widget test.** A session without `visitor_passes` shows the API-style locked message and no create button. A valid form posts once and the plate is the value typed.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement C1 and C2.** The type control posts `kind` as `guest`, `delivery`, `ehailing`, `service`, or `walkin` from `lib/enums.dart`. Dates use a Material date and time picker. Send ISO 8601 with `+08:00`. The list filter is `upcoming` or `past`.

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T03.2 · Pass and SOS

**Files:**
- Create: `lib/visitors/pass_page.dart`, `lib/visitors/sos_page.dart`
- Test: `test/visitors/sos_test.dart`

C3: ticket layout, WhatsApp/share, save is the share sheet (no custom gallery writer), cancel calls `DELETE`. C4: hold-to-alert (about 800ms), contacts from `GET /emergency_contacts` as `tel:` links, then `POST /sos`.

- [ ] **Step 1: Widget test.** A hold shorter than 800ms does not POST. A completed hold POSTs once. A second hold while the first request runs does not POST again.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement C3 and C4.** Add `qr_flutter`, `share_plus` and `geolocator`. Location permission denied still allows the hold to POST with null coordinates.

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

A resident with the scope can issue a pass and share it. A resident without the scope cannot. SOS cannot fire from a short tap.
