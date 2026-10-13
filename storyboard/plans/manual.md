# Manual checklist

The agent does not tick this file. You do, when the human step is done. Then run `ruby progress.rb` if you want the bar in the README to move.

These need accounts, a device, a store, or a secret the agent must not invent.

## Apple, Google, Firebase

- [ ] Create the Firebase project and note the project id for `credentials.firebase.project_id`.
- [ ] Enable phone sign-in. Add the Malaysian test numbers you will use in development.
- [ ] Download `google-services.json` into `tamanly_app/android/app/`. Do not commit it if the repo is public.
- [ ] Download `GoogleService-Info.plist` into `tamanly_app/ios/Runner/`.
- [ ] Create an Apple Developer app id. Enable Push Notifications and Associated Domains.
- [ ] Create an APNs key and upload it to Firebase Cloud Messaging.
- [ ] Create the Android app in Play Console (package name must match the Flutter app).
- [ ] Confirm SMS for phone auth works on a real Malaysian SIM, not only the test number.
- [ ] On a real iPhone and a real Android, accept the notification permission and receive one FCM message with the app in the background and one with it killed.

## Push, links, device permissions

- [ ] Host `apple-app-site-association` and `assetlinks.json` for the HTTPS links you will put in WhatsApp share URLs.
- [ ] Register the `tamanly://` scheme on both platforms and open `tamanly://payments/<id>` from Notes once.
- [ ] Write the permission purpose strings in Info.plist and Android manifest: camera (guard scan and listing photos), photos, location (SOS only), notifications.
- [ ] SOS: stand at a real gate once and confirm the location the guard sees is that gate, not a simulator default.

## Payments

- [ ] Open a Billplz account per management company. Sandbox first.
- [ ] Put the Billplz secret and X Signature key in Rails credentials for that payout account. The app never sees them.
- [ ] Set `auth.access_ttl_seconds`, `auth.refresh_ttl_seconds` and `auth.refresh_reuse_grace_seconds` on the admin settings screen (B01). Confirm a refresh after the access TTL returns a new pair.
- [ ] Pay one sandbox invoice by FPX and one permit deposit. Confirm the webhook moves the payment without a second charge when Billplz retries.
- [ ] Return from the bank page lands on the app receipt (E3), not a blank browser tab.

## Stores, legal, content

- [ ] Privacy policy and terms URLs for G4 (PDPA). Account deletion must be possible in the app (`DELETE /api/v1/me`) because Apple requires it.
- [ ] Replace the storyboard logo with the real SVG from `LOGODESIGN.md` when you have it.
- [ ] Read the EN and BM strings on A1, the pay button, the guard verdict, and the SOS sheet. Fix any line a resident would not say.
- [ ] Store listing: app name, screenshots from the storyboard flows, age rating, support email.
- [ ] Play App Signing and an App Store distribution certificate. The agent does not hold these.

## Operations the app only displays

- [ ] Seed or enter one taman, units, a guard, an owner, a sub-tenant, a facility, a permit type, and an invoice so the app has something to show.
- [ ] Create guards and management staff in the admin. The A3 cards do not register those roles.
- [ ] Set `min_app_version` when you ship a build the old app must refuse. The app only shows the `426` screen.
- [ ] Confirm a sub-tenant without `bills_pay` cannot pay, on a real build, not only in a test.
- [ ] Confirm the guard scan of a visitor QR and a contractor pass both return a verdict in a few seconds on the guardhouse network.
