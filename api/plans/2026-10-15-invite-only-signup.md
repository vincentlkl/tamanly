# Invite-only Sign-up — Plan (P01)

> **For agentic workers:** use superpowers:executing-plans; tick `- [ ]` boxes as you go. Invoke `ponytail:ponytail` (full) first. This plan is mostly **docs/design**: the API already supports invite-only. No new endpoint is planned.

**Goal:** Remove every "Create account" path from the design and the Flutter guides. Accounts exist only because an admin (or a host, for a sub-tenant) invited an email. The emailed link `tamanly://invite/<token>` opens a **Set password** screen, which calls `POST /auth/invite/accept` and signs the person in. Forgot/reset password works by email the same way.

**Architecture (already built, verified 2026-10-15 on `feature/mobile-api`):**
- **Routes:** `tamanly_backend/config/routes.rb:45-48`: `POST auth/password`, `auth/password/forgot`, `auth/password/reset`, `auth/invite/accept`. `:31` `GET /invite` (web fallback page, `app/views/home/invite.html.erb`, button to `tamanly://invite/<token>`). There is no signup route, and `/users` is not in `api/v1`.
- **Controller:** `app/controllers/api/v1/auth_controller.rb`. `accept_invite` uses `UserInvitation.find_pending`, then `accept!(password:)`, then `start_session` (it returns the same `{access_token, refresh_token, expires_in, me}` as sign-in). `forgot` always returns 202. `reset` returns 204, unlocks the account and ends every session.
- **Token model:** `app/models/user_invitation.rb`. It is single use, lasts 7 days and stores a SHA-256 digest. `send_to!` deletes older pending invites and mails `AuthMailer#invitation` (`tamanly://invite/<token>` + `invite_url`). `accept!` sets the password, confirms the email, marks the user `Active` and **activates every `invited` occupancy**.
- **Who sends it:**
  - `Identity::InviteUser` (admin Users page, staff and guards);
  - `Properties::AssignOccupant` (admin Occupants page, and `POST /units/:unit_id/sub_tenants` with `require_acceptance: true`). It sends the email only when the user is new or still `Invited`.
  - Resend: `Admin::UsersController` (`to == "Resend"`).
- **Reset mail:** `app/views/devise/mailer/reset_password_instructions.html.erb` links `tamanly://reset/<token>`.
- **Sub-tenant invite of an existing account:** no email token. It shows up in `GET /invites` (`InvitesController#index`, `InviteSerializer`) → A7 accept/decline.

## Decisions (locked, Vincent 2026-10-15)

| # | Decision |
|---|---|
| D1 | **No self sign-up.** No "Create account" button, link or route anywhere in the design, the guides or the app. The backend stays as it is (no signup endpoint). |
| D2 | **Only ways in:** (a) sign in with email + password (A2), (b) the invite link → Set password (A8), (c) the reset link → New password (A2c). Dev sign-in `{email}` is for development only. |
| D3 | **One kind of "invite code": the emailed `UserInvitation` token**, carried by `tamanly://invite/<token>` or by `https://…/invite?token=`. Nobody types it. The Set-password screen also has a "Paste invite link" field, which pulls out the token on the client, for mail apps that break custom schemes. |
| D4 | **Sub-tenant invite ≠ code.** A host invites by email (`{email,name,scopes}`). A new person gets the D3 email (accepting it activates the occupancy, so A7 is skipped). An existing account sees it under `GET /invites` → A7. **Typed codes like `TMN-8KD2-Q7` are dropped.** `GET /invites?code=` is **not** built. |
| D5 | **A3 "Choose role" is deleted.** Roles come from `me.modes` (resident / guard / staff), which the invite set. `me.profile_complete` is `name.present?` and the invite always sets a name. |
| D6 | **A4 "Link property"** keeps only "Find your taman" (`POST /link_requests`). It is opened from A5 "Link another property" and from the no-access screen, never from onboarding. |
| D7 | **Signed in with no modes** (the person declined every invite, or the tenancy ended) → `/invites` (A7), with an empty state: "No property yet", **Find your taman** (A4) and **Sign out**. |
| D8 | **Invite expired or used:** `422 validation_failed` with `details.token`. The screen says "This link has expired. Ask your management office to send a new one" and links to A2. No resend API (admins resend from the console). |
| D9 | No SMS or phone OTP anywhere (README decision 1). `phone_auth.dart` and `firebase_auth` go; `firebase_core` stays for FCM. |

## Global Constraints

