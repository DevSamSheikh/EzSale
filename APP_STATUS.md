# EzSale — Application Status

> **Source of truth for the current implementation status of EzSale.**
> Updated alongside every code change. Sections below reflect the **actual** state of the codebase, not the planned future state.

---

## 1. Application Pages / Routes

| Page | Route | Purpose | Implementation | UI | Functional | Important Components | Related Features | Known Issues | Pending Work |
|------|-------|---------|----------------|----|-----------|----------------------|-------------------|--------------|--------------|
| Login | `/login` | Sign in with email/password | 🟢 Complete | 🟢 Complete | 🟢 Complete | AuthShell | Authentication | None | Remember-me, social SSO, MFA flow |
| Signup | `/signup` | Register workspace owner | 🟢 Complete | 🟢 Complete | 🟢 Complete | AuthShell | Authentication, First-time setup | None | Email verification flow |
| Forgot password | `/forgot` | Reset password request | 🟢 Complete | 🟢 Complete | 🟡 Partial (mocked reset) | AuthShell | Authentication | Reset is a UI stub, no real email/token sent | Real email + token reset flow |
| Setup Wizard | `/setup` | First-time onboarding for new business | 🟢 Complete | 🟢 Complete | 🟢 Complete | Step components | First-time setup, Onboarding | None | Save progress persistence, multi-business flow |
| Dashboard | `/app/dashboard` | Home overview, KPIs, recent activity | 🟢 Complete | 🟢 Complete | 🟢 Complete | KpiGrid, SalesChart, LocationsBreakdown | Dashboard, Locations | None | Drill-through from any KPI tile |
| POS | `/app/pos` | Point of sale — products + cart | 🟢 Complete | 🟢 Complete | 🟢 Complete | ProductCard, CartPanel, POSNavbar, **POSAlertStrip** | POS, Multi-location, **Notifications** | None | Quick reorder, save-as-quotation |
| POS Payment | `/app/pos/payment` | Choose method & finalize sale | 🟢 Complete | 🟢 Complete | 🟢 Complete | MemberPicker, CardPanel, **NFCScanExperience** | POS, Payments, Cards, Locations | None | Split-tender, partial deposits |
| POS Receipt | `/app/pos/receipt/:txnId` | Digital receipt with print/share | 🟢 Complete | 🟢 Complete | 🟢 Complete | ReceiptDocument, **ReceiptPreviewModal** | POS, Receipts, Locations | None | Email/SMS receipt delivery |
| Products | `/app/products` | Catalog management | 🟢 Complete | 🟢 Complete | 🟢 Complete | ProductCard, Editor drawer | Products, Categories, Inventory | None | Bulk import (CSV) |
| Categories | `/app/categories` | Category configuration | 🟢 Complete | 🟢 Complete | 🟢 Complete | CategoryCard, Editor | Categories, Products | None | Reorder via drag-and-drop |
| Orders | `/app/orders` | Sales history with detail drawer | 🟢 Complete | 🟢 Complete | 🟢 Complete | OrdersTable, OrderDetailsDrawer | Orders, Refunds, Locations, Cards | None | Bulk export with all columns |
| Users | `/app/users` | Member/customer list | 🟢 Complete | 🟢 Complete | 🟢 Complete | UserCard, Filters | Customers, Cards | None | Bulk invite via CSV |
| User Details | `/app/users/:memberId` | Single member profile | 🟢 Complete | 🟢 Complete | 🟢 Complete | Tabs (Profile, Cards, Activity) | Customers, Cards | None | "Impersonate member" for support |
| **Notifications & Activity** *(new)* | `/app/notifications` | Admin notification center + activity timeline | 🟢 Complete | 🟢 Complete | 🟢 Complete | NotificationsPage, NotificationDropdown, **TopbarNotifications** | Notifications, Activity | None | Server-side email / push, snooze |
| Cards | `/app/cards` | Membership card grid | 🟢 Complete | 🟢 Complete | 🟢 Complete | CardTile, Filters | NFC Cards, Multi-location | None | NFC UID collision re-check |
| Card Details | `/app/cards/:cardId` | Single card profile & activity | 🟢 Complete | 🟢 Complete | 🟢 Complete | Tabs (Activity, Txns, Deposits) | NFC Cards | None | Card-replacement flow polish |
| Deposits | `/app/deposits` | Card top-up records | 🟢 Complete | 🟢 Complete | 🟢 Complete | DepositsTable | Payments, Cards | None | Real deposit-provider integration |
| Deposit Requests | `/app/deposit-requests` | Pending top-up requests | 🟢 Complete | 🟢 Complete | 🟢 Complete | RequestsTable, ApproveDialog | Payments, Cards | None | Bulk approve action |
| Transactions | `/app/transactions` | Full transaction ledger | 🟢 Complete | 🟢 Complete | 🟢 Complete | TransactionsTable, TransactionDetailsDrawer | Transactions, Refunds, Locations | None | Export reconciliation report |
| Reports | `/app/reports` | Pre-built report catalog with 9 categories and 15 ready reports | 🟢 Complete | 🟢 Complete | 🟢 Complete | ReportsCatalog, ReportRunner, **reports-engine** | Reports, Analytics, Locations | None | Saved reports, scheduled email delivery, custom report builder |
| Analytics | `/app/analytics` | Charts, trends, comparisons | 🟢 Complete | 🟢 Complete | 🟢 Complete | KpiGrid, LineChart, DonutChart | Analytics, Locations | None | Saved views, scheduled email digests |
| Staff | `/app/staff` | Operator (employee) list | 🟢 Complete | 🟢 Complete | 🟢 Complete | OperatorTable, Editor | Staff, Locations, Roles | None | Bulk invite via email |
| Operator Details | `/app/staff/:operatorId` | Single operator profile | 🟢 Complete | 🟢 Complete | 🟢 Complete | Profile, Permissions, Activity | Staff, Roles, Locations | None | Force-logout button |
| Roles | `/app/roles` | Role/permission editor | 🟢 Complete | 🟢 Complete | 🟢 Complete | PermissionGrid, RoleEditor | Roles, Staff | None | "Clone role" shortcut |
| Settings | `/app/settings` | Workspace config (tax, receipt, NFC, etc.) | 🟢 Complete | 🟢 Complete | 🟢 Complete | SettingsShell, SettingCard | Settings, Multi-location | None | Audit history of setting changes |
| **Locations** *(new)* | `/app/locations` | Manage stores/kiosks/terminals/managers | 🟢 Complete | 🟢 Complete | 🟢 Complete | LocationCard, LocationEditor, LocationDetailsDrawer | Multi-location | None | Bulk terminal import |
| Portal Landing | `/u/identify` | Cardholder identifies themselves | 🟢 Complete | 🟢 Complete | 🟢 Complete | IdentifyForm | User Portal | None | QR login |
| Portal Dashboard | `/u/:slug` | Cardholder dashboard | 🟢 Complete | 🟢 Complete | 🟢 Complete | StatCard, RecentActivity | User Portal, Cards | None | Top-up flow in portal |

