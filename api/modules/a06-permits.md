# A06 Permits

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 10. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/permit_types` | [L185](../../storyboard/plans/api.md#L185) |
| GET | `/api/v1/permits` | [L186](../../storyboard/plans/api.md#L186) |
| GET | `/api/v1/permits/:id` | [L187](../../storyboard/plans/api.md#L187) |
| POST | `/api/v1/permits` | [L188](../../storyboard/plans/api.md#L188) |
| PATCH | `/api/v1/permits/:id/documents/:doc_id` | [L189](../../storyboard/plans/api.md#L189) |
| POST | `/api/v1/permits/:id/withdraw` | [L190](../../storyboard/plans/api.md#L190) |
| GET | `/api/v1/permits/:id/pass` | [L191](../../storyboard/plans/api.md#L191) |
| POST | `/api/v1/permits/:id/completion` | [L192](../../storyboard/plans/api.md#L192) |
| GET | `/api/v1/permits/:id/refund` | [L193](../../storyboard/plans/api.md#L193) |
| POST | `/api/v1/permits/:id/notices/:notice_id/acknowledge` | [L194](../../storyboard/plans/api.md#L194) |


## Per-endpoint checklist

### GET /api/v1/permit_types
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/permits
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/permits/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/permits
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### PATCH /api/v1/permits/:id/documents/:doc_id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/permits/:id/withdraw
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/permits/:id/pass
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/permits/:id/completion
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/permits/:id/refund
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/permits/:id/notices/:notice_id/acknowledge
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Deployment notes

**Reverse proxy upload limit**: Configure `client_max_body_size` (nginx) or equivalent to allow ~80 MB for permit document uploads. This accommodates high-res construction photos and architectural plans.

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged
