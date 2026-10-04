# M09 · Communications

**Status:** Not started · **Owner:** — · **Wave:** 3 · **Depends on:** M03 and M10. Also M02 and M11.

**Goal:** Management publishes announcements to a whole taman or to chosen blocks and units, and sends SMS or email broadcasts from a bilingual template library. Residents see the announcements in a home feed, together with alerts that need their attention.

**Read first:**
- `../contracts.md` §5, §10 and §14
- `../decisions.md` ADR-012 (SMS and email adapters)

**Feature coverage (FEATRURES.md):**

| Surface | Feature | Covered here |
|---|---|---|
| Web | Announcements (taman-wide or unit-targeted) | All |
| Web | Broadcast SMS / email / in-app (where configured) | All |
| Web | Template library | All |
| Mobile | Taman / property home feed (announcements, alerts) | All |
| Mobile | Push for announcements | All |
| Shared | Announcements: publish on web, consume on mobile | All |

**Prototype references:**
- Admin pages:
  - `admin/#/announcements`
  - `admin/#/broadcasts`
  - `admin/#/templates`
- Seed data in `admin/data.js`: `ANNOUNCEMENTS`, `BROADCASTS`, `TEMPLATES`
- Storyboard screen H0, the home feed

## Data model

**`announcements`**

| Column | Notes |
|---|---|
| `reference` | |
| `organization_id` | |
| `taman_ids` | `uuid[]` |
| `audience` | `everyone` / `owners` / `tenants` / `blocks` / `units` |
| `target_ids` | `uuid[]` of blocks or units |
| `title_en`, `title_ms`, `body_en`, `body_ms` | `*_ms` is optional and falls back to `*_en` |
| `channels` | `text[]`: `in_app`, `push`, `email` |
| `status` | `draft` / `scheduled` / `sent` / `archived` |
| `publish_at`, `sent_at` | |
| `pinned_until` | |
| `created_by_id` | |
| `recipients_count` | |

An announcement can have an attached `image`.

**`announcement_reads`**

| Column | Notes |
|---|---|
| `announcement_id` | |
| `user_id` | |
| `read_at` | |

Unique on `[announcement_id, user_id]`.

**`message_templates`**

| Column | Notes |
|---|---|
| `organization_id` | |
| `name` | |
| `channel` | `sms` / `email` / `push` |
| `category` | `billing` / `security` / `facilities` / `general` |
| `subject_en`, `subject_ms`, `body_en`, `body_ms` | |
| `archived_at` | |

**`broadcasts`**

| Column | Notes |
|---|---|
| `reference` | |
| `organization_id` | |
| `taman_ids`, `audience`, `target_ids` | Same rules as announcements |
| `channel` | `sms` / `email` |
| `template_id` | |
| `subject`, `body` | |
| `status` | `draft` / `scheduled` / `sending` / `sent` / `partly_failed` / `failed` |
| `scheduled_at`, `sent_at` | |
| `recipients_count`, `delivered_count`, `failed_count` | |
| `created_by_id` | |

**`broadcast_deliveries`**

| Column | Notes |
|---|---|
| `broadcast_id` | |
| `user_id` | |
| `to` | |
| `status` | `queued` / `sent` / `failed` |
| `error` | |
| `sent_at` | |

Template variables come from a fixed list and are checked when the template is saved. A broadcast fills them per recipient:
- `%{name}`
- `%{unit}`
- `%{taman}`
- `%{amount_due}`
- `%{due_date}`
- `%{date}`

## Interfaces

**Produces:**

```ruby
Audience.resolve(taman_ids:, audience:, target_ids:)   # => User relation (active occupancies; owners/tenants filter; never ended tenancies)
Announcements::Publish.call(announcement)               # idempotent; sets sent, fans out Notifier "announcement.published"
Broadcasts::Send.call(broadcast)                        # fans out per-recipient jobs; updates counts
Feed::Registry.alert(key) { |occupancy| [Feed::Alert(title:, body:, deep_link:, tone:)] }   # modules register home-feed alerts
```

**Consumes:**
- From M03: `Occupancy.active`, `Unit`, `Block`
- From M10: `Notifier`
- From M01: `Sms` and the mailer settings from M13

## API endpoints

| Method | Path | Screen |
|---|---|---|
| GET | `/api/v1/feed` | H0. Needs `X-Unit-Id`. Returns `{ alerts: [...], announcements: [...] }`, with pinned announcements first and then the newest, cursor-paginated |
| GET | `/api/v1/announcements/:id` | Detail. Marks it read |

## Tasks

### T09.1 · Announcements

**Files:**
- Create:
  - migrations and models for announcements and reads
  - `app/services/audience.rb`
  - `app/services/announcements/publish.rb`
  - `app/jobs/announcements/publish_due_job.rb`
  - `app/controllers/admin/announcements_controller.rb`
  - views
  - catalog entry `announcement.published`