---

## 2. Features

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (email/password) | 🟢 Complete | localStorage-backed; one signed-in operator at a time |
| First-time setup wizard | 🟢 Complete | Captures business profile, payment methods, NFC config |
| POS catalog browsing | 🟢 Complete | Filter by category, search, favorites, variants |
| Cart | 🟢 Complete | Quantity stepper, duplicate-line toggle, promo codes |
| Checkout | 🟢 Complete | All 5 payment methods supported (cash, card, bank, wallet, membership) |
| Receipts | 🟢 Complete | Print (thermal + A4 / US-letter), save as .txt or .html, share, email via mailto:. Receipt content: business name / address / tax id, location + terminal, order id, date/time, cashier, customer, membership card (status / tier / number), per-line items + qty + price, subtotal, discount, tax (with inclusive/exclusive label), total, cash change / card reference, and the post-charge card balance for membership payments. Thermal layout honours `@page { size: 80mm }`; standard layout honours A4. |
| Products / Catalog | 🟢 Complete | CRUD, status, variants, images, badges, discounts |
| Categories | 🟢 Complete | Per-business-type presets, custom categories |
| Inventory | 🟡 In Progress | Stock + low-stock threshold present; no reorder / purchase-order flow yet |
| Orders | 🟢 Complete | Full filter, search, pagination, CSV export |
| Refunds | 🟢 Complete | Full + partial, card balance reversal, audit trail |
| Manual adjustments | 🟢 Complete | Audit-trail events, status transitions |
| Customers (Members) | 🟢 Complete | Individual / corporate / staff types, status, notes |
| Membership cards (NFC + virtual) | 🟢 Complete | Issue, top up, transfer, replace, block, expire |
| Membership card cross-location usage | 🟢 Complete | Cards tagged with homeLocationId; per-card `usableAcrossLocations` flag; locations opt out individually |
| NFC reader config | 🟢 Complete | Reader protocol + UID prefix; no actual hardware bind yet |
| **NFC tap-to-pay scan experience** | 🟢 Complete | New `NFCScanExperience` component used on the POS Membership flow. State machine: idle → scanning → loading → success/error. Animated tap target, loading state on detection, member/tier/balance display on success, full error state with reason codes (blocked, expired, inactive, lost, replaced, unassigned, insufficient, unknown card, reader error, empty input). Manual entry fallback: by card number / NFC UID, by member name/email/phone. Two-step confirmation. Respects `b.nfc.tapSound` and surfaces `b.nfc.autoChargeOnSale` in the footer. |
| Payments (all 5 methods) | 🟢 Complete | Membership card uses `chargeCard` with balance snapshot |
| Dashboard KPIs | 🟢 Complete | Today / yesterday / week / revenue / active users / low-balance |
| Dashboard Sales-by-Location | 🟢 Complete | New breakdown widget with revenue share bars |
| Analytics | 🟢 Complete | Period-over-period, donut, top products, top users, operators, cards |
| Reports | 🟢 Complete | New `reports-engine` (15 pre-built reports across 9 categories: sales, orders, products, users, cards, deposits, transactions, refunds, operators). Every report supports a date range plus filters for location, payment method, product category, operator, member, and card. Results render in a clean sortable table with summary KPI tiles. **CSV export** (`.csv` download) and **PDF export** (opens a print-ready HTML window with the same table + summary, honours `@page A4 landscape`) are wired for every report. Each report declares its own columns, summary, and tone; visuals are consistent with the Analytics and Dashboard pages (rounded-2xl cards, ink-100 borders, brand / emerald / rose severity colours). |
| Multi-Location (locations page) | 🟢 Complete | CRUD locations, terminals, managers, operating hours, status, primary flag |
| Multi-Location (filtering) | 🟢 Complete | Orders, Transactions, Analytics all filter by location; Topbar global chip |
| Multi-Location (POS tagging) | 🟢 Complete | Active-location context stored; new transactions stamped with locationId and (optional) terminalId |
| Cross-location cards (settings) | 🟢 Complete | `cardsUsableAcrossLocations` toggle + per-location `acceptsSharedCards` override |
| Roles & permissions | 🟢 Complete | 6 default roles, full CRUD, staff can be assigned to locations |
| Notifications | 🟢 Complete | New in-app notification system backed by `notifications-store`. Admins receive notifications for new deposit requests, low card balances, card expiry, refunds (full + partial), manual adjustments, new members, successful membership card sales, and system events. Members receive notifications for deposit status changes, card charges (with new balance), card status changes (activated/deactivated/blocked/lost), and low-balance / expiry warnings. Bell icon in topbar with unread count badge. Dedicated `/app/notifications` page with two tabs (Notifications / Activity timeline), severity / category / read-state filters, search, mark-all-read, clear-all, deep links to the related entity. Real-time updates via `useNotificationsTick()` + `storage` events. Health checks (`runCardHealthChecks`) detect low balance / expiring cards on mount and emit deduped alerts. Activity timeline records card issuance, deposit requests, refunds, adjustments, card status changes, and configuration updates with operator attribution. **POS screen also gets notifications** via (1) a real `TopbarNotifications` bell in `POSNavbar` with the same unread count / dropdown, (2) a `POSAlertStrip` pinned under the navbar that surfaces up to 3 high-priority unread alerts (low balance, deposit requests, refunds, card status) with severity colour, and (3) a live toast that fires when a new high-signal notification arrives (e.g. a deposit request or refund) so the operator sees the event even when the dropdown is closed. |
| Activity timeline | 🟢 Complete | New `ActivityEntry` model in `notifications-store`. Recorded automatically from refund / adjust / deposit / card / member flows. Shown on the dedicated Activity tab and on the topbar's audit-style surfaces. |
| Business settings | 🟢 Complete | All setting groups functional |
| User Portal | 🟢 Complete | Cardholder dashboard + identification via email or card |
| **POS location selector** | 🟢 Complete | Topbar + POSNavbar chips let operator pick where they're ringing up |

