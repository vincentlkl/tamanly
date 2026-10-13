# API catalog for the Tamanly mobile app

The Flutter app calls these routes and no others. The Rails app already plans them under `/api/v1` (see `plan/docs/superpowers/plans/2026-10-04-tamanly-platform/modules/`). This file is the list the backend must implement for the app to ship. **B01** is the only new backend behaviour: token lifetimes move from constants to settings.

## Conventions

- Base: `/api/v1`. JSON, snake_case.
- Success: `{ "data": ... }` or `{ "data": [...], "meta": { "next_cursor": "...", "limit": 25 } }`.
- Error: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
- Times: ISO 8601 with offset (`2026-10-03T10:42:00+08:00`). Dates: `2026-10-15`.
- Money: `{ "cents": 105000, "formatted": "RM 1,050.00" }`. Integer sen. Never a float.
- Cursor pagination on list endpoints. The app sends `?cursor=` from `meta.next_cursor`.

### Closed values

JSON stays the snake_case string. The app parses each set below as a plain Dart enum in `lib/enums.dart`. One file. Unknown wire values become `unknown` and sort last. They do not throw. The server stores the same strings as Rails enums (ADR-014), except the rows marked "list" or "derived".

| Name | Wire values | Notes |
|---|---|---|
| `relationship` | `owner` / `tenant` / `sub_tenant` | Link requests send only `owner` or `tenant` |
| `scope` | `bills_view` / `bills_pay` / `visitor_passes` / `facility_booking` | A list of these values. Not one column |
| `locale` | `en` / `ms` | |
| `mode` | `resident` / `guard` / `staff` | Derived on `me`. Not a stored column |
| `directory category` | `management` / `security` / `maintenance` / `utilities` / `health` / `education` / `worship` / `transport` / `other` | B1 groups by this |
| `visitor pass kind` | `guest` / `delivery` / `ehailing` / `service` / `walkin` | C2 `kind` |
| `price_kind` | `fixed` / `free` / `ask` | B4. `free` and `ask` send a null `price_cents`. No condition or visibility field |
| payable `type` | `invoice` / `permit` / `booking` | Body of `POST /payments`. Not a column |
| `method` | `online` / `bank_transfer` | What the app sends. Admin also has `cash` and `cheque` |
| transfer `purpose` | `default` / `sinking_fund` | Query on transfer instructions. Server routes also have `deposits` |
| pass and booking filter | `upcoming` / `past` | Query param. Not the stored status |
| invoice filter | `open` / `paid` | Query param. Not the stored status |
| `platform` | `ios` / `android` | Device registration |
| preference `category` | `visitors` / `bills` / `bookings` / `permits` / `announcements` / `marketplace` / `account` | G3 |

Permit status order stays the label list in the README. Map the API snake_case status onto that order in the same file.

### Headers

| Header | When |
|---|---|
| `Authorization: Bearer <access_token>` | Every route except `POST /auth/*` |
| `Accept-Language: en` or `ms` | Always |
| `X-App-Version: 1.0.0` | Always. Below `Setting.min_app_version` the API returns `426 upgrade_required` |
| `X-Device-Id: <uuid>` | Always. Stable per install |
| `X-Unit-Id: <unit uuid>` | Unit-scoped routes. Missing → `422 unit_required` |
| `Idempotency-Key: <uuid>` | `POST` payments, bookings, visitor passes, permits, listings |

### Error codes the app handles

| HTTP | `code` | App behaviour |
|---|---|---|
| 401 | `token_expired` | One refresh, retry the call once |
| 401 | `unauthorized` | Sign out |
| 401 | `phone_unverified` | Stay on the sign-in screen, show `message` |
| 403 | `forbidden`, `scope_missing` | Show `message`. Hide the action next time via scopes |
| 404 | `not_found` | Show `message`. Do not show the id |
| 409 | `conflict`, `slot_taken`, `idempotency_conflict`, `invalid_transition` | Show `message` |
| 422 | `validation_failed` | Field errors from `details` |
| 422 | `unit_required` | Open the property switcher |
| 426 | `upgrade_required` | Blocking screen, store link |
| 429 | `rate_limited` | Show `message`, no auto-retry storm |
| 502 | `payment_provider_error` | Show `message`, keep the idempotency key |

