# F00 · Shell

**Status:** Done · **Owner:** grok · **Depends on:** none

**Ponytail:** full. One `Api`, one `Session`, one theme, one router. No state-management package. No code generation.

**Goal:** A Flutter app that signs nothing yet, but every later module can call the network, store tokens, pick a unit, and sit inside the resident or guard shell.

**Screens:** the shells around H0 and C5 (bars only). Visual tokens from the storyboard: indigo `#3D2B6B`, coral `#E87A6B`, yellow `#E8B84A`, cream `#F7F3EC`, ink `#1F1A2E`, Inter.

**App path:** `tamanly/tamanly_app`.

## Produces (later modules use these names)

```dart
class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  final Map<String, dynamic> details;
}

class Api {
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query});
  Future<Map<String, dynamic>> send(String method, String path, {Object? body, bool idempotent = false});
}

class Session extends ChangeNotifier {
  Me? me;
  String? unitId;
  String locale; // 'en' or 'ms'
  bool get signedIn;
  bool allows(String scope); // owners and tenants: true; sub-tenant: scope is in the selected property
  Future<void> acceptInvite(String token, String password);
  Future<void> signInWithPassword(String email, String password);
  Future<void> refresh();
  Future<void> signOut();
  void selectUnit(String id);
}

int refreshDelaySeconds(int expiresIn); // expiresIn <= 60 ? 0 : expiresIn - 60
```

`send` with `idempotent: true` reuses one `Idempotency-Key` until the call returns a non-network response. `get` and `send` on `401` + `token_expired` call `Session.refresh` once and retry once. A second 401 signs out. Parallel 401s await the same refresh future.

Headers from `Session`: bearer, `Accept-Language`, `X-App-Version` from `package_info` is not a dependency — read the version from a `const` in `lib/version.dart` that F09 also shows. `X-Device-Id` is a uuid created once and kept in secure storage. `X-Unit-Id` when `unitId` is set.

## Tasks

### T00.1 · Project, theme, strings

**Files:**
- Create: `tamanly_app/` via `flutter create --org my.tamanly --platforms=ios,android .`
- Create: `lib/theme.dart`, `lib/version.dart`, `lib/l10n/app_en.arb`, `lib/l10n/app_ms.arb`, `lib/widgets.dart`
- Test: `test/widget_test.dart` pumps a `TamanlyApp` and finds the cream background

- [x] **Step 1: Create the project in `tamanly/tamanly_app`.** Delete the counter sample.

- [x] **Step 2: Add only the allow-listed packages this module needs:** `go_router`, `http`, `flutter_secure_storage`, `uuid`. Leave Firebase and the camera packages to the modules that open them.

- [x] **Step 3: `theme.dart` exposes `ThemeData light()` and `ThemeData dark()`.** Light uses the storyboard colours, 16px card radius, 48px minimum button height. Dark is `ColorScheme.fromSeed(seedColor: indigo, brightness: dark)`. Comment: `// ponytail: seed dark palette, replace if design ships dark screens`.

- [x] **Step 4: `widgets.dart` has `PrimaryButton`, `MoneyText` (takes the API `formatted` string), `ErrorText`, `EmptyState`.** Nothing else.

- [x] **Step 5: ARB holds the shell labels** Home, Services, QR Pass, Bills, Me, Gate, Log, Scan, Permits, in EN and BM.

- [x] **Step 6: Run `flutter test`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb` from `plan/storyboard/plans`.

### T00.2 · Session and API client

**Files:**
- Create: `lib/api.dart`, `lib/session.dart`, `lib/me.dart`
- Test: `test/session_test.dart`

- [x] **Step 1: Write `test/session_test.dart` against a fake HTTP client (a class in the test file, injected into `Api`).** Cases:
  - `refreshDelaySeconds(3600)` is 3540. `refreshDelaySeconds(60)` is 0. `refreshDelaySeconds(30)` is 0.
  - A `401` with `token_expired` refreshes once and the original GET is retried with the new access token.
  - Two overlapping `401`s cause one `POST /api/v1/auth/refresh`.
  - Refresh `401` clears both tokens and `signedIn` is false.
  - `allows('bills_pay')` is false for a sub-tenant whose selected property scopes are `['bills_view']`, and true for an owner.

- [x] **Step 2: Run `flutter test test/session_test.dart`.** Expected: FAIL.

- [x] **Step 3: Implement `Api` and `Session`.** Tokens go in `flutter_secure_storage`. Access token is also kept in memory. Base URL is `--dart-define=API_BASE=...`, default `http://127.0.0.1:3000`.

- [x] **Step 4: Run the test.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

### T00.3 · Router and shells

**Files:**
- Create: `lib/router.dart`, `lib/shells.dart`, `lib/app.dart`, `lib/main.dart`
- Test: `test/router_test.dart`

- [x] **Step 1: Write a widget test.** A signed-out session pumps the router and the only route is `/welcome` (placeholder text is fine). A session with `modes: ['resident']` shows the five resident labels. A session with `modes: ['guard']` shows Gate, Log, Scan, Permits, Me.

- [x] **Step 2: Run it.** Expected: FAIL.

- [x] **Step 3: Implement `go_router`.** Resident and guard shells are two `StatefulShellRoute`s. Feature modules add their pages later by editing `router.dart` in their own task. Placeholder child pages are a centered title so the bars are visible.

- [x] **Step 4: Run `flutter test` and `flutter analyze`.** Expected: PASS. Tick every box in this task. Run `ruby progress.rb`.

## Done when

`flutter test` is green, the resident bar matches H0's five items, the guard bar matches C5's five items, and no feature screen is built in this module.
