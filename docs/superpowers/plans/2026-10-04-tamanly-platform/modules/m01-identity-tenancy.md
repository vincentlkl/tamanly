# M01 · Identity, tenancy & permissions

**Status:** Not started · **Owner:** — · **Wave:** 1 · **Depends on:** M00

**Goal:** Build who someone is, which tamans they may touch, and what they may do there. This covers companies, users, staff sign-in, Firebase phone sign-in, API tokens, the permission matrix and the audit trail, plus the Users and Roles admin pages.

**Read first:**
- `../README.md`: Review Focus 1
- `../decisions.md`: ADR-003, 004, 005, 012, 018
- `../contracts.md`: §1–§4 and §14

**Feature coverage (FEATRURES.md):**

| Where | Feature | Covered here |
|---|---|---|
| Web | Org / management-company login | All |
| Web | Multi-taman & multi-property admin console | The tenancy half |
| Web | User & role management | All |
| Web | Permission matrices per property / taman | All |
| Web | Audit log of admin actions | The data half; the page is M13 T13.4 |
| Mobile | Sign in / register | Models and services; the endpoints are M11 |
| Mobile | Role- and property-scoped permissions | All |

**Prototype references:**
- `admin/index.html?signin=1` (sign-in)
- `admin/#/users`
- `admin/#/roles`
- The source data shapes are `ROLES`, `MODULES`, `LEVELS`, `PERM_DEFAULT` and `PERM_OVERRIDE` in `admin/data.js`.

## Scope

**In:**
- `organizations`, `tamans` (base columns only), `users`, `sessions`
- `staff_memberships`, `staff_taman_assignments`
- `api_tokens`
- `role_permissions`, `taman_permission_overrides`
- `audit_events`
- Staff sign-in, password reset and invitation
- `Current`, `Access`, `TamanScoped`, `Permissions`, `ApplicationPolicy`
- The Users page and the Roles & permissions page

**Out:**
- Taman profile columns and CRUD (M03)
- Occupancies (M03)
- Guard PIN and stations (M04)
- API auth endpoints (M11)
- The audit log page (M13)

## Data model

| Table | Columns | Constraints and indexes |
|---|---|---|
| `organizations` | `name`, `short_name`, `registration_no`, `email_domain` (citext), `status` (`active`/`suspended`) | unique `email_domain` |
| `tamans` | `organization_id`, `name`, `short_name`, `kind` (`landed`/`strata`), `city`, `state` | unique `[organization_id, name]` |
| `users` | `name`, `email` (citext), `password_digest`, `phone`, `firebase_uid`, `locale` (`en`/`ms`, default `en`), `status` (`active`/`invited`/`disabled`), `last_seen_at` | unique `email` (partial, not null); unique `phone` (partial, not null); unique `firebase_uid` (partial, not null); check `email IS NOT NULL OR phone IS NOT NULL` |
| `sessions` | `user_id`, `ip_address`, `user_agent` | Rails 8 generator |
| `staff_memberships` | `user_id`, `organization_id`, `role`, `title`, `all_tamans` (bool), `status` (`active`/`disabled`), `pin_digest` (guards; M04) | unique `[user_id, organization_id]` |
| `staff_taman_assignments` | `staff_membership_id`, `taman_id` | unique pair |
| `api_tokens` | `user_id`, `family_id` (uuid), `device_uid`, `access_digest`, `refresh_digest`, `access_expires_at`, `refresh_expires_at`, `rotated_at`, `revoked_at` | unique `access_digest`; unique `refresh_digest`; index `family_id` |
| `role_permissions` | `organization_id`, `role`, `module_key`, `level` (int 0–3) | unique `[organization_id, role, module_key]` |
| `taman_permission_overrides` | `taman_id`, `role`, `module_key`, `level` | unique `[taman_id, role, module_key]` |
| `audit_events` | `organization_id`, `taman_id`, `actor_id`, `actor_label`, `action`, `target_type`, `target_id`, `target_label`, `metadata` (jsonb), `ip` (inet), `user_agent`, `created_at` | index `[organization_id, created_at]`; index `[target_type, target_id]`; trigram index on `target_label` |

## Interfaces

**Produces:** everything in contracts §1–§4, plus:

