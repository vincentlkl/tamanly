# F09 · Profile & settings

**Status:** Not started · **Owner:** — · **Depends on:** F00, F01

**Ponytail:** full. G2 reuses `lib/access/scopes.dart` and the sub-tenant API from F01. G3 writes only `push` and `email`. Quiet hours are a local switch stored next to the session, with `// ponytail: device-only until the API has quiet_hours`. Dark mode is the F00 theme toggle. Help is a static FAQ in ARB plus `tel:` / `mailto:` from the directory payload. No CMS.

**Screens:** G1 Me, G2 Properties & roles, G3 Notification prefs, G4 Help.

## Tasks

### T09.1 · Me and properties

**Files:**
- Create: `lib/profile/me_page.dart`, `lib/profile/properties_page.dart`, `lib/profile/edit_page.dart`
- Modify: `lib/router.dart` Me tab
- Test: `test/profile/me_test.dart`

G1: name, phone, email, edit profile, linked properties, sub-tenants (opens F01 A6 for owners), payment methods (opens E4 receipts, not a card vault and not a masked Maybank row), language toggle, notifications row, dark mode switch, help, terms (URL from a const `kTermsUrl`), sign out. The avatar is the first letter of the name. `// ponytail: letter avatar, add an upload when PATCH /me accepts a photo.` Version line uses `lib/version.dart`.

G2: each property with relationship and scopes. Manage access opens the sub-tenant list for units the user owns.

- [ ] **Step 1: Widget test.** Sign out calls `Session.signOut` and the router is on `/welcome`. Language BM calls `PATCH /me` with `locale: ms`. The payment row does not contain a text field.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement G1, G2 and the edit page** (`PATCH /me` with name and email).

- [ ] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T09.2 · Notification prefs and help

**Files:**
- Create: `lib/profile/prefs_page.dart`, `lib/profile/help_page.dart`
- Test: `test/profile/prefs_test.dart`

G3: one switch per category from `GET /notification_preferences`. The category wire values are `visitors`, `bills`, `bookings`, `permits`, `announcements`, `marketplace`, `account` (`lib/enums.dart`). Locked categories are disabled and show the API reason. Save sends `PUT` with the edited list, using the wire string. Quiet hours do not go in that body.

G4: search filters the local FAQ. Chat / call / email use the directory contact for the selected taman. Report an issue is a `mailto:` with the app version in the body.

- [ ] **Step 1: Widget test.** A locked category ignores taps. Saving sends only `category`, `push` and `email`.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement G3 and G4.** FAQ entries live in the ARB files as a short list (visitors, bills, passes, SOS). Ten entries is enough.

- [ ] **Step 4: Run `flutter test` and `flutter analyze`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

Sign out clears the session, EN/BM hits `PATCH /me`, a sub-tenant sees their scopes on G2, and notification saves do not invent quiet-hour fields.
