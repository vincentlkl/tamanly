# Fix batch 6 (approved 2026-10-15). Haiku medium build, Opus medium review
Runs via runs/drive_fix6.sh in screen 'fix6'. Resume: rerun drive_fix6.sh (finished steps have FX6F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | No made-up 96% delivered on broadcast retry; real results only | done | 9f47050 |
| 2 | Validate announcement channels against allowed list, en/ms messages | done | 9079390 |
| - | Full rspec + minitest | done (951 examples, 0 failures 88 runs, 571 assertions, 0 failures, 0 errors, 0 skips ) | |
| - | Opus medium review + fixes | done (946 examples, 0 failures 88 runs, 571 assertions, 0 failures, 0 errors, 0 skips ) | c409864 |
