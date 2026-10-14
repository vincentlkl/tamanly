# Fix batch 2 (approved 2026-10-15 "fix those bugs"). Haiku medium build, Opus medium review
Runs via runs/drive_fix2.sh in screen 'fix2'. Resume: rerun drive_fix2.sh (finished steps have FX2F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Cap unpaid booking window at 15 min; release pending payment via Payments::Release | done | 9e4dac6 |
| 2 | bookings.user_id from signed-in user; facility_booking pays own bookings only | done | 10ae91e |
| 3 | Admin-approved: payment window from approval, notify booker | done | b68f583 |
| 4 | Deposit-only bookings require online payment | done | 76f5b67 |
| 5 | FCM PushSender + token pruning, BroadcastPushJob, in-app notifications | done | d22b15a |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
