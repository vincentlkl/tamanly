# M10 · Notifications & push

**Status:** Not started · **Owner:** — · **Wave:** 2 · **Depends on:** M01, M11. M03 is needed for unit recipient helpers; until it lands, code against `Unit#recipients` from contracts.

**Goal:** One call, `Notifier.deliver`, takes any event to the right people. It always lands in the in-app inbox. It is also sent by push (FCM HTTP v1 to Android and iOS) or email, following the event catalog and each person's preferences. Staff see their events in the dashboard bell.

**Read first:**
- `../contracts.md` §5 (Notifier) and §10 (event catalog)
- `../decisions.md` ADR-006 and ADR-021
- Review Focus 4

**Feature coverage (FEATRURES.md):**

| Area | Feature | Covered |
|---|---|---|
| Mobile | Push for visitor arrival, bills due, booking confirmations, permit status and deposit updates, announcements | Delivery. The events are fired by M04–M09 |
| Mobile | In-app notification center | All |
| Mobile | Profile, language (EN / BM), notification prefs | Prefs |
| Mobile | Receipt history & reminders | Reminder delivery |
| Mobile | Push reminders before booked time | Delivery |
| Web | Staff bell | All |

**Prototype references:**
- Storyboard:
  - B5 Notification center
  - B6 Push on lock screen
  - G3 Notification prefs
- The admin bell popover in `admin/app.js` (`topBar()`)

## Data model

| Table | Columns | Notes |
|---|---|---|
| `devices` | `user_id`, `device_uid`, `platform` (`ios`/`android`), `fcm_token`, `app_version`, `os_version`, `locale`, `last_seen_at` | Unique `device_uid`. Unique `fcm_token`, partial, not null |
| `notifications` | `user_id`, `event_key`, `title`, `body`, `deep_link`, `admin_path`, `record_type`, `record_id`, `taman_id`, `data` (jsonb), `read_at`, `created_at` | Index `[user_id, created_at desc]`. Partial index `[user_id] WHERE read_at IS NULL` |
| `notification_deliveries` | `notification_id`, `channel` (`push`/`email`), `device_id`, `status` (`queued`/`sent`/`failed`/`skipped`), `error`, `attempts`, `sent_at` | Index `[notification_id]` |
| `notification_preferences` | `user_id`, `category`, `push`, `email` (booleans) | Unique `[user_id, category]`. A missing row uses the catalog defaults |

Preference categories, as shown on G3: `visitors`, `bills`, `bookings`, `permits`, `announcements`, `marketplace`, `account`.

## Interfaces

**Produces** (contracts §5 and §10):

```ruby
Notifier.deliver(event_key, record:, to: nil, params: {})   # => Array<Notification>

Notifications::Catalog.register(
  "visitor.arrived",
  category: :visitors,
  recipients: ->(pass) { [pass.created_by, *pass.unit.recipients(scope: :visitor_passes)] },
  channels: %i[push],            # default-on channels; inbox is always on unless inbox: false
  mandatory: false,
  priority: :high,               # :high | :normal
  ttl: nil,                      # seconds; nil = FCM default (4 weeks)
  collapse_key: ->(pass) { "pass-#{pass.id}" },
  deep_link: ->(pass) { "tamanly://visitors/#{pass.id}" },
  admin_path: nil,               # ->(record) { "/admin/..." } for staff events
  params: ->(pass) { { name: pass.visitor_name, gate: pass.last_gate_name } }
)
# Templates: config/locales/{en,ms}/notifications.yml -> notifications.<event_key>.title / .body

Notifications::Recipients.staff(taman, module_key)   # active staff covering the taman with >= view on module_key
Notifications::Recipients.on_duty_guards(taman)      # M04 replaces the body; until then: all guard memberships for the taman

Push::Fcm.new.deliver(token:, title:, body:, data:, high_priority:, ttl:, collapse_key:, badge:)  # => Push::Fcm::Result(status, error, retry_after)
```

