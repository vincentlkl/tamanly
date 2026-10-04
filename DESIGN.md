# Tamanly — Warm Material (mobile)

Recorded from the 42-screen storyboard built in Google Stitch (project `12733498436694002804`, design system `assets/2537142664765639231`). Visual references: `logo.jpg`, `LOGODESIGN.md`, `draft_1.jpeg`, `draft_2.png`. Overview: `storyboard/index.html`.

## Color
| Token | Hex | Use |
|---|---|---|
| indigo | `#3D2B6B` | Header bands, primary buttons, headings, active nav |
| indigo-deep | `#2A1D4D` | Pressed states |
| coral | `#E87A6B` | Raised center nav button, active filter chip, badges, unread dots |
| yellow | `#E8B84A` | Pending / attention, sprout accents, contractor pass strip |
| cream | `#F7F3EC` | App ground behind cards |
| white | `#FFFFFF` | Cards, content sheets |
| ink / muted / hairline | `#1F1A2E` / `#6E6880` / `#ECE6DC` | Text and dividers |
| success / danger | `#2E9E6B` / `#D64545` | Paid, admitted, approved / overdue, deny, SOS |
| tints | coral `#FBE6E2`, yellow `#FAF0D6`, indigo `#ECE9F3`, mint `#E3F3EC` | Icon tiles, chips, info banners |

White on coral fails AA for body text, so primary CTAs are indigo. Coral fills hold icons or short bold labels only.

## Type
Inter throughout. Display 28/34 700 (−0.02em) · Headline 22/28 600 · Title 17/22 600 · Body 15/22 400 · Label 13/18 500 · Caption 12/16 500.

## Layout signatures
1. **Indigo header band** on hub screens: avatar, property switcher pill (taman · unit + chevron), bell with coral dot, greeting, white search field.
2. **White sheet overlaps the band** with a 28px top radius. Sub-pages use a compact band with a rounded back button and a 22px title.
3. **Flat cards**: radius 20, no border, shadow `0 8px 24px rgba(61,43,107,.08)`, 16px padding.
4. **Tinted tiles**: square icon tiles in the four tints with a duotone icon.
5. **Pill buttons**: 52px full-width indigo primary; outline or tinted secondary; sticky bottom CTA bar.
6. **Bottom nav**: floating white bar (radius 24) on the cream ground, never on a colored band. Raised 56px coral center button with an indigo-deep (`#2A1D4D`) icon and a label underneath (`QR Pass` / `Scan`). Tab labels are 11px muted; the active tab is indigo semibold. Resident: Home · Services · [QR Pass] · Bills · Me. Guard: Gate · Log · [Scan] · Permits · Me.
   - The centre icon is indigo-deep, not white: white on coral is about 2.8:1, below the 3:1 non-text minimum; indigo-deep on coral is about 5.4:1.
   - A screen's primary action sits above the nav with 16px clearance and never overlaps the center button. Use a full-width pill for flows and an indigo extended FAB bottom-right on list screens.
   - Overdue or error state lives in chips and tiles, never in a colored card border.
7. **Passes** (visitor and contractor): white ticket on an indigo field with side notches and a dashed tear line. The contractor pass adds a yellow header strip.
8. **Status chips**: Pending Review (yellow), Pending Deposit (coral), Approved (green), Work In Progress (indigo), Inspection Scheduled (yellow), Completed (green), Deposit Refunded (mint).
9. **Illustration**: flat vector Malaysian residents and terrace houses in indigo / coral / yellow.
10. **Icons**: rounded 2px line (Material Symbols Rounded).

## Known gaps
- The logo on Welcome / Sign in is Stitch's redraw. Use the real SVG lockup in production.
- All data is synthetic.
- D3: the "Renovation plan / drawings" title truncates. Let document titles wrap to two lines in the build.
- H0 / C6: Stitch's screenshots carry a 20px cream page margin above the status bar. The storyboard images are trimmed; the Stitch source is not.
- The floating bottom bar is a brand choice. On Android it still needs Material 3 nav-bar behavior: 48dp targets, system Back, and edge-to-edge insets. Dark theme is not designed yet, although G1 shows a Dark mode toggle.