---

## 3. Components & Modules

| Component / Module | Purpose | Status | Notes |
|--------------------|---------|--------|-------|
| AppShell | Authenticated dashboard chrome | 🟢 Complete | Responsive, mobile bottom nav |
| Topbar | Header, search, business/location/operator chips | 🟢 Complete | Includes new location chip + dropdown |
| Sidebar / MobileSidebar | Primary navigation | 🟢 Complete | Collapsible, permission-gated |
| POSNavbar | POS-only navbar | 🟢 Complete | Includes location chip |
| SettingsShell | Settings page chrome | 🟢 Complete | Grouped sidebar |
| AuthShell | Pre-auth pages chrome | 🟢 Complete | |
| Primitives (PageHeader, StatCard, ActionTile, EmptyState, Logo) | Shared layout primitives | 🟢 Complete | |
| SettingsShell components (SettingCard, Toggle, Field) | Settings form primitives | 🟢 Complete | |
| DrawerShell | Slide-over drawer | 🟢 Complete | 5 sizes, ESC to close, body scroll lock |
| FilterBar (FilterSearchInput, FilterSelect, FilterDateRange, FilterTabs) | List-page filter chips | 🟢 Complete | |
| Pagination | Page navigation | 🟢 Complete | |
| Tooltip | Hover tooltips | 🟢 Complete | |
| Switch | Toggle switch | 🟢 Complete | |
| POS ProductCard | Product card on POS grid | 🟢 Complete | Variants, badges, qty stepper |
| CartPanel / CartItemRow | Right-side cart | 🟢 Complete | Promo dropdown, mobile drawer |
| OrderDetailsDrawer | Order detail with refund/adjust | 🟢 Complete | Now also shows location + terminal details |
| TransactionDetailsDrawer | Transaction ledger detail | 🟢 Complete | Card before/after snapshots |
| Toast / Cue | Audio + visual cues | 🟢 Complete | playCue() in audio.ts |
| GlobalSearchMenu | Cmd-K palette | 🟢 Complete | |
| NavIcon | Icon registry | 🟢 Complete | Added `MapPin` |
| **LocationCard** *(new)* | Locations-page tile | 🟢 Complete | Status, type, hours summary, recent sale, manager/terminal counts |
| **LocationEditor** *(new)* | Drawer to create/edit a location | 🟢 Complete | Identity, address, hours, managers, notes |
| **LocationDetailsDrawer** *(new)* | Drawer with full location info, terminal list, recent transactions | 🟢 Complete | Inline terminal add/toggle/remove |
| **LocationsBreakdown** *(new)* | Dashboard widget: revenue per location | 🟢 Complete | |
| **LocationContext chip** *(new)* | Topbar pill that links to /app/locations | 🟢 Complete | |
| **Active-location hook** *(new)* | `useActiveLocation()` + `getActiveLocationIdSync()` | 🟢 Complete | Persists choice to localStorage |
| **NFCScanExperience** *(new)* | POS membership-card scan flow with state machine (idle/scan/loading/success/error) and manual-entry fallback | 🟢 Complete | Replaces the prior text-based Membership panel on `/app/pos/payment` |
| **ReceiptDocument** *(new)* | Renders a thermal (80 mm) or standard (A4 / US-letter) receipt for any transaction. Pure presentation — pulled in by `POSReceiptPage` and `ReceiptPreviewModal`. | 🟢 Complete | |
| **ReceiptPreviewModal** *(new)* | Full-screen modal: thermal / standard layout toggle, zoom, Print, Download (.txt / .html), Email (mailto:), Copy text, New order, ESC + Ctrl/Cmd+P shortcuts. ESC closes. | 🟢 Complete | |
| **NotificationDropdown** *(new)* | Topbar bell with unread count, severity-bordered rows, All / Unread filter, mark-all-read, deep-links. Standalone `TopbarNotifications` exports a button + dropdown for the topbar. | 🟢 Complete | |
| **POSAlertStrip** *(new)* | Horizontally-scrolling alert strip pinned to the top of the POS screen. Surfaces up to 3 high-priority unread notifications (deposit requests, low balance, refunds, card status) with severity colour, dismissable, click-to-mark-read. | 🟢 Complete | |
| **reports-engine** *(new)* | `src\reports-engine.ts` — 15 ready reports + shared types, formatters, CSV / PDF export helpers. Pure functions over the existing stores; no new state. | 🟢 Complete | |