**Consumes:**
- `User#locale` and `Permissions` (M01)
- `Unit#recipients` (M03)
- `Api::V1::BaseController` (M11)

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| PUT | `/api/v1/devices/current` | Upsert `{ fcm_token, platform, app_version, os_version }` for `X-Device-Id` |
| DELETE | `/api/v1/devices/current` | Forget the push token, e.g. when push is turned off in OS settings |
| GET | `/api/v1/notifications` | Inbox, cursor-paginated. `?unread=true` filters |
| POST | `/api/v1/notifications/:id/read` | Mark one read |
| POST | `/api/v1/notifications/read_all` | Mark all read |
| GET | `/api/v1/notification_preferences` | Categories with `push`/`email`, the locked events and the reason they're locked |
| PUT | `/api/v1/notification_preferences` | `{ preferences: [{ category, push, email }] }` |

## Tasks

### T10.1 · Device registration

**Files:**
- Create: migration, `app/models/device.rb`, `app/controllers/api/v1/devices_controller.rb`
- Modify: `app/services/auth/tokens.rb` (`revoke!` also clears the device's `fcm_token`)
- Test: `spec/requests/api/v1/devices_spec.rb`

- [ ] **Step 1: Write the failing specs.**
  - PUT creates the device on first call and updates on later calls, keyed by `X-Device-Id`.
  - When the same `fcm_token` arrives for a different user (a shared phone after sign-out and sign-in), the token moves to the new user's device row and the old row's `fcm_token` becomes `nil`.
  - A missing `X-Device-Id` returns 400.
  - Signing out (`DELETE /auth/session`) sets `fcm_token` to nil for that `device_uid`.
  - `platform` must be `ios` or `android`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the controller.** Use `Device.upsert` inside a transaction that first nulls any other row holding the same `fcm_token`.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add device registration for push"`.

### T10.2 · Inbox API

**Files:**
- Create:
  - migration for `notifications`
  - `app/models/notification.rb`
  - `app/controllers/api/v1/notifications_controller.rb`
  - `app/serializers/api/v1/notification_serializer.rb`
- Modify: `app/serializers/api/v1/me_serializer.rb` (`unread_notifications`)
- Test: `spec/requests/api/v1/notifications_spec.rb` (rswag)

- [ ] **Step 1: Write the failing specs.**
  - The list is newest first, cursor-paginated, and only shows my notifications.
  - `?unread=true` filters to unread.
  - Each item has `id`, `event`, `title`, `body`, `deep_link`, `read`, `created_at`, and `taman { id, short_name }`.
  - `read` and `read_all` set `read_at`.
  - Someone else's notification returns 404.
  - `me.unread_notifications` counts unread.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Add `Notification.unread_count_for(user)`, using the partial index.

- [ ] **Step 4: Run the specs.** Expected: PASS.

- [ ] **Step 5: Commit** with `git commit -m "Add notification inbox API"`.

### T10.3 · FCM HTTP v1 client and push delivery job

**Files:**
- Create:
  - `app/lib/push/fcm.rb`
  - migration and model for `notification_deliveries`
  - `app/jobs/notifications/push_job.rb`
- Test:
  - `spec/lib/push/fcm_spec.rb` (WebMock)
  - `spec/jobs/notifications/push_job_spec.rb`

**Credentials:** `bin/rails credentials:edit` → `firebase: { project_id:, service_account_json: }`. This is the same entry M01 T01.4 reads for phone sign-in. Use the Firebase projects we create: staging credentials in staging, production in production (ADR-006).

- [ ] **Step 1: Write the failing client specs** with WebMock stubs.
  - The OAuth token request goes to `https://oauth2.googleapis.com/token`. The token is cached and reused for 50 minutes: two deliveries make only one token request.
  - A send posts to `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send` with the payload below. All `data` values are strings.
  - Responses map to results:

    | Response | Result |
    |---|---|
    | 200 | `:sent` |
    | 404 with `UNREGISTERED` | `:unregistered` |
    | 429 with `Retry-After: 30` | `:retry`, `retry_after` 30 |
    | 503 | `:retry` |
    | 400 `INVALID_ARGUMENT` | `:invalid` |

  Payload:

  ```json
  { "message": {
      "token": "<fcm_token>",
      "notification": { "title": "Visitor at the gate", "body": "Tan Wei Ming arrived at Main gate" },
      "data": { "deep_link": "tamanly://visitors/<id>", "notification_id": "<id>", "event": "visitor.arrived" },
      "android": { "priority": "HIGH", "collapse_key": "pass-<id>", "notification": { "channel_id": "gate" } },
      "apns": { "headers": { "apns-priority": "10", "apns-collapse-id": "pass-<id>" },
                "payload": { "aps": { "sound": "default", "badge": 3 } } } } }
  ```

  For normal priority, use `"priority": "NORMAL"`, `"apns-priority": "5"` and `"channel_id": "general"`. When `ttl` is set, add `"ttl": "60s"` on Android and `"apns-expiration"` (unix seconds) on iOS.

- [ ] **Step 2: Write the failing job specs.**
  - `PushJob.perform_now(delivery)` sends to every device of the user that has an `fcm_token`, with one delivery row per device.
  - The badge equals the user's unread count.
  - `:unregistered` clears `device.fcm_token`, and the delivery becomes `failed` with the error `UNREGISTERED`.
  - `:retry` re-enqueues with `wait: retry_after || 2**attempts` seconds, up to 5 attempts, then `failed`.
  - A user with no devices gets a delivery marked `skipped` with the error `no_devices`.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement `Push::Fcm`.**

  ```ruby
  module Push
    class Fcm
      SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
      Result = Data.define(:status, :error, :retry_after)

      def initialize(creds: Rails.application.credentials.firebase)
        @project_id = creds.fetch(:project_id)
        @json = creds.fetch(:service_account_json)
      end

      def deliver(token:, title:, body:, data:, high_priority: false, ttl: nil, collapse_key: nil, badge: nil)
        uri = URI("https://fcm.googleapis.com/v1/projects/#{@project_id}/messages:send")
        res = Net::HTTP.post(uri, { message: message(token, title, body, data, high_priority, ttl, collapse_key, badge) }.to_json,
                             "Authorization" => "Bearer #{access_token}", "Content-Type" => "application/json")
        return Result.new(:sent, nil, nil) if res.is_a?(Net::HTTPSuccess)
        err = JSON.parse(res.body).dig("error", "details")&.find { _1["errorCode"] }&.dig("errorCode") rescue nil
        err ||= JSON.parse(res.body).dig("error", "status") rescue res.code
        case err
        when "UNREGISTERED" then Result.new(:unregistered, err, nil)
        when "INVALID_ARGUMENT" then Result.new(:invalid, err, nil)
        when "QUOTA_EXCEEDED", "UNAVAILABLE", "INTERNAL" then Result.new(:retry, err, res["Retry-After"]&.to_i)
        else Result.new(:failed, err.to_s, nil)
        end
      end

      private

      def access_token
        Rails.cache.fetch("fcm-access-token", expires_in: 50.minutes) do
          Google::Auth::ServiceAccountCredentials.make_creds(json_key_io: StringIO.new(@json), scope: SCOPE).fetch_access_token!.fetch("access_token")
        end
      end

      def message(token, title, body, data, high, ttl, collapse, badge)
        android = { priority: high ? "HIGH" : "NORMAL", notification: { channel_id: high ? "gate" : "general" } }
        android[:ttl] = "#{ttl}s" if ttl
        android[:collapse_key] = collapse if collapse
        headers = { "apns-priority" => high ? "10" : "5" }
        headers["apns-expiration"] = (Time.current + ttl).to_i.to_s if ttl
        headers["apns-collapse-id"] = collapse if collapse
        { token:, notification: { title:, body: }, data: data.transform_values(&:to_s), android:,
          apns: { headers:, payload: { aps: { sound: "default", badge: }.compact } } }
      end
    end
  end
  ```

- [ ] **Step 5: Implement `Notifications::PushJob`.** In test and development, `Push::Fcm` is replaced by `Push::Fake` (records messages), configured as `Push.client`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add FCM HTTP v1 push delivery"`.

### T10.4 · `Notifier` and the event catalog

**Files:**
- Create:
  - `app/services/notifier.rb`
  - `app/notifications/catalog.rb`
  - `app/notifications/recipients.rb`
  - `app/jobs/notifications/email_job.rb`
  - `app/mailers/notification_mailer.rb`
  - `app/views/notification_mailer/notify.{html,text}.erb`
  - `config/locales/{en,ms}/notifications.yml`
- Test:
  - `spec/services/notifier_spec.rb`
  - `spec/notifications/catalog_spec.rb`
  - `spec/mailers/notification_mailer_spec.rb`

- [ ] **Step 1: Write the failing specs** using a test-only catalog entry `test.ping`.
  - `Notifier.deliver("test.ping", record: unit)` creates one `Notification` per recipient.
  - Title and body render in **each recipient's** locale: an `ms` user gets BM.
  - Default channels queue one delivery each.
  - An unknown event key raises `KeyError`. This catches typos in tests.
  - A disabled user is skipped.
  - Passing `to:` overrides the resolver.
  - With `inbox: false` and no channels allowed, no rows are created.
  - Delivery jobs are enqueued **after commit**. Calling inside a rolled-back transaction sends nothing.
  - Every key in contracts §10 has EN and BM templates. A catalog spec walks `Catalog.all` and checks that `I18n.exists?` holds for both locales. Each module adds its own keys, so this spec grows with them.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement `Notifier`.**

  ```ruby
  module Notifier
    module_function

    def deliver(event_key, record:, to: nil, params: {})
      ev = Notifications::Catalog.fetch(event_key)
      users = Array(to || ev.recipients.call(record)).compact.uniq.select(&:active?)
      vars = ev.params.call(record).merge(params)
      users.filter_map do |u|
        channels = ev.channels.select { |c| ev.mandatory || NotificationPreference.allowed?(u, ev.category, c) }
        next if !ev.inbox && channels.empty?
        n = I18n.with_locale(u.locale) do
          Notification.create!(user: u, event_key:, record:, taman: record.try(:taman),
                               title: I18n.t("notifications.#{event_key}.title", **vars),
                               body: I18n.t("notifications.#{event_key}.body", **vars),
                               deep_link: ev.deep_link&.call(record), admin_path: ev.admin_path&.call(record),
                               read_at: (ev.inbox ? nil : Time.current))
        end
        channels.each do |c|
          d = n.deliveries.create!(channel: c, status: "queued")
          ActiveRecord.after_all_transactions_commit { Notifications.job_for(c).perform_later(d) }
        end
        n
      end
    end
  end
  ```

  Notes:
  - `ActiveRecord.after_all_transactions_commit` exists from Rails 7.2. It runs the block immediately when there is no open transaction.
  - `Notifications.job_for(:push)` returns `PushJob`, and `:email` returns `EmailJob`. There is no SMS channel (ADR-012).

- [ ] **Step 4: Implement `Notifications::Recipients.staff(taman, module_key)`.** It returns active memberships of `taman.organization` that cover the taman, have `admin?` and pass `Permissions.allows?(m.user, module_key, :view, taman)`, mapped to their users.

- [ ] **Step 5: Implement the email channel.**
  - `NotificationMailer.notify(notification)` uses one branded template: logo, title, body, and a button to the deep link's web fallback or `admin_path`. The sender comes from the organisation's settings (M13), falling back to `notices@tamanly.app`.
  - Users without an email address are skipped for this channel, and their delivery is marked `skipped` with `no_email`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add Notifier, event catalog and email channel"`.

### T10.5 · Preferences and recipient rules (Review Focus 4)

**Files:**
- Create:
  - migration and model `notification_preferences`
  - `app/controllers/api/v1/notification_preferences_controller.rb`
- Test:
  - `spec/requests/api/v1/notification_preferences_spec.rb`
  - `spec/services/notifier_recipients_spec.rb`

- [ ] **Step 1: Write the failing recipient-rule specs.** They use real occupancies from M03 factories.

  ```ruby
  RSpec.describe "Notifier recipients" do
    before do
      Notifications::Catalog.register("test.bill", category: :bills, channels: %i[push],
        recipients: ->(unit) { unit.recipients(scope: :bills_view) }, params: ->(_) { {} }, deep_link: ->(_) { "tamanly://invoices" })
    end
    let(:unit) { create(:unit) }

    it "skips a tenant whose tenancy ended between scheduling and sending" do
      tenant = create(:occupancy, unit:, relationship: "tenant")
      Occupancies::End.call(tenant, on: Date.current, reason: "moved out")
      expect(Notifier.deliver("test.bill", record: unit).map(&:user)).not_to include(tenant.user)
    end

    it "skips a sub-tenant without bills_view" do
      sub = create(:occupancy, unit:, relationship: "sub_tenant", scopes: %w[visitor_passes])
      expect(Notifier.deliver("test.bill", record: unit).map(&:user)).not_to include(sub.user)
    end

    it "honours a push opt-out but still writes the inbox" do
      owner = create(:occupancy, unit:, relationship: "owner").user
      NotificationPreference.create!(user: owner, category: "bills", push: false, email: false)
      n = Notifier.deliver("test.bill", record: unit).find { _1.user == owner }
      expect(n).to be_present
      expect(n.deliveries).to be_empty
    end

    it "ignores opt-outs for mandatory events" do
      Notifications::Catalog.register("test.must", category: :bills, channels: %i[push], mandatory: true,
        recipients: ->(unit) { unit.recipients }, params: ->(_) { {} }, deep_link: ->(_) { "tamanly://x" })
      owner = create(:occupancy, unit:, relationship: "owner").user
      NotificationPreference.create!(user: owner, category: "bills", push: false, email: false)
      expect(Notifier.deliver("test.must", record: unit).find { _1.user == owner }.deliveries.map(&:channel)).to eq(["push"])
    end
  end
  ```

- [ ] **Step 2: Write the failing preferences API specs.**
  - GET returns 7 categories. Each has `push` and `email` booleans (catalog defaults when there is no row) and `locked_events: [{ key, title, reason }]`, where `reason` is "Needed for payments and security, so it can't be turned off."
  - PUT updates the rows and ignores unknown categories.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the model and controller.** Write `NotificationPreference.allowed?(user, category, channel)`, memoised per request.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add notification preferences and recipient rules"`.

### T10.6 · Staff bell, retention and delivery health

**Files:**
- Create:
  - `app/controllers/admin/notifications_controller.rb`
  - `app/views/admin/notifications/_bell_list.html.erb`
  - `app/jobs/notifications/purge_job.rb`
- Modify:
  - `app/views/admin/shared/_bell.html.erb` (from M02)
  - `config/recurring.yml`
- Test:
  - `spec/requests/admin/notifications_spec.rb`
  - `spec/jobs/notifications/purge_job_spec.rb`
  - `spec/system/admin/bell_spec.rb`

- [ ] **Step 1: Write the failing specs.**
  - The bell shows the 8 newest notifications for `Current.user`, each with an unread dot.
  - Clicking one marks it read and goes to its `admin_path`.
  - "Mark all read" clears the badge.
  - A new staff notification broadcasts to `[user, :bell]` and updates the badge without a reload (system spec).
  - `PurgeJob` deletes notifications older than 180 days and deliveries older than 30 days. It runs daily at 03:00 KL.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.** Use `Notification` `after_create_commit` to broadcast to `[user, :bell]` when `admin_path` is present.

- [ ] **Step 4: Add a delivery health panel** under Settings → Integrations (M13 slot). It shows push sent and failed in the last 24 h, and devices with tokens. M13 renders the partial `admin/notifications/_health` when present.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add staff bell, retention and delivery health"`.

## Module done when

- [ ] On a real Android phone and a real iPhone with a staging build:
  - `Notifier.deliver("visitor.arrived", ...)` from the console shows a lock-screen push within 5 s;
  - tapping it opens the visitor screen through the deep link.
- [ ] Turning off "Bills → Push" on G3 stops bill pushes, and the bill still appears in the notification center.
- [ ] Review Focus 4's specs pass.

## Progress log

| Date | Who | Note |
|---|---|---|
