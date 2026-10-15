# Fix batch 5 (approved 2026-10-15): remove all SMS from backend admin. Haiku medium build, Opus medium review
Runs via runs/drive_fix5.sh in screen 'fix5'. Resume: rerun drive_fix5.sh (finished steps have FX5F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Broadcasts: no SMS channel, default Push, no fake 98%, migrate SMS rows | done | 9602a19 |
| 2 | Late-fee reminders: no SMS channel, credits text gone, migrate data | done | 7b40097 |
| 3 | Announcements: no SMS/credits text; sweep leftovers (enums, seeds, i18n, helpers, specs) | done | 5a10d8b |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