---

## 4. User Workflows

| Workflow | Status | Notes |
|----------|--------|-------|
| Sign up → Setup wizard | 🟢 Complete | All steps functional |
| Login | 🟢 Complete | Single-tenant; sign-out clears localStorage |
| Add a product | 🟢 Complete | Create / edit / archive / duplicate |
| Create a category | 🟢 Complete | Per business-type presets |
| Set up a location | 🟢 Complete | New LocationPage editor captures identity, address, hours, managers |
| Register a POS terminal | 🟢 Complete | Add/remove from LocationDetailsDrawer; status toggling |
| Assign operator to a location | 🟢 Complete | Staff-page filters and editor; Locations-page manager picker |
| Create an order at POS | 🟢 Complete | Adds → cart → checkout → receipt |
| Change active location from POS | 🟢 Complete | POSNavbar chip or topbar chip |
| Complete checkout with membership card | 🟢 Complete | Picks member, charges card, decrements balance |
| **NFC scan experience at POS** *(new)* | 🟢 Complete | Tap card → animated read state → member/tier/balance preview → two-step charge confirmation. Error states for blocked/expired/inactive/lost/replaced/unassigned/insufficient/unknown. Manual entry fallback (card number, NFC UID, or by member). |
| **Receipt & printing at POS** *(new)* | 🟢 Complete | Successful payment → `/app/pos/receipt/:id`. Receipt renders inline; `ReceiptPreviewModal` opens for the full preview with thermal/standard toggle, print, download (.txt / .html), email (mailto:), copy text, and "New order". Receipt content includes business, location, terminal, cashier, customer, membership card (status / tier / balance), line items, subtotal, discount, tax, total, change / reference, and the post-charge card balance for membership payments. |
| Process a refund | 🟢 Complete | Full or partial; reverses card balance optionally |
| Issue a membership card | 🟢 Complete | Create, link member, set tier, set limits |
| Top up a card | 🟢 Complete | Direct deposit or via deposit request |
| Block / report lost card | 🟢 Complete | Status transitions in Cards page |
| Review transactions / orders | 🟢 Complete | Filter, search, paginate, export |
| Cross-location card usage | 🟢 Complete | Toggle in settings, per-card override, visual badge on card tile |
| View analytics | 🟢 Complete | Filter by period / category / method / operator / **location** |
| Reset password | ⚠️ Needs Revision | UI stub only; no real email/token plumbing |
| Reports | ⚠️ Needs Revision | Catalog renders but "Run report" is placeholder |
| Member self-service (portal) | 🟢 Complete | Identify → dashboard with stats and transactions |

---

## 5. Database / Backend

> The app uses **localStorage** as its data store (no real backend). All "API endpoints" below are localStorage-backed functions.

### 5.1 Storage Keys

| Key | Entity |
|-----|--------|
| `ezsale:business` | Business config |
| `ezsale:auth` | Current auth session |
| `ezsale:onboarded` | Setup-wizard completion flag |
| `ezsale:members` | Member/customer list |
| `ezsale:cards` | Membership cards |
| `ezsale:card-activity` | Card activity log |
| `ezsale:card-deposits` | Top-up records |
| `ezsale:deposit-requests` | Pending top-up requests |
| `ezsale:member-activity` | Member activity log |
| `ezsale:categories` | Category list |
| `ezsale:pos:products` | Product catalog |
| `ezsale:pos:cart` | Active cart |
| `ezsale:transactions` | Transactions ledger |
| `ezsale:financial-events` | Refund / adjustment audit trail |
| `ezsale:operator-permissions` | Refund / adjust permission toggles |
| `ezsale:locations` | Locations (and their terminals) |
| `ezsale:locations:seeded:v2` | Locations seed guard |
| `ezsale:roles` | Role definitions |
| `ezsale:operators` | Operator records |
| `ezsale:operator-activity` | Operator activity log |
| `ezsale:auth:operator-id` | Currently-selected operator (demo) |
| `ezsale:active-location` | Currently-selected location context |
| `ezsale:onboarded` / sidebar collapsed | Various UI flags |

### 5.2 Entities & Relationships

