---
version: 1
slug: "security-index-html"
primary_target: "security/index.html"
related_targets: []
---

# Guard console

Mode: Operate. Surface: `security/index.html` (guardhouse tablet first, responsive to the guard's phone). Same Tamanly world as `admin/` and the mobile app; reuses `admin/ui.css`, `admin/helpers.js`, `admin/data.js`.

Audience: security guards at a taman gate (contract guards, often Nepali, Malay or Bangladeshi; English is a working language, not a first one), day and night shifts, standing at a booth with cars waiting. Job: check passes, admit or deny, register walk-ins and get the host's OK (in-app request or phone call), check contractors against their permit, keep the shift log and handover notes, reach emergency numbers. Product principle: the guardhouse is a 3-second interaction.

## Direction contract

THESIS: The gate is a verdict machine. Every pass, code, plate or walk-in resolves to one full-width answer (Admit, Check with host, Do not admit) readable at arm's length, with the next action as the biggest thing on screen. Refuses the admin's filter-and-table console: guards get big cards, big words and one obvious button.

OWN-WORLD: Tamanly indigo shell and cream sheet, white radius-20 cards, Inter with tabular clock and plates, Material Symbols Rounded. The coral raised Scan button from the app's guard mode. Verdict bands in ok-ink green, bad-ink red and sun amber, with white or ink text at AA. Primary buttons 56px, every target at least 48px.

STORY: A guard taps their name and enters a PIN, sees who is arriving and who is inside, scans or types a pass and gets a verdict. Walk-ins are registered, the host is asked in the app or by phone, then admitted. Contractors are checked against hours, workers, plates and stop-work orders.

FIRST VIEWPORT: Tablet landscape: 96px indigo rail (coral Scan, Gate, Log, Permits, Me); indigo top bar with station (taman · gate), live clock, sync, guard on duty, SOS. Sheet: a 56px lookup field (pass code, car plate or name; one field covers code entry and every lookup, so there is no separate Enter code button) and three big actions (Scan pass, Walk-in, Delivery), then "Arriving today" with one-tap Check, and a right column "Call a unit" plus emergency numbers. Phone: same content stacked, floating bottom bar with the raised coral Scan.

FORM: Gate console on Material navigation (rail when wide, bottom bar when compact). Concept-seed not run, exempted by the user's words "follow the same design theme": DESIGN.md already fixes the guard mode's navigation (Gate · Log · [Scan] · Permits · Me) and visual world, so a roll could not change the form.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
