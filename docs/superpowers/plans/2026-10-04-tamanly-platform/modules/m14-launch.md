# M14 · Launch readiness

**Status:** Not started · **Owner:** — · **Wave:** 5 · **Depends on:** all modules

**Goal:** Make the app safe to run with real residents' money and personal data:
- harden access;
- meet PDPA access rights, with data kept for the life of the service (ADR-024);
- see failures before users report them;
- prove performance at 10× the seed volume;
- ship repeatable deploys, plus the plumbing the mobile release needs.

**Read first:**
- `../decisions.md`: ADR-011a (Billplz), ADR-012 (Firebase phone sign-in), ADR-019, ADR-020, ADR-024 (retention)
- The README Review Focus (all five)

**Feature coverage:** non-functional requirements. The table maps each to its task.

| Requirement | Task |
|---|---|
| Malaysian PDPA 2010: retention setting, privacy notice | T14.2 |
| Access requests | T14.2 |
| App store account deletion (M11 T11.2) | T14.2 |
| Security | T14.1 |
| Uptime | T14.3 |
| Speed | T14.4 |
| Deploys | T14.5 |

## Tasks

### T14.1 · Security hardening

**Files:**
- Create:
  - `config/initializers/content_security_policy.rb`
  - `app/models/staff_totp.rb` and its migration
  - `app/controllers/admin/two_factor_controller.rb`
  - views
- Modify: `app/controllers/admin/sessions_controller.rb`
- Test:
  - `spec/requests/admin/two_factor_spec.rb`
  - `spec/requests/security_headers_spec.rb`
  - `spec/requests/tenant_isolation_sweep_spec.rb`

Add the `rotp` gem, with a line in `decisions.md` as ADR-022: "TOTP for staff with money or permission access".

- [ ] **Step 1: Write failing two-factor specs.**
  - **Who must enrol.** Platform operators (M15), `portfolio_admin` and `billing_ops` must set up an authenticator app at their next sign-in. The QR comes from `rqrcode`, and they get 10 single-use recovery codes.
  - **Who may enrol.** Other staff roles can turn it on but don't have to.
  - **Signing in.** A wrong code is refused. Five wrong codes lock sign-in for 15 minutes.
  - **Recovery codes.** A recovery code works once.
  - **Reset.** A portfolio admin can reset another staff member's 2FA. The reset is audited as `user.2fa_reset`.

- [ ] **Step 2: Write failing header and session specs.**
  - **Content security policy.** Admin and security responses send a CSP with `default-src 'self'`.
    - Fonts are allowed from `fonts.googleapis.com` and `fonts.gstatic.com`.
    - Images are allowed from the S3 host.
    - Inline scripts need a nonce.
  - **Other headers.** Responses send `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS in production.
  - **Session expiry.** Staff sessions end after 12 hours idle. Guard console sessions end at 13 hours (M04).
  - **Cookies.** All cookies are `Secure`, `HttpOnly` and `SameSite=Lax`.

- [ ] **Step 3: Write the failing tenant-isolation sweep.** This automates Review Focus 1.
  - Walk `Rails.application.routes`.
  - For every `GET` route under `/admin` and `/api/v1` with an `:id` segment, create a record of the matching model in a second organisation. Request it as staff of the first organisation, or as a resident of the first organisation for API routes.
  - Assert a 404 response.
  - Maintain the model-for-route mapping in the spec. Any new route without a mapping fails the spec with "Add <route> to the isolation sweep", so new endpoints can't skip the check.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement it.**
  - Then run `bin/brakeman` and `bundle exec bundler-audit`, and fix every warning.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add staff 2FA, security headers and isolation sweep"`.

### T14.2 · PDPA: retention, access requests and privacy notice

**Files:**
- Create:
  - `app/jobs/retention/{visitor_logs,permit_documents,tokens}_job.rb`
  - `app/services/accounts/export.rb`
  - `app/controllers/api/v1/me/exports_controller.rb`
  - `app/views/pages/privacy.html.erb`
