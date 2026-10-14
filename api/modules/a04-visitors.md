# A04 Visitor passes, walk-in reply, emergency, SOS

Build: **Opus, effort high**. Review: **Opus, effort high**.
Endpoints: 7. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/visitor_passes?status=upcoming\|past` | [L155](../../storyboard/plans/api.md#L155) |
| POST | `/api/v1/visitor_passes` | [L156](../../storyboard/plans/api.md#L156) |
| GET | `/api/v1/visitor_passes/:id` | [L157](../../storyboard/plans/api.md#L157) |
| DELETE | `/api/v1/visitor_passes/:id` | [L158](../../storyboard/plans/api.md#L158) |
| POST | `/api/v1/walkin_requests/:id/reply` | [L159](../../storyboard/plans/api.md#L159) |
| GET | `/api/v1/emergency_contacts` | [L160](../../storyboard/plans/api.md#L160) |
| POST | `/api/v1/sos` | [L161](../../storyboard/plans/api.md#L161) |


## Per-endpoint checklist

### GET /api/v1/visitor_passes?status=upcoming|past
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/visitor_passes
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/visitor_passes/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/visitor_passes/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/walkin_requests/:id/reply
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/emergency_contacts
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/sos
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged

## Follow-ups

### A04-F1 walk-in guard-only
- [x] implement
- [x] spec
- [x] review pass

### A04-F2 SOS already-sent
- [x] implement
- [x] spec
- [x] review pass

### A04-F3 QR share page
- [x] implement
- [x] spec
- [x] review pass
