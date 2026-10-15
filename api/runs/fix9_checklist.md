# Fix batch 9 (approved 2026-10-15): retry reclaims stale pending push rows. Haiku medium build, Opus medium review
Runs via runs/drive_fix9.sh in screen 'fix9'. Resume: rerun drive_fix9.sh (finished steps have FX9F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Retry reclaims pending rows older than 10 min (safe outer-check claim); specs stale vs fresh | done | 572b33d |
| - | Full rspec + minitest | done (958 examples, 0 failures 88 runs, 571 assertions, 0 failures, 0 errors, 0 skips ) | |
| - | Opus medium review + fixes | done (959 examples, 0 failures 88 runs, 571 assertions, 0 failures, 0 errors, 0 skips ) | 698c387 |
