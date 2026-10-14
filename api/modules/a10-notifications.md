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
- [ ] `PUT /devices/current` (alias `POST /devices` accepted) upserts the same `devices` row via `DeviceRegistrar` (token refresh from FCM `onTokenRefresh`); `DELETE /devices/current` deactivates it
- [ ] `PushSender` (Firebase Cloud Messaging HTTP v1, service-account OAuth via `googleauth`, creds from Rails credentials; no legacy server key); stubbed in test
- [ ] Prune invalid tokens on send: FCM `UNREGISTERED` / `INVALID_ARGUMENT` (404/400) → `fcm_token=nil, active=false`
- [ ] Blast push: admin broadcast (admin dashboard) → `BroadcastPushJob` (ActiveJob, background) targets all active devices with fcm_token for audience (property + role: residents/guards/staff/all, respecting notification_preferences), batches of 500, per-batch job, retries with backoff on 429/5xx, records sent/failed counts on the broadcast
- [ ] Each push also creates an in-app `notifications` row per user (feeds `GET /notifications`)
- [ ] Specs: audience filtering, batching, pruning, inactive devices skipped

## Per-endpoint checklist

### PUT /api/v1/devices/current
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### DELETE /api/v1/devices/current
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### GET /api/v1/notifications?unread=true
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### POST /api/v1/notifications/:id/read
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### POST /api/v1/notifications/read_all
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### GET /api/v1/notification_preferences
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

### PUT /api/v1/notification_preferences
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [ ] review pass (Opus high)

## Module done
- [ ] all specs green
- [ ] swagger regenerated (`rails rswag`)
- [ ] usage rows logged
