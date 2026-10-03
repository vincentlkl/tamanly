# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Single Material-leaning design language shipped on both iOS and Android (user choice, 2026-10-03: "neutral / warm Material"). No per-OS divergence.

## Stack

Design-only phase. Mobile storyboard produced in Google Stitch (user choice); Figma not connected.

## Users

- **Residents and owners** of units in Malaysian tamans (landed housing estates / gated communities). Owners may hold multiple units across different tamans.
- **Sub-tenants** with limited, owner-granted scopes (e.g. view bills only, or pay).
- **Security guards** at the guardhouse: mobile-first, scanning visitor and contractor QR, admitting/denying, logging.
- **Management staff** of a management company. Their primary surface is the web dashboard (`admin/index.html`, responsive down to phone width); a company only ever sees and edits the tamans under its own management contract.

Guards use the same app; a guard account lands in a dedicated guard mode after sign-in.

## Product Purpose

Multi-tenant neighborhood property management: one app for community news, visitor access, contractor permits with deposits, billing, facility booking, and a community marketplace, scoped by role and property.

## Positioning

Built for the Malaysian taman: permits with refundable deposits and contractor passes verified at the guardhouse, multi-property owners across tamans, EN / BM.

## Capabilities and Constraints

Source of truth: `FEATRURES.md` → Mobile app section. Key flows: sign in/register by role, property switcher, sub-tenant invites, home feed, facility & service directory, marketplace, visitor pre-registration + QR, guard scan/admit/deny/log, contractor permit verification, SOS contacts, permit applications (category, documents, deposit/fee payment, status tracker, contractor pass QR, completion + refund), invoices/pay/receipts, facility booking, notification center, profile/language/settings.

Permit statuses: Pending Review, Pending Deposit, Approved, Work In Progress, Inspection Scheduled, Completed, Deposit Refunded.

Currency RM. Languages EN / BM.

## Brand Commitments

- Logo: `logo.jpg`, spec in `LOGODESIGN.md`. Gate-and-roofs mark is fixed.
- Palette: Indigo `#3D2B6B` (primary), Coral `#E87A6B`, Warm yellow `#E8B84A`, Cream `#F7F3EC`.
- Type: Inter (wordmark Inter Medium); no rounded bubble fonts.
- Style: warm Material, soft elevation, rounded geometry; friendly but professional, not playful, not cold corporate.
- Visual references made binding by the user: `draft_1.jpeg` (clean flat white cards, soft shadows, pill CTAs, bold rounded bottom bar with raised center action) and `draft_2.png` (colored header band with wave that the white content sheet overlaps, flat character illustrations, tinted category tiles).

## Evidence on Hand

No real tamans, residents, prices, or fees. All names, amounts, and taman data in designs are synthetic placeholders.

## Product Principles

1. The right role sees the right thing: permissions are visible, never surprising.
2. The guardhouse is a 3-second interaction: scan, verdict, done.
3. Money is clear: amounts, deposits, and refund status are never ambiguous.
4. Property context is always visible: which taman and unit you are acting for.
