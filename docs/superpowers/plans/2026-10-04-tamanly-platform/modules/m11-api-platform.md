# M11 · API platform

**Status:** Not started · **Owner:** — · **Wave:** 1 · **Depends on:** M00, M01 T01.4 (tokens), M01 T01.5 (`Current`)

**Goal:** Build the `/api/v1` foundation the mobile app and every feature endpoint stand on:
- authentication endpoints;
- the base controller;
- the single error envelope;
- cursor pagination;
- `Idempotency-Key` replay;
- rate limits;
- the app-version gate;
- the published OpenAPI document.

**Read first:**
- `../contracts.md` §8 (API conventions)
- `../decisions.md` ADR-004, ADR-012 (Firebase phone sign-in) and ADR-016
- Review Focus 2 in the README

**Feature coverage:**
- Mobile: sign in / register (owner, resident, sub-tenant, security, management staff).
- Mobile: profile and language (EN / BM). The `/me` endpoints live here.
- App store rule: in-app account deletion.

**Prototype references** (storyboard):
- A1 Welcome
- A2 Sign in
- A3 Choose role
- G1 Profile & language

## Scope

**In:**
- `Api::V1::BaseController`
- `/api/v1/auth/*`
- `/api/v1/me`
- `idempotency_keys`
- `Api::Paginates`
- `Api::Idempotent`
- Rack::Attack rules
- The version gate
- The rswag base and the published docs

**Out:**
- Feature endpoints, which belong to their own modules
- The `X-Unit-Id` occupancy resolution (M03 T03.4 adds `Api::V1::UnitContext`)
- Device registration (M10)

## Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/firebase` | `{ id_token, device_uid }` → tokens + `me`. The app gets `id_token` from Firebase phone sign-in | none |
| POST | `/api/v1/auth/dev` | Development and test only: `{ phone, device_uid }` → tokens + `me`. The route doesn't exist outside `Rails.env.local?` | none |
| POST | `/api/v1/auth/password` | Staff `{ email, password, device_uid }` → tokens + `me` | none |
| POST | `/api/v1/auth/refresh` | `{ refresh_token }` → new pair | none |
| DELETE | `/api/v1/auth/session` | Sign out this device (revoke token) | bearer |
| GET | `/api/v1/me` | Profile, modes and linked properties | bearer |
| PATCH | `/api/v1/me` | `{ name, email, locale }` | bearer |
| DELETE | `/api/v1/me` | Request account deletion | bearer |

`me` payload. M03 fills `properties`, and M10 adds `unread_notifications`.

```json
{
  "id": "uuid", "name": "Nurul Aisyah binti Rahman", "phone": "+60123450001", "email": null, "locale": "en",
  "profile_complete": true,
  "modes": ["resident", "guard", "staff"],
  "staff": [{ "organization": { "id": "uuid", "name": "Lestari Facility Management Sdn Bhd" }, "role": "guard", "tamans": [{ "id": "uuid", "name": "Taman Desa Harmoni" }] }],
  "properties": [],
  "unread_notifications": 0
}
```

How `modes` is derived:
- `resident` means the user has at least one active occupancy (M03).
- `guard` means an active `guard` membership.
- `staff` means an active membership with `admin?`.
- A new user has `modes: []` and `profile_complete: false`. The app then shows A3 "Choose role" and the linking flow (M03).

## Interfaces

**Produces:**

```ruby
class Api::V1::BaseController < ActionController::API
  include Api::Errors      # render_error(code, message, status:, details: nil) + rescue_from mapping
  include Api::Paginates   # paginate(relation, order: :created_at) => [records, meta]
  include Api::Idempotent  # idempotent :create, :pay  (class macro)
  include Pundit::Authorization
  before_action :check_app_version, :authenticate!, :set_locale
end

Api::V1::MeSerializer.new(user).as_json
# Serializers: plain classes with #as_json, a `money(cents)` helper returning { cents:, formatted: }, and `time(t)` returning iso8601 with offset
```

`render_data(obj, meta: nil)` renders `{ data:, meta: }`.

**Consumes:**
- `Auth::FirebasePhone` and `Auth::Tokens` (M01 T01.4)
- `Current` (M01 T01.5)

## Tasks

### T11.1 · Base controller, errors and the version gate

**Files:**
- Create:
  - `app/controllers/api/v1/base_controller.rb`
  - `app/controllers/concerns/api/errors.rb`
  - `app/serializers/api/v1/base_serializer.rb`
  - `config/locales/{en,ms}/api.yml`
- Test:
  - `spec/requests/api/v1/base_spec.rb`, using a test-only `Api::V1::PingController` mounted in `spec/support/test_routes.rb`

