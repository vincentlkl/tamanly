# Architecture decisions

Each record gives the choice, the reason, and what was turned down. Change a decision only by adding a new record that supersedes the old one.

## ADR-001 · The Rails app gets its own private repository

- **Decision:** Create the app at `/Users/vincent/work/ror/apps/vincent/tamanly/app` as a new **private** GitHub repository (`vincentlkl/tamanly-app`).
- **Why:**
  - This plan repo is public, because GitHub Pages serves the prototypes from it.
  - Application code, credentials and infrastructure config must not be public.
- **Turned down:** a `rails/` folder inside this repo. It would be published to Pages and readable by anyone.

## ADR-002 · One Rails monolith, server-rendered admin

- **Decision:** One Rails 8 app serves the dashboard (`/admin`), the guard console (`/security`), the mobile API (`/api/v1`) and webhooks (`/webhooks`). The dashboard and guard console use Hotwire (Turbo Frames, Turbo Streams, Stimulus) and ViewComponent.
- **Why:**
  - One team and one deploy.
  - The prototypes are plain HTML and JS, so they port to ERB, components and Stimulus controllers almost line for line.
  - Turbo Streams gives the live boards (on site now, gate arrivals) without a separate SPA.
- **Turned down:**
  - A React SPA plus API-only Rails: two apps, two auth flows, and duplicated validation.
  - Separate services per domain: not needed at this scale (about 1,400 units per company in the seed).

## ADR-003 · Row-level multi-tenancy

- **Decision:** Every tenant-owned table has `taman_id`, and through it `organization_id`. Access goes through `Current` plus Pundit scopes (`contracts.md` §2).
- **Why:** Residents and multi-property owners hold units across tamans managed by **different** companies. Schema-per-tenant can't express one user spanning companies.
- **Turned down:** `apartment` / schema-per-tenant, and database-per-tenant.

## ADR-004 · Authentication

| Who | Surface | Method |
|---|---|---|
| Management staff | `/admin` | Email + password (Rails 8 authentication generator), `sessions` table, cookie session |
| Management staff | mobile | `POST /api/v1/auth/password` returns API tokens |
| Residents, owners, sub-tenants, guards | mobile | Phone + 6-digit SMS OTP returns API tokens |
| Guards | `/security` on a paired guardhouse device | Station device cookie, then guard picks their name and enters a 4-digit PIN |

API tokens:
- **Access tokens** last 1 hour. **Refresh tokens** last 60 days and rotate on every use.
- Both are opaque random strings. Only SHA-256 digests are stored.
- Reusing a rotated refresh token revokes the whole token family (theft detection).
- **Turned down:** JWT. Revocation needs a server lookup anyway, and opaque tokens are simpler to rotate and revoke.

## ADR-005 · Permissions: role × module × level, with taman overrides

- **Decision:** This mirrors the prototype matrix (`admin/#/roles`).
  - There are 14 module keys and 4 levels (`none`, `view`, `edit`, `full`).
  - Each organisation has its own defaults per role. Per-taman overrides sit on top.
  - Policies ask `Permissions.allows?(user, :billing, :edit, taman)`.
  - Occupant scopes (`bills_view` etc.) are a separate, simpler check on the occupancy.
- **Turned down:**
  - `rolify` / `cancancan`: they don't model per-taman overrides cleanly, and Pundit is easier to test one rule at a time.

## ADR-006 · Push via Firebase Cloud Messaging HTTP v1

- **Decision:** Send one FCM HTTP v1 call per device. APNs is reached through FCM, so we keep one credential set, one payload builder and one error handler.
  - Auth uses a Google service account through `googleauth`, and the access token is cached for 50 minutes.
  - Delivery happens in `Push::DeliverJob` on Solid Queue.
- **Why:**
  - One code path for both platforms.
  - FCM returns `UNREGISTERED` for dead tokens, which lets us clean them up.
- **Turned down:**
  - `rpush`: an extra daemon.
  - Direct APNs plus FCM: two providers to keep alive.
  - The `noticed` gem: the in-app inbox, preferences and event catalog are three small tables we want to own, not configure around.

## ADR-007 · Background jobs, cache, websockets: Solid Queue / Cache / Cable

- **Decision:** Use the Rails 8 defaults, all on PostgreSQL. Recurring work lives in `config/recurring.yml`.
- **Why:** No Redis to run. Throughput needs are small (pushes and reminders in the thousands per day).
- **Turned down:** Sidekiq + Redis. Revisit if the queue backs up past 1 minute at peak (M14 adds the alert).

## ADR-008 · Money as integer sen

- **Decision:** Store money in `bigint *_cents` columns, MYR only.
  - Format with `Money.format(cents)`, which gives `RM 1,050.00`.
  - Parse admin input with `Money.parse("1,050.00")`.
- **Turned down:** the `money-rails` gem. One currency doesn't need it.

## ADR-009 · UUID keys plus human reference numbers

- **Decision:** Every table uses a UUID primary key.
  - Records people read aloud get a separate `reference` string, e.g. `PMT-2689`, `INV-2610-00001`, `BK-5102`.
  - References are generated from a `reference_counters` table under a row lock (`Reference.next!`).
- **Why:** UUIDs stop ID guessing across tenants. References stay short enough for a guard or a phone call.

## ADR-010 · Visitor and contractor passes: random tokens, looked up server-side

