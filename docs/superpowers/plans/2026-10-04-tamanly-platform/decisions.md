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
| Residents, owners, sub-tenants, guards | mobile | Firebase phone sign-in in the app. Rails verifies the Firebase ID token (`POST /api/v1/auth/firebase`) and issues its own API tokens |
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
  - Delivery happens in `Notifications::PushJob` on Solid Queue.
  - The Firebase projects are created and owned by us: one for staging, one for production. The same project also runs phone sign-in (ADR-012).
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
  - M06 ships `Payments::Gateways::Fake` for development and tests, plus the Billplz adapter (ADR-011a).
  - Bank-transfer receipts are a payment method too: the resident uploads a slip and staff verify it.
  - Deposit refunds are paid out by the company's bank (IBG). The app records the payout reference rather than calling the gateway.

## ADR-011a · Billplz, with one Billplz account per paying-in bank account (decided 2026-10-04, revised the same day)

- **Decision:** Online payments go through Billplz API v3, using the **customer's own** Billplz accounts. Tamanly never holds residents' money.
  - Hosts:
    - production: `https://www.billplz.com/api/v3`
    - sandbox: `https://www.billplz-sandbox.com/api/v3`
  - Auth is HTTP Basic, with the account's API secret key as the username.
- **Payout accounts:**
  - A customer (a management company) connects one or more **payout accounts** in Tamanly. Each is one Billplz account: its API secret key, its X Signature Key, and the bank account it pays out to.
  - Billplz allows exactly one bank account per Billplz account, so:

    | Situation | Payout accounts |
    |---|---|
    | A company that collects for several tamans into one client account | One account, used by all of them |
    | A taman whose owners' body or residents' association has its own bank account | Its own account |
    | A strata taman | Two accounts: the maintenance account and the sinking fund account. The Strata Management Act 2013, section 51, requires separate bank accounts. Sinking-fund invoices go to the second |

  - **Payout routes** say which account each taman uses, and from which date.
    - Each taman has one `default` route, plus optional `sinking_fund` and `deposits` routes.
    - The `deposits` route is the "bank account for refunds" in FEATRURES.md: permit deposits and fees are paid into it and refunded from it.
    - Each route has its own Billplz collection inside that account, so the customer's Billplz reports split by taman.
- **One payment, one bill.** `POST /bills` on the route's account with:
  - `collection_id`
  - `email` or `mobile`
  - `name`
  - `amount` in sen
  - `description`
  - `callback_url`
  - `redirect_url`
  - `reference_1_label: "Payment"` and `reference_1: <PAY-reference>`

  The bill `id` becomes `payments.provider_ref`. The bill `url` is where the app sends the resident, and the payer picks FPX, card or e-wallet on the Billplz page.
- **One app address for every customer.** Billplz takes the callback URL per bill, so each bill points to `/webhooks/payments/billplz/<payout_account_id>`, and Tamanly verifies the callback with that account's X Signature Key.
- **Confirmation:**
  - The signed server-to-server callback is the only thing that settles a payment.
  - The signed redirect only shows the result screen.
  - A poller checks `GET /bills/:id` for payments still pending after 10 minutes.
- **Deduplication:** Billplz callbacks carry no event id, so `"#{bill_id}:#{state}"` is the dedupe key.
- **Fees:**
  - Residents always pay exactly the bill amount.
  - Billplz takes its transaction fee from the customer's own Billplz Credit Balance, and from their payouts when that runs out, so the customer bears it directly.
  - Tamanly charges its own fees on a monthly invoice (ADR-025).
- **Settlement:** Billplz's standard schedule pays each day's collections into the customer's bank on the next business day. Tamanly builds nothing for it. A customer who wants real-time payouts can apply for Billplz's FPX Own ID; that is a Billplz-side setting.
- **Changing where money goes:**
  - A new bank account is changed inside the customer's Billplz account. Nothing changes in Tamanly.
  - A new receiver is handled by repointing the taman's route from a cut-over date (M13 T13.2). Examples:
    - the developer hands over to the owners' body;
    - the owners' body becomes the management corporation;
    - the taman changes management company.

    Unpaid bills open under the old account are cancelled, so nobody pays the old receiver.
- **Turned down:**
  - **Billplz split payments from a Tamanly-owned account.** Every receiver still needs its own verified Billplz account, so onboarding is no easier. The fees would land on Tamanly and need recharging. Tamanly would also appear as the merchant on every resident's payment and would sit in the money flow.
  - **Collecting into Tamanly's account and paying out with Billplz Payment Orders.** Tamanly would hold other people's money, including deposits held for months. That needs prefunding, daily remittance and reconciliation, and invites payment-regulation questions.
  - **Other gateways:** iPay88, Razer Merchant Services, Stripe.

