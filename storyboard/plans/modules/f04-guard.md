# F04 · Guard mode

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01

**Ponytail:** full. One scanner page. Verdict is one screen for visitors and contractors, branched on the payload `kind`. Poll Gate every 15 seconds while it is the current route. Override dials `tel:`. No websocket, no boom-gate API.

**Screens:** C5 Guard home, C6 Scan, C7 Visitor verdict, C8 Contractor permit check, C9 Gate log.

**APIs:** `/api/v1/guard/*` in [../api.md](../api.md).

## Tasks

### T04.1 · Gate home and log

**Files:**
- Create: `lib/guard/gate_page.dart`, `lib/guard/log_page.dart`
- Modify: `lib/router.dart` guard shell
- Test: `test/guard/gate_test.dart`

C5: shift, four counts, scan card, arriving next, contractors, override. Check in on an arrival opens the verdict for that pass. See all opens C9. Permits log opens today's contractor rows (same payload as C8). C9: admitted, denied with reason, contractors, exits. Pull to refresh. Poll only on C5.

- [ ] **Step 1: Widget test.** Counts from a fake `GET /guard/home` render. A `Timer` test (fake async) issues a second GET after 15 seconds and not before. Override invokes the injected dialer with the station phone.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement C5 and C9.** `// ponytail: 15s poll, replace with a stream if the gate feels late.`

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T04.2 · Scan and verdict

**Files:**
- Create: `lib/guard/scan_page.dart`, `lib/guard/verdict_page.dart`
- Test: `test/guard/verdict_test.dart`

C6: camera via `mobile_scanner`, plus a text field for plate or code. Recent scans are the last five kept in memory. C7: valid or not, host, plate, window, admit, deny with a reason. C8 is the same page when `kind` is `permit`: hours, worker count, plates. Admit on a permit calls `POST /guard/permits/:id/admit`. Admit on a visitor calls `POST /guard/visitor_passes/:id/admit`.

- [ ] **Step 1: Unit test of a pure function `GuardAction.parse(verdict)`** that returns the admit path. A visitor id hits the visitor URL. A permit id hits the permit URL. A denied verdict has no admit path.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement scan and verdict.** Add `mobile_scanner`. The camera is created when the page opens and disposed when it closes.

- [ ] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

Scan, then admit or deny, is one verdict screen. The log shows the result after a refresh. A non-guard session cannot open these routes (`redirect` to the resident shell).
