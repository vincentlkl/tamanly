# A08 Facilities and bookings

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 7. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/facilities` | [L227](../../storyboard/plans/api.md#L227) |
| GET | `/api/v1/facilities/:id` | [L228](../../storyboard/plans/api.md#L228) |
| GET | `/api/v1/facilities/:id/availability?date=2026-10-10` | [L229](../../storyboard/plans/api.md#L229) |
| POST | `/api/v1/bookings` | [L230](../../storyboard/plans/api.md#L230) |
| GET | `/api/v1/bookings?status=upcoming\|past` | [L231](../../storyboard/plans/api.md#L231) |
| GET | `/api/v1/bookings/:id` | [L232](../../storyboard/plans/api.md#L232) |
| POST | `/api/v1/bookings/:id/cancel` | [L233](../../storyboard/plans/api.md#L233) |


## Per-endpoint checklist

### GET /api/v1/facilities
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/facilities/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/facilities/:id/availability?date=2026-10-10
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/bookings
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/bookings?status=upcoming|past
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/bookings/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/bookings/:id/cancel
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [ ] usage rows logged

## Run log (2026-10-14)
- Group 1 facilities (3 endpoints): built by Haiku medium, full suites green, committed c713f09.
- Group 2 bookings (4 endpoints): HALTED at 10:19 PM MYT, Claude session limit (resets 10:20 PM). Partial, uncommitted work in tamanly_backend (bookings controller/serializer/Bookings::Create/spec, routes, booking.rb, swagger_helper). Resume: rerun runs/drive_a08.sh (it skips G1 via A08G1_build.done) after telling the builder to continue the existing partial files.
- Opus high review (2026-10-14): fixed cross-cutting booking rules (open hours/blackout/past/advance/per_month/whole hours), facility row lock, slot_taken code, fee/deposit stored, cancel cutoff via Bookings::Decide, X-Unit-Id + scope on all facility routes, N+1 on bookings list. rspec + minitest green, swagger regenerated. Uncommitted.
