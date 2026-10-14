# A00 Foundation (base controller, errors, headers, rack-attack, idempotency, rswag dev-only)

Build: **Opus, effort high**. Review: **Opus, effort high**.
Endpoints: 0. Update `status` in [../endpoints.yml](../endpoints.yml) as you go.

## Tasks
- [x] Gems: rspec-rails, rswag (api/specs/ui), rack-attack, jwt, factory_bot; keep existing minitest suite green
- [x] `Api::V1::BaseController` (ActionController::API), JSON envelope `{data}` / `{error:{code,message,details}}`
- [x] Error mapping per api.md error table (401/403/404/409/422/426/429/502)
- [x] Header handling: Accept-Language → I18n, X-App-Version vs `Setting.min_app_version` → 426, X-Device-Id required, X-Unit-Id → `Current.unit` or 422 `unit_required`
- [x] Unit/scope authorization concern (`require_scope :bills_view`), Pundit policies for API
- [x] Idempotency-Key concern + table (user, key, request hash, response); 409 `idempotency_conflict` on body mismatch
- [x] rack-attack: per-IP + per-user throttles, stricter on `/auth/*`; 429 `rate_limited` JSON
- [x] rswag mounted ONLY in development: `if Rails.env.development?` + route constraint; swagger yaml at `swagger/v1/swagger.yaml`
- [x] rspec-rails + rswag run alongside minitest (`bin/rails test` and `bundle exec rspec` both in CI)
- [x] Request spec: `/api-docs` returns 404 when `Rails.env` is production (and test)
- [x] CORS off (mobile only), `force_ssl` in production, filter params `password refresh_token access_token`
- [x] Review pass (Opus high): security checklist, no leaked IDs, N+1