- **Business** 1—n **Locations** 1—n **POSTerminals**
- **Location** n—n **Operator** (via `Location.managerIds` and `Operator.locationIds`)
- **Member** 1—n **MembershipCard**
- **MembershipCard** n—1 **Location** (`homeLocationId`)
- **Transaction** n—1 **Location** (`locationId`), n—1 **POSTerminal** (`terminalId`, optional), n—1 **Member** (`memberId`, optional), n—1 **MembershipCard** (`cardId`, optional)
- **FinancialEvent** n—1 **Transaction** (parent)
- **Operator** n—1 **Role**
- **OperatorActivity** n—1 **Operator**

### 5.3 "Endpoints" (localStorage functions)

| Domain | Functions |
|--------|-----------|
| Business | `getBusiness`, `saveBusiness`, `withDefaults` |
| Auth | `getAuth`, `setAuth`, `clearAuth` |
| Members | `getMembers`, `getMember`, `createMember`, `updateMember`, `setMemberStatus`, `getMemberActivity` |
| Cards | `getCards`, `getCard`, `getCardsByMember`, `getCardByNumber`, `createCard`, `updateCard`, `activateCard`, `deactivateCard`, `replaceCard`, `chargeCard`, `isCardUsable`, `formatCardNumber`, `maskCardNumber` |
| Card deposits | `getCardDeposits`, `createCardDeposit` |
| Deposit requests | `getDepositRequests`, `createDepositRequest`, `approveDepositRequest`, `rejectDepositRequest` |
| Products | `getProducts`, `createProduct`, `updateProduct`, `setProductStatus`, `archiveProduct`, `duplicateProduct`, `deleteProduct` |
| Categories | `getCategoriesForBusiness`, `createCategory`, `updateCategory`, `deleteCategory` |
| Cart | `getCart`, `addToCart`, `setCartQty`, `removeFromCart`, `clearCart` |
| Transactions | `getTransactions`, `createTransaction`, `setTransactionStatus`, `paymentMethodLabel` |
| Refunds / Adjustments | `refundTransaction`, `adjustTransaction`, `getFinancialEvents`, `remainingRefundable` |
| **Locations** *(new)* | `getLocations`, `getActiveLocations`, `getDefaultLocationId`, `createLocation`, `updateLocation`, `deleteLocation`, `setLocationStatus`, `addTerminal`, `updateTerminal`, `removeTerminal`, `getTerminal`, `assignManager`, `unassignManager` |
| Roles | `getRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole` |
| Operators | `getOperators`, `getOperator`, `getOperatorByEmail`, `createOperator`, `updateOperator`, `setOperatorStatus`, `recordOperatorLogin`, `getOperatorActivity`, `getCurrentOperator`, `getCurrentOperatorName` |
| Permissions | `operatorPermissions`, `operatorHas`, `operatorHasAny`, `operatorHasAll` |
| Active location *(new)* | `useActiveLocation`, `getActiveLocationIdSync`, `getActiveLocationSync`, `useActiveLocationTick` |

### 5.4 Authorization

- Permission keys defined in `src/permissions.ts` (`PermissionKey` union, `PERMISSION_GROUPS`, `PERMISSION_TO_NAV`).
- `RequirePermission` route guard wraps each privileged page.
- `operatorPermissions(op)` further restricts `pos.use` / `pos.refund` when an operator has no active location assignment.
- Admin (`role-super-admin`) is unrestricted.

### 5.5 Data Validation / Business Logic

- Card status transitions enforce active/inactive/blocked/lost/expired/replaced semantics.
- `chargeCard` enforces sufficient balance and daily/monthly limits; rejects blocked/lost/expired cards.
- `refundTransaction` computes refundable amount from prior refund events and prevents double-refunds.
- `updateLocation` enforces code uppercase ≤ 12 chars; `isPrimary` clears on other rows.
- `updateLocation` re-validates terminal codes.

---

## 6. UI/UX Status

| Area | Status | Notes |
|------|--------|-------|
| Desktop layout | 🟢 Complete | 7-col dashboard grid, responsive down to md |
| Responsive behavior | 🟢 Complete | Sidebar collapses, topbar switches to icon stack, mobile bottom nav for key pages |
| POS layout | 🟢 Complete | Catalog left, cart right, mobile drawer fallback |
| Navigation | 🟢 Complete | Sidebar + mobile drawer; permission-gated; Locations added |
| Modals | 🟢 Complete | Drawer pattern used widely; Confirm modal for refunds |
| Forms | 🟢 Complete | Inputs, selects, toggles, time inputs, multi-select pickers |
| Empty states | 🟢 Complete | "No data" placeholders with brand-consistent copy |
| Loading states | ⚠️ Needs Revision | Currently implicit (localStorage is synchronous); no skeletons |
| Error states | ⚠️ Needs Revision | `confirm()` / `prompt()` for delete and terminal add |
| Confirmation states | 🟡 In Progress | `toast` confirmed-action notifications work; destructive actions use native confirm |
| Accessibility | ⚠️ Needs Revision | Focus rings present; ARIA labels on icon buttons; no full audit yet |

---

## 7. Known Issues & Technical Debt