- Test:
  - `spec/services/audience_spec.rb`
  - `spec/services/announcements/publish_spec.rb`
  - `spec/requests/admin/announcements_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **`Audience.resolve`**
    - `everyone` returns all active occupants of the tamans.
    - `owners` returns owners only.
    - `blocks` returns occupants of units in those blocks.
    - `units` returns exactly those units.
    - Ended tenancies are excluded.
    - Target ids from another organisation are ignored (Review Focus 1).
  - **Publishing**
    - Publishing sets `sent` and `recipients_count`.
    - It calls `Notifier.deliver("announcement.published", to: users, record: announcement)`, and push only goes out when `push` is in `channels`.
    - Email is sent only when `email` is in `channels`.
    - Publishing twice sends nothing new.
  - **Scheduling.** A scheduled announcement is published by `PublishDueJob`, which runs every minute, at `publish_at` in KL time.
  - **Announcements page** (`admin/#/announcements`)
    - Tabs: Sent, Scheduled, Drafts, Archived.
    - Search by title.
    - The compose drawer has:
      - taman multi-select;
      - an audience picker that shows a live count: "Goes to 412 people in 380 units";
      - EN and BM fields, with the "BM version" field optional;
      - channel checkboxes;
      - "Publish now" or a schedule date and time;
      - "Pin for N days".
    - The read rate shows as "312 of 412 read".
  - **Permissions and audit**
    - Writing needs `communications: edit`.
    - Actions are audited as `announcement.published` and `announcement.scheduled`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed from `ANNOUNCEMENTS` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add announcements with audience targeting and scheduling"`.

### T09.2 · Home feed API and feed alerts

**Files:**
- Create:
  - `app/models/feed/registry.rb`
  - `app/controllers/api/v1/{feed,announcements}_controller.rb`
  - serializers
  - `config/initializers/feed_alerts.rb`
- Test:
  - `spec/requests/api/v1/feed_spec.rb` (rswag)
  - `spec/models/feed/registry_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Announcements in the feed**
    - The feed lists announcements for the current unit's taman and audience, in the user's locale, falling back to EN when BM is empty.
    - Pinned announcements come first while `pinned_until` is in the future.
    - Each one has a `read` flag.
    - A tenant doesn't see an owners-only announcement.
  - **Alerts.** They come from `Feed::Registry`, and each provider is called with `Current.occupancy`:
    - Billing (M06): "RM 185.00 overdue since 16 Oct". Shown only when the user holds `bills_view`.
    - Bookings (M07): "Badminton court A today at 20:00".
    - Permits (M05): "Upload the missing document for PMT-2689".
    - Visitors (M04): "2 visitors expected today".
    - A module that hasn't landed simply registers nothing.
    - A failing provider is skipped and reported to `Rails.error`.
  - **Detail.** `GET /announcements/:id` marks the announcement read. An announcement for another audience returns 404.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Register the four alert providers in `config/initializers/feed_alerts.rb`, guarding each with `defined?(Invoice)`, `defined?(Booking)` and so on. When the owning module lands, it moves its provider into its own initializer.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add home feed with announcements and alerts"`.

### T09.3 · Templates and SMS/email broadcasts

**Files:**
- Create:
  - migrations and models for templates, broadcasts and deliveries
  - `app/services/broadcasts/send.rb`
  - `app/jobs/broadcasts/{deliver,send_due}_job.rb`
  - `app/controllers/admin/{templates,broadcasts}_controller.rb`
  - views
- Test:
  - `spec/models/message_template_spec.rb`
  - `spec/services/broadcasts/send_spec.rb`
  - `spec/requests/admin/broadcasts_spec.rb`

- [ ] **Step 1: Write failing specs.**
  - **Templates**
    - An unknown variable is rejected: "%{balance} isn't a variable you can use. Pick from: name, unit, taman, amount_due, due_date, date."
    - SMS bodies over 306 characters (2 segments) get a warning showing the segment count.
    - A template used by a scheduled broadcast can't be archived.
  - **Sending**
    - `Broadcasts::Send` creates one delivery per recipient who has a phone (for SMS) or an email address (for email). Recipients without one are counted as failed with the error "No phone number".
    - It renders the variables per recipient, in their locale.
    - Delivery jobs update the counts.
    - It ends as `partly_failed` when any delivery fails, `sent` when none fail, and `failed` when all fail.
  - **Scheduling and limits**
    - Scheduled broadcasts send at `scheduled_at`.
    - SMS broadcasts need the SMS integration to be connected (M13). Otherwise sending is blocked with "Connect an SMS gateway in Settings → Integrations first."
  - **Broadcasts page** (`admin/#/broadcasts`)
    - Lists broadcasts with delivered and failed counts. The drawer shows the failed recipients and their reasons, and a "Retry failed" button.
  - **Templates page** (`admin/#/templates`)
    - Filter by channel and category. The editor shows EN and BM side by side with a preview.
  - **Permissions and audit**
    - Sending needs `communications: full`.
    - Sending is audited as `broadcast.sent`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Seed from `BROADCASTS` and `TEMPLATES` in `admin/data.js`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add message templates and SMS/email broadcasts"`.

## Module done when

- [ ] An announcement scheduled for 09:00 KL goes out at 09:00 KL as a push to the right audience and appears in the home feed.
- [ ] An SMS broadcast through the Fake SMS adapter reports accurate delivered and failed counts.

## Progress log

| Date | Who | Note |
|---|---|---|
