# Tamanly mobile API plan (Rails, `/api/v1`)

Plan only. Source contract: [../storyboard/plans/api.md](../storyboard/plans/api.md). Inventory: [endpoints.yml](endpoints.yml) (90 endpoints). Progress: `ruby progress.rb`.

## Modules (build order)

| # | Module | Endpoints | Build model | Review |
|---|---|---|---|---|
| A00 | [Foundation](modules/a00-foundation.md) | 0 (tasks) | Opus high | Opus high |
| A01 | [Auth, tokens, me](modules/a01-auth.md) | 10 | Opus high | Opus high |
| A02 | [Properties, invites, directory](modules/a02-properties.md) | 12 | Sonnet high | Opus high |
| A03 | [Home feed](modules/a03-home.md) | 2 | Sonnet high | Opus high |
| A04 | [Visitors, SOS](modules/a04-visitors.md) | 7 | Opus high | Opus high |
| A05 | [Guard](modules/a05-guard.md) | 18 | Opus high | Opus high |
| A06 | [Permits](modules/a06-permits.md) | 10 | Grok grok-4.7 xhigh | Sonnet high |
| A07 | [Billing, payments](modules/a07-billing.md) | 9 | Haiku high | Opus high |
| A08 | [Facilities, bookings](modules/a08-facilities.md) | 7 | Haiku high | Sonnet high |
| A09 | [Marketplace](modules/a09-marketplace.md) | 8 | Haiku high | Sonnet high |
| A10 | [Devices, notifications](modules/a10-notifications.md) | 7 | Haiku high | Sonnet high |
| A11 | Guard (permit show/deny, gate CSV) | 3 | Haiku high | Sonnet high |
| A12 | Billing + permits (statement PDF, access requests, refund account) | 3 | Haiku high | Sonnet high |
| A13 | Incidents + marketplace (resident incidents, listing photos) | 2 | Haiku high | Sonnet high |

## Decisions locked

1. **Everyone (residents, guards, staff) signs in with email + password**: `POST /api/v1/auth/password`. No SMS, no phone OTP, no Firebase Auth (Firebase Cloud Messaging for push stays).
2. Accounts are created by **admin invite only** (no self-signup). Admin invites a resident, guard or staff member by email, which creates a single-use `user_invitations` token (stored as a digest, 7 d). The email link opens the app, which calls `POST /auth/invite/accept { token, password, device_uid }` to set the password and sign in. Sub-tenant invites (A02) send the same email link and take email instead of phone.
2b. Password reset by email: `POST /auth/password/forgot`, `POST /auth/password/reset` (new, not in api.md). Reset revokes all refresh families.
3. Lockout + throttling: Devise lockable and rack-attack on `/auth/*`. Error messages are generic.
4. Access token: short-lived JWT (HS256), TTL `auth.access_ttl_seconds` = 3600. Refresh token: opaque, stored as a SHA-256 digest, TTL `auth.refresh_ttl_seconds` = 5184000 (60 d). Every refresh rotates the token. Reuse inside `auth.refresh_reuse_grace_seconds` (10 s) gets 401 and the family stays alive. Reuse after the grace window revokes the whole family. A revoked family kills its access tokens.
5. Authorization: `X-Unit-Id` sets the unit, the occupancy relationship gives the scopes (`bills_view`, `bills_pay`, `visitor_passes`, `facility_booking`), and guard/staff routes need an active membership. Pundit is used.
6. `Idempotency-Key` is required on POST payments, bookings, visitor passes, permits, listings and link_requests.
7. Required headers: Authorization, Accept-Language (en/ms), X-App-Version (426 when below the minimum), X-Device-Id, X-Unit-Id (on unit routes).
8. Rate limiting: rack-attack, 429 `rate_limited`.
9. Swagger: rswag, mounted **only in development** (`if Rails.env.development?` plus a route constraint). A spec asserts `/api-docs` is 404 outside development.
10. `/auth/dev { email, device_uid }` is mounted in **development only**. A spec asserts 404 in test and production. The `phone_unverified` error code is dropped.
11. Tests: rspec-rails + rswag request specs run **alongside** the existing minitest suite. Both run in CI.
12. Billplz webhook `POST /webhooks/payments/billplz/:payout_account_id` counts as an endpoint (A07). It verifies the signature and is idempotent.
13. **Push device tokens:** sign-in and `/auth/refresh` accept optional `device {device_uid, fcm_token, platform, app_version, locale}` and upsert a `devices` row (unique device_uid; fcm_token moves to the newest owner; last_seen_at). `PUT /devices/current` refreshes the token, logout deactivates it, FCM-invalid tokens are pruned on send. Admin broadcast = blast push via FCM HTTP v1 in a background job, batched (500), to all active tokens of the audience (property/role). Tasks in A01 + A10.
14. Not in api.md yet: forgot, reset, invite/accept, webhook. api.md cleanup is proposed in `proposed_sms_cleanup.diff`.
15. **Account lockout** (approved 2026-10-14): after 5 failed sign-ins, new sign-ins are blocked but existing sessions/refresh families are kept (so a stranger cannot sign someone out with bad guesses). `account_locked` is only shown when the correct password is given. Password reset unlocks and revokes all sessions.
16. **Link-request proof is optional** (approved 2026-10-14); staff verify the link request in admin.
17. **Notice audience fail-closed:** an announcement whose free-text audience is not recognised ("All", "Owners only", or other known values) is hidden from residents until structured targeting (M09) exists.
18. **Scheduled notices** are published by a Solid Queue recurring job (scheduled + publish_at <= now -> sent). Task A03-F1.
19. **Expired sub-tenant invites** do not block re-inviting the same person (expired/revoked/declined are ignored by the duplicate check). Task A02-F1.
20. **Ended host tenancy blocks invite acceptance:** accepting a sub-tenant invite fails if the host is no longer an active occupant (including tenancy past its end date). Task A02-F2.
21. **Deploy note:** cap request body size at the proxy (e.g. nginx/Kamal proxy `client_max_body_size 12m`) so huge uploads are rejected before Rails buffers them.
22. **Lapsed tenancies** are ended by a nightly Solid Queue job (Ending + end date passed in Asia/Kuala_Lumpur -> EndOccupancy, which ends sub-tenants and their invites). Task A02-F4.