| ID | Area | Issue | Severity |
|----|------|-------|----------|
| ISSUE-001 | Reports | "Run report" buttons are placeholders | Resolved 2026-08-31 (see Reports entry) |
| ISSUE-002 | Auth | Password reset is a UI stub (no email/token) | High |
| ISSUE-003 | Notifications | Bell shows a static list; no real subscription engine | Resolved 2026-08-31 (see Notifications & Activity Center entry) |
| ISSUE-004 | Inventory | Stock thresholds tracked; no reorder / purchase-order workflow | Medium |
| ISSUE-005 | Error UX | Native `window.confirm` / `window.prompt` for destructive actions (terminal add, location delete) | Low |
| ISSUE-006 | Loading states | No skeletons or explicit loading affordances (acceptable because data is local) | Low |
| ISSUE-007 | A11y | No full audit; keyboard nav mostly implicit | Medium |
| ISSUE-008 | Multi-location | "Require location selection at POS" toggle is in settings but not yet enforced in the POS flow | Medium |
| ISSUE-009 | Analytics | No saved views / scheduled email digests | Low |
| ISSUE-010 | Card replace | Flow exists but not deeply wired into portal self-service | Low |
| ISSUE-011 | Data | All data lives in localStorage; no real persistence / multi-user | High (architectural) |
| ISSUE-012 | Search | Global search covers a few entity types; missing cards, locations, staff | Low |
| ISSUE-013 | POS | No offline-first or print-fallback safeguards | Low |
| ISSUE-014 | Onboarding | Setup wizard does not yet show a "data import" or "demo reset" option | Low |
| ISSUE-015 | Permissions | Operator has manual `locationIds[]`; UI lets the admin clear them but no warning when staff lose POS access | Low |
| ISSUE-016 | POS / NFC checkout | *(Resolved 2026-08-31)* First `Charge card` button skipped the confirm step and never invoked `onConfirm`; fixed by routing `onContinue` to `setConfirmStep(1)` | Resolved |

---

## 8. Change Log

> Most recent first.

### 2026-08-31 — Reports

- **New engine** — `src\reports-engine.ts` ships the report model (`ReportDefinition`, `ReportFilters`, `ReportResult`, `ReportCategory`) and 15 working reports grouped under 9 categories: Sales (daily, by-location, by-payment-method), Orders (detail), Products (performance, inventory snapshot), Users (detail, tier-movement), Cards (detail, balance), Deposits (detail), Transactions (raw ledger), Refunds & Adjustments, and Operators (performance, activity). Every report supports date range plus filters for location, payment method, product category, operator, member, and card. The engine is pure (no new persistence) and reads from the existing localStorage-backed stores.
- **Catalog UI** — `ReportsPage` now has a category-coloured, searchable catalog with category chips and tag pills. Picking a report opens the runner with the report's `defaultFilters` pre-applied (e.g. "Daily sales" defaults to today; "by-location" / "by-payment-method" / "performance" / etc. default to the last 30 days).
- **Runner UI** — A filter panel with date pickers, product category, locations, payment methods, operators, members, and cards (multi-select pills matching the existing filter bar style). A "Run report" CTA, a "Hide / Show filters" toggle, a reset button, and an "active filter" chip row. Results render in a clean table with summary KPI tiles, a "Showing 200 of N rows" footer, and a sticky export bar.
- **Exports** — Every report supports **CSV** (`.csv` download) and **PDF** (opens a print-ready HTML window with the same table + summary, A4 landscape). Both honour the current filters and the table is rendered with `tabular-nums` for clean number alignment.
- **Visual consistency** — Same `card` surface, `rounded-2xl` borders, `ink-100` palette, and severity-tinted summary tones as the Analytics and Dashboard modules. Numeric values are formatted with the business's currency symbol.
- **Build status** — `tsc -b && vite build` succeeds. Added `getAllCardDeposits()` to `card-store.ts` (the existing `getCardDeposits` requires a `cardId` and is single-card scoped).
- Status: 🟢 Complete.

### 2026-08-31 — POS Screen Notifications

- **`POSNavbar` bell** — Replaced the static `<Bell>` button with the live `TopbarNotifications` component, so the operator sees the same unread count + dropdown that admins get, with the same deep-links.
- **`POSAlertStrip` component** — A new horizontally-scrolling strip pinned to the top of the POS screen (`src\components\POSAlertStrip.tsx`). Surfaces the top 3 unread notifications filtered to operator-relevant categories (deposit_request, deposit_status, low_balance, card_expiry, card_status, transaction, refund, membership). Each card is severity-coloured (info / success / warning / critical), clickable to mark read + open the deep-link (or stay on the POS for non-critical items), and has an explicit dismiss button. A "View all" button on the right deep-links into the admin notification center.
- **POS-side live toast** — `POSPage` now subscribes to the notifications store via `useNotificationsTick()` and fires the existing bottom-of-screen toast whenever a high-signal notification arrives (deposit request, deposit status, low balance, refund). The toast timeout was bumped from 1.5s → 3.5s so operators have time to read it. A `seenNotifRef` dedupes per id so a notification only toasts once per session. Audio cue is wired: critical → error cue, success → success cue, others → tap.
- **Build status** — `tsc -b && vite build` succeeds; no type errors.
- Status: 🟢 Complete.

### 2026-08-31 — Notifications & Activity Center

