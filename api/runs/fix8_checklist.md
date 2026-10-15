# Fix batch 8 (approved 2026-10-15): atomic claim of failed push rows on retry. Haiku medium build, Opus medium review
Runs via runs/drive_fix8.sh in screen 'fix8'. Resume: rerun drive_fix8.sh (finished steps have FX8F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Retry atomically claims failed push rows; two-jobs spec | done | acf5210 |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
