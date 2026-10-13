# F05 · Permits

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01, F06 (`PaymentSheet`)

**Ponytail:** full. One permit model file with `fromJson`. Status order is the const below, not a copy on each screen. Payment is `PaymentSheet` from F06 with payable type `permit`.

**Screens:** D1 List, D2 Category, D3 Details & documents, D4 Deposit & fee, D5 Status, D6 Contractor pass, D7 Inspection & refund.

**Status order:** Pending Review, Docs requested, Pending Deposit, Approved, Work In Progress, Inspection Scheduled, Completed, Deposit Refunded, Rejected. `PermitStatus` lives in `lib/enums.dart`. `indexOf` still takes the label. `fromJson` maps the API snake_case status onto that order.

## Tasks

### T05.1 · List, category, documents

**Files:**
- Create: `lib/permits/permits_page.dart`, `lib/permits/category_page.dart`, `lib/permits/form_page.dart`, `lib/permits/permit.dart`
- Test: `test/permits/status_test.dart`

D1: active, action needed, deposits held, status chips. D2: types from `GET /permit_types` with fee and deposit `formatted`. D3: scope, dates, hours, contractor, workers, plates, required uploads. `POST /permits` multipart, idempotent.

- [ ] **Step 1: Unit test.** `PermitStatus.indexOf('Deposit Refunded')` is after `Completed`. An unknown status sorts last and does not throw.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement D1–D3.** Required documents come from the type payload. Missing ones block the button and name the missing label.

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T05.2 · Pay, tracker, pass, refund

**Files:**
- Create: `lib/permits/detail_page.dart`, `lib/permits/pass_page.dart`, `lib/permits/refund_page.dart`
- Test: `test/permits/detail_test.dart`

D4 is `PaymentSheet` when `next_action` is pay. D5 shows the seven-plus statuses with the current one marked, using the timeline from `GET /permits/:id`. D6 QR from `GET /permits/:id/pass`, share `share_url`. D7 checklist, photos, `POST /permits/:id/completion`, then `GET /permits/:id/refund`.

- [ ] **Step 1: Widget test.** A permit in Pending Deposit shows the pay button. A permit in Approved does not. The pay button opens `PaymentSheet` with that permit id.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement D4–D7.** Reuse `qr_flutter` from F03.

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

An owner can start a permit, pay the deposit through the shared sheet, open the contractor pass, and request the inspection. Status labels match the list above in EN, with BM in ARB.