## Auth and profile

| Method | Path | Body | Screen |
|---|---|---|---|
| POST | `/api/v1/auth/firebase` | `{ id_token, device_uid }` | A2 phone OTP. Returns tokens + `me` |
| POST | `/api/v1/auth/dev` | `{ phone, device_uid }` | Local and test only. Route absent in production |
| POST | `/api/v1/auth/password` | `{ email, password, device_uid }` | Staff email sign-in |
| POST | `/api/v1/auth/refresh` | `{ refresh_token }` | Rotation. Returns a new pair. Old refresh dies |
| DELETE | `/api/v1/auth/session` | | Sign out this device. 204 |
| GET | `/api/v1/me` | | Profile, `modes`, `properties`, `unread_notifications` |
| PATCH | `/api/v1/me` | `{ name, email, locale }` | G1 edit profile, language |
| DELETE | `/api/v1/me` | | Account deletion request |

Token payload (sign-in and refresh):

```json
{ "data": { "access_token": "...", "refresh_token": "...", "expires_in": 3600, "me": { } } }
```

`expires_in` is seconds, copied from `auth.access_ttl_seconds` at the moment of issue. The app must not assume 3600.

`me`:

```json
{
  "id": "uuid",
  "name": "Nurul Aisyah binti Rahman",
  "phone": "+60123450001",
  "email": null,
  "locale": "en",
  "profile_complete": true,
  "modes": ["resident", "guard"],
  "staff": [{ "organization": { "id": "uuid", "name": "..." }, "role": "guard", "tamans": [{ "id": "uuid", "name": "Taman Desa Harmoni" }] }],
  "properties": [],
  "unread_notifications": 0
}
```

`modes`: `resident` if any active occupancy, `guard` if an active guard membership, `staff` if another active staff membership. Empty `modes` and `profile_complete: false` send the user to A3.

Rotation rules the backend enforces (opaque tokens, SHA-256 digests, not JWT):

- Refresh writes a new row in the same `family_id`, revokes the old row, and the old access token stops working.
- Presenting a revoked refresh token more than `auth.refresh_reuse_grace_seconds` after rotation revokes the whole family.
- Presenting it inside the grace window returns 401 and leaves the family alive (two refreshes in flight).
- A disabled user does not authenticate.

### Token settings (backend only, B01)

No mobile route. Three rows in the existing `settings` table, edited on the admin settings screen:

| Key | Default |
|---|---|
| `auth.access_ttl_seconds` | 3600 |
| `auth.refresh_ttl_seconds` | 5184000 |
| `auth.refresh_reuse_grace_seconds` | 10 |

Reject non-integers, access TTL below 60 seconds, refresh TTL below access TTL, grace below 0 or above 120. See [modules/b01-token-rotation.md](modules/b01-token-rotation.md).

## Properties, invites, directory

Owner and tenant hold every occupant scope. Sub-tenant `scopes` are a subset of `bills_view`, `bills_pay`, `visitor_passes`, `facility_booking`.

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/properties` | A5, H0 switcher. Unit, taman, relationship, scopes |
| GET | `/api/v1/tamans?q=` | A4. Name and city only. `q` at least 3 characters |
| GET | `/api/v1/invites` | A7 |
| POST | `/api/v1/invites/:id/accept` | A7 |
| POST | `/api/v1/invites/:id/decline` | A7 |
| GET | `/api/v1/link_requests` | A4 status |
| POST | `/api/v1/link_requests` | A4. Multipart `proof`. Idempotent |
| GET | `/api/v1/units/:unit_id/sub_tenants` | A6, G2 |
| POST | `/api/v1/units/:unit_id/sub_tenants` | A6. `{ phone, name, scopes[] }` → invite + `share_url` |
| PATCH | `/api/v1/units/:unit_id/sub_tenants/:id` | G2 scopes |
| DELETE | `/api/v1/units/:unit_id/sub_tenants/:id` | Revoke |
| GET | `/api/v1/directory` | B1. Needs `X-Unit-Id` |

## Home feed

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/feed` | H0. `{ alerts, announcements }`. Needs `X-Unit-Id` |
| GET | `/api/v1/announcements/:id` | Announcement detail. Marks read |