- **Data model** — Added `Notification`, `NotificationCategory` (deposit_request, deposit_status, low_balance, card_expiry, card_status, transaction, refund, membership, system, user), `NotificationSeverity` (info / success / warning / critical), `ActivityEntry`, `ActivityCategory`, `ActivitySeverity`, and `NotificationAudience` (admin / member) to `types.ts`. New `PermissionKey` member `notifications.view` and a new `notifications` permission group.
- **Store** — `src/notifications-store.ts` is the single source of truth. CRUD: `notify()`, `markNotificationRead()`, `markAllAdminRead()`, `markAllMemberRead()`, `clearAllAdmin()`, `clearAllMember()`, `deleteNotification()`. Activity: `logActivity()`. React hook `useNotificationsTick()` re-renders on storage / custom events. Seeded with realistic admin + activity examples on first load.
- **Hooks into existing flows** — `card-store.ts` now fires admin + member notifications for: new member, new deposit request, deposit approved / rejected / cancelled, card activated / deactivated / blocked / lost, low balance (auto-deduped), card expiring (auto-deduped). `orders-store.ts` fires admin + member notifications for refunds (full / partial) and manual adjustments. `POSPaymentPage` fires admin + member notifications for successful membership card charges, including the new balance.
- **Topbar dropdown** — Replaced the static stub with a real `NotificationDropdown` driven by the store. Unread count badge, severity colour-coding, All / Unread filter, mark-all-read, deep-link rows.
- **Dedicated page** — New `/app/notifications` page (`NotificationsPage.tsx`) with two tabs:
  - **Notifications** — search, severity / category / read-state filter chips, mark-all-read, clear-all, per-row View (deep-links + marks read) and Delete.
  - **Activity timeline** — vertical timeline with category-aware icons, severity colour, search, severity filter.
  - KPI tiles (unread, critical, new today, total activity). Auto-runs `runCardHealthChecks()` on mount.
- **User portal** — `PortalDashboardPage.tsx` now shows a "Recent activity" block on the Overview tab, sourced from the same store. Auto-marks all member notifications as read 1.5s after the portal opens.
- **Nav & permissions** — New `Notifications` sidebar link with the `Bell` icon. New `permissions.ts` mapping `notifications.view → /app/notifications`.
- **Build status** — `tsc -b && vite build` succeeds; no type errors. Resolved two existing import-cycle risks: the activity helper in `card-store.ts` is aliased to `recordActivity` to avoid colliding with the file's own internal card-activity logger; the public `runHealthChecks` shim in `notifications-store.ts` defers to `runCardHealthChecks` in `card-store.ts`.
- Status: 🟢 Complete.

### 2026-08-31 — Receipts & Printing

