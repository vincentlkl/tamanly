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
6. **Bottom nav**: floating white bar (radius 24) on the cream ground, never on a colored band. Raised 56px coral center button with a white icon and a label underneath (`QR Pass` / `Scan`). Tab labels are 11px muted; the active tab is indigo semibold. Resident: Home · Services · [QR Pass] · Bills · Me. Guard: Gate · Log · [Scan] · Permits · Me.
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
