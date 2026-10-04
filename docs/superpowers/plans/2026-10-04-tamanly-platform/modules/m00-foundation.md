# M00 · Foundation

**Status:** Not started · **Owner:** — · **Wave:** 0 · **Depends on:** nothing

**Goal:** Create a Rails app that boots, tests, lints and seeds, with the shared helpers every other module uses: money, phone numbers, reference numbers, the demo clock and spec helpers.

**Read first:**
- `../README.md` (Global Constraints)
- `../decisions.md` (ADR-001, 007, 008, 009)
- `../contracts.md` (§9, §12, §14)

## Scope

**In:**
- App generation and gems
- Base config (time zone, locales, UUIDs, Postgres extensions)
- Test toolchain
- `Money`, `Phone`, `Reference`
- CI workflow
- The seeds loader and seed helpers

**Out:**
- Any domain table (M01 onward)
- The admin layout (M02)
- Deployment (M14)

## Interfaces

**Produces:**
- `Money.format(cents) → String`
- `Money.parse(str) → Integer`
- `Phone.normalize(str) → String | nil`
- `Phone.display(e164) → String`
- `Reference.next!(kind, scope:) → String`
- `SeedKit` (rng, names, phones, plates)
- The spec helpers in `contracts.md` §14 that need no domain models: `at_demo_clock`, `json_data`, `json_error`

**Consumes:** none.

## Tasks

### T00.1 · Generate the app and base config

**Files:**
- Create: the whole app at `/Users/vincent/work/ror/apps/vincent/tamanly/app`
- Create: `config/initializers/locale.rb`
- Create: `db/migrate/*_enable_extensions.rb`
- Create: `spec/requests/health_spec.rb`

- [ ] **Step 1: Install Ruby 3.4 and Rails 8.1.**

  ```bash
  mise use -g ruby@3.4   # or: rbenv install 3.4.x && rbenv global 3.4.x
  gem install rails -v '~> 8.1'
  ```

- [ ] **Step 2: Generate the app.**

  ```bash
  cd /Users/vincent/work/ror/apps/vincent/tamanly
  rails new app --name=tamanly -d postgresql -c tailwind -j importmap -T --skip-jbuilder
  cd app
  ```

- [ ] **Step 3: Add the gems** and run `bundle install`.

  ```ruby
  # Gemfile
  gem "pundit"
  gem "pagy", "~> 9.0"
  gem "view_component"
  gem "rqrcode"
  gem "prawn"
  gem "prawn-table"
  gem "googleauth"   # Firebase: push (M10) and phone sign-in token checks (M01)
  gem "jwt"          # already pulled in by googleauth; listed because specs sign Firebase test tokens with it
  gem "rack-attack"
  gem "rails-i18n"
  gem "image_processing"
  gem "aws-sdk-s3", require: false

  group :development, :test do
    gem "rspec-rails"
    gem "factory_bot_rails"
    gem "rswag-specs"
    gem "i18n-tasks", require: false
    gem "bundler-audit", require: false
  end

  group :test do
    gem "capybara"
    gem "cuprite"
    gem "shoulda-matchers"
    gem "webmock"
    gem "database_cleaner-active_record"
    gem "pdf-inspector", require: "pdf/inspector"
  end

  gem "rswag-api"
  gem "rswag-ui"
  ```

- [ ] **Step 4: Set the app-wide config.**

  ```ruby
  # config/application.rb (inside class Application)
  config.time_zone = "Asia/Kuala_Lumpur"
  config.i18n.available_locales = %i[en ms]
  config.i18n.default_locale = :en
  config.i18n.load_path += Dir[Rails.root.join("config/locales/**/*.yml")]
  config.generators do |g|
    g.orm :active_record, primary_key_type: :uuid
    g.test_framework :rspec
    g.helper false
  end
  ```

- [ ] **Step 5: Enable the Postgres extensions.**

  ```ruby
  # db/migrate/20261004000000_enable_extensions.rb
  class EnableExtensions < ActiveRecord::Migration[8.1]
    def change
      enable_extension "pgcrypto"
      enable_extension "pg_trgm"
      enable_extension "btree_gist"
      enable_extension "citext"
    end
  end
  ```

- [ ] **Step 6: Write a failing health spec.**

  ```ruby
  # spec/requests/health_spec.rb
  require "rails_helper"
  RSpec.describe "Health", type: :request do
    it "answers /up with 200" do
      get "/up"
      expect(response).to have_http_status(:ok)
    end
  end
  ```

- [ ] **Step 7: Run it.** Install RSpec first (`bin/rails g rspec:install`), then `bin/rails db:create db:migrate && bin/rspec spec/requests/health_spec.rb`. Expected: PASS. `/up` ships with Rails 8; if it fails, the database config is wrong.

- [ ] **Step 8: Create the private repo and commit.**

  ```bash
  git init && git add -A && git commit -m "Generate Tamanly Rails app"
  gh repo create vincentlkl/tamanly-app --private --source=. --push
  ```

### T00.2 · Test toolchain and spec helpers

**Files:**
- Modify: `spec/rails_helper.rb`
- Create: `spec/support/{factory_bot,capybara,time,json,webmock,shoulda,concurrency}.rb`
- Create: `spec/support/time_spec.rb`

**Interfaces produced:** `at_demo_clock`, `DEMO_NOW`, `json_data`, `json_error` (contracts §14).

- [ ] **Step 1: Load the support files.**
  - In `spec/rails_helper.rb`, uncomment the support loader: `Rails.root.glob("spec/support/**/*.rb").sort.each { |f| require f }`.
  - Add `config.include ActiveSupport::Testing::TimeHelpers`.

- [ ] **Step 2: Write the failing demo-clock spec.**

  ```ruby
  # spec/support/time_spec.rb
  require "rails_helper"
  RSpec.describe "at_demo_clock" do
    it "freezes time at Sat 3 Oct 2026 10:42 in Kuala Lumpur" do
      at_demo_clock do
        expect(Time.current).to eq(Time.zone.local(2026, 10, 3, 10, 42))
        expect(Time.current.utc_offset).to eq(8 * 3600)
        expect(Date.current).to eq(Date.new(2026, 10, 3))
      end
    end
  end
  ```

- [ ] **Step 3: Run it.** Expected: FAIL with `undefined method 'at_demo_clock'`.

- [ ] **Step 4: Implement the helpers.**

  ```ruby
  # spec/support/time.rb
  DEMO_NOW = Time.find_zone!("Asia/Kuala_Lumpur").local(2026, 10, 3, 10, 42)
  module DemoClock
    def at_demo_clock(&) = travel_to(DEMO_NOW, &)
  end
  RSpec.configure { |c| c.include DemoClock }

  # spec/support/json.rb
  module JsonHelpers
    def json_data  = JSON.parse(response.body).fetch("data")
    def json_error = JSON.parse(response.body).fetch("error")
  end
  RSpec.configure { |c| c.include JsonHelpers, type: :request }
  ```

- [ ] **Step 5: Add the remaining support files.**
  - FactoryBot: `config.include FactoryBot::Syntax::Methods`.
  - Shoulda matchers config.
  - WebMock: `WebMock.disable_net_connect!(allow_localhost: true)`.
  - Capybara with Cuprite: `Capybara.javascript_driver = :cuprite`, and `driven_by :cuprite, screen_size: [1440, 900]` for system specs.
  - The `concurrency` shared context, for specs that run threads. Each thread uses its own database connection, so the spec can't run inside one rolled-back transaction:

    ```ruby
    # spec/support/concurrency.rb
    RSpec.shared_context "concurrency" do
      self.use_transactional_tests = false   # runs at group level because shared contexts are class_exec'd
      after { DatabaseCleaner.clean_with(:truncation, except: %w[ar_internal_metadata schema_migrations]) }
    end
    ```

  - Usage: `context "under concurrency" do include_context "concurrency"; it ... end`. M06, M07 and M11 use it.

- [ ] **Step 6: Install rswag.** Run `bin/rails g rswag:install`, then set `config.openapi_root = Rails.root.join("swagger").to_s` and a v1 doc with a bearer security scheme in `spec/swagger_helper.rb`.

- [ ] **Step 7: Run `bin/rspec`.** Expected: all pass (health and demo clock).

- [ ] **Step 8: Commit** with `git commit -m "Add RSpec toolchain and shared spec helpers"`.

### T00.3 · Money, phone numbers and reference numbers

**Files:**
- Create: `app/lib/money.rb`, `app/lib/phone.rb`
- Create: `app/models/reference.rb`, `app/models/reference_counter.rb`
- Create: `db/migrate/*_create_reference_counters.rb`
- Test: `spec/lib/money_spec.rb`, `spec/lib/phone_spec.rb`, `spec/models/reference_spec.rb`

**Interfaces produced:** `Money.format`, `Money.parse`, `Phone.normalize`, `Phone.display`, `Reference.next!` (contracts §9).

- [ ] **Step 1: Write failing money specs.**

  ```ruby
  # spec/lib/money_spec.rb
  require "rails_helper"
  RSpec.describe Money do
    it { expect(Money.format(105_000)).to eq("RM 1,050.00") }
    it { expect(Money.format(0)).to eq("RM 0.00") }
    it { expect(Money.format(-500)).to eq("-RM 5.00") }
    it { expect(Money.format(-0)).to eq("RM 0.00") }
    it { expect(Money.parse("RM 1,050.5")).to eq(105_050) }
    it { expect(Money.parse("185")).to eq(18_500) }
    it { expect(Money.parse(" 0.07 ")).to eq(7) }
    it { expect { Money.parse("12.345") }.to raise_error(ArgumentError) }
    it { expect { Money.parse("abc") }.to raise_error(ArgumentError) }
  end
  ```

- [ ] **Step 2: Write failing phone specs.**

  ```ruby
  # spec/lib/phone_spec.rb
  require "rails_helper"
  RSpec.describe Phone do
    it { expect(Phone.normalize("012-345 6789")).to eq("+60123456789") }
    it { expect(Phone.normalize("60123456789")).to eq("+60123456789") }
    it { expect(Phone.normalize("+60 3-5521 0412")).to eq("+60355210412") }
    it { expect(Phone.normalize("011-2345 6789")).to eq("+601123456789") }
    it { expect(Phone.normalize("12345")).to be_nil }
    it { expect(Phone.normalize("")).to be_nil }
    it { expect(Phone.display("+60123456789")).to eq("+60 12-345 6789") }
  end
  ```

- [ ] **Step 3: Write a failing reference spec,** including the concurrency case.

  ```ruby
  # spec/models/reference_spec.rb
  require "rails_helper"
  RSpec.describe Reference do
    let(:scope) { SecureRandom.uuid }

    it "formats and increments per scope" do
      expect(Reference.next!(:permit, scope:, start: 2689)).to eq("PMT-2689")
      expect(Reference.next!(:permit, scope:)).to eq("PMT-2690")
    end

    it "keeps month counters apart for invoices" do
      at_demo_clock do
        expect(Reference.next!(:invoice, scope:)).to eq("INV-2610-00001")
      end
    end

    context "under concurrency" do
      include_context "concurrency"
      it "never hands out the same number twice" do
        refs = 8.times.map { Thread.new { ActiveRecord::Base.connection_pool.with_connection { Reference.next!(:booking, scope:) } } }.map(&:value)
        expect(refs.uniq.size).to eq(8)
      end
    end
  end
  ```

- [ ] **Step 4: Run the three specs.** Expected: FAIL with `uninitialized constant`.

- [ ] **Step 5: Implement `Money`.**

  ```ruby
  # app/lib/money.rb
  module Money
    module_function

    def format(cents)
      cents = cents.to_i
      sign = cents.negative? ? "-" : ""
      ringgit, sen = cents.abs.divmod(100)
      "#{sign}RM #{ringgit.to_s.reverse.scan(/\d{1,3}/).join(',').reverse}.#{sen.to_s.rjust(2, '0')}"
    end

    def parse(str)
      s = str.to_s.strip.sub(/\ARM\s*/i, "").delete(",")
      raise ArgumentError, "not an amount: #{str.inspect}" unless s.match?(/\A-?\d+(\.\d{1,2})?\z/)
      (BigDecimal(s) * 100).to_i
    end
  end
  ```

- [ ] **Step 6: Implement `Phone`.**

  ```ruby
  # app/lib/phone.rb
  module Phone
    module_function

    # Malaysian numbers only: mobiles 01x (9-10 digits after 0), landlines 0[3-9] (8-9 digits after 0)
    def normalize(str)
      d = str.to_s.gsub(/\D/, "")
      d = d.delete_prefix("60") if d.start_with?("60")
      d = d.delete_prefix("0")
      return nil unless d.match?(/\A(1\d{8,9}|[3-9]\d{7,8})\z/)
      "+60#{d}"
    end

    def display(e164)
      d = e164.to_s.delete_prefix("+60")
      return e164 if d.empty?
      if d.start_with?("1") then "+60 #{d[0, 2]}-#{d[2..-5]} #{d[-4..]}"
      else "+60 #{d[0]}-#{d[1..-5]} #{d[-4..]}"
      end
    end
  end
  ```

- [ ] **Step 7: Add the reference counter migration and model.**

  ```ruby
  # db/migrate/20261004000100_create_reference_counters.rb
  class CreateReferenceCounters < ActiveRecord::Migration[8.1]
    def change
      create_table :reference_counters, id: :uuid do |t|
        t.string :kind, null: false
        t.string :scope_key, null: false   # organization id, or "org:yymm" for monthly counters
        t.bigint :last_value, null: false, default: 0
        t.timestamps
      end
      add_index :reference_counters, %i[kind scope_key], unique: true
    end
  end
  ```

  ```ruby
  # app/models/reference_counter.rb
  class ReferenceCounter < ApplicationRecord; end

  # app/models/reference.rb
  module Reference
    FORMATS = {
      permit: "PMT-%04d", payment: "PAY-%05d", booking: "BK-%04d", incident: "INC-%04d",
      notice: "NTC-%03d", listing: "LST-%04d", report: "RPT-%03d", announcement: "ANN-%03d",
      broadcast: "BRC-%03d", schedule: "SCH-%02d",
      invoice: "INV-%<yymm>s-%<n>05d", receipt: "RCT-%<yymm>s-%<n>05d"
    }.freeze
    MONTHLY = %i[invoice receipt].freeze

    module_function

    # start: first number used when the counter does not exist yet (seeds use it to match the prototype)
    def next!(kind, scope:, start: 1)
      fmt = FORMATS.fetch(kind)
      yymm = Time.current.strftime("%y%m")
      key = MONTHLY.include?(kind) ? "#{scope}:#{yymm}" : scope.to_s
      n = ReferenceCounter.transaction do
        ReferenceCounter.insert_all([{ kind: kind.to_s, scope_key: key, last_value: start - 1 }], unique_by: %i[kind scope_key])
        c = ReferenceCounter.lock.find_by!(kind: kind.to_s, scope_key: key)
        c.increment!(:last_value)
        c.last_value
      end
      MONTHLY.include?(kind) ? format(fmt, yymm:, n:) : format(fmt, n)
    end
  end
  ```

- [ ] **Step 8: Run the specs.** `bin/rails db:migrate && bin/rspec spec/lib spec/models/reference_spec.rb`. Expected: PASS.

- [ ] **Step 9: Add the view helpers** `rm(cents)` and `phone(e164)` in `ApplicationHelper`, delegating to `Money.format` and `Phone.display`. One spec each in `spec/helpers/application_helper_spec.rb`.

- [ ] **Step 10: Commit** with `git commit -m "Add Money, Phone and Reference helpers"`.

### T00.4 · CI and quality gates

**Files:**
- Create: `.github/workflows/ci.yml`, `config/i18n-tasks.yml`
- Modify: `.rubocop.yml`

- [ ] **Step 1: Configure i18n-tasks.** `bundle exec i18n-tasks init`, then set `base_locale: en`, `locales: [en, ms]`, and `data.read: config/locales/**/*.%{locale}.yml`.

- [ ] **Step 2: Add a locale parity spec** that fails when a key exists in one locale but not the other.

  ```ruby
  # spec/i18n_spec.rb
  require "i18n/tasks"
  RSpec.describe "I18n" do
    let(:i18n) { I18n::Tasks::BaseTask.new }
    it("has no missing keys") { expect(i18n.missing_keys).to be_empty }
    it("has no unused keys") { expect(i18n.unused_keys).to be_empty }
  end
  ```

- [ ] **Step 3: Write the CI workflow.**

  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_PASSWORD: postgres }
          ports: ["5432:5432"]
          options: --health-cmd pg_isready --health-interval 5s --health-retries 10
      env:
        RAILS_ENV: test
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/tamanly_test
      steps:
        - uses: actions/checkout@v4
        - uses: ruby/setup-ruby@v1
          with: { bundler-cache: true }
        - run: bin/rails db:prepare
        - run: bin/rails tailwindcss:build
        - run: bin/rspec
        - run: bin/rubocop
        - run: bin/brakeman --no-pager --quiet
        - run: bundle exec bundler-audit check --update
  ```

- [ ] **Step 4: Push and confirm CI is green** on the pull request.

- [ ] **Step 5: Protect `main`** so the CI check must pass: `gh api -X PUT repos/vincentlkl/tamanly-app/branches/main/protection` with `required_status_checks.contexts: ["test"]`.

- [ ] **Step 6: Commit** with `git commit -m "Add CI, i18n parity and lint gates"`.

### T00.5 · Seeds loader and seed kit

**Files:**
- Create: `db/seeds.rb`, `db/seeds/00_kit.rb`
- Create: `app/lib/seed_kit.rb`
- Test: `spec/lib/seed_kit_spec.rb`, `spec/seeds_spec.rb`

**Interfaces produced:**
- `SeedKit.rng`
- `SeedKit.person_name`
- `SeedKit.mobile`
- `SeedKit.plate`
- `SeedKit.pick(array)`
- `SeedKit.int(a, b)`
- `SeedKit.chance(p)`

Every later seed file uses these.

- [ ] **Step 1: Write a failing determinism spec.**

  ```ruby
  # spec/lib/seed_kit_spec.rb
  require "rails_helper"
  RSpec.describe SeedKit do
    it "is deterministic" do
      a = (SeedKit.reset!; 5.times.map { SeedKit.person_name })
      b = (SeedKit.reset!; 5.times.map { SeedKit.person_name })
      expect(a).to eq(b)
    end
    it "makes Malaysian mobiles and plates" do
      SeedKit.reset!
      expect(Phone.normalize(SeedKit.mobile)).to start_with("+601")
      expect(SeedKit.plate).to match(/\A[A-Z]{1,3} \d{1,4}( [A-Z])?\z/)
    end
  end
  ```

- [ ] **Step 2: Run it.** Expected: FAIL with `uninitialized constant SeedKit`.

- [ ] **Step 3: Implement `SeedKit`.** Port the name lists from `admin/data.js` lines 17–22 (`MALAY_G`, `MALAY_L`, `CN_L`, `CN_G`, `IN_G`, `IN_L`) as frozen arrays.
  - `person_name` picks an ethnicity one-third each, and builds Malay names as `"<given> binti/bin <family>"` or `"<given> <family>"`, the same way `person()` does in `data.js`.

  ```ruby
  # app/lib/seed_kit.rb
  module SeedKit
    NOW = Time.find_zone!("Asia/Kuala_Lumpur").local(2026, 10, 3, 10, 42)
    module_function
    def reset! = @rng = Random.new(20261003)
    def rng = @rng ||= Random.new(20261003)
    def int(a, b) = rng.rand(a..b)
    def chance(p) = rng.rand < p
    def pick(arr) = arr[rng.rand(arr.size)]
    def mobile = "+601#{pick(%w[2 3 6 7 9])}#{format('%07d', int(0, 9_999_999))}"
    def plate = "#{pick(%w[W V B P J A N])}#{pick(['', *('A'..'Y').to_a])}#{pick(['', *('A'..'Y').to_a])} #{int(1, 9999)}"
    # person_name: see Step 3 above
  end
  ```

- [ ] **Step 4: Write the loader.**

  ```ruby
  # db/seeds.rb - demo data for development and staging only
  abort "Demo seeds refuse to run in production" if Rails.env.production? && ENV["SEED_DEMO"] != "1"
  require "active_support/testing/time_helpers"
  include ActiveSupport::Testing::TimeHelpers

  SeedKit.reset!
  travel_to(SeedKit::NOW) do
    Rails.root.glob("db/seeds/*.rb").sort.each { |f| puts "seeding #{f.basename}"; load f }
  end
  ```

  Change `spec/support/time.rb` to `DEMO_NOW = SeedKit::NOW`, so the demo clock is defined in one place.

- [ ] **Step 5: Write a seeds spec** that runs `Rails.application.load_seed` twice and asserts every model's count is unchanged after the second run. It starts trivially green and grows as modules add seed files.

  ```ruby
  # spec/seeds_spec.rb
  require "rails_helper"
  RSpec.describe "db/seeds" do
    it "is idempotent" do
      Rails.application.load_seed
      counts = ApplicationRecord.descendants.reject(&:abstract_class?).to_h { [_1.name, _1.count] }
      Rails.application.load_seed
      expect(ApplicationRecord.descendants.reject(&:abstract_class?).to_h { [_1.name, _1.count] }).to eq(counts)
    end
  end
  ```

- [ ] **Step 6: Run** `bin/rspec spec/lib/seed_kit_spec.rb spec/seeds_spec.rb`. Expected: PASS.

- [ ] **Step 7: Commit** with `git commit -m "Add deterministic seed kit and seeds loader"`.

## Module done when

- [ ] `bin/setup && bin/rspec && bin/rubocop && bin/brakeman` pass on a fresh clone.
- [ ] CI is green and required on `main`.
- [ ] `bin/rails db:seed` runs twice without errors.

## Progress log

| Date | Who | Note |
|---|---|---|