## Web admin console
Recorded from the shipped build: `admin/index.html` (Tailwind v4 `@theme`), `admin/ui.css` (component styles, shared by admin and the guard console), `admin/helpers.js` (formatters, shared), `admin/app.js`, `admin/pages.js`, `admin/pages2.js`, `admin/mobile.html`. Screenshots: `.impeccable/review/` (1440, 1024, 390). Same world as the mobile app (palette, Inter, chips, pill buttons, indigo band with an overlapping cream sheet), laid out as a desktop console.

### Admin-only tokens
| Token | Hex | Use |
|---|---|---|
| paper | `#FCFAF6` | Table header row, search field at rest, disabled input, hover on popover items |
| edge | `#E2DACB` | 1px inset stroke on inputs, outline buttons, picks; ticket tear line. Hover stroke `#CFC6B6` |
| lav | `#C9C1E0` | Secondary text and icons on indigo (sidebar icons, sub-items, drawer subtitle). 6.9:1 on indigo |
| coral-ink | `#A23F31` | Text on coral tint (5.3:1) |
| sun-ink | `#7A5A12` | Text on yellow tint (5.6:1) |
| ok-ink | `#1F7A50` | Text on mint (4.6:1) |
| bad-tint / bad-ink | `#FBE4E4` / `#B33232` | Danger chip, tile, button (5.1:1) |
| mute chip | `#F1ECE3` / `#5E586E` | Neutral chip and lowest permission level (5.8:1) |
| row hover | `#FBF8F3` | Hovered table row or card |
| shadow `--sh` | `0 8px 24px rgba(61,43,107,.07), 0 1px 2px rgba(61,43,107,.05)` | Panels |

Tinted fills always carry their own ink colour, never the base hue as text. Every pair above passes AA for body text.

### Layout shell
1. **Indigo shell.** Body is indigo. Sidebar 288px (lockup 76px tall, company name in lav under it, grouped nav, user row with sign-out at the foot). Top bar 64px: scope pill, search button (white pill, max 420px, `⌘ K` / `Ctrl K` keycap on cream), bell with coral dot ringed in indigo.
2. **Cream work sheet** overlaps the shell with a 28px top-left corner (top-right square on desktop). Page content max 1360px, 32px side padding on desktop. Page title 26/32 600 (−0.02em) with a muted 14.5px sub line; actions right-aligned.
3. **Sidebar nav.** Group rows are 40px, radius 12, 14px/500 in `#EEEBF6` with lav icons; groups are dropdowns with a rotating chevron, sub-items hang from a 1px white/14% rule. The current page is a cream pill with indigo semibold text; a collapsed group holding the current page shows a small cream dot. Counts sit right-aligned before the chevron; a collapsed group shows the sum of its waiting counts.
4. **Below 1024px** the sidebar becomes a slide-in drawer (max 86vw) over an ink/45% scrim, opened from a menu button in the top bar; the search button collapses to an icon below 768px. The sheet then has 28px corners on both top edges.
5. **Panels**: white, radius 20, `--sh`, no border; hairline (`#ECE6DC`) dividers between rows inside. Panel section title 16px 600.
6. Popovers (scope, bell) are white radius 18; the command palette is a 640px white dialog at 10vh, radius 20.

### Index pattern
Every list page uses one engine:
- **Toolbar** (in the panel, above a hairline): search field (280px on desktop, paper fill, white on focus), then filter pills, then tools on the right (view `seg`, `Export CSV` outline button). On phones the filter pills scroll sideways in one row.
- **Result line**: bold tabular count + noun, optional summary, and `Clear filters` when anything is active.
- **Table**: 12.5px muted header on paper, sortable headers with an arrow icon (faint `unfold_more` until active), 12×16 cell padding, hairline rows, numbers right-aligned in tabular figures, whole row clickable and focusable.
- **Measured card fallback.** The table is shown only when it fits its panel; a ResizeObserver checks `scrollWidth` and switches the panel to cards otherwise (and always below 768px). A card puts the first column on top, the status chip right, up to four fields in a 2/4-column definition grid, and row actions underneath.
- **Pager**: `1–20 of N`, page x of y, two outline icon buttons.
- **Empty state teaches**: indigo tile, title, one sentence naming the scope and what to do, and a tonal button (`Clear search and filters`, or the page's create action).

### Drawer pattern
Right-hand dialog 560px (760px wide variant), 24px left corners, ink/45% backdrop. Indigo head (20px 600 white title, lav subtitle, close button), cream body overlapping it by 20px with 24px top corners, white footer with a hairline and right-aligned actions. Below 640px it becomes a bottom sheet: full width, 94dvh, 28px top corners.

### Components
- **Buttons**: pills, 40px (32px small), 14px 600. Primary indigo (hover indigo-deep), tonal indigo-tint, outline white with edge stroke, danger bad-tint/bad-ink, ghost indigo text, dark (transparent, white text) on the shell. Press scales to .98; busy shows a spinner.
- **Chips**: 24px pills, 12px 600, a 6px dot in the text colour; tones sun, coral, ok, indigo, bad, mute, dark. Status mapping follows the mobile vocabulary.
- **Count**: 20px coral pill with indigo-deep 11px bold tabular text (5.4:1); live counts (on site now) use green `#7ED8AE` beside a static `#48C98C` dot.
- **Tiles**: 40px, radius 12, tint fill with its ink icon.
- **Filter select (fsel)**: 36px cream pill select sized to its content (max 220px); an active filter turns coral-tint with coral-ink text.
- **Segmented control (seg)**: cream track, 32px items, the selected item white with indigo semibold text and a soft shadow. Used for tabs and view switches.
- **Inputs**: 40px, radius 12, edge inset stroke, 2px indigo stroke on focus, 2px danger stroke when invalid, `(optional)` marks optional labels.
- **Pick / pickc**: radio cards (radius 14, 2px indigo stroke when checked) and checkbox pills (indigo-tint when checked).
- **Switch (sw)**: 40×24 track, `#D9D0C0` off, indigo on, white knob.
- **Permission levels (perm)**: 32px pills; none mute, view indigo, edit sun, full ok. A per-user override adds a 2px coral ring; an unsaved change a 2px indigo ring.
- **Ticket**: the mobile pass, white radius 18 on indigo, dashed edge tear line with indigo notches.
- **Toast**: ink rectangle (radius 14) bottom centre, coral-light action link `#F3A79C`.
- Focus ring: 2px indigo, offset 2; white on indigo surfaces.

### Scope rule
Scope is always visible in the top-bar pill. Every list, count, search result and the palette goes through one `inScope` filter; a management company only ever sees and edits its own tamans. With one taman chosen, the taman filter and taman column disappear. The scope popover states the rule in plain words.

### Motion
State transitions only, 150–250ms: colours and strokes 150ms, switch and chevron 200ms on `cubic-bezier(.2,.8,.2,1)`, drawer slide-in 240ms (slide-up on phones), palette rise 180ms. No entrance choreography; reduced motion collapses all of it.

### Known gaps
- The logo mark is cropped from `logo.jpg` with background-position. Use the real SVG mark when it exists.
- All data is synthetic, on a fixed demo clock (Sat 3 Oct 2026, 10:42).
- Tailwind runs from the browser CDN build. That is prototype-only; production needs a compiled stylesheet.

## Guard console
Recorded from the shipped build: `security/index.html` (the shared `@theme`, then `admin/ui.css`, then a guard-only component `<style>` block), `security/guard.js`, `admin/helpers.js`, `admin/data.js`. Screenshots: `.impeccable/review/sec-*.png` (1440, 1280, 1024, 390). It uses the same world and tokens as the web admin, with no new colours, and is built for a guard standing at a booth: big cards, big words, and one obvious button.

### Layout shell
1. **Navigation**: Gate · Log · [Scan] · Permits · Me. From 1024px it is a 96px indigo rail. Rail items are 76px wide, at least 64px tall, radius 18, 12px/500 in lav, and the current item is a cream pill with indigo semibold text and a filled icon. Below 1024px it becomes the mobile floating bottom bar: white, radius 24, 70px tall, 12px from the edges plus the safe area, 11px muted labels, with the raised 56px coral Scan (indigo-deep icon, 5px white ring). The toast lifts to clear the bar.
2. **Top bar**: indigo, 64px, sticky. It holds the station (gate · taman, 15px semibold), a live clock (20px semibold, tabular) with the day in lav, `Synced` with a live dot, the guard's avatar and name, and a tonal danger SOS button (bad-tint/bad-ink, 48px). The clock appears from 640px; sync and guard appear from 768px.
3. **Cream sheet** with 28px top corners (top-right square beside the rail), max 1280px, with 96px+ bottom padding on phones so content clears the bar.
4. **Sign-in**: an indigo half with the lockup and a `Guard` dark chip, and a cream half holding a guard picker (white radius-20 cards) and then a PIN keypad. The halves sit side by side 5:7 from 1024px and stack below that.

### Verdict sheet
The core of the console: every pass, permit or walk-in resolves to one full-colour answer.
- **Band tones**: ok-ink green with white text (Admit / Valid), bad-ink red with white text (Do not admit, Refuse entry, stop-work), sun amber with ink text (Check with host), and indigo with white text for neutral flows (walk-in, delivery, scan, SOS, incident, end shift).
- **Band type**: title 700, −0.02em, 28/36 on phones and 34/40 from 640px. Filled icon 44px on phones and 52px from 640px. Close button 48px, inheriting the band's text colour.
- **Verdict wipe**: the band's colour wipes in from the left (`clip-path` inset, 340ms, `--ease`) only on the sheet's first open. Re-renders inside an open sheet never replay it. This is the console's one authored motion; everything else is state transitions. The scan viewfinder's coral scanline stops under reduced motion.
- **Footer**: white with a hairline. One dominant 56px action (`btn-xl`, 16px) with a 56px outline secondary beside it. Admit is a solid ok-ink button (hover `#186543`). The primary takes autofocus.
- **Gating**: when a valid pass has a plate, Admit stays disabled until the guard answers the plate check (Plate matches / On foot / Different car; a different car also needs the host's yes). Refuse turns the band red and preselects the reason the verdict already knows. `Host said no` is preselected the same way.
- **Shape**: below 640px it is a bottom sheet (full width, 94dvh max, 28px top corners, slides up). From 640px it is a centred 640px dialog, radius 28, over an ink/55% backdrop.
- **Sheet body** stacks as a block with vertical spacing (`space-y-5`; padding 20/24, 18/16 on phones) and scrolls. Never lay it out as a height-capped grid: rows collapse under overflow hidden.

### Components
- **Choice**: a white tile with an edge inset stroke, radius 16, at least 60px tall, 13.5px/600, with a 22px icon over the label. When selected it turns indigo-tint with indigo text and a 2px indigo inset stroke. The `row` variant is a 48px pill. Choices are used for the plate check, purpose, host answer and refusal reasons.
- **Stepper**: a 48px white circle with an edge stroke and an indigo glyph, at 35% opacity when disabled. A 26px tabular count sits between the − and + buttons.
- **PIN keypad**: 64px keys, radius 18, white with an edge stroke, 26px/600 tabular, flashing indigo-tint on press. A 3-column grid (max 320px) sits under four 16px dots, which fill indigo.
- **Arrival rows**: the whole row is one button. It shows the time (tabular) and how long ago, the name, and the type · unit. Phones end the row with a muted chevron; from 640px it ends with a 48px tonal `Check` pill.
- **Unit names** never break inside the street part: the parcel list breaks only after the comma (`un()` in guard.js). Arrival rows keep the whole unit name together.
- **Targets**: every interactive element is at least 48px, including the row buttons, emergency links (`min-h-12`), check-out and permit buttons (`h-12`), the sheet close button and SOS.
- **Lookup field**: a 56px search input (17px) handles pass code, plate and name, so there is no separate Enter-code button.

### Rendering rule
Host panels repaint only when their HTML string changes. In the walk-in sheet, the host-request block and the footer go through `paint()`, which compares the new HTML against `data-h` before writing `innerHTML`. A redraw therefore never replaces a button between pointer-down and click, so taps are not swallowed.

### Known gaps
- Camera scanning is simulated (viewfinder with a scanline; no camera access).
- Resident in-app approval is simulated (timed reply).
- No BM language toggle and no night theme, although guards work night shifts.
- The password gate (`gate.js`) is a client-side deterrent only, not authentication.
