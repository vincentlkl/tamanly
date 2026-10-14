# A02 Properties, invites, sub-tenants, directory

Build: **Sonnet, effort high**. Review: **Opus, effort high**.
Endpoints: 12. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Endpoints

| Method | Path | api.md |
|---|---|---|
| GET | `/api/v1/properties` | [L129](../../storyboard/plans/api.md#L129) |
| GET | `/api/v1/tamans?q=` | [L130](../../storyboard/plans/api.md#L130) |
| GET | `/api/v1/invites` | [L131](../../storyboard/plans/api.md#L131) |
| POST | `/api/v1/invites/:id/accept` | [L132](../../storyboard/plans/api.md#L132) |
| POST | `/api/v1/invites/:id/decline` | [L133](../../storyboard/plans/api.md#L133) |
| GET | `/api/v1/link_requests` | [L134](../../storyboard/plans/api.md#L134) |
| POST | `/api/v1/link_requests` | [L135](../../storyboard/plans/api.md#L135) |
| GET | `/api/v1/units/:unit_id/sub_tenants` | [L136](../../storyboard/plans/api.md#L136) |
| POST | `/api/v1/units/:unit_id/sub_tenants` | [L137](../../storyboard/plans/api.md#L137) |
| PATCH | `/api/v1/units/:unit_id/sub_tenants/:id` | [L138](../../storyboard/plans/api.md#L138) |
| DELETE | `/api/v1/units/:unit_id/sub_tenants/:id` | [L139](../../storyboard/plans/api.md#L139) |
| GET | `/api/v1/directory` | [L140](../../storyboard/plans/api.md#L140) |

## Module tasks
- [x] Sub-tenant invite (`POST /units/:unit_id/sub_tenants`) takes `{ email, name, scopes[] }` (not phone) and sends the same admin email invite link used by `/auth/invite/accept`
- [x] Admin web: invite resident/guard by email (reuses `user_invitations`)


## Per-endpoint checklist

### GET /api/v1/properties
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/tamans?q=
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/invites
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/invites/:id/accept
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/invites/:id/decline
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/link_requests
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/link_requests
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/units/:unit_id/sub_tenants
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### POST /api/v1/units/:unit_id/sub_tenants
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### PATCH /api/v1/units/:unit_id/sub_tenants/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### DELETE /api/v1/units/:unit_id/sub_tenants/:id
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

### GET /api/v1/directory
- [x] implement
- [x] request spec (happy + 401 + 403/422)
- [x] rswag doc
- [x] authorization check (unit / scope / ownership)
- [x] review pass (Opus high)

## Module done
- [x] all specs green
- [x] swagger regenerated (`rails rswag`)
- [x] usage rows logged

## Follow-ups (decisions 16, 19, 20, 21)
### A02-F1 expired invites don't block re-invite
- [x] implement
- [x] spec
- [x] review pass (Opus high)
### A02-F2 ended host tenancy blocks acceptance
- [x] implement
- [x] spec
- [x] review pass (Opus high)
### A02-F3 proof optional confirmed + deploy note on body size
- [x] doc note in README/deploy docs (no code change for proof)
- [x] review pass (Opus high)
### A02-F4 nightly job ends lapsed tenancies (Ending + end date passed -> EndOccupancy, cascades sub-tenants, closes host's pending invites)
- [x] implement job + config/recurring.yml entry
- [x] spec
- [x] review pass (Opus high)