- PLAN/DOCS edits only, unless a task says otherwise. Don't change backend behaviour. Never push. Commit only when Vincent asks.
- API contract = `plan/api/endpoints.yml` + `tamanly_backend/swagger/v1/swagger.yaml`. Both already list forgot/reset/invite accept (`endpoints.yml:523-539`). No new rows.
- Backend conventions: `tamanly_backend/docs/AGENT_CONVENTIONS.md` (UUID PKs, `*_cents`, services, tenant = taman). They don't apply here, because there is no backend change.
- Screens: the source of truth is `plan/storyboard/refined/_src/gen.py`. The HTML/PNG are generated and `tamanly_app/docs/storyboard/` is a copy, so edit the source and regenerate both.

## File map

| File | Change |
|---|---|
| `plan/storyboard/refined/_src/gen.py` | A1 CTA; delete `S['A3']`; A4 drops the invite-code card; add A2b, A2c, A8 |
| `plan/storyboard/index.html` (`FLOWS` "access", ~l.125-143) | rewrite the `seq` (Task 1) |
| `plan/storyboard/refined/{A1,A3,A4}.html/.png` | regenerated; A3 files deleted |
| `tamanly_app/docs/storyboard/{index.html,refined/…}` | the same, copied |
| `tamanly_app/docs/storyboard/plans/modules/f01-access.md:20` | drop "link to create account" and the phone field |
| `tamanly_app/docs/plans/mobile-app/00-index.md` | rows 48, 72, 108, 135 (X5), 176, 199, 292 |
| `tamanly_app/docs/plans/mobile-app/01-foundation.md` | M8 deep links, `_signedOutPaths` (~l.1475), `routeForDeepLink` (~l.1439), smoke check l.1786 |
| `tamanly_app/docs/plans/mobile-app/02-access.md` | goal, screen list, M3–M8, M14, l10n (l.380), l.867, checks l.1556, file map |

## Tasks

### Task 1: Storyboard (design)

- [ ] **A1 Welcome** (`gen.py:51`): the primary button becomes **Sign in** (→ A2). Replace "Already have an account? Sign in" with the muted line "New here? Your management office will email you an invite."
- [ ] **A2 Sign in** (`sign_in.html`): keep email, password and **Forgot password?**. Remove any "Create account" or "Sign up" link. Remove Google/Apple if they are still drawn (not built).
- [ ] **Delete A3** (`gen.py:55` `S['A3']`, `refined/A3.html`, `A3.png`). Remove the "Invite code" chip text with it.
- [ ] **A4**: remove the "I have an invite code" card and the `TMN-8KD2-Q7` field. Keep "Find your taman" (search + unit + note). The header becomes "Link a property", with no 3/3 stepper.
- [ ] **Add A8 Set password** (from the invite link): title "Set your password" (no name or email: the token is opaque until accepted); password + confirm fields; a "Paste invite link" disclosure; **Set password & sign in**; and an expired-link state (D8).
- [ ] **Add A2b Forgot password** (email → "If an account exists, we've emailed a link") and **A2c New password** (from `tamanly://reset/<token>`: password + confirm → "Password changed. Sign in again." → A2).
- [ ] **FLOWS "access"** (`index.html`), new `seq`: `A1 → (Sign in) A2 → H0` `|` `Invite email → A8 Set password → H0` `|` `A2 → (Forgot) A2b → reset email → A2c → A2` `|` `H0 → A5 switcher → (Link another) A4` `|` `A6 → (Email invite) A7`. Keep the `desc` line (it is already invite-only).
- [ ] Regenerate the PNGs, copy them to `tamanly_app/docs/storyboard/`, and check that a grep finds no "Create account" or "Invite code" in either tree.

### Task 2: 00-index.md

- [ ] Row 48 / 176: A-flow = A1 Welcome, A2 Sign in (+A2b forgot, A2c new password), A4 Link property, A5 Switcher, A6 Invite sub-tenant, A7 Accept invite, **A8 Set password**. Remove A3.
- [ ] Row 72: remove `role_page`, `phone_auth.dart`; add `set_password_page`, `forgot_page`, `reset_page`.
- [ ] X5 (l.135): rewrite it as email + password for everyone (`auth.password`). `Session.acceptInvite(token,password)`, `Session.forgot(email)`, `Session.reset(token,password)`. Deep links `tamanly://invite/<t>` and `tamanly://reset/<t>` work signed out. Remove `firebase_auth`, `auth.firebase` and phone dev sign-in; dev sign-in takes `{email}`.
- [ ] l.199: Forgot password is **built**. Google/Apple stay out of scope. Remove the "resident passwords not built" note.
- [ ] l.108 / l.292: the app opens on A1 with **Sign in**. Test accounts use email (Tan Mei Ling → her seed email, not a phone).
- [ ] Open questions: remove A1/A3 "Create account" (decided by D1).

