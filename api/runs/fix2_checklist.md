# Fix batch 2 (approved 2026-10-15 "fix those bugs"). Haiku medium build, Opus medium review
Runs via runs/drive_fix2.sh in screen 'fix2'. Resume: rerun drive_fix2.sh (finished steps have FX2F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Cap unpaid booking window at 15 min; release pending payment via Payments::Release | pending | |
| 2 | bookings.user_id from signed-in user; facility_booking pays own bookings only | pending | |
| 3 | Admin-approved: payment window from approval, notify booker | pending | |
| 4 | Deposit-only bookings require online payment | pending | |
| 5 | FCM PushSender + token pruning, BroadcastPushJob, in-app notifications | pending | |
| - | Full rspec + minitest | pending | |
| - | Opus medium review + fixes | pending | |
