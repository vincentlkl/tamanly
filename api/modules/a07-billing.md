# A07 Billing and payments (+ Billplz webhook)

Build: **Opus, effort high**. Review: **Opus, effort high**.
Endpoints: 9. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/billing/summary` | [L204](../../storyboard/plans/api.md#L204) |
| GET | `/api/v1/invoices?status=open\|paid` | [L205](../../storyboard/plans/api.md#L205) |
| GET | `/api/v1/invoices/:id` | [L206](../../storyboard/plans/api.md#L206) |
| POST | `/api/v1/payments` | [L207](../../storyboard/plans/api.md#L207) |
| GET | `/api/v1/payments/:id` | [L208](../../storyboard/plans/api.md#L208) |
| GET | `/api/v1/receipts` | [L209](../../storyboard/plans/api.md#L209) |
| GET | `/api/v1/receipts/:id/pdf` | [L210](../../storyboard/plans/api.md#L210) |
| GET | `/api/v1/billing/transfer_instructions?purpose=default\|sinking_fund` | [L211](../../storyboard/plans/api.md#L211) |
| POST | `/webhooks/payments/billplz/:payout_account_id` | NEW |

## Module tasks
- [x] Billplz webhook: verify X-Signature against payout account key, idempotent on bill id, no auth headers, excluded from rack-attack user throttle


## Per-endpoint checklist

### GET /api/v1/billing/summary
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/invoices?status=open|paid
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/invoices/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/payments
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/payments/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/receipts
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/receipts/:id/pdf
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/billing/transfer_instructions?purpose=default|sinking_fund
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /webhooks/payments/billplz/:payout_account_id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [ ] usage rows logged
