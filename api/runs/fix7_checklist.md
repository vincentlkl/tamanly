# Fix batch 7 (approved 2026-10-15): broadcast retry resends only to failed. Haiku medium build, Opus medium review
Runs via runs/drive_fix7.sh in screen 'fix7'. Resume: rerun drive_fix7.sh (finished steps have FX7F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Track per-person push result per broadcast; stats from real results | done | 87a4de5 |
| 2 | Retry pushes only to failed recipients, no duplicate inbox rows | pending |  |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
