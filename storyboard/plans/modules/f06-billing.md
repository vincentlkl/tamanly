# F06 · Billing & payments

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01

**Ponytail:** full. One `PaymentSheet` for invoices, permits and bookings. The app opens the Billplz URL and polls `GET /payments/:id` after `tamanly://payments/:id`. No card form. No second payment client.

**Screens:** E1 Bills, E2 Invoice & pay, E3 Success, E4 Receipts, E5 Sub-tenant view only.

**APIs:** billing routes in [../api.md](../api.md). Reminder toggles that the API does not return stay off this screen (they live on G3). E1's reminder switch is shown only if the summary payload includes a reminder flag. If it does not, omit the switch and add `// ponytail: reminder switch waits for a summary field`.

## Produces

```dart
class PaymentSheet extends StatelessWidget {
  final String payableType; // invoice | permit | booking
  final String payableId;
  final String amountFormatted;
}
```

Other modules push this sheet. They do not call `POST /payments` themselves.

## Tasks

### T06.1 · List and invoice

**Files:**
- Create: `lib/billing/bills_page.dart`, `lib/billing/invoice_page.dart`, `lib/billing/payment_sheet.dart`
- Modify: `lib/router.dart` Bills tab
- Test: `test/billing/pay_test.dart`

E1: outstanding across units, due / overdue / paid. The list filter is `open` or `paid`. E2: line items, then two methods: Pay online (opens the Billplz URL) and Bank transfer (receipt photo). Those post `method` `online` or `bank_transfer`. Payable `type` is `invoice`, `permit`, or `booking` (`lib/enums.dart`). Do not build the Maybank / CIMB / Public Bank grid, the DuitNow row, the card row, or the auto-pay switch. Billplz draws the banks. E5: same invoice page with `can_pay == false` — no pay button, owner name, and a note to ask the owner. A sub-tenant cannot open A6.

- [ ] **Step 1: Widget test.** `can_pay: false` renders no Pay now. `can_pay: true` posts `POST /api/v1/payments` with the same idempotency key on a retry after a socket error. The body `payables[0].type` is `invoice`.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement E1, E2, E5 and `PaymentSheet`.** Online flow launches the returned URL with `url_launcher`. Bank transfer uploads `receipt_slip` via `image_picker` and shows `GET /billing/transfer_instructions`.

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T06.2 · Return, receipt, PDF

**Files:**
- Create: `lib/billing/receipt_page.dart`, `lib/billing/receipts_page.dart`
- Modify: `lib/router.dart` for `tamanly://payments/:id`
- Test: `test/billing/return_test.dart`

E3: poll until the payment is `paid` or `failed`, show the reference, share, download PDF via `GET /receipts/:id/pdf` (write to a temp file and share it; no PDF viewer package). E4: list by month.

- [ ] **Step 1: Unit test of the poll stopper.** Status `pending` continues. `paid` and `failed` stop. More than 10 polls stop as failed-to-confirm without marking the bill unpaid in the UI copy (the string says the bank is still confirming).

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement the deep link, E3 and E4.**

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

Paying an invoice and paying a permit both go through `PaymentSheet`. A sub-tenant without `bills_pay` cannot reach a successful POST.
