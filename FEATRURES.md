# Tamanly — Product features

Multi-tenant neighborhood property management for Malaysian tamans. Owners can hold multiple properties across different housing areas; management companies, security, residents, and sub-tenants share one product with clear permissions.

---

## Mobile app

Primary surface for residents, sub-tenants, field security, and on-the-go owners.

### Access & accounts
- Sign in / register (owner, resident, sub-tenant, security, management staff)
- Multi-property switcher (owner with units across tamans)
- Role- and property-scoped permissions
- Invite / accept sub-tenant access with limited scopes

### Home & community
- Taman / property home feed (announcements, alerts)
- Directory of facilities and services for the selected taman
- Marketplace browse & list (community buy/sell/services)

### Visitors & security
- Visitor pre-registration
- Generate / show visitor QR for gate entry
- Security: scan QR, admit / deny, visitor log (mobile-first for guards)
- Security: verify contractor / vendor permits (allowed hours, worker count, vehicle plates)
- Emergency / SOS contacts for the taman

### Permits & vendor requests
- Submit permit applications by category (renovation, contractor/vendor entry, move-in/out, heavy vehicle)
- Required document uploads (contractor company details, worker IC/passports, renovation plans, insurance policies)
- Integrated deposit & fee payment (refundable security deposits, non-refundable processing fees via payment gateway or bank transfer receipt)
- Application status tracker (Pending Review, Pending Deposit, Approved, Work In Progress, Inspection Scheduled, Completed, Deposit Refunded)
- Digital contractor pass & entry QR: Shareable with approved vendors/contractors for guardhouse gate verification
- Work completion & deposit refund request: Request management inspection upon job completion to trigger security deposit refund

### Billing & payments
- View invoices & balance for linked units
- Pay bills (in-app payment flow)
- Receipt history & reminders
- Sub-tenant: view only or pay if granted

### Facilities
- Browse bookable facilities (hall, court, BBQ, etc.)
- Book slots, cancel, see booking status
- Push reminders before booked time

### Notifications
- Push for visitor arrival, bills due, booking confirmations, permit status & deposit updates, announcements
- In-app notification center

### Profile & settings
- Profile, language (EN / BM), notification prefs
- Linked properties & roles
- Support / help

---

## Web dashboard

Primary surface for management companies, taman admins, billing ops, and owners who prefer desktop oversight.

### Access & tenancy
- Org / management-company login
- Multi-taman & multi-property admin console
- User & role management (owners, residents, sub-tenants, security teams)
- Permission matrices per property / taman

### Properties & units
- CRUD for tamans, blocks, units
- Assign owners, tenants, sub-tenants
- Unit status (occupied, vacant, under notice)

### Security operations
- Visitor registry (search, filter, audit trail)
- QR policy config (validity window, guest limits)
- Security team roster & shift notes
- Incident / log reporting

### Permits & contractor admin
- Central permit registry & workflow board (filter by taman, unit, category, status, date)
- Category & policy configuration:
  - Define permit types (renovation, contractor/vendor entry, move-in/out, heavy vehicles)
  - Security deposit requirements (refundable deposit amount, processing fee, bank account for refunds)
  - Required document checklists (renovation plans, contractor SSM, public liability insurance, worker IC/passports)
  - Permitted work hours & day restrictions per taman (e.g. weekdays only, no loud drilling on weekends)
- Application review & approval workflow:
  - Review submitted drawings, contractor credentials, and scope of work
  - Approve, reject with remarks, or request document resubmission
  - Issue conditional approval pending deposit payment verification
- Deposit escrow & refund management:
  - Track collected deposits, active funds held in escrow, and refund claims
  - Pre- and post-work site inspection checklist (assess lift padding, corridors, common area damage)
  - Approve full refund, partial refund with itemized damage deductions, or forfeiture
- Security & site enforcement:
  - Live dashboard of active on-site contractors across tamans for guardhouse synchronization
  - Blacklist errant contractors / vendors across the taman or entire management portfolio
  - Issue digital stop-work orders or violation notices

### Billing & finance
- Create & schedule invoices (maintenance, sinking fund, extras)
- Payment reconciliation & status board
- Permit security deposit tracking, escrow ledger, and refund payouts
- Late fees / reminders configuration
- Export statements (CSV / PDF)
- Owner portfolio billing across properties

### Facilities admin
- Facility catalog & calendars
- Booking rules (caps, deposits, blackout dates)
- Approve / override bookings
- Utilization reports

### Marketplace moderation
- Listing approval / takedown
- Category & policy settings
- Report handling

### Communications
- Announcements (taman-wide or unit-targeted)
- Broadcast SMS / email / in-app (where configured)
- Template library

### Analytics & reports
- Occupancy, collections rate, visitor volume, facility usage, active renovation permits & deposit escrow balances
- Per-taman and cross-portfolio views for multi-property owners / JMB / management

### Settings
- Branding (logo, colors), taman profile
- Integrations (payment gateway, SMS)
- Audit log of admin actions

---

## Shared platform (both)

| Capability | Mobile | Web dashboard |
|------------|:------:|:-------------:|
| Multi-tenant / multi-property | ✓ | ✓ |
| Role-based permissions | ✓ | ✓ (full admin) |
| Visitor QR | Generate / show / scan | Configure & audit |
| Permits & vendor passes | Request, pay deposit, track & share pass | Configure rules, review/approve, inspect & refund |
| Billing | View & pay | Create & reconcile |
| Facility booking | Book | Configure & manage |
| Marketplace | Browse & post | Moderate |
| Announcements | Consume | Publish |

## Out of scope (for now)
- Native desktop apps
- Hardware gate controller firmware (integration hooks only)