- [ ] **Step 1: Write failing request specs against `GET /api/v1/ping`.**
  - No token → 401 `{ error: { code: "unauthorized" } }`.
  - An expired token → 401 `token_expired`.
  - A valid token → 200 `{ data: { pong: true } }`.
  - `X-App-Version: 1.0.0` when `Setting.min_app_version` is `1.2.0` → 426 `upgrade_required`, with the message "Update Tamanly to keep using it." in EN and "Kemas kini Tamanly untuk terus menggunakannya." in BM.
  - `Accept-Language: ms` returns BM error messages.
  - A raised `ActiveRecord::RecordNotFound` → 404 `not_found`, and the body does not include the ID.
  - `ActiveRecord::RecordInvalid` → 422 `validation_failed`, with `details` keyed by attribute.
  - `Pundit::NotAuthorizedError` → 403 `forbidden`.
  - An unexpected `StandardError` → 500 `{ error: { code: "server_error", message: "Something went wrong on our side. Try again." } }`, and the exception is reported via `Rails.error.report`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement `Api::Errors`.**

  ```ruby
  module Api::Errors
    extend ActiveSupport::Concern
    included do
      rescue_from StandardError do |e|
        Rails.error.report(e)
        render_error(:server_error, I18n.t("api.errors.server_error"), status: 500)
      end
      rescue_from ActiveRecord::RecordNotFound, with: -> { render_error(:not_found, I18n.t("api.errors.not_found"), status: 404) }
      rescue_from ActiveRecord::RecordInvalid, with: ->(e) { render_error(:validation_failed, I18n.t("api.errors.validation_failed"), status: 422, details: e.record.errors.to_hash(true)) }
      rescue_from ActionController::ParameterMissing, with: ->(e) { render_error(:bad_request, e.message, status: 400) }
      rescue_from Pundit::NotAuthorizedError, with: -> { render_error(:forbidden, I18n.t("api.errors.forbidden"), status: 403) }
    end

    def render_error(code, message, status:, details: nil)
      render json: { error: { code:, message:, details: }.compact }, status:
    end

    def render_data(data, meta: nil, status: :ok) = render(json: { data:, meta: }.compact, status:)
  end
  ```

  Rails checks `rescue_from` handlers from the last declared to the first, so `StandardError` must be declared first, as above.

- [ ] **Step 4: Implement the base controller.**
  - `authenticate!` reads the bearer token and calls `Auth::Tokens.authenticate`.
    - It distinguishes "expired" from "unknown" by looking the digest up without the expiry check.
    - It sets `Current.user`, `Current.api_token`, `Current.ip` and `Current.request_id`.
    - It touches `users.last_seen_at` at most every 5 minutes.
  - `set_locale` uses `Accept-Language` when it is `en` or `ms`. Otherwise it uses `user.locale`.
  - `check_app_version` compares `Gem::Version` values. A missing header is allowed (web tools, curl).

- [ ] **Step 5: Add the setting.** Create a `settings` key-value table (`key`, `value` jsonb) with `Setting.min_app_version`. Its default is `"0.0.0"`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add API base controller, error envelope and version gate"`.

### T11.2 · Auth and `/me` endpoints

**Files:**
- Create:
  - `app/controllers/api/v1/auth/firebase_controller.rb`
  - `app/controllers/api/v1/auth/dev_controller.rb`
  - `app/controllers/api/v1/auth/passwords_controller.rb`
  - `app/controllers/api/v1/auth/refresh_controller.rb`
  - `app/controllers/api/v1/auth/sessions_controller.rb`
  - `app/controllers/api/v1/me_controller.rb`
  - `app/serializers/api/v1/me_serializer.rb`
  - `app/jobs/accounts/purge_job.rb`
- Test:
  - `spec/requests/api/v1/auth_spec.rb` (rswag)
  - `spec/requests/api/v1/me_spec.rb` (rswag)
  - `spec/jobs/accounts/purge_job_spec.rb`