```ruby
Auth::FirebasePhone.verify!(id_token)        # => User (created on first sign-in); raises Auth::FirebasePhone::Invalid
Auth::Tokens.issue!(user, device_uid:)       # => Auth::Tokens::Pair(access_token, refresh_token, expires_in)
Auth::Tokens.authenticate(access_token)      # => ApiToken | nil
Auth::Tokens.refresh!(refresh_token)         # => Pair; raises Auth::Tokens::Invalid
Auth::Tokens.revoke!(api_token)
Admin::BaseController               # authenticated, sets Current, includes Pundit, rescues NotAuthorized -> 403 page
```

**Consumes:**
- `Phone.normalize` (M00)
- The `contracts.md` §14 spec helpers

## Tasks

### T01.1 · Organisations and tamans (base tables)

**Files:**
- Create: `db/migrate/*_create_organizations.rb`, `*_create_tamans.rb`
- Create: `app/models/organization.rb`, `app/models/taman.rb`
- Test: `spec/models/organization_spec.rb`, `spec/models/taman_spec.rb`
- Create: `spec/factories/organizations.rb`, `spec/factories/tamans.rb`

- [ ] **Step 1: Write failing model specs.**
  - `Organization` validates `name` presence.
  - `email_domain` is downcased and unique.
  - `Taman` belongs to an organisation and validates `kind` in `%w[landed strata]`.
  - `name` is unique within an organisation but may repeat across organisations.

- [ ] **Step 2: Run** `bin/rspec spec/models/organization_spec.rb spec/models/taman_spec.rb`. Expected: FAIL (no tables).

- [ ] **Step 3: Write the migrations** with the columns in the data-model table. Use `id: :uuid`, foreign keys, and `null: false` on required columns.

- [ ] **Step 4: Write the models.**

  ```ruby
  class Organization < ApplicationRecord
    has_many :tamans, dependent: :restrict_with_error
    has_many :staff_memberships, dependent: :destroy
    normalizes :email_domain, with: ->(d) { d.strip.downcase.delete_prefix("@") }
    validates :name, presence: true
    validates :email_domain, uniqueness: true, allow_nil: true
    enum :status, { active: "active", suspended: "suspended" }, default: "active"
  end

  class Taman < ApplicationRecord
    belongs_to :organization
    enum :kind, { landed: "landed", strata: "strata" }, validate: true
    validates :name, presence: true, uniqueness: { scope: :organization_id }
  end
  ```

- [ ] **Step 5: Add factories:** `:organization` (Lestari-style names via `sequence`) and `:taman` (association `organization`, `kind "landed"`).

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add organizations and tamans"`.

### T01.2 · Users, staff memberships and admin sign-in

**Files:**
- Run: `bin/rails generate authentication`. It creates `User`, `Session`, `SessionsController`, `PasswordsController` and the `Authentication` concern.
- Modify: `app/models/user.rb`
- Create: `app/models/staff_membership.rb`, `app/models/staff_taman_assignment.rb` and their migrations
- Create: `app/controllers/admin/sessions_controller.rb`, `app/views/admin/sessions/new.html.erb`
- Test:
  - `spec/models/user_spec.rb`
  - `spec/models/staff_membership_spec.rb`
  - `spec/requests/admin/sessions_spec.rb`
  - `spec/system/admin/sign_in_spec.rb`

**Interfaces produced:**
- `User#staff_membership_for(organization)`
- `StaffMembership#admin?` (any role except `guard`)
- `StaffMembership#taman_ids`
- `StaffMembership#covers?(taman_id)`

- [ ] **Step 1: Generate authentication.**
  - Run the generator.
  - Move the generated routes and controllers under `namespace :admin` (`/admin/sign_in`, `/admin/sign_out`, `/admin/passwords`).
  - Make `email_address` become `email` (citext).
  - Add the extra user columns from the data model.

- [ ] **Step 2: Write failing request specs** for `POST /admin/sign_in`:
  - The right password for an active staff member with `admin?` redirects to `/admin`.
  - A wrong password re-renders with "That email and password don't match." and status 422.
  - A disabled membership is refused with "Your access to <org> is switched off. Ask your portfolio admin."
  - A guard membership is refused: "Guards sign in on the guard console."
  - The 11th attempt from one IP within 3 minutes gets 429. Use `rate_limit to: 10, within: 3.minutes, only: :create`.

