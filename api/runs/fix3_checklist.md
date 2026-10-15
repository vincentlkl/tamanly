# Fix batch 3 (approved 2026-10-15). Haiku medium build, Opus medium review. Recipient-count item deferred (waiting on Vincent).
Runs via runs/drive_fix3.sh in screen 'fix3'. Resume: rerun drive_fix3.sh (finished steps have FX3F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Per-property booking auto-cancel minutes (default 15; unpaid + unapproved), admin setting, expiry job | done | 7d83262 |
| 2 | Recurring job sends due scheduled broadcasts once via BroadcastPushJob | done | 27ba45d |
| 3 | Announcement push off still creates in-app inbox row | done | 04dcda6 |
| 4 | Broadcast recipient_count counts distinct people, not devices | pending |  |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