- [ ] **Step 1: Write the failing rswag specs.** Each one documents its request and response schemas. The cases:
  - `POST /auth/firebase` (uses `firebase_id_token` from M01's spec helper):
    - a valid token → 200 `{ data: { access_token, refresh_token, expires_in, me } }`;
    - an expired, forged or other-project token → 401 `phone_unverified` with "We couldn't confirm your phone number. Try signing in again.";
    - a non-Malaysian number → 401 `phone_unverified` with "Use a Malaysian mobile number (+60).";
    - a new phone gets `me.profile_complete == false` and `modes == []`;
    - a phone that staff already invited (a guard, or an occupant from M03) signs straight into that account.
  - `POST /auth/dev` issues tokens for any phone in development and test. A routing spec asserts the route is absent when `Rails.env.local?` is false, by reloading routes with the env stubbed.
  - `POST /auth/password`:
    - an active staff member → tokens;
    - a resident (no membership) → 401 `unauthorized` with the message "Use your phone number to sign in.";
    - a wrong password → 401 with the same message shape as the admin sign-in.
  - `POST /auth/refresh` → a new pair. Reusing the old refresh token → 401 `unauthorized`.
  - `DELETE /auth/session` → 204, and the token stops working.
  - `PATCH /me`:
    - updates the name and locale;
    - `locale: "fr"` → 422;
    - with `name` set, `profile_complete` becomes true.
  - `DELETE /me` → 202 and sets `deletion_requested_at`. All tokens are revoked. `Accounts::PurgeJob` runs 30 days later, at `wait_until:`.

- [ ] **Step 2: Write the failing purge job spec.**
  - The job anonymises the user: `name = "Deleted user"`, phone, email and `firebase_uid` set to `nil`, `status = "disabled"`.
  - It deletes the Firebase Authentication user: `POST https://identitytoolkit.googleapis.com/v1/projects/<project_id>/accounts:delete` with `{ localId: firebase_uid }`, authorised with the service account from M10 (`googleauth`, scope `https://www.googleapis.com/auth/cloud-platform`). Stub it with WebMock. A failed call retries; it never blocks the anonymising.
  - It ends the user's occupancies (M03, guarded by `defined?(Occupancy)`).
  - It keeps invoices and payments, because finance records must stay.
  - It does nothing if the request was cancelled. Signing in again within 30 days clears `deletion_requested_at`.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the controllers.**
  - Map service exceptions to codes:

    | Exception | Status | `code` |
    |---|---|---|
    | `Auth::FirebasePhone::Invalid` | 401 | `phone_unverified` |
    | `Auth::Tokens::Invalid` | 401 | `unauthorized` |

  - The `device_uid` param is required. It comes from `X-Device-Id` when the param is absent.

- [ ] **Step 5: Implement `MeSerializer`.** Add hooks for M03 and M10:
  - `properties` calls `PropertiesSerializer` only if `defined?(Occupancy)`.
  - `unread_notifications` calls `Notification.unread_count_for(user)` only if `defined?(Notification)`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add API auth, me and account deletion endpoints"`.

### T11.3 · Cursor pagination and serializer helpers

**Files:**
- Create:
  - `app/controllers/concerns/api/paginates.rb`
  - `app/serializers/api/v1/base_serializer.rb` (add helpers)
- Test:
  - `spec/controllers/concerns/api/paginates_spec.rb`
  - `spec/serializers/api/v1/base_serializer_spec.rb`

- [ ] **Step 1: Write the failing pagination specs** against 60 records that share 3 identical `created_at` values.
  - Walking pages of 25 returns every record exactly once, in `created_at desc, id desc` order.
  - `limit=500` is clamped to 100.
  - A tampered cursor returns 400 `bad_request` with "That page link is no longer valid. Start again from the top."
  - The last page has `next_cursor: null`.

- [ ] **Step 2: Write the failing serializer specs.**
  - `money(105000)` returns `{ cents: 105000, formatted: "RM 1,050.00" }`.
  - `time(t)` returns `"2026-10-03T10:42:00+08:00"`.
  - `date(d)` returns `"2026-10-15"`.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement it.**

  ```ruby
  module Api::Paginates
    # order must be a column name from code, never from params
    def paginate(rel, order: :created_at)
      limit = params.fetch(:limit, 25).to_i.clamp(1, 100)
      if params[:cursor].present?
        c = JSON.parse(Base64.urlsafe_decode64(params[:cursor])) rescue raise(ActionController::BadRequest)
        rel = rel.where(rel.arel_table[order].lt(c["v"]).or(rel.arel_table[order].eq(c["v"]).and(rel.arel_table[:id].lt(c["id"]))))
      end
      rows = rel.reorder(order => :desc, id: :desc).limit(limit + 1).to_a
      more = rows.size > limit
      rows = rows.first(limit)
      last = rows.last
      cursor = more ? Base64.urlsafe_encode64({ v: last.public_send(order).iso8601(6), id: last.id }.to_json, padding: false) : nil
      [rows, { next_cursor: cursor, limit: }]
    end
  end
  ```

  Map `ActionController::BadRequest` to the 400 message above in `Api::Errors`.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add cursor pagination and serializer helpers"`.

### T11.4 · Idempotency keys

**Files:**
- Create:
  - `db/migrate/*_create_idempotency_keys.rb`
  - `app/models/idempotency_key.rb`
  - `app/controllers/concerns/api/idempotent.rb`
  - `app/jobs/idempotency_keys/sweep_job.rb`
- Modify: `config/recurring.yml`
- Test:
  - `spec/requests/api/v1/idempotency_spec.rb`, against a test-only `POST /api/v1/ping/charge` that creates a row
  - `spec/jobs/idempotency_keys/sweep_job_spec.rb`

**Table `idempotency_keys`:**

| Column | Type |
|---|---|
| `user_id` | reference |
| `key` | string |
| `request_digest` | string |
| `locked_at` | timestamp |
| `completed_at` | timestamp |
| `response_status` | int |
| `response_body` | jsonb |
| `created_at` | timestamp |

Unique index on `[user_id, key]`.

- [ ] **Step 1: Write failing specs.** This is Review Focus 2.
  - Two sequential POSTs with the same key and body create 1 row. The second response is byte-identical to the first.
  - The same key with a different body → 409 `idempotency_conflict`.
  - A missing key on an idempotent action → 400 with "Send an Idempotency-Key header."
  - Two concurrent requests with the same key create 1 row. Use `include_context "concurrency"` (M00).
    - Integration sessions aren't thread-safe, so drive two threads through `Rack::MockRequest.new(Rails.application).post(...)`, each with the same headers.
    - The other response is either the replay or 409 "The same request is still being processed."
  - A 5xx response is not stored, so a retry runs again.
  - Keys are per user: user B reusing user A's key is independent.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

  ```ruby
  module Api::Idempotent
    extend ActiveSupport::Concern
    class_methods do
      def idempotent(*actions) = around_action(:with_idempotency, only: actions)
    end

    private

    def with_idempotency
      key = request.headers["Idempotency-Key"].presence
      return render_error(:bad_request, I18n.t("api.errors.idempotency_missing"), status: 400) unless key
      digest = Digest::SHA256.hexdigest([request.method, request.path, request.raw_post].join("|"))
      rec = IdempotencyKey.create_or_find_by!(user_id: Current.user.id, key:) { _1.request_digest = digest }
      return render_error(:idempotency_conflict, I18n.t("api.errors.idempotency_mismatch"), status: 409) if rec.request_digest != digest
      return render(json: rec.response_body, status: rec.response_status) if rec.completed_at

      claimed = IdempotencyKey.where(id: rec.id, completed_at: nil)
                              .where("locked_at IS NULL OR locked_at < ?", 30.seconds.ago)
                              .update_all(locked_at: Time.current)
      return render_error(:idempotency_conflict, I18n.t("api.errors.idempotency_in_flight"), status: 409) if claimed.zero?

      yield
      if response.status < 500
        rec.update!(response_status: response.status, response_body: JSON.parse(response.body), completed_at: Time.current, locked_at: nil)
      else
        rec.update!(locked_at: nil)
      end
    end
  end
  ```

- [ ] **Step 4: Add the sweep job.** `IdempotencyKeys::SweepJob` deletes rows older than 24 hours. Schedule it hourly in `config/recurring.yml`.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add Idempotency-Key replay for API writes"`.

### T11.5 · Rate limits and published API docs

**Files:**
- Create:
  - `config/initializers/rack_attack.rb`
  - `config/initializers/rswag_ui.rb`
  - `config/initializers/rswag_api.rb`
- Modify: `config/routes.rb`, `spec/swagger_helper.rb`
- Test: `spec/requests/rate_limits_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - The 31st `POST /api/v1/auth/firebase` from one IP within 10 minutes gets 429 in the JSON envelope (`rate_limited`) with `Retry-After`.
  - The 11th `POST /api/v1/auth/password` for one email within 10 minutes gets 429.
  - Firebase itself limits how often a phone can request a code; App Check (M14 T14.5) blocks scripted requests.
  - An authenticated user's 301st request within 5 minutes gets 429.
  - `/up` and webhooks (`/webhooks/*`) are never throttled.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Configure Rack::Attack.**
  - Its cache store is `Rails.cache` (Solid Cache).
  - Add a throttle for each case in Step 1. Read the email from `JSON.parse(req.body.read)` and rewind the body afterwards.
  - The throttled responder returns the JSON envelope.

- [ ] **Step 4: Mount the docs.**
  - Mount rswag-ui at `/api-docs`.
  - In production, protect it with `http_basic_authenticate_with`, with credentials from `Rails.application.credentials.api_docs`.
  - Run `bundle exec rake rswag:specs:swaggerize` and commit `swagger/v1/openapi.yaml`.

- [ ] **Step 5: Add a CI step.** It fails when `swagger/v1/openapi.yaml` is stale: `rake rswag:specs:swaggerize && git diff --exit-code swagger/`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add API rate limits and published OpenAPI docs"`.

## Module done when

- [ ] The mobile team can sign in against staging with a Firebase test phone number (code `123456`, set in the Firebase console) using only the published docs.
- [ ] Every API error in the codebase uses the envelope. A spec asserts that each `render json:` in `app/controllers/api` goes through `render_data` or `render_error` (grep test).
- [ ] Review Focus 2's idempotency specs pass.

## Progress log

| Date | Who | Note |
|---|---|---|