- [ ] **Step 3: Write a failing system spec** at 390px and 1440px. Typing `meiling@lestarifm.my` shows "Lestari Facility Management Sdn Bhd" under the field before submit (company recognised from the email domain, as in the prototype).
  - Route: `GET /admin/sign_in/company?email=` returns `{ name: }`, or 404 when unknown.
  - Stimulus controller: `company-hint`, debounced 300ms.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement the memberships.**

  ```ruby
  class StaffMembership < ApplicationRecord
    ROLES = %w[portfolio_admin taman_manager billing_ops security_lead guard].freeze
    belongs_to :user
    belongs_to :organization
    has_many :staff_taman_assignments, dependent: :destroy
    has_many :assigned_tamans, through: :staff_taman_assignments, source: :taman
    enum :role, ROLES.index_by(&:itself), validate: true
    enum :status, { active: "active", disabled: "disabled" }, default: "active"

    def admin? = active? && !guard?
    def taman_ids = @taman_ids ||= (all_tamans? ? organization.tamans.ids : staff_taman_assignments.pluck(:taman_id))
    def covers?(taman_id) = taman_ids.include?(taman_id)
  end
  ```

- [ ] **Step 6: Build the sign-in view.**
  - Port the sign-in sheet from `admin/index.html?signin=1`: indigo band, overlapping white sheet, logo mark, email, password, "Forgot password?", primary button.
  - Use the M02 `Ui::` components if they have landed. Otherwise use plain Tailwind classes with the same tokens, and note it in the progress log so M02 can swap them.

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Add `db/seeds/01_identity.rb`.** It creates:
  - the organisation "Lestari Facility Management Sdn Bhd", domain `lestarifm.my`;
  - 4 tamans copied from `TAMANS` in `admin/data.js`;
  - the 7 staff from `STAFF`, each with their role and tamans, password `password1234`.

- [ ] **Step 9: Commit** with `git commit -m "Add staff sign-in and memberships"`.

### T01.3 · Password reset and staff invitations

**Files:**
- Create:
  - `app/controllers/admin/passwords_controller.rb` (from the generator)
  - `app/controllers/admin/invitations_controller.rb`
  - `app/mailers/staff_mailer.rb`
  - views and locales for both
- Test:
  - `spec/requests/admin/passwords_spec.rb`
  - `spec/requests/admin/invitations_spec.rb`
  - `spec/mailers/staff_mailer_spec.rb`

**Interfaces produced:** `Staff::Invite.call(organization:, email:, name:, role:, taman_ids:, all_tamans:) → StaffMembership`. M01 T01.8 uses it.

- [ ] **Step 1: Write failing specs.**
  - A reset email is sent for a known email. An unknown email shows the same "Check your inbox" page, so accounts can't be discovered.
  - The reset token expires after 15 minutes. Use `generates_token_for :password_reset, expires_in: 15.minutes`.
  - An invitation creates a user with status `invited` and a membership, then sends `StaffMailer.invite`.
  - Accepting the invite at `GET/PATCH /admin/invitations/:token` sets the password and activates the user. The token expires after 7 days.
  - Accepting twice shows "This invitation was already used. Sign in instead."
  - Inviting an email that already belongs to another organisation adds a second membership instead of a new user.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**
  - Use `generates_token_for :invitation, expires_in: 7.days { status }`. Including `status` invalidates the token once the user is active.
  - Write `Staff::Invite` as a service that wraps user + membership + assignments in one transaction and sends the mail after commit.

- [ ] **Step 4: Add EN and BM strings** for the mail subject and body, and the page copy.

- [ ] **Step 5: Run the specs.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add password reset and staff invitations"`.

### T01.4 · Firebase phone sign-in and API tokens

There is no SMS provider (ADR-012). The mobile app signs the person in with Firebase phone authentication, so Firebase sends and checks the code. The app then posts the Firebase ID token to Rails. Rails verifies the token and swaps it for its own rotating API tokens. M11 T11.2 adds the endpoint.

**Files:**
- Create:
  - `app/models/api_token.rb` and its migration
  - migration adding `users.firebase_uid`
  - `app/services/auth/firebase_phone.rb`
  - `app/services/auth/tokens.rb`
- Test:
  - `spec/services/auth/firebase_phone_spec.rb`
  - `spec/services/auth/tokens_spec.rb`
  - `spec/support/firebase.rb`