The bill card on H0 comes from `GET /api/v1/billing/summary`, not from the feed.

## Visitors, SOS, guard

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/visitor_passes?status=upcoming\|past` | C1. Scope `visitor_passes` |
| POST | `/api/v1/visitor_passes` | C2. Idempotent |
| GET | `/api/v1/visitor_passes/:id` | C3. `qr_payload` (`tamanly://pass/<token>`), `code`, `share_url` |
| DELETE | `/api/v1/visitor_passes/:id` | C3 cancel |
| POST | `/api/v1/walkin_requests/:id/reply` | `{ approve: true\|false }` from a push action |
| GET | `/api/v1/emergency_contacts` | C4 |
| POST | `/api/v1/sos` | C4. `{ message, lat, lng }` |
| GET | `/api/v1/guard/home` | C5 |
| POST | `/api/v1/guard/checks` | C6. `{ code, station_id }` → verdict |
| POST | `/api/v1/guard/visitor_passes/:id/admit` | C7 |
| POST | `/api/v1/guard/visitor_passes/:id/deny` | C7. Body includes the reason |
| POST | `/api/v1/guard/visitor_passes/:id/check_out` | Log exit |
| GET | `/api/v1/guard/arrivals` | C5 arriving next. KL date |
| GET | `/api/v1/guard/gate_events` | C9 |
| GET | `/api/v1/guard/units?q=` | Walk-in lookup. Unit name and first names only |
| POST | `/api/v1/guard/units/:id/call` | Returns host phone. Audited |
| POST | `/api/v1/guard/walkins` | Walk-in |
| GET | `/api/v1/guard/walkins/:id` | |
| POST | `/api/v1/guard/deliveries` | |
| POST | `/api/v1/guard/incidents` | |
| POST | `/api/v1/guard/shift_notes` | |
| POST | `/api/v1/guard/sos/:id/acknowledge` | |
| GET | `/api/v1/guard/permits/today` | C5 contractors, C8 |
| POST | `/api/v1/guard/permits/:id/admit` | `{ station_id, workers_in, plates }` |
| POST | `/api/v1/guard/permits/:id/exit` | |

## Permits

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/permit_types` | D2. Deposit, fee, max days, max workers, required documents, hours |
| GET | `/api/v1/permits` | D1 |
| GET | `/api/v1/permits/:id` | D5. Timeline, documents, charges, `next_action` |
| POST | `/api/v1/permits` | D3. Multipart. Idempotent |
| PATCH | `/api/v1/permits/:id/documents/:doc_id` | Resubmit one file |
| POST | `/api/v1/permits/:id/withdraw` | Before approved |
| GET | `/api/v1/permits/:id/pass` | D6. `qr_payload`, hours, worker cap, plates, `share_url` |
| POST | `/api/v1/permits/:id/completion` | D7. Notes and photos |
| GET | `/api/v1/permits/:id/refund` | D7 refund status |
| POST | `/api/v1/permits/:id/notices/:notice_id/acknowledge` | |

Deposit and fee payment uses `POST /api/v1/payments` with payable type `permit`.

## Billing

All need `X-Unit-Id` except the summary, which covers every unit the user may see.

| Method | Path | Scope | Screen |
|---|---|---|---|
| GET | `/api/v1/billing/summary` | any visible unit | E1, H0 card |
| GET | `/api/v1/invoices?status=open\|paid` | `bills_view` | E1 |
| GET | `/api/v1/invoices/:id` | `bills_view` | E2. Includes `can_pay` |
| POST | `/api/v1/payments` | `bills_pay` | E2, D4. Idempotent |
| GET | `/api/v1/payments/:id` | payer | E3. Poll after the gateway |
| GET | `/api/v1/receipts` | `bills_view` | E4 |
| GET | `/api/v1/receipts/:id/pdf` | `bills_view` | E4 PDF |
| GET | `/api/v1/billing/transfer_instructions?purpose=default\|sinking_fund` | `bills_pay` | Bank transfer details |

`POST /api/v1/payments`:

```json
{ "payables": [{ "type": "invoice", "id": "uuid" }], "method": "online" }
```

`type` is `invoice`, `permit`, or `booking`. `method` is `online` or `bank_transfer`. Bank transfer is multipart with `receipt_slip`. The online response includes the Billplz URL. The gateway returns to `tamanly://payments/<id>`.

