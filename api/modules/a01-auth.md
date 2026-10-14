# A01 Auth, tokens, me

Build: **Opus, effort high**. Review: **Opus, effort high**.
Endpoints: 10. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| POST | `/api/v1/auth/dev` | [L69](../../storyboard/plans/api.md#L69) |
| POST | `/api/v1/auth/password` | [L70](../../storyboard/plans/api.md#L70) |
| POST | `/api/v1/auth/refresh` | [L71](../../storyboard/plans/api.md#L71) |
| DELETE | `/api/v1/auth/session` | [L72](../../storyboard/plans/api.md#L72) |
| GET | `/api/v1/me` | [L73](../../storyboard/plans/api.md#L73) |
| PATCH | `/api/v1/me` | [L74](../../storyboard/plans/api.md#L74) |
| DELETE | `/api/v1/me` | [L75](../../storyboard/plans/api.md#L75) |
| POST | `/api/v1/auth/password/forgot` | NEW |
| POST | `/api/v1/auth/password/reset` | NEW |
| POST | `/api/v1/auth/invite/accept` | NEW |

## Module tasks
- [x] Migration `refresh_tokens` (user, family_id, token_digest SHA-256, device_uid, expires_at, revoked_at, replaced_by_id); never store raw token
- [x] Settings rows `auth.access_ttl_seconds` 3600, `auth.refresh_ttl_seconds` 5184000, `auth.refresh_reuse_grace_seconds` 10 with validations (see b01)
- [x] Rotation service: new row same family, revoke old; reuse after grace → revoke family; inside grace → 401, family alive
- [x] Disabled user never authenticates; Devise lockable/timing-safe password check
- [x] `/auth/dev` takes `{ email, device_uid }`, mounted ONLY when `Rails.env.development?`; spec asserts 404 in test and production
- [x] Access token = short-lived JWT (HS256, `sub`,`jti`,`fam`,`exp`); refresh token = opaque random, stored only as SHA-256 digest, rotated on every refresh
- [x] Accounts via admin invite: admin creates resident/guard/staff → `user_invitations` row (token digest, 7 d TTL, single use) → email with `tamanly://invite/<token>` + web fallback; `POST /auth/invite/accept { token, password, device_uid }` sets password, confirms email, returns tokens + `me`
- [x] No `phone_unverified` error code; 401 codes are `unauthorized`, `token_expired`, `invalid_credentials`, `account_locked`
- [x] Everyone (residents, guards, staff) signs in with email + password via `POST /auth/password`; no SMS/OTP anywhere
- [x] Lockout: Devise lockable (5 failures → 30 min) + rack-attack 5/min per IP+email on `/auth/password*`; generic error message (no account enumeration)
- [x] Forgot: emails single-use reset token (digest stored, 30 min TTL), always 202
- [x] Reset: `{ token, password }`; on success revoke ALL refresh families for the user
- [x] Logout `DELETE /auth/session` revokes the device family and deactivates the device (`active=false`, `fcm_token=nil`)

- [x] Migration `devices` (user_id, device_uid UNIQUE, fcm_token UNIQUE nullable, platform ios|android, app_version, locale, last_seen_at, active bool, deactivated_at); model `Device`
- [x] `DeviceRegistrar` service: sign-in (`/auth/password`, `/auth/invite/accept`, `/auth/dev`) and `/auth/refresh` accept optional `device: { device_uid, fcm_token, platform, app_version, locale }` and upsert by `device_uid` (reassign to current user if it belonged to another user; if `fcm_token` is on another row, clear it there), set `active=true`, `last_seen_at=now`; falls back to `X-Device-Id` when `device_uid` absent
- [x] Specs: sign-in creates device row; refresh updates token/last_seen_at; same device_uid signing in as another user moves the row; duplicate fcm_token moved, not duplicated

## Per-endpoint checklist

### POST /api/v1/auth/dev
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/auth/password
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/auth/refresh
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/auth/session
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/me
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### PATCH /api/v1/me
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/me
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/auth/password/forgot
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/auth/password/reset
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/auth/invite/accept
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged
