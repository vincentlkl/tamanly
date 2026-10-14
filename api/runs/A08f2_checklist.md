# A08 follow-ups 2 (approved 2026-10-15) — QUEUED after A10. Haiku medium build, Opus medium review
Runs automatically via runs/drive_a08f2.sh once drive_all.sh logs ALLDONE (waiter screen 'a08f2wait').
Resume: rerun runs/drive_a08f2.sh (finished steps have A08G2F<n>_build.ok files).
| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Online checkout charges fee + deposit | queued | |
| 2 | Unpaid bookings expire after 15 min (reuse expiry job pattern), slot released | queued | |
| 3 | facility_booking scope can pay own bookings (no bills_pay needed) | queued | |
| 4 | Refunds manual by admin: docs note only | queued | |
| 5 | 'Booking' option in admin reconciliation filter | queued | |
| - | Full rspec + minitest | done (887 examples, 0 failures 87 runs, 565 assertions, 0 failures, 0 errors, 0 skips ) | |
| - | Opus medium review + fixes | done (888 examples, 0 failures 87 runs, 565 assertions, 0 failures, 0 errors, 0 skips ) | ed5655f |
Note: if drive_all.sh halts on a limit the waiter exits; after drive_all.log shows ALLDONE run drive_a08f2.sh directly.
