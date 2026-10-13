# F01 · Access & accounts

**Status:** Done · **Owner:** grok · **Depends on:** F00

**Ponytail:** full. Firebase phone auth is the resident sign-in. Staff email uses the password endpoint. Do not build Google, Apple, or a resident password. One form widget for the OTP code.

**Screens:** A1 Welcome, A2 Sign in, A3 Choose role, A4 Verify & link, A5 Property switcher, A6 Invite sub-tenant, A7 Accept invite. H0's property chip opens A5 (the chip itself is F02).

**APIs:** auth, `me`, properties, tamans, invites, link_requests, sub_tenants. See [../api.md](../api.md).

## Tasks

### T01.1 · Welcome and sign in

**Files:**
- Create: `lib/access/welcome_page.dart`, `lib/access/sign_in_page.dart`
- Modify: `lib/router.dart`
- Test: `test/access/sign_in_test.dart`

Storyboard: A1 brand, EN/BM toggle, illustration. A2 phone field with `+60`, "Sign in with one-time code", link to create account. Staff reach email via the Email tab, which posts to `/auth/password`. The password field, Remember me, Forgot password, Google and Apple on the A2 picture are not built. The email tab's error for a forgotten password says to ask the management office.

`google-services.json` and `GoogleService-Info.plist` come from [../manual.md](../manual.md). Widget tests inject `PhoneAuth` and do not read those files.

- [x] **Step 1: Add `firebase_core` and `firebase_auth`.** Document in the module progress log that `google-services` files come from [../manual.md](../manual.md). The page must still build without them in widget tests (inject a `PhoneAuth` function, defaulting to Firebase).

- [x] **Step 2: Write a widget test.** Tapping BM on the welcome page sets `Session.locale` to `ms` and the sign-in title is the BM string. Submitting a 6-digit code calls the injected verifier once. The Google and Apple buttons are absent.

- [x] **Step 3: Run `flutter test test/access/sign_in_test.dart`.** Expected: FAIL.

- [x] **Step 4: Build A1 and A2.** OTP: `FirebaseAuth.verifyPhoneNumber` with the E.164 number, then `Session.signInWithFirebase`. Email tab: `Session.signInWithPassword`. Errors show `ApiException.message`.

- [x] **Step 5: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T01.2 · Role, link, invites

**Files:**
- Create: `lib/access/role_page.dart`, `lib/access/link_page.dart`, `lib/access/invite_page.dart`
- Test: `test/access/link_test.dart`

A3 is shown when `me.profile_complete` is false or `modes` is empty. Roles on the screen: owner, resident, sub-tenant (has an invite code / pending invite), security guard, management staff. Guard and staff are not self-serve creations: those cards explain that the management office adds them, and the button returns to sign-in. Owner and resident go to A4. Sub-tenant goes to A7 if `GET /invites` is non-empty, otherwise A4's code field.

A4: taman search (`GET /tamans?q=`), unit note, optional proof photo via `image_picker`, `POST /link_requests`. A7: list pending invites, show granted scopes and locked ones, accept or decline.

- [x] **Step 1: Write a widget test with a fake `Api`.** A `me` with `profile_complete: false` opens A3. Accepting an invite calls `POST /invites/:id/accept` and then `selectUnit` with the returned unit.

- [x] **Step 2: Run it.** Expected: FAIL.

- [x] **Step 3: Implement the three pages.** Scope labels come from one map in `lib/access/scopes.dart` (`bills_view`, `bills_pay`, `visitor_passes`, `facility_booking`) used again by A6 and G2.

- [x] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T01.3 · Switcher and sub-tenant invite

**Files:**
- Create: `lib/access/switcher_page.dart`, `lib/access/sub_tenant_page.dart`
- Test: `test/access/scopes_test.dart`

A5 lists `GET /properties`: taman, unit, relationship chip, dues line if the payload has an amount. Tap calls `Session.selectUnit`. A6: phone and name typed in (no contact-book picker). Draw all six scope rows from the picture. Permits and Marketplace stay disabled and are not posted. Post only `bills_view`, `bills_pay`, `visitor_passes`, `facility_booking`. The API body is `{ phone, name, scopes[] }`. The start and end dates on the picture are not in that body: show them disabled and add `// ponytail: dates on screen, send when POST accepts starts_on and ends_on`. Share the returned `share_url` with `share_plus`. There is no step 2.

- [x] **Step 1: Write a unit test** that the scope chip list is exactly the four keys, in the storyboard order view bills, pay, visitors, facilities.

- [x] **Step 2: Run it.** Expected: FAIL.

- [x] **Step 3: Implement A5 and A6.** After a successful invite, pop back to Me or Home, whichever opened the page.

- [x] **Step 4: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

A new phone can request a link, an invited sub-tenant can accept and see only the granted scopes, and an owner can switch units. Google and Apple are not on the screen.