## Model / effort policy

- Opus, effort high: A00, A01, A04, A05, A07 (security, tokens, money, gate), and **every review pass**.
- **From 2026-10-14 (A04 follow-ups onward):** builds by Grok grok-4.7, effort high (`runs/run_grok.sh`); **all reviews by Claude Opus, effort high** (`runs/run_claude.sh`). Commit only after the Opus review and green tests.
- **From A05 review onward (2026-10-14):** builds by Grok grok-4.7 at its top effort `xhigh`; reviews by Claude Opus at `--effort high` (Vincent lowered from max on 2026-10-14). Prompts require short, clean, idiomatic Rails (no duplication, small methods, reuse concerns/services, no dead code or over-engineering); reviewers simplify/refactor without losing behaviour or tests.
- Sonnet, effort high: routine CRUD (A02, A03, A06, A08, A09, A10).
- **From 2026-10-14 3:54 PM (Grok credit running out):** builds A07 through A10 by Claude Haiku, effort high (`runs/run_claude.sh`, model `haiku`). Reviews by Claude Sonnet, effort high, for A06, A08, A09, A10; A07 (billing/payments) reviewed by Claude Opus, effort high. Same short/clean code rules apply.

## Running Claude Code

```bash
cd /Users/vincent/work/ror/apps/vincent/tamanly/tamanly_backend
screen -dmS api_A01 bash -lc '/Users/vincent/.local/bin/claude -p "Build module A01 per ../plan/api/modules/a01-auth.md. Tick each checkbox as done and set status in ../plan/api/endpoints.yml. Stop at the review pass." \
  --model opus --effort high --output-format json > /tmp/A01_build.json'
ruby ../plan/api/log_run.rb /tmp/A01_build.json A01 "build" build opus high
ruby ../plan/api/progress.rb
```

Review: run the same command with a prompt like "Review module A01 against its checklist and api.md; fix issues; set status reviewed", using `--model opus`, role `review`.

**Resume after a limit:** the checkboxes and `endpoints.yml` are the source of truth. Take `session_id` from usage_log.csv and run `claude -p --resume <session_id> "continue from the first unchecked box"`, or start fresh with the same prompt. Claude picks up at the first `- [ ]`.

`gen.rb` regenerates endpoints.yml and the module files from api.md. Running it **overwrites status and ticks**, so only use it before work begins.