## ADR-012 · No SMS provider: push, email and Firebase phone sign-in (decided 2026-10-04)

- **Decision:** The app sends no SMS of its own.
  - **Phone sign-in:** Firebase Authentication sends and checks the one-time code inside the mobile app. Rails only verifies the Firebase ID token: the RS256 signature against Google's published certificates, `aud` = project id, `iss` = `https://securetoken.google.com/<project id>`, and expiry. It then reads the verified `phone_number`.
  - **Notifications:** go out by push and email only (contracts §10). Push is the primary channel.
  - **Invites to people without the app:** the sender shares a prefilled WhatsApp link (`https://wa.me/<number>?text=...`) from their own phone or browser. No provider is involved. The invite waits on the server until that phone number signs in.
  - **Broadcasts:** email and push only (M09).
  - **Email:** Action Mailer over SMTP, with per-organisation sender settings (M13).
- **Why:** one less provider to contract, configure and monitor. Firebase is already needed for push.
- **Cost to know:**
  - Firebase phone sign-in is billed per verification SMS on the Blaze plan.
  - Turn on Firebase App Check (Play Integrity on Android, App Attest on iOS) before launch, so bots can't run up SMS charges.
- **Consequence:** the FEATRURES.md line "Broadcast SMS / email / in-app (where configured)" ships without the SMS part. A resident who has neither the app nor an email address receives nothing from the platform.
- **Turned down:** our own SMS provider for OTP, invites and broadcasts.

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

## ADR-024 · Keep data for the life of the service (decided 2026-10-04)

- **Decision:** No automatic deletion of visitor logs, permit documents or other records while the service runs in Malaysia.
  - Account deletion on request (M11 T11.2) and personal-data export (M14 T14.2) still ship. The app stores require the first; PDPA access rights require the second.
  - Each data type gets a retention setting in `Setting`, off by default. A portfolio admin can switch one on later without a code change.
- **Note:** PDPA 2010's retention principle (section 10) says personal data shouldn't be kept longer than its purpose needs. Worker IC/passport scans are the most sensitive item. Have the privacy notice reviewed before launch, and consider switching on purging for those scans.

## ADR-025 · Tamanly is the service provider; customers subscribe (decided 2026-10-04)

- **Decision:** Tamanly runs the platform. Management companies are subscribing customers.
- **Platform console:** a separate `/platform` area (M15) for Tamanly's own staff, who are `users.platform_role` = `operator`, not staff of any customer. It covers:
  - onboarding customers;
  - plans and subscriptions;
  - monthly invoices to customers;
  - suspension for non-payment;
  - payout-account health across customers.
- **What Tamanly charges a customer each month:**
  - a subscription priced per unit, with a monthly minimum;
  - an additional per-payment platform fee for each online resident payment processed in that month.

  The rates live on the plan and can be overridden per customer.
- **How Tamanly collects:** with its own Billplz account (`Rails.application.credentials.billplz_platform`). Its callback goes to `/webhooks/payments/billplz/platform`. That account receives only Tamanly's own invoices, never residents' money.
- **Suspension:**
  - A suspended customer's staff can sign in and pay their Tamanly invoice, but every other admin write is blocked behind a banner.
  - Residents and guards are never cut off, because a guardhouse and a resident's bills shouldn't stop over a supplier dispute.

## Resolved business questions

| # | Question | Answer (2026-10-04) | Recorded in |
|---|---|---|---|
| 1 | Payment gateway | Billplz, using each customer's own Billplz accounts (payout accounts) | ADR-011a, M06 T06.4, M13 T13.2 |
| 2 | SMS provider | None: Firebase phone sign-in, push and email | ADR-012, M01 T01.4, M11 T11.2 |
| 3 | Firebase project owner | Us (staging and production projects) | ADR-006, M10 T10.3, M14 T14.5 |
| 4 | Who pays gateway fees | Residents pay the bill amount only. Billplz charges its fee to the customer's own account, and Tamanly adds its own per-payment fee to the customer's monthly invoice | ADR-011a, ADR-025, M15 T15.4 |
| 5 | Data retention | Keep for the life of the service in Malaysia | ADR-024, M14 T14.2 |
| 6 | Settling collected money to customers | Payments go straight into each customer's own Billplz account; Tamanly never holds the money | ADR-011a |
| 7 | Business model | Tamanly is the service provider; management companies subscribe | ADR-025, M15 |