### Task 3: 01-foundation.md

- [ ] `_signedOutPaths` = `{'/welcome','/sign-in','/forgot','/reset','/set-password'}`.
- [ ] `routeForDeepLink`: `invite/<t>` → `/set-password?token=<t>` and `reset/<t>` → `/reset?token=<t>`. These two are applied **even when signed out**; every other link still drops when signed out (M8). If someone is signed in and opens an invite link, sign them out first, then open A8 (one account per device).
- [ ] Add the cases to the `routeForDeepLink` test table (l.1371). Also add a redirect test: signed out + `tamanly://invite/abc` → `/set-password?token=abc`.
- [ ] Error table: `invalid_credentials` / `account_locked` (401) show the server message on A2 without clearing anything. `validation_failed` with `details.token` → the D8 copy.
- [ ] Smoke check l.1786: "opens on Welcome (A1) with a Sign in button and no Create account".

### Task 4: 02-access.md

- [ ] Goal and screens: list A1, A2, A2b, A2c, A4, A5, A6, A7, A8, linked to `refined/<code>.png` (A2 = `sign_in.png`). Delete A3 and the phone flow (l.45).
- [ ] **A1**: one Sign in button and the invite hint. Remove the `accessCreateAccount` / `createAccount` l10n keys (guide l.380; app `lib/l10n/app_{en,ms}.arb:19`) and the l.867 note.
- [ ] **A2**: single email form (no Phone/Email tabs). `auth.password`, then a **Forgot password?** link to `/forgot`.
- [ ] **A2b** `ForgotPage`: `POST /auth/password/forgot {email}` → always shows the same "check your email" message (202).
- [ ] **A2c** `ResetPage`: `POST /auth/password/reset {token,password}` → 204 → snackbar → `/sign-in`. A `422 details.password` is shown under the field.
- [ ] **A8** `SetPasswordPage`: `POST /auth/invite/accept {token,password,device_uid,device}` → session saved like sign-in → `/home` (or `/guard` when guard-only). "Paste invite link" parses the `invite/<t>` path or the `?token=` query.
- [ ] **M6 / A3**: delete `role_page.dart` and its test. The router's setup redirect (`lib/router.dart:68-76`) sends `modes.isEmpty` → `/invites` (D7) instead of `/role`.
- [ ] **M7 / M8 / M14**: remove the invite code lookup and `invites.index?code=`. A4 = link request only. A7 = `GET /invites` + accept/decline (decline returns `200 {status:"declined"}`, a stale invite returns `409 invalid_transition`). Add the D7 empty state.
- [ ] **A6**: body `{email,name,scopes}`, and the success copy is "Invite emailed". Remove phone and dates.
- [ ] Logging rule (l.16): "Don't log tokens or invite links".
- [ ] File map: add `set_password_page.dart`, `forgot_page.dart`, `reset_page.dart` and their tests. Delete `phone_auth.dart`, `role_page.dart` and `test/access/role_test.dart`.
- [ ] Manual checks (l.1556): A1 has no Create account. Open `tamanly://invite/<seed token>` cold → A8 → Home. Reset link → A2c → A2.

### Task 5: Verify

- [ ] Run `grep -rniI "create account\|create an account\|invite code\|?code=\|phone_auth\|auth/firebase" plan/storyboard tamanly_app/docs`. Expect no hits outside the superseded `2026-10-11-mobile-api.md` (its banner is another chunk's job).
- [ ] Get a dev invite token from a console: `UserInvitation.send_to!(User.find_by(email: …), by: nil)` returns the raw token (development only, never seeds). Then smoke the A8 flow against `POST /auth/invite/accept`.

## API gaps

None. The rswag specs already cover the four auth routes (`spec/requests/api/v1/auth_spec.rb`), and invites are covered in `invites_spec.rb` and `sub_tenants_spec.rb`. Skipped: `GET /invites?code=` (D4) and an app-side "resend invite" endpoint (D8, the admin console already has Resend). Add them only if a typed code or self-service resend comes back as a requirement.

## Open questions

None blocking. One small note for Vincent: A8 can't show the invitee's email before acceptance, because the token is opaque and `accept_invite` returns `me` only afterwards. If the design wants "Setting a password for nurul@…", that needs a `GET /auth/invite/:token` peek. It is skipped by default.