**Credentials:** `bin/rails credentials:edit` → `firebase: { project_id: }`. Use the staging project in staging and the production project in production (ADR-006).

- [ ] **Step 1: Write the test helper.** It signs tokens with a local RSA key and points the verifier at that key, so specs never call Google.

  ```ruby
  # spec/support/firebase.rb
  module FirebaseHelpers
    KEY = OpenSSL::PKey::RSA.new(2048)
    PROJECT = "tamanly-test"

    def firebase_id_token(phone: "+60123456789", uid: "uid-#{phone}", aud: PROJECT, exp: 1.hour.from_now, iat: Time.current)
      payload = { iss: "https://securetoken.google.com/#{aud}", aud:, sub: uid, phone_number: phone,
                  auth_time: iat.to_i, iat: iat.to_i, exp: exp.to_i }
      JWT.encode(payload, KEY, "RS256", { kid: "test-key" })
    end
  end

  RSpec.configure do |c|
    c.include FirebaseHelpers
    c.before do
      key = Google::Auth::IDTokens::KeyInfo.new(id: "test-key", key: FirebaseHelpers::KEY.public_key, algorithm: "RS256")
      Auth::FirebasePhone.verifier = Google::Auth::IDTokens::Verifier.new(key_source: Google::Auth::IDTokens::StaticKeySource.new([key]))
      allow(Auth::FirebasePhone).to receive(:project_id).and_return(FirebaseHelpers::PROJECT)
    end
  end
  ```

- [ ] **Step 2: Write the failing sign-in specs.**

  ```ruby
  RSpec.describe Auth::FirebasePhone do
    it "creates a user from a verified Malaysian number on first sign-in" do
      user = described_class.verify!(firebase_id_token(phone: "+60123456789", uid: "abc"))
      expect(user).to have_attributes(phone: "+60123456789", firebase_uid: "abc")
    end
    it "returns the same user on later sign-ins" do
      first = described_class.verify!(firebase_id_token(uid: "abc"))
      expect(described_class.verify!(firebase_id_token(uid: "abc"))).to eq(first)
    end
    it "matches an existing user by phone, e.g. a guard invited by staff" do
      guard = create(:user, phone: "+60123456789", firebase_uid: nil)
      expect(described_class.verify!(firebase_id_token(uid: "xyz"))).to eq(guard)
      expect(guard.reload.firebase_uid).to eq("xyz")
    end
    it "rejects an expired token" do
      token = firebase_id_token(iat: 2.hours.ago, exp: 1.hour.ago)
      expect { described_class.verify!(token) }.to raise_error(described_class::Invalid)
    end
    it "rejects a token for another Firebase project" do
      expect { described_class.verify!(firebase_id_token(aud: "someone-else")) }.to raise_error(described_class::Invalid)
    end
    it "rejects a token signed by another key" do
      forged = JWT.encode({ sub: "x", phone_number: "+60123456789" }, OpenSSL::PKey::RSA.new(2048), "RS256", { kid: "test-key" })
      expect { described_class.verify!(forged) }.to raise_error(described_class::Invalid)
    end
    it "rejects numbers outside Malaysia" do
      expect { described_class.verify!(firebase_id_token(phone: "+6591234567")) }.to raise_error(described_class::Invalid, /Malaysian/)
    end
    it "refuses a disabled user" do
      create(:user, phone: "+60123456789", status: "disabled")
      expect { described_class.verify!(firebase_id_token) }.to raise_error(described_class::Invalid, /switched off/)
    end
  end
  ```

- [ ] **Step 3: Write the failing token specs:**
  - Issue, then authenticate, returns the token.
  - An expired access token returns nil.
  - Refresh returns a new pair, and the old access token stops working.
  - Reusing an old refresh token more than 10 s after rotation revokes the whole family: the new pair stops working too.
  - Reusing within 10 s raises `Invalid` but leaves the family alive. This covers mobile apps that fire two refreshes at once.
  - A disabled user's token doesn't authenticate.

- [ ] **Step 4: Run them.** Expected: FAIL.