- **New component** — `src/components/ReceiptDocument.tsx` is a reusable, presentation-only renderer for any `Transaction`. Two layouts: `thermal` (80 mm, dashed rules, double-line total, deterministic barcode) and `standard` (A4 / US-letter with bordered fields, full table, balance card / cash-change / reference cards). Honours `business.tax` (inclusive label + tax id), `business.receipt` (header / footer / return-policy), and the location / terminal / member / card context.
- **Text + HTML serialisers** — `receiptToText(ctx)` and `receiptToHtml(ctx)` share the same data model, so the .txt download, the .html download, the `mailto:` body, and the clipboard text are all generated from one source of truth.
- **New component** — `src/components/ReceiptPreviewModal.tsx` is a full-screen modal that:
  - Lets the operator toggle **Thermal / Standard** layout.
  - Adds a **Zoom** control for on-counter readability.
  - Exposes **Print**, **Download** (.txt or .html, via a format pill), **Email** (`mailto:` to the member's email when available, with a graceful "Copy text" fallback otherwise), and **New order** / **Close** actions.
  - Listens for `Esc` to close and `Cmd/Ctrl + P` to print.
  - Injects per-layout `@page` rules so the print stylesheet targets the right paper size.
- **POS receipt page** — `src/pages\app\POSReceiptPage.tsx` was rewritten to use the new components. Inline receipt is always visible; the modal gives the full preview. The 5 quick actions are: Print · Preview · Save (text) · Email (mailto, disabled when no customer email) · Share (Web Share API or clipboard), with a full-width **New order** primary button below. The deep-link from `OrderDetailsDrawer` (`/app/pos/receipt/:id`) continues to work.
- **Coverage** — Cash (tendered / change), Card / Bank / Wallet (reference), Membership (card number, tier, status pill, balance before + after). Tax row uses the business tax config and flips its label between "Tax" and "Tax (incl.)" depending on `tax.inclusive`.
- **Build status** — `tsc -b && vite build` succeeds; no type errors.
- Status: 🟢 Complete.

### 2026-08-31 — Hotfix: NFC checkout confirm button

- **Bug** — On the POS payment → Membership flow, scanning a valid card showed the success panel but clicking `Charge card` skipped straight to the `step 2` "Charge submitted" pill without ever calling `onConfirm`. The order was never finalised; there was no reachable "Confirm and place order" button.
- **Root cause** — `NFCScanExperience` had a three-step state machine (`0 → 1 → 2`) but the parent wired the first action button (`onContinue`) directly to `setConfirmStep(2)`, jumping past the actual confirm step (`1`) where the `onConfirm` button lived. The user could see a "Charge submitted" pill while the order was silently abandoned.
- **Fix** — `onContinue` now sets `confirmStep(1)` (the review → confirm transition), and the `step === 1` block renders the final "Yes, charge $X.XX" button that actually fires `onConfirm`, calling the existing `finalize()` in `POSPaymentPage` and navigating to the receipt. The `step 0` button was renamed from `Charge card` to `Review & charge` so the two-step intent is obvious, and the `step 1` button now shows the exact amount being charged and is styled as the primary emerald CTA. Removed the dead `Charge submitted` path (now unreachable since `onConfirm` navigates away).
- **Build status** — `tsc -b && vite build` succeeds.
- Status: 🟢 Fixed. Verification done by code review; no automated e2e for the POS checkout exists yet (see Known Issues).

### 2026-08-31 — NFC Scan Experience

- **New component** — `src/components/NFCScanExperience.tsx` ships a state-machine-driven, touch-first scan flow: `idle` (large "Tap to start" CTA with concentric pulse rings) → `scanning` (animated NFC icon with double ripple) → `loading` (spinner + "Card detected · Looking up the member…") → `success` (green emerald panel showing member name, status pill, card number, tier badge, available balance, before/after balance, and a two-step `Charge card` → `Yes, charge` confirmation) or `error` (red panel with reason code icon and explicit message: blocked / expired / inactive / lost / replaced / unassigned / insufficient / unknown card / reader error / empty input).
- **Manual entry fallback** — A full-screen "Find a card" modal lets the operator search by card number, NFC UID, member name, email, or phone. Each hit shows balance + ready/blocked/insufficient reason. Tapping a row feeds it back through the same evaluation path so the success / error UX is identical.
- **NFC settings honoured** — Footer chip surfaces `b.nfc.tapSound` and `b.nfc.autoChargeOnSale`; the success tone is muted when the operator has disabled it. A "Switch payment method" link returns the user to the method picker.
- **POS wiring** — `POSPaymentPage.MembershipPanel` is now a thin wrapper that forwards the chosen `card` + `member` to the existing `onPay` handler, so the rest of the payment flow (transaction stamping, location tagging, terminal id, balance snapshot) is unchanged. Removed dead imports (Lock, ScanLine, Search, formatCardNumber, getCardByNumber, getCards, isCardUsable, getMember).
- **Build status** — `tsc -b && vite build` succeeds; no type errors. Visual smoke-checked against the existing brand palette and the `rounded-3xl` large-touch pattern used elsewhere in the POS.
- Status: 🟢 Complete.

### 2026-08-31 — Multi-Location / Shopping Mall Support

- **Data model** — Expanded `Location` with `type`, address parts, timezone, `managerIds`, `terminals[]`, `hours[]`, `contact {phone, email}`, `acceptsSharedCards`, `isPrimary`, `status` (active/maintenance/inactive/archived), `notes`, `createdAt`, `updatedAt`. Added `POSTerminal` type. Added optional `terminalId` to `Transaction`. Added `cardsUsableAcrossLocations` and `requireLocationSelectionAtPOS` to `BusinessLocationSettings`. Added `homeLocationId` and `usableAcrossLocations` to `MembershipCard`.
- **Store** — `src/orders-store.ts` now ships full CRUD for locations, terminals, and manager assignment, plus `getActiveLocations`, `getDefaultLocationId`, `getTerminal`. Seeded 4 demo locations (Aurora Downtown, Lobby Kiosk, Express Window, Westfield Mall Pop-up) with terminals, hours, and managers. New `src/active-location.ts` provides `useActiveLocation()` and `getActiveLocationIdSync()`.
- **Locations page** — New `/app/locations` page with grid view, KPI tiles, search + status + type filters, create/edit/deactivate/delete actions. Editor drawer captures identity, address, hours (per-day open/close), manager picker, notes. Detail drawer shows identity, contact, full hours, terminal list (inline add / toggle / remove), manager list (tap to toggle), and recent transactions.
- **Nav & routes** — `MapPin` added to `NavIcon`; "Locations" link added to `NAV_LINKS`; new route registered in `App.tsx` with `settings.manage` / `settings.view` / `staff.view` access. `permissions.ts` maps `settings.manage → /app/locations`.
- **Global UI** — Topbar gets a location chip with live status dot + dropdown of all locations + "Manage locations" link. POSNavbar mirrors the chip on POS screens. Dashboard gets a `LocationContext` chip in the header.
- **POS wiring** — `POSPaymentPage` stamps every new transaction with the active `locationId` (respecting the `multiLocation` toggle) and `terminalId`. Receipt page (header + thermal body) shows the location and terminal.
- **Filtering** — `OrdersPage` and `TransactionsPage` gained a Location filter chip and a Location column in their tables. `AnalyticsPage` now wires the `LocationChip` to `matchesFilter`, so dashboard analytics respect the location selection.
- **Dashboard** — Added "Sales by location" breakdown widget. Recent orders and recent transactions now show the location code/name.
- **Drawer & receipt** — `OrderDetailsDrawer` shows location name, code, address, and the resolved terminal name/code (when present). Receipt page prints the same line.
- **Settings** — `SettingsPage` Locations section reflects the new schema, shows terminal / manager counts and primary badge, and links to the dedicated page. Added toggles for "Membership cards usable across locations" and "Require location selection at POS".
- **Cross-location cards** — Card tiles show home location + "CROSS-LOCATION" / "HOME ONLY" badge. Cards now persist `homeLocationId` and `usableAcrossLocations`; membership card seed data updated.
- **Build status** — `tsc -b && vite build` succeeds; no type errors.
- Status: 🟢 Complete for all multi-location surface area listed in the prompt; ISSUE-008 remains for enforcement of the "require location" toggle in the POS flow.

### 2026-08-31 — Pre-existing application (prior to multi-location work)

- Existing pages, components, and flows described above. Reports, reset-password, notifications, and inventory are known partial implementations; see Known Issues.