- **Decision:** A pass has two identifiers:
  - `token`: 24 random URL-safe characters, unique. It is encoded in the QR as `tamanly://pass/<token>` and carried on the share link `https://<host>/p/<token>`.
  - `code`: 6 characters of Crockford base32, unique among a taman's active passes. Guards type it when the QR won't scan.
- **Why:** Gates are online, so verifying a signature gains nothing over a database lookup. A lookup can also be revoked instantly. The 6-character code matches the guard console prototype.
- **Turned down:** signed or offline JWT passes, because they can't be revoked.

## ADR-011 · Payment gateway behind an adapter

- **Decision:** `Payments::Gateway` is an interface (`contracts.md` §6).
  - M06 ships `Payments::Gateways::Fake` for development and tests, plus one real adapter.
  - Bank-transfer receipts are a payment method too: the resident uploads a slip and staff verify it.
  - Deposit refunds are paid out by the company's bank (IBG). The app records the payout reference rather than calling the gateway.
- **Open:** which gateway. Requirements are FPX, cards, DuitNow QR, signed webhooks, and a sandbox.
  - Candidates: Billplz, iPay88, Razer Merchant Services, Stripe (FPX + cards).
  - Decide before M06 T06.4. Record it as ADR-011a.

## ADR-012 · SMS and email behind adapters

- **Decision:**
  - `Sms.deliver(to:, body:)` is backed by an adapter class. The adapter is chosen from the integration settings in M13, and a `Sms::Fake` adapter is used in development and tests.
  - Email is Action Mailer over SMTP, with per-organisation sender settings (M13).
- **Open:** which SMS provider. It needs a Malaysian sender ID, delivery receipts and an OTP template. Decide before M01 T01.4 goes to production. Development uses `Sms::Fake`.

## ADR-013 · Admin UI: Tailwind v4 + ViewComponent, ported from the prototype

- **Decision:**
  - The tokens from the prototype's `@theme` block and `admin/ui.css` move to `app/assets/tailwind/application.css` unchanged.
  - Each prototype pattern becomes one component under `app/components/ui/` (list in M02).
  - The prototype's table-to-cards fallback (`fitIx`) becomes the Stimulus controller `index-fit`.
- **Turned down:** a component kit (DaisyUI, Flowbite). It would fight the established design system in `DESIGN.md`.

## ADR-014 · State machines as plain Ruby

- **Decision:** Status columns are Rails enums (string-backed). Allowed transitions live in a frozen hash on the model, e.g. `Permit::TRANSITIONS`. Every move goes through one service, which:
  - checks the hash;
  - writes the change;
  - records an `AuditEvent`;
  - calls `Notifier`.
- **Turned down:** `aasm` / `statesman`. A hash and one service is less to learn and easier to test.

## ADR-015 · Search with Postgres

- **Decision:** Index pages search with `ILIKE` backed by `pg_trgm` GIN indexes on the searched columns (names, references, plates, phone numbers).
- **Turned down:** Elasticsearch / Meilisearch. The largest table at launch (visitor log) stays within what Postgres handles comfortably for years.

## ADR-016 · Pagination

- **Decision:**
  - Admin index pages use Pagy with page numbers, matching the prototype pager.
  - The API uses cursor (keyset) pagination: `?cursor=<opaque>&limit=` (default 25, max 100), returning `meta.next_cursor`.

## ADR-017 · Live updates

- **Decision:**
  - Web surfaces get Turbo Streams over Solid Cable for the on-site board, gate arrivals, guard console queues and the sidebar counts.
  - Mobile gets push notifications plus pull-to-refresh, with no websocket for mobile in v1.

## ADR-018 · Audit trail

- **Decision:** Use our own `audit_events` table, with these columns:
  - actor
  - action key
  - target type / id / label
  - taman
  - IP
  - metadata JSON
  - timestamp
- **How it's written:** by `AuditEvent.record!`, which the domain services call.
- **Turned down:** `paper_trail`. It records row versions, and the admin audit log needs readable actions ("Approved permit PMT-2689").

## ADR-019 · Files

- **Decision:**
  - Active Storage with S3-compatible storage in production, and Disk in development and tests.
  - Uploads are limited by content type (PDF, JPEG, PNG, HEIC) and size (10 MB).
  - Downloads use expiring URLs, and only after a policy check.

## ADR-020 · Hosting

- **Decision:**
  - Kamal 2 to one or two VMs.
  - Managed PostgreSQL 16 in a Malaysian or Singapore region, for PDPA residency and latency.
  - Thruster in front of Puma.
  - Nightly logical backups plus point-in-time recovery from the managed database.
- **Turned down:** Heroku-style PaaS, for cost and region choice.

## ADR-021 · Staff on the mobile app

- **Decision:**
  - Staff can sign in on the mobile app (`FEATRURES.md`, "Sign in / register … management staff").
  - In v1 the staff mode is the notification center plus deep links that open the dashboard page in the browser.
  - No staff-only mobile screens exist in the storyboard, so none are built.
- **Revisit:** when a staff mobile flow is designed.

## Open questions for the business

These don't block the start; each names the task that needs the answer.

1. **Payment gateway provider.** Needed by M06 T06.4.
2. **SMS provider and sender ID.** Needed before production use of M01 T01.4.
3. **Firebase project ownership** (company account, not personal). Needed by M10 T10.3.
4. **Who pays gateway fees** (absorbed by the company or passed to the resident). Needed by M06 T06.4.
5. **Retention for the visitor log and IC/passport scans** under PDPA. Needed by M14 T14.2. The default in this plan is 12 months for visitor logs, and permit documents purged 6 months after the deposit closes.
