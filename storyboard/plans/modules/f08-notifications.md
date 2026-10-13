# F08 · Notifications

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01

**Ponytail:** full. One deep-link parser for push taps and inbox taps. Firebase Messaging is initialized once, in this module. Lock-screen UI is the OS (B6). The agent does not create the Firebase project. That is [../manual.md](../manual.md).

**Screens:** B5 Notification center, B6 the data those pushes carry (the app does not draw the lock screen).

**APIs:** devices, notifications, and the `deep_link` field. Preferences UI is F09, but this module registers the device token.

## Tasks

### T08.1 · Inbox

**Files:**
- Create: `lib/inbox/inbox_page.dart`, `lib/inbox/links.dart`
- Modify: `lib/router.dart` — the bell on Home and Me opens the inbox
- Test: `test/inbox/links_test.dart`

B5: list, unread filter, unread dot, inline action when the payload has one (Pay now opens `PaymentSheet` or the invoice). Tap marks read and follows `deep_link`.

- [ ] **Step 1: Unit test `parseDeepLink`.**
  - `tamanly://invoices/abc` → invoice route with id `abc`.
  - `tamanly://payments/abc` → payment return route.
  - `tamanly://visitor_passes/abc` → pass route.
  - `tamanly://permits/abc` → permit route.
  - `tamanly://bookings/abc` → booking route.
  - `tamanly://announcements/abc` → announcement route.
  - An unknown host returns null. The caller stays on the inbox.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement the inbox and the parser.** Empty state names what will show up (visitors, bills, bookings, permits, announcements).

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T08.2 · Push registration

**Files:**
- Create: `lib/inbox/push.dart`
- Modify: `lib/app.dart` to call `Push.attach(session)` after sign-in and `Push.detach` on sign-out
- Test: `test/inbox/push_test.dart` with an injected token source (no Firebase in the test)

- [ ] **Step 1: Add `firebase_messaging`.**

- [ ] **Step 2: Write the test.** A token `abc` results in `PUT /api/v1/devices/current` with `fcm_token: abc`. A null token (permission denied) does not PUT. `detach` calls `DELETE /api/v1/devices/current`.

- [ ] **Step 3: Run it.** Expected: FAIL.

- [ ] **Step 4: Implement.** The device PUT sends `platform` `ios` or `android` from `lib/enums.dart`. Foreground messages refresh the unread count on `Session`. A tap uses `parseDeepLink`. Permission prompt happens here, once, after sign-in.

- [ ] **Step 5: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

Inbox items open the right screen, Pay now respects `can_pay`, and a signed-in install registers one device token. A real push still needs the human steps in `manual.md`.