- [ ] **Step 5: Implement `Auth::FirebasePhone`.** It uses the ID-token verifier that ships in `googleauth` (already in the Gemfile for push), so no new gem is needed.

  ```ruby
  module Auth
    class FirebasePhone
      CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
      class Invalid < StandardError; end

      class << self
        attr_writer :verifier

        def verify!(id_token)
          payload = verifier.verify(id_token.to_s, aud: project_id, iss: "https://securetoken.google.com/#{project_id}")
          raise Invalid, "no phone number on this sign-in" if payload["phone_number"].blank? || payload["sub"].blank?
          phone = Phone.normalize(payload["phone_number"]) or raise Invalid, I18n.t("auth.phone.not_malaysian")
          user = User.find_by(firebase_uid: payload["sub"]) || User.create_or_find_by!(phone:)
          raise Invalid, I18n.t("auth.phone.disabled") if user.disabled?
          user.update!(firebase_uid: payload["sub"], phone:) if user.firebase_uid != payload["sub"] || user.phone != phone
          user
        rescue Google::Auth::IDTokens::VerificationError, JWT::DecodeError => e
          raise Invalid, e.message
        end

        def verifier
          @verifier ||= Google::Auth::IDTokens::Verifier.new(
            key_source: Google::Auth::IDTokens::X509CertHttpKeySource.new(CERTS_URL)
          )
        end

        def project_id = Rails.application.credentials.dig(:firebase, :project_id)
      end
    end
  end
  ```

  The certificate source caches Google's keys and refreshes them when they rotate. If the installed `googleauth` version names these classes differently, keep the same checks (RS256, `kid` lookup, `aud`, `iss`, `exp`) using `JWT.decode` against the same certificate URL.

- [ ] **Step 6: Implement `Auth::Tokens`.**

  ```ruby
  module Auth
    class Tokens
      ACCESS_TTL = 1.hour
      REFRESH_TTL = 60.days
      REUSE_GRACE = 10.seconds
      Pair = Data.define(:access_token, :refresh_token, :expires_in)
      class Invalid < StandardError; end

      def self.issue!(user, device_uid:, family_id: SecureRandom.uuid)
        access = SecureRandom.urlsafe_base64(32)
        refresh = SecureRandom.urlsafe_base64(48)
        ApiToken.create!(user:, family_id:, device_uid:, access_digest: digest(access), refresh_digest: digest(refresh),
                         access_expires_at: ACCESS_TTL.from_now, refresh_expires_at: REFRESH_TTL.from_now)
        Pair.new(access, refresh, ACCESS_TTL.to_i)
      end

      def self.authenticate(access)
        t = ApiToken.includes(:user).find_by(access_digest: digest(access.to_s))
        t if t && t.revoked_at.nil? && t.access_expires_at.future? && t.user.active?
      end

      def self.refresh!(refresh)
        stolen_family = nil
        pair = ApiToken.transaction do
          t = ApiToken.lock.find_by(refresh_digest: digest(refresh.to_s)) or raise Invalid
          if t.revoked_at
            stolen_family = t.family_id if t.rotated_at.nil? || t.rotated_at < REUSE_GRACE.ago
            next nil
          end
          raise Invalid if t.refresh_expires_at.past? || !t.user.active?
          t.update!(rotated_at: Time.current, revoked_at: Time.current)
          issue!(t.user, device_uid: t.device_uid, family_id: t.family_id)
        end
        ApiToken.where(family_id: stolen_family).update_all(revoked_at: Time.current) if stolen_family
        pair or raise Invalid
      end

      def self.revoke!(token) = token.update!(revoked_at: Time.current)
      def self.digest(raw) = Digest::SHA256.hexdigest(raw)
    end
  end
  ```

- [ ] **Step 7: Add strings and run the specs.**
  - Add `auth.phone.not_malaysian` in EN and BM: "Use a Malaysian mobile number (+60)." / "Gunakan nombor telefon bimbit Malaysia (+60)."
  - Add `auth.phone.disabled` in EN and BM: "This account is switched off. Contact your management office." / "Akaun ini telah dimatikan. Hubungi pejabat pengurusan anda."
  - Run the specs. Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Add Firebase phone sign-in and rotating API tokens"`.

### T01.5 · `Current`, access and tenant isolation

**Files:**
- Create:
  - `app/models/current.rb` (contracts §1)
  - `app/models/concerns/taman_scoped.rb` (contracts §2)
  - `app/services/access.rb`
  - `app/controllers/admin/base_controller.rb`
  - `app/controllers/admin/scope_controller.rb`
