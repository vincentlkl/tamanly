# A05 Guard app

Build: **Opus, effort high**. Review: **Opus, effort high**.
Endpoints: 18. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/guard/home` | [L162](../../storyboard/plans/api.md#L162) |
| POST | `/api/v1/guard/checks` | [L163](../../storyboard/plans/api.md#L163) |
| POST | `/api/v1/guard/visitor_passes/:id/admit` | [L164](../../storyboard/plans/api.md#L164) |
| POST | `/api/v1/guard/visitor_passes/:id/deny` | [L165](../../storyboard/plans/api.md#L165) |
| POST | `/api/v1/guard/visitor_passes/:id/check_out` | [L166](../../storyboard/plans/api.md#L166) |
| GET | `/api/v1/guard/arrivals` | [L167](../../storyboard/plans/api.md#L167) |
| GET | `/api/v1/guard/gate_events` | [L168](../../storyboard/plans/api.md#L168) |
| GET | `/api/v1/guard/units?q=` | [L169](../../storyboard/plans/api.md#L169) |
| POST | `/api/v1/guard/units/:id/call` | [L170](../../storyboard/plans/api.md#L170) |
| POST | `/api/v1/guard/walkins` | [L171](../../storyboard/plans/api.md#L171) |
| GET | `/api/v1/guard/walkins/:id` | [L172](../../storyboard/plans/api.md#L172) |
| POST | `/api/v1/guard/deliveries` | [L173](../../storyboard/plans/api.md#L173) |
| POST | `/api/v1/guard/incidents` | [L174](../../storyboard/plans/api.md#L174) |
| POST | `/api/v1/guard/shift_notes` | [L175](../../storyboard/plans/api.md#L175) |
| POST | `/api/v1/guard/sos/:id/acknowledge` | [L176](../../storyboard/plans/api.md#L176) |
| GET | `/api/v1/guard/permits/today` | [L177](../../storyboard/plans/api.md#L177) |
| POST | `/api/v1/guard/permits/:id/admit` | [L178](../../storyboard/plans/api.md#L178) |
| POST | `/api/v1/guard/permits/:id/exit` | [L179](../../storyboard/plans/api.md#L179) |


## Per-endpoint checklist

### GET /api/v1/guard/home
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/checks
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/visitor_passes/:id/admit
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/visitor_passes/:id/deny
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/visitor_passes/:id/check_out
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/guard/arrivals
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/guard/gate_events
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/guard/units?q=
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/units/:id/call
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/walkins
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/guard/walkins/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/deliveries
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/incidents
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/shift_notes
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/sos/:id/acknowledge
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/guard/permits/today
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/permits/:id/admit
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/guard/permits/:id/exit
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged
