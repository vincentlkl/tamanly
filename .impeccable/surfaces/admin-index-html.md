---
version: 1
slug: "admin-index-html"
primary_target: "admin/index.html"
related_targets: ["admin/mobile.html"]
---

# Admin web dashboard

Mode: Operate. Surface: `admin/index.html` (management console) plus `admin/mobile.html` (phone-width drafts of each section).

Audience: staff of one management company (demo: Lestari Facility Management, 4 tamans). Job: clear what is waiting on them (permits, refunds, payments, bookings, reports, incidents) and run every web-dashboard feature in FEATRURES.md. Constraint: a company sees and edits only its own tamans; scope is always visible. Responsive to phone width is a user requirement. Tailwind CSS. Same brand as the mobile app, but a desktop layout (user, 2026-10-03).

User-pinned structure: grouped sidebar with dropdown sub-menus; search + filters on every index page; sign-in page.

## Direction contract

THESIS: Scope is the frame. An indigo shell (sidebar + top bar with the taman scope pill) holds who and where you act for; the cream work sheet overlaps it with a 28px corner, as the app's sheet overlaps its band. Refuses the grey SaaS admin that opens on four KPI cards: the landing is a worklist of what is waiting on you.

OWN-WORLD: Indigo shell, cream sheet, white radius-20 panels with soft indigo shadow, no borders on panels, hairline row dividers. Cream pill marks the current page in the sidebar; coral counts; yellow pending; mobile status-chip vocabulary. Inter with tabular figures; Material Symbols Rounded; pill buttons (indigo filled, indigo-tint tonal).

STORY: A manager signs in, sees only their company's tamans, sees what waits, and clears it (review a permit, settle a refund, match a payment) through one consistent index + drawer pattern.

FIRST VIEWPORT: 288px indigo sidebar (lockup, company, grouped nav with counts). Indigo top bar: scope pill, search (⌘K), bell, avatar. Sheet: greeting + date and scope, then "Waiting on you" worklist (2/3) with inline actions; right column "On site now" live contractors and today's gate numbers; a single ruled band for this month.

FORM: Classic side-nav console, pinned by the user; concept-seed not run because the topology is pinned. Signature interaction: changing the scope re-filters every page, count and search result; ⌘K palette reaches every page and record in scope.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
