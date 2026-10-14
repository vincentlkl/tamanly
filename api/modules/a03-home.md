# A03 Home feed, announcements

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 2. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/feed` | [L146](../../storyboard/plans/api.md#L146) |
| GET | `/api/v1/announcements/:id` | [L147](../../storyboard/plans/api.md#L147) |


## Per-endpoint checklist

### GET /api/v1/feed
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/announcements/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged

## Follow-ups (decisions 17, 18)
### A03-F1 scheduled-notice publisher job (Solid Queue recurring)
- [x] implement job + config/recurring.yml entry
- [x] spec
- [x] review pass (Opus high)
### A03-F2 unknown audience text hidden (fail closed)
- [x] implement
- [x] spec
- [x] review pass (Opus high)
### A03-F3 demo seeds: switch a few seeded notices to "Taman-wide" so they show in the app
- [x] implement
- [x] review pass (Opus high)