- Test:
  - `spec/services/access_spec.rb`
  - `spec/support/shared_examples/tenant_isolation.rb`
  - `spec/support/auth_helpers.rb`
  - `spec/requests/admin/scope_spec.rb`

- [ ] **Step 1: Write failing `Access` specs.**
  - A portfolio admin with `all_tamans` gets all 4 seed tamans.
  - A taman manager gets only their assigned taman.
  - A staff member of org B gets none of org A's tamans.
  - A disabled membership gets `[]`.

- [ ] **Step 2: Write failing scope-switcher specs.**
  - `PATCH /admin/scope` with `taman=<id>` sets the cookie `tm_scope`, and later requests use `Current.taman_ids == [id]`.
  - Choosing a taman outside access is ignored, and the cookie is cleared.
  - `taman=all` resets it.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement `Access` and the admin base controller.**

  ```ruby
  module Access
    module_function
    def taman_ids_for(user, organization:)
      m = user.staff_memberships.active.find_by(organization:)
      m ? m.taman_ids : []
    end
  end

  class Admin::BaseController < ApplicationController
    include Authentication
    include Pundit::Authorization
    layout "admin"
    before_action :set_current_context
    after_action :verify_authorized, except: :index
    after_action :verify_policy_scoped, only: :index
    rescue_from Pundit::NotAuthorizedError, with: -> { render "admin/errors/forbidden", status: :forbidden }
    rescue_from ActiveRecord::RecordNotFound, with: -> { render "admin/errors/not_found", status: :not_found }

    private

    def set_current_context
      m = Current.user.staff_memberships.active.find { _1.admin? } or return terminate_session_with_notice
      Current.staff_membership = m
      Current.organization = m.organization
      chosen = cookies[:tm_scope]
      Current.taman_ids = chosen && m.covers?(chosen) ? [chosen] : m.taman_ids
      Current.ip = request.remote_ip
      Current.user_agent = request.user_agent
    end
  end
  ```

  `terminate_session_with_notice` signs the user out with the flash "You no longer have dashboard access."

  **Multiple organisations:** a user with active memberships in two organisations sees an organisation picker after sign-in, which stores `session[:organization_id]`. Rare at launch, so it is one screen: a list of company names as buttons.

- [ ] **Step 5: Add the shared example and helpers.**
  - Shared example: `"a tenant-isolated endpoint"`, verbatim from contracts §2.
  - `sign_in_as(user)`: posts to `/admin/sign_in`.
  - `api_headers_for(user, unit: nil)`: calls `Auth::Tokens.issue!`.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add Current context, access and tenant isolation"`.

### T01.6 · Permission matrix and policies

**Files:**
- Create:
  - `app/models/role_permission.rb`, `app/models/taman_permission_override.rb` and their migrations
  - `app/services/permissions.rb`
  - `app/policies/application_policy.rb`
- Modify: `app/models/staff_membership.rb` (`level_value`), `app/models/organization.rb` (seed defaults on create)
- Test:
  - `spec/services/permissions_spec.rb`
  - `spec/support/shared_examples/permission_gated.rb`

