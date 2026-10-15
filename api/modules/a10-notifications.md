# A10 Devices, notifications, preferences

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 7. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| PUT | `/api/v1/devices/current` | [L254](../../storyboard/plans/api.md#L254) |
| DELETE | `/api/v1/devices/current` | [L255](../../storyboard/plans/api.md#L255) |
| GET | `/api/v1/notifications?unread=true` | [L256](../../storyboard/plans/api.md#L256) |
| POST | `/api/v1/notifications/:id/read` | [L257](../../storyboard/plans/api.md#L257) |
| POST | `/api/v1/notifications/read_all` | [L258](../../storyboard/plans/api.md#L258) |
| GET | `/api/v1/notification_preferences` | [L259](../../storyboard/plans/api.md#L259) |
| PUT | `/api/v1/notification_preferences` | [L260](../../storyboard/plans/api.md#L260) |


## Module tasks
- [x] `PUT /devices/current` (alias `POST /devices` accepted) upserts the same `devices` row via `DeviceRegistrar` (token refresh from FCM `onTokenRefresh`); `DELETE /devices/current` deactivates it
- [x] `PushSender` (Firebase Cloud Messaging HTTP v1, service-account OAuth via `googleauth`, creds from Rails credentials; no legacy server key); stubbed in test
- [x] Prune invalid tokens on send: FCM `UNREGISTERED` / `INVALID_ARGUMENT` (404/400) → `fcm_token=nil, active=false`
- [x] Blast push: admin broadcast (admin dashboard) → `BroadcastPushJob` (ActiveJob, background) sends to all audience users (batches of 500); each user gets in-app notification; FCM pushes only when notification_preferences.push ≠ false; retries with backoff on 429/5xx, records sent/failed counts on the broadcast
- [x] Each push creates an in-app `notifications` row per user regardless of push preference (feeds `GET /notifications`)
- [x] Specs: audience filtering, batching, pruning, inactive devices skipped

## Per-endpoint checklist

### PUT /api/v1/devices/current
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/devices/current
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/notifications?unread=true
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/notifications/:id/read
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/notifications/read_all
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/notification_preferences
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### PUT /api/v1/notification_preferences
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [ ] usage rows logged