- Test:
  - `spec/jobs/retention/*_spec.rb`
  - `spec/services/accounts/export_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Default is keep (ADR-024).** With the retention settings at their defaults (`nil`, meaning keep), both retention jobs change nothing, however old the data.
  - **Visitor logs, when a portfolio admin sets `retention.visitor_log_months`:** passes and gate events older than that are anonymised.
    - `visitor_name` becomes "Visitor".
    - `visitor_phone` and `visitor_ic_last4` are set to `nil`.
    - The plate and the times stay, for security history.
  - **Permit documents, when `retention.permit_documents_months` is set:** IC/passport scans and other permit documents are purged that many months after the permit reaches `deposit_refunded` or `rejected`. The permit row and its amounts stay.
  - **Settings page.** Changing a retention setting is audited as `retention.updated`. The page explains what each setting removes and that removal can't be undone.
  - **API tokens** that are expired or revoked are deleted after 30 days. This is housekeeping, not personal data, so it always runs.
  - **Personal data export.** `POST /api/v1/me/exports` builds a JSON file with:
    - profile;
    - occupancies;
    - visitor passes created;
    - invoices billed to the user;
    - payments;
    - bookings;
    - permits;
    - listings;
    - notifications.

    The file is emailed as a link that expires in 7 days. The request is audited as `account.exported`.
  - **Privacy page.** `/privacy` serves the privacy notice in EN and BM. `me` returns `privacy_url`.
  - **Privacy notice wording.** It says data is kept for as long as the service runs, stored in Malaysia or Singapore (ADR-020), and can be exported or deleted on request in the app.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Schedule the retention jobs nightly in `config/recurring.yml`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add retention settings, personal data export and privacy notice"`.

### T14.3 · Observability

**Files:**
- Modify:
  - `Gemfile`
  - `config/initializers/sentry.rb`
  - `config/routes.rb`
  - `config/recurring.yml`
- Create:
  - `app/jobs/ops/health_check_job.rb`
  - `docs/runbook.md`, in the app repo
- Test: `spec/jobs/ops/health_check_job_spec.rb`

Add `sentry-ruby`, `sentry-rails` and `mission_control-jobs`, with ADR-023 in `decisions.md`.

- [ ] **Step 1: Write a failing spec for `Ops::HealthCheckJob`.** It runs every 5 minutes and posts a staff bell item, plus an email to the ops address, when any of these is true:
  - the oldest ready Solid Queue job has waited more than 60 seconds;
  - the push failure rate in the last hour is above 20% and more than 50 pushes were sent;
  - more than 5 payment webhooks failed signature checks in the last hour;
  - a gate webhook is in `error`.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Sentry reports errors from web and jobs, scrubbing `phone`, `email`, `ic`, `token` and `password`.
  - Mount Mission Control Jobs at `/admin/jobs`. Only platform operators (`users.platform_role = "operator"`, M15) can open it.
  - Add an external uptime check on `/up` (a hosted pinger, configured in the runbook).

- [ ] **Step 4: Write the runbook.** It covers:
  - restarting jobs;
  - replaying failed payment webhooks: `PaymentEvent.where(processed_at: nil)`;
  - rotating Firebase credentials (push and phone sign-in share them);
  - rotating Billplz keys, and checking a payment in the Billplz dashboard against `payments.provider_ref`;
  - restoring from backup;
  - revoking a station device.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add error tracking, job dashboard and health checks"`.

### T14.4 · Performance at 10× volume

**Files:**
- Create:
  - `lib/tasks/perf.rake`
  - `perf/k6/gate_check.js`
  - `perf/k6/payments.js`
  - `perf/k6/api_browse.js`
  - `docs/perf-results.md`, in the app repo

Add `prosopite` to the development and test groups for N+1 detection, with a line in `decisions.md`.

- [ ] **Step 1: Generate the load data.** `bin/rails perf:seed[10]` generates 10× the seed volume:
  - 40 tamans;
  - 14,060 units;
  - 1 year of visitors at 400 per day per taman;
  - invoices for 12 months.

- [ ] **Step 2: Turn on N+1 detection.** Enable Prosopite in the request and system specs (`Prosopite.raise = true`), run the full suite, and fix every N+1 query.