- [ ] **Step 1: Write failing specs.**

  ```ruby
  RSpec.describe Permissions do
    let(:org) { create(:organization) }
    let(:bi)  { create(:taman, organization: org) }
    let(:dh)  { create(:taman, organization: org) }
    let(:guard) { create(:staff_membership, organization: org, role: "guard", taman_ids: [bi.id, dh.id]).user }

    it "uses role defaults" do
      expect(Permissions.level(guard, :permit_review, dh)).to eq(:view)
    end
    it "lets a taman override win" do
      TamanPermissionOverride.create!(taman: bi, role: "guard", module_key: "permit_review", level: 2)
      expect(Permissions.level(guard, :permit_review, bi)).to eq(:edit)
      expect(Permissions.level(guard, :permit_review, dh)).to eq(:view)
    end
    it "returns none for a taman outside the assignment" do
      other = create(:taman, organization: org)
      expect(Permissions.level(guard, :visitor_registry, other)).to eq(:none)
    end
    it "returns none for another organisation" do
      expect(Permissions.level(guard, :visitor_registry, create(:taman))).to eq(:none)
    end
    it "takes the highest level across tamans for org-wide pages" do
      TamanPermissionOverride.create!(taman: bi, role: "guard", module_key: "permit_review", level: 2)
      Current.organization = org
      expect(Permissions.level(guard, :permit_review, nil)).to eq(:edit)
    end
    it "copies defaults when an organisation is created" do
      expect(RolePermission.where(organization: org).count).to eq(5 * 14)
    end
  end
  ```

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement `Permissions`.**
  - Add `LEVELS`, `MODULES` and `DEFAULTS` from contracts §3.
  - `StaffMembership#level_value(module_key, taman_id)` loads the role's `role_permissions` and `taman_permission_overrides` once into a hash, memoised on the instance.

  ```ruby
  module Permissions
    module_function

    def level(user, module_key, taman)
      org_id = taman&.organization_id || Current.organization&.id
      m = current_membership_for(user, org_id) || StaffMembership.active.find_by(user:, organization_id: org_id)
      return :none unless m&.active?
      ids = taman ? (m.covers?(taman.id) ? [taman.id] : []) : m.taman_ids
      LEVELS.key(ids.map { m.level_value(module_key.to_s, _1) }.max || 0)
    end

    def allows?(user, module_key, level, taman) = LEVELS.fetch(level(user, module_key, taman)) >= LEVELS.fetch(level)

    def current_membership_for(user, org_id)
      m = Current.staff_membership
      m if m && m.user_id == user.id && m.organization_id == org_id
    end
  end
  ```

- [ ] **Step 4: Copy the defaults on organisation create.** Add an `after_create :seed_role_permissions` callback that inserts 70 rows with `insert_all`.

- [ ] **Step 5: Add `ApplicationPolicy`** (contracts §3) with a `Scope` base whose `resolve` is `scope.in_scope`.

- [ ] **Step 6: Add the shared example `"a permission-gated page"`.**
  - It takes `module_key` and `level`.
  - It builds two staff members: one whose override sets the module one level below, and one at the required level.
  - It expects 403 for the first and 200 for the second on `path`.

- [ ] **Step 7: Run the specs.** Expected: PASS.

- [ ] **Step 8: Commit** with `git commit -m "Add role x module permission matrix with taman overrides"`.

### T01.7 · Audit events

**Files:**
- Create: `app/models/audit_event.rb` and its migration
- Create: `config/locales/{en,ms}/audit.yml`
- Test:
  - `spec/models/audit_event_spec.rb`
  - `spec/support/shared_examples/audited_action.rb`

- [ ] **Step 1: Write failing specs.**
  - `record!` copies the actor, organisation, IP and user agent from `Current`.
  - The target label prefers `reference`, then `to_s`.
  - The taman defaults to `target.taman`.
  - Metadata is stored as JSON.
  - Records are read-only: `update` raises `ActiveRecord::ReadOnlyRecord`.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement it.**

  ```ruby
  class AuditEvent < ApplicationRecord
    belongs_to :organization
    belongs_to :taman, optional: true
    belongs_to :actor, class_name: "User", optional: true
    def readonly? = persisted?

    def self.record!(action:, target:, taman: target.try(:taman), metadata: {})
      create!(action:, target_type: target.class.name, target_id: target.id,
              target_label: target.try(:reference) || target.to_s, taman:, metadata:,
              organization: Current.organization || taman&.organization,
              actor: Current.user, actor_label: Current.user&.name || "System",
              ip: Current.ip, user_agent: Current.user_agent)
    end
  end
  ```

- [ ] **Step 4: Add the shared example `"an audited action"`.**
  - It takes `action_key`.
  - The `subject` block must perform the write.
  - It expects `change { AuditEvent.where(action: action_key).count }.by(1)`.

- [ ] **Step 5: Add the action labels.**
  - Add `audit.actions.*` keys in EN and BM for every action this module records:
    - `user.invited`
    - `user.disabled`
    - `user.enabled`
    - `user.role_changed`
    - `permissions.changed`
    - `session.signed_in`
  - Later modules add their own keys.

- [ ] **Step 6: Run the specs.** Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add audit events"`.

### T01.8 · Users admin page

**Files:**
- Create:
  - `app/controllers/admin/users_controller.rb`
  - `app/policies/user_policy.rb` (`MODULE_KEY = :users_roles`)
  - `app/queries/admin/users_query.rb`
  - views under `app/views/admin/users/`
