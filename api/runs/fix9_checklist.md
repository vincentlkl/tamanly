# Fix batch 9 (approved 2026-10-15): retry reclaims stale pending push rows. Haiku medium build, Opus medium review
Runs via runs/drive_fix9.sh in screen 'fix9'. Resume: rerun drive_fix9.sh (finished steps have FX9F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Retry reclaims pending rows older than 10 min (safe outer-check claim); specs stale vs fresh | done | 572b33d |
| - | Full rspec + minitest | pending |  |
| - | Opus medium review + fixes | pending |  |
