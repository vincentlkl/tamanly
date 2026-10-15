# Fix batch 3 (approved 2026-10-15). Haiku medium build, Opus medium review. Recipient-count item deferred (waiting on Vincent).
Runs via runs/drive_fix3.sh in screen 'fix3'. Resume: rerun drive_fix3.sh (finished steps have FX3F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Per-property booking auto-cancel minutes (default 15; unpaid + unapproved), admin setting, expiry job | done | 7d83262 |
| 2 | Recurring job sends due scheduled broadcasts once via BroadcastPushJob | done | 27ba45d |
| 3 | Announcement push off still creates in-app inbox row | done | 04dcda6 |
| 4 | Broadcast recipient_count counts distinct people, not devices | done | bf2c2e5 |
| - | Full rspec + minitest | done (926 examples, 0 failures 87 runs, 565 assertions, 0 failures, 0 errors, 0 skips ) | |
| - | Opus medium review + fixes | done (929 examples, 0 failures 87 runs, 565 assertions, 0 failures, 0 errors, 0 skips ) | e0a4d79 |