- Test:
  - `spec/requests/admin/users_spec.rb`
  - `spec/system/admin/users_spec.rb`

**Prototype:** `admin/#/users`. It has these tabs:
- All
- Management staff
- Security
- Owners
- Residents
- Sub-tenants

The rest of the page:
- **Filters:** taman and status.
- **Search:** name, phone and email.
- **Columns:** name + contact, role/title, tamans, units, status, last active.
- **Row drawer:** profile, memberships or occupancies, and actions.

- [ ] **Step 1: Write failing request specs.**
  - The index lists staff of the current organisation, plus residents with an occupancy in `Current.taman_ids`. Occupancy lands in M03. Until then residents are omitted, and the test is tagged `:pending_m03`.
  - Search `?q=chong` matches name, email and phone.
  - The `?role=` and `?taman=` filters narrow the list.
  - It includes `"a tenant-isolated endpoint"` for `GET /admin/users/:id`.
  - It includes `"a permission-gated page", :users_roles, :view`.

- [ ] **Step 2: Write failing specs for the actions.**
  - "Invite staff" uses `Staff::Invite` and is audited as `user.invited`.
  - "Change role" is audited as `user.role_changed`.
  - "Disable" sets the membership to `disabled`, revokes the user's sessions and API tokens, and is audited as `user.disabled`.
  - You can't disable yourself or the last active portfolio admin. The flash says "There must be at least one active portfolio admin."

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement the query object and controller actions.**
  - Query object: `Admin::UsersQuery.new(params).call`, which returns a relation (search with `ILIKE`, plus filters).
  - Controller actions: `index`, `show` (the drawer, in a Turbo Frame), `new`/`create` (invite), `edit`/`update` (role and tamans), `disable`, `enable`.

- [ ] **Step 5: Build the views** with M02's `Ui::IndexComponent` and `Ui::DrawerComponent`. If M02 hasn't landed, use a plain table and record it as a stub.

- [ ] **Step 6: Run the specs.** Expected: PASS. Then run the system spec at 390px and 1440px.

- [ ] **Step 7: Commit** with `git commit -m "Add users admin page"`.

### T01.9 · Roles & permissions page

**Files:**
- Create:
  - `app/controllers/admin/permissions_controller.rb`
  - `app/policies/permission_policy.rb` (`MODULE_KEY = :users_roles`)
  - `app/views/admin/permissions/show.html.erb`
  - `app/javascript/controllers/perm_matrix_controller.js`
- Test:
  - `spec/requests/admin/permissions_spec.rb`
  - `spec/system/admin/permissions_spec.rb`

**Prototype:** `admin/#/roles`.
- The matrix has roles as columns and 14 modules as rows. Each cell is a level picker (`.perm`).
- A taman selector switches between "Organisation defaults" and per-taman overrides. Overridden cells are marked.
- On phones the module column is pinned and the table scrolls sideways.

- [ ] **Step 1: Write failing specs.**
  - `PATCH /admin/permissions` with `role=guard&module_key=permit_review&level=edit&taman_id=<bi>` creates an override and is audited as `permissions.changed`, with metadata `{from: "view", to: "edit"}`.
  - Setting it back to the default removes the override.
  - Editing needs `users_roles: full`; with only `edit` the response is 403.
  - The portfolio admin's `users_roles` cell can't be lowered below `full`. This prevents a lock-out; the response is 422 with "Portfolio admins always keep full access to Users & roles."

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement the controller and view.** Each cell is a small form, submitted on change with Turbo, that replaces the cell.

- [ ] **Step 4: Add the Owner, Resident and Sub-tenant columns** as read-only, with the note "Set by occupancy scopes, not this matrix". This matches the prototype and links to the Occupants page (M03).

- [ ] **Step 5: Run the specs, including the system spec at 390px.** Expected: PASS.

- [ ] **Step 6: Commit** with `git commit -m "Add roles and permissions matrix page"`.

## Module done when

- [ ] Every Review Focus 1 check passes for users and permissions.
- [ ] The seeded staff can sign in. Mei Ling sees 4 tamans; Faizal sees Desa Harmoni only.
- [ ] `Permissions.level` for every seeded role matches `PERM_DEFAULT` in `admin/data.js`, plus the Bukit Indah guard override.

## Progress log

| Date | Who | Note |
|---|---|---|