Webhook (backend, not called by the app): `POST /webhooks/payments/billplz/:payout_account_id`.

## Facilities

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/facilities` | F1. Bookable and listed-only (pool, gym) with hours |
| GET | `/api/v1/facilities/:id` | Rules in plain words |
| GET | `/api/v1/facilities/:id/availability?date=2026-10-10` | F2. Slots: available, booked |
| POST | `/api/v1/bookings` | F2. Idempotent. May return `payment_required` |
| GET | `/api/v1/bookings?status=upcoming\|past` | F3 |
| GET | `/api/v1/bookings/:id` | |
| POST | `/api/v1/bookings/:id/cancel` | F3 |

Scope: `facility_booking`. A taken slot returns `409 slot_taken`.

## Marketplace

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/market/categories` | B2 |
| GET | `/api/v1/listings?q=&category_id=&mine=true` | B2 |
| GET | `/api/v1/listings/:id` | B3. Seller first name, `contact_url` (`https://wa.me/...`) |
| POST | `/api/v1/listings` | B4. Multipart. Idempotent |
| PATCH | `/api/v1/listings/:id` | Edit own listing |
| POST | `/api/v1/listings/:id/sold` | |
| DELETE | `/api/v1/listings/:id` | Withdraw |
| POST | `/api/v1/listings/:id/reports` | Report |

## Notifications

| Method | Path | Screen |
|---|---|---|
| PUT | `/api/v1/devices/current` | `{ fcm_token, platform, app_version, os_version }` for `X-Device-Id` |
| DELETE | `/api/v1/devices/current` | Push turned off |
| GET | `/api/v1/notifications?unread=true` | B5 |
| POST | `/api/v1/notifications/:id/read` | |
| POST | `/api/v1/notifications/read_all` | |
| GET | `/api/v1/notification_preferences` | G3. `push` / `email`, locked events |
| PUT | `/api/v1/notification_preferences` | `{ preferences: [{ category, push, email }] }` |

Push data includes a `deep_link` (`tamanly://...`). The app routes with the same parser as in-app taps. Sign-out clears the FCM token for that device.

## Not endpoints

These storyboard controls stay in the app or in a human setup. Do not add routes for them unless a later decision says so.

| Screen control | What happens |
|---|---|
| A2 Google, Apple, resident password, Remember me, Forgot password | Not in v1. Staff ask the office |
| A6 Permits and Marketplace rows, contact picker, access dates | Rows can show locked. The POST body is phone, name, scopes only |
| E2 bank grid, DuitNow, card, auto-pay | Billplz hosted page. The app sends `method: online` or `bank_transfer` |
| G1 photo and masked card row | Letter avatar. Payment row opens receipts |
| G1 dark mode | Device setting |
| G3 quiet hours, SMS channel | Device until the preferences payload grows those fields |
| H0 search | Filter the loaded feed |
| C5 boom-gate Override | `tel:` of the station |
| B6 lock-screen push | FCM. Setup is [manual.md](manual.md) |
| WhatsApp chat | `url_launcher` on `share_url` or `contact_url` |