- [ ] **Step 3: Run the k6 scripts against staging.** The budgets, at p95:

  | Scenario | Load | Budget |
  |---|---|---|
  | `POST /api/v1/guard/checks` | 20 rps | under 150 ms |
  | `GET /api/v1/feed` | 50 rps | under 250 ms |
  | `GET /api/v1/invoices` | 50 rps | under 200 ms |
  | Admin index pages, with 10 virtual staff users | — | under 300 ms |
  | Checkout start | 10 rps | under 400 ms |

- [ ] **Step 4: Fix anything over budget.** Use `EXPLAIN ANALYZE` and add indexes. Record before and after numbers in `docs/perf-results.md`.

- [ ] **Step 5: Commit** with `git commit -m "Add load data, N+1 checks and k6 budgets"`.

### T14.5 · Deploy, backups and mobile release plumbing

**Files:**
- Create:
  - `config/deploy.yml` and `config/deploy.staging.yml` (Kamal 2)
  - `.kamal/secrets`
  - `public/.well-known/apple-app-site-association`
  - `public/.well-known/assetlinks.json`
  - `.github/workflows/deploy.yml`
- Modify: `docs/runbook.md`

- [ ] **Step 1: Configure Kamal.**
  - Roles: `web` (Puma behind Thruster) and `job` (`bin/jobs`).
  - Environments: staging and production.
  - Accessories: none, because Postgres is managed.
  - Secrets come from 1Password or the provider's secrets store.

- [ ] **Step 2: Provision the infrastructure.**
  - Managed PostgreSQL 16 in a Malaysia or Singapore region, with point-in-time recovery on.
  - An S3 bucket with a blocked public ACL; files are served only by signed URL.
  - DNS:
    - `app.<domain>` for the dashboard, guard console and API;
    - `<domain>/p/*` share links, which may use the same host.
  - TLS by Kamal proxy.

- [ ] **Step 3: Set up deploy CI.** Merges to `main` deploy to staging. Tags `v*` deploy to production after a manual approval in GitHub Environments.

- [ ] **Step 4: Run a backup drill.** Restore last night's backup into a scratch database. Run `bin/rails runner 'puts Unit.count, Invoice.sum(:amount_cents)'` and compare the output with production. Record how long the restore took in the runbook.

- [ ] **Step 5: Add the mobile release plumbing.**
  - Serve `apple-app-site-association` and `assetlinks.json` so `https://<host>/p/<token>` opens the app when it's installed.
  - Put the production Firebase service account in credentials (`firebase.project_id`, `firebase.service_account_json`), and upload the APNs key to Firebase.
  - In the production Firebase project:
    - enable the Phone sign-in provider;
    - add the Android app's SHA-256 fingerprints;
    - turn on App Check (Play Integrity, App Attest) and enforce it for Authentication, so bots can't trigger paid verification SMS (ADR-012);
    - keep test phone numbers in the staging project only.
  - Each launch customer connects their live Billplz payout accounts (M13 T13.2) and routes every taman, including sinking fund for strata.
  - Put Tamanly's own live Billplz account in `billplz_platform` credentials (M15 T15.4).
  - Set `Setting.min_app_version`.
  - Point the published OpenAPI document at production.

- [ ] **Step 6: Pass the launch checklist.** Every item is green before the first real taman:
  - [ ] All modules are `Done` in the README progress table.
  - [ ] The isolation sweep (T14.1) passes.
  - [ ] Review Focus 2–5 specs pass.
  - [ ] A Billplz sandbox payment settles through the callback into the customer's own account, and a deliberately dropped callback is settled by the poller.
  - [ ] A platform invoice is issued and paid through Tamanly's own Billplz account (M15).
  - [ ] A suspended test customer's residents can still pay and their guards can still admit visitors.
  - [ ] One small live Billplz payment settles in production and is refunded through the Billplz dashboard, then marked refunded on Reconciliation.
  - [ ] Firebase phone sign-in works with a real Malaysian number on iOS and Android production builds.
  - [ ] A push was received on real iOS and Android production builds.
  - [ ] Backup drill done.
  - [ ] The runbook has been reviewed by a second person.

- [ ] **Step 7: Commit** with `git commit -m "Add Kamal deploy, backups drill and app links"`.

## Module done when

- [ ] Production is live behind the launch checklist.
- [ ] One pilot taman is onboarded with real units imported via CSV (M03 T03.2).

## Progress log

| Date | Who | Note |
|---|---|---|
