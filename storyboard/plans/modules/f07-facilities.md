# F07 · Facilities

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01, F06 (`PaymentSheet`)

**Ponytail:** full. The slot grid is one widget. A booked slot is not tappable. Payment, when the booking response says `payment_required`, opens `PaymentSheet`. Calendar add is a Google Calendar URL via `url_launcher`, not a calendar plugin.

**Screens:** F1 Book a facility, F2 Pick slots, F3 My bookings.

**APIs:** facilities and bookings. Scope `facility_booking`.

## Tasks

### T07.1 · Catalog and slots

**Files:**
- Create: `lib/facilities/facilities_page.dart`, `lib/facilities/slots_page.dart`
- Test: `test/facilities/slots_test.dart`

F1: name, price, deposit, and availability from `GET /facilities`. `kind` is `hall`, `court`, `bbq`, `pool`, `gym`, `room`, or `other` (`lib/enums.dart`). A place with `bookable: false` has no book button. F2: day strip, slot grid (available / selected / booked), rules text from the facility, reminder line. The booking list filter is `upcoming` or `past`.

- [ ] **Step 1: Widget test.** A booked slot does not call select. Two taps on one available slot select then clear it. Confirm posts `POST /bookings` once with that slot id.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement F1 and F2.** `409 slot_taken` refreshes the grid and shows the message.

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T07.2 · My bookings

**Files:**
- Create: `lib/facilities/bookings_page.dart`
- Test: `test/facilities/bookings_test.dart`

F3: confirmed, pending approval, cancelled. Cancel calls `POST /bookings/:id/cancel`. Add to calendar opens a URL built by a pure function `calendarUrl(title, start, end)`.

- [ ] **Step 1: Unit test `calendarUrl`.** The start is in the URL in UTC basic format. The title is query-encoded.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement F3.** When `payment_required` is set, the row's action is Pay and it opens `PaymentSheet` with type `booking`.

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

A resident with `facility_booking` can book a free slot and see it under My bookings. A taken slot cannot be double-booked from this UI. A sub-tenant without the scope has no book button.
