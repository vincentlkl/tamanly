# A09 Marketplace

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 8. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/market/categories` | [L241](../../storyboard/plans/api.md#L241) |
| GET | `/api/v1/listings?q=&category_id=&mine=true` | [L242](../../storyboard/plans/api.md#L242) |
| GET | `/api/v1/listings/:id` | [L243](../../storyboard/plans/api.md#L243) |
| POST | `/api/v1/listings` | [L244](../../storyboard/plans/api.md#L244) |
| PATCH | `/api/v1/listings/:id` | [L245](../../storyboard/plans/api.md#L245) |
| POST | `/api/v1/listings/:id/sold` | [L246](../../storyboard/plans/api.md#L246) |
| DELETE | `/api/v1/listings/:id` | [L247](../../storyboard/plans/api.md#L247) |
| POST | `/api/v1/listings/:id/reports` | [L248](../../storyboard/plans/api.md#L248) |


## Per-endpoint checklist

### GET /api/v1/market/categories
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/listings?q=&category_id=&mine=true
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/listings/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/listings
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### PATCH /api/v1/listings/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/listings/:id/sold
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/listings/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/listings/:id/reports
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged
