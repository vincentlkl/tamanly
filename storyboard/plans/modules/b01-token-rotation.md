# B01 · Configurable token rotation

**Status:** Not started · **Owner:** — · **Depends on:** Rails M01 task T01.4 (the `api_tokens` table and `Auth::Tokens`). If T01.4 is not written yet, implement it with the settings below instead of the constants in that plan.

**Ponytail:** full. Three setting keys and a reader. No JWT library, no token-settings JSON API, no per-taman TTL. The admin form is three number fields.

**Goal:** Access and refresh lifetimes live in the `settings` table. Rotation stays as specified in M01: a refresh burns the old pair and issues a new pair in the same family. Reuse of an old refresh token outside the grace window revokes the family. The mobile app only reads `expires_in`.

**Spec:** [../api.md](../api.md) section "Token settings". Rails plan `m01-identity-tenancy.md` T01.4 is the rotation algorithm. Replace `ACCESS_TTL`, `REFRESH_TTL` and `REUSE_GRACE` constants with the settings.

## Settings

| Key | Default | Rule |
|---|---|---|
| `auth.access_ttl_seconds` | 3600 | Integer ≥ 60 |
| `auth.refresh_ttl_seconds` | 5184000 | Integer ≥ access TTL |
| `auth.refresh_reuse_grace_seconds` | 10 | Integer, 0–120 |

`Auth::Tokens.issue!` sets `access_expires_at` and `refresh_expires_at` from these values at insert time and returns `expires_in` equal to the access TTL in seconds. A later edit of the setting does not move rows already stored.

Admin UI: three fields on the existing settings screen (M13). Saving writes an `AuditEvent`. Invalid numbers redisplay the form with the rule that failed.

## Tasks

### T01.1 · TTLs come from settings

**Files:**
- Modify: `tamanly_backend/app/services/auth/tokens.rb` (create it from M01 if it does not exist yet)
- Modify: the `settings` seed so the three keys exist
- Test: `tamanly_backend/spec/services/auth/tokens_spec.rb`

- [ ] **Step 1: Write the failing specs.**
  - With access TTL set to 120, `issue!` returns `expires_in == 120` and `access_expires_at` about 120 seconds out.
  - With refresh TTL set to 3600, `refresh_expires_at` is about 3600 seconds out.
  - Changing the access TTL after issue does not change the stored `access_expires_at`.
  - Refresh returns a new pair. The previous access token no longer authenticates.
  - Reusing the old refresh token after the grace window revokes the family.
  - Reusing it inside the grace window raises invalid and leaves the new pair working.
  - Access TTL 30 is rejected. Refresh TTL shorter than access TTL is rejected. Grace 200 is rejected.

- [ ] **Step 2: Run `bundle exec rspec spec/services/auth/tokens_spec.rb`.** Expected: FAIL.

- [ ] **Step 3: Implement the reader and the three validations.** One method `Auth::TokenTtl.fetch` returns the three integers. `Auth::Tokens` calls it. No other class reads these keys.

- [ ] **Step 4: Run the spec.** Expected: PASS.

- [ ] **Step 5: Tick every box in this task, then run `ruby progress.rb` from `plan/storyboard/plans`.**

### T01.2 · Admin fields

**Files:**
- Modify: the admin settings screen that M13 owns (integrations or profile). If that screen does not exist yet, add the three fields to a single partial the settings page can render later, and say so in a `ponytail:` comment.
- Test: a request spec that patches the three values and records an `AuditEvent`.

- [ ] **Step 1: Write the failing request spec.** A portfolio admin sets access TTL to 900. A second issue returns `expires_in` 900. A non-integer shows the validation message and does not write the row.

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Add the three fields and the audit line.**

- [ ] **Step 4: Run it.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb` from `plan/storyboard/plans`.

## Done when

A developer can change the access TTL in admin, sign in from the app, and see the new `expires_in` on the next token. Old sessions keep their original expiry until they refresh.
