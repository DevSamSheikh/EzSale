# PRD — Single-Business POS + NFC Membership Management System

**Version:** 1.0  
**Scope:** Single Business / Single Organization  
**Status:** Product Definition  
**Future:** SaaS / multi-business expansion is explicitly out of scope for this version.

---

## 1. Product Overview

This product is a complete **single-business POS + NFC Membership Management System**.

One business can use the application to:

- Configure its business for the first time.
- Manage products and categories.
- Manage customers/members.
- Register, assign, activate, block, and replace NFC membership cards.
- Maintain member wallet/account balances.
- Create and process POS orders.
- Accept Cash, Card, Bank Transfer, Digital Wallet, and Membership Card payments.
- Allow members to request deposits.
- Approve/reject deposits from the Admin Panel.
- Track purchases, deposits, refunds, and balance changes.
- Manage staff and permissions.
- View dashboard analytics and reports.
- Give every member a unique personal URL.
- Provide members with a responsive User Portal.

The product must support different business types such as:

- Restaurants
- Schools
- Shopping Malls
- Retail Shops
- Gaming Zones
- Other configurable businesses

The first release is intentionally **single-business**. There is no tenant switcher, SaaS billing, multi-business dashboard, platform admin, or cross-business reporting.

---

# 2. Product Vision

Build a modern, reliable business management system combining:

> **POS + NFC Membership Cards + Member Wallet + Deposits + User Portal + Administration + Analytics**

The core product loop is:

```text
Business Setup
    ↓
Products + Members
    ↓
NFC Card
    ↓
Member Deposit
    ↓
Wallet Balance
    ↓
POS Purchase
    ↓
NFC Card Payment
    ↓
Transaction
    ↓
Updated Balance
    ↓
Member Portal
```

The product should be fast enough for real POS operation while remaining simple enough for business administrators.

---

# 3. Product Experiences

The system contains three major experiences.

## 3.1 POS

For cashiers/operators.

Purpose:

- Create orders quickly.
- Search products.
- Add products to cart.
- Process payments.
- Scan/tap NFC membership cards.
- Charge member balances.
- Generate receipts.

## 3.2 Admin Panel

For owners, managers, accountants, and authorized staff.

Purpose:

- Manage the business.
- Manage products.
- Manage users.
- Manage cards.
- Manage deposits.
- Manage orders.
- Manage transactions.
- Manage staff.
- View analytics and reports.
- Configure settings.

## 3.3 Member/User Portal

For customers/members.

Purpose:

- View account.
- View balance.
- View membership card.
- View purchases.
- View transactions.
- Request deposits.
- View deposit status.
- Access their unique personal URL.

---

# 4. Target Users & Roles

## Business Owner

Full control over the business.

Can manage:

- Business settings
- POS
- Products
- Categories
- Members
- Cards
- Orders
- Deposits
- Transactions
- Reports
- Analytics
- Staff
- Permissions
- Notifications

## Admin / Manager

Operational administration according to assigned permissions.

## Cashier / POS Operator

Can:

- Access POS.
- Create orders.
- Search products.
- Process permitted payments.
- Scan NFC cards.
- Charge membership balances.
- Print/view receipts.

Should not automatically have access to sensitive administration or financial adjustment functions.

## Accountant

Focused on:

- Transactions
- Deposits
- Refunds
- Financial reports
- Sales reports

## Member / Customer

Can:

- View account.
- View card.
- View balance.
- View transactions.
- View purchases.
- Request deposits.
- View deposit status.

---

# 5. Visual & UX Direction

The attached POS screenshot is the primary visual reference.

Preserve its design language:

- Light neutral page background.
- White floating content containers.
- Lime/bright-green primary actions.
- Dark charcoal text.
- Rounded cards.
- Rounded buttons.
- Pill-shaped filters.
- Soft shadows.
- Clean spacing.
- Modern SaaS aesthetic.
- Product-image-focused cards.
- Compact navigation.
- Clear hierarchy.

The screenshot is the **visual source of truth for POS composition**, not a requirement to copy its exact text or products.

Use one consistent design system across POS, Admin, and Member Portal while adapting density and navigation to each experience.

---

# 6. First-Time Business Setup

When the business opens the application for the first time, show a setup wizard.

## Step 1 — Business Information

Fields:

- Business name
- Business type
- Logo
- Phone
- Email
- Address

## Step 2 — Regional Settings

Fields:

- Currency
- Time zone
- Date format
- Tax settings

## Step 3 — POS Configuration

Configure:

- Receipt settings
- Tax behavior
- Discount behavior
- Product display
- Order behavior

## Step 4 — Payment Methods

Enable:

- Cash
- Card
- Bank Transfer
- Digital Wallet
- Membership Card

## Step 5 — Membership Configuration

Configure:

- Membership card usage
- Wallet behavior
- Deposit workflow
- Card expiry
- Balance rules

## Step 6 — Initial Data

Optional:

- Categories
- Products
- Staff
- Members

## Step 7 — Complete

Display:

> Your POS is ready.

Primary action:

**Open POS**

---

# 7. Main Navigation

## Admin

```text
Dashboard
POS
Products
  ├── Products
  ├── Categories
  └── Variants
Orders
Users / Members
Cards
Deposits
Transactions
Analytics
Reports
Staff & Roles
Settings
```

## POS

Keep navigation minimal:

```text
POS
Orders
Members
Transactions
Profile / Settings
```

## Member Portal

```text
Home
Card
Transactions
Deposits
Profile
```

---

# 8. POS Requirements

## 8.1 Main POS Screen

Desktop layout should follow the attached reference:

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo    Dashboard Products Orders ...      User / Settings │
├───────────────────────────────┬─────────────────────────────┤
│ Search / Filter               │       Current Cart          │
│ Categories                    │  Product 1       Qty Price │
│                               │  Product 2       Qty Price │
│ Product Grid                  │  Product 3       Qty Price │
│                               │                             │
│ [Product] [Product] [Product] │  Subtotal                  │
│ [Product] [Product] [Product] │  Discount                  │
│ [Product] [Product] [Product] │  Tax                       │
│                               │  Total                      │
│                               │                             │
│                               │ [ Proceed to Payment ]     │
└───────────────────────────────┴─────────────────────────────┘
```

Required:

- Floating navbar.
- Two main floating content containers.
- Product grid.
- Cart panel.
- Search.
- Category filters.
- Product filters.
- Payment workflow.
- Responsive behavior.

## 8.2 Product Cards

Display:

- Product image
- Product name
- Short description
- Price
- Category
- Favorite
- Promotional badge
- Add button
- Availability

Possible badges:

- Best Sale
- Top Sale
- New Item
- Offer
- Discount

## 8.3 Search

Search by:

- Product name
- SKU
- Barcode
- Product code
- Category

Results should update without a full-page refresh.

## 8.4 Categories

Categories are dynamically managed by Admin.

Examples:

```text
All
Pizza
Burger
Pasta
Biryani
Salad
Drinks
Dessert
Rice
```

These are examples only.

## 8.5 Cart

Support:

- Add product.
- Remove product.
- Increase/decrease quantity.
- Clear cart.
- Item notes.
- Variants.
- Permitted discounts.

Display:

```text
Subtotal
Discount
Tax
----------------
Total
```

Totals update immediately.

---

# 9. Order Creation

Workflow:

```text
Products
   ↓
Cart
   ↓
Review
   ↓
Member/Customer
   ↓
Payment
   ↓
Payment Success
   ↓
Create Order
   ↓
Create Transaction
   ↓
Update Wallet if applicable
   ↓
Generate Receipt
```

The system must prevent duplicate successful charges when a payment request is retried.

---

# 10. Payment System

Supported payment methods:

1. Cash
2. Credit/Debit Card
3. Bank Transfer
4. Digital Wallet
5. Membership Card

Admin can enable or disable methods.

---

# 11. Membership Card Payment

Membership Card is a core payment method.

## Flow

```text
Proceed to Payment
       ↓
Membership Card
       ↓
Tap NFC Card
       ↓
Card Identified
       ↓
Member Identified
       ↓
Show Balance
       ↓
Validate Card
       ↓
Validate Balance
       ↓
Confirm Charge
       ↓
Deduct Amount
       ↓
Create Transaction
       ↓
Show Remaining Balance
       ↓
Receipt
```

## Validation

Reject payment when:

- Card does not exist.
- Card is unassigned.
- Card is inactive.
- Card is blocked.
- Card is expired.
- Member is inactive.
- Balance is insufficient.
- Transaction exceeds configured limits.

## Scan States

- Waiting for card
- Reading
- Card detected
- Member found
- Valid
- Invalid
- Blocked
- Expired
- Insufficient balance
- Processing
- Success
- Failed

Provide manual card lookup/identifier entry as a fallback where appropriate.

---

# 12. NFC Card Management

Admin → Cards

Features:

- Register card.
- Search cards.
- Assign card.
- Unassign card.
- Activate.
- Deactivate.
- Block.
- Mark lost.
- Replace.
- View history.

## Card Fields

- Card ID
- NFC identifier
- Assigned member
- Card type
- Status
- Balance
- Membership level
- Issue date
- Expiry date
- Last used
- Last transaction

## Card Status

```text
Active
Inactive
Blocked
Expired
Lost
Replaced
```

## Card Architecture Principle

The physical NFC card should primarily identify the card/member record.

The backend is the source of truth for:

- Member account
- Card record
- Wallet
- Financial ledger
- Transaction history

Conceptually:

```text
NFC Card
   ↓
Card Identifier
   ↓
Card Record
   ↓
Member
   ↓
Wallet
   ↓
Transactions
```

Do not store the authoritative wallet balance only on the physical NFC card.

---

# 13. Users / Members

Admin → Users/Members

Features:

- Create.
- Edit.
- Search.
- Filter.
- Activate/deactivate.
- View details.
- Assign card.
- Replace card.
- View wallet.
- View transaction history.

## User Fields

- User ID
- Name
- Email
- Phone
- Profile image
- User type
- Status
- Membership status
- Unique URL
- Created date

---

# 14. Member Wallet

Every member has an account/wallet balance.

Example:

```text
Starting Balance: $100
Purchase:         -$25
-----------------------
Remaining:         $75
```

Deposit:

```text
Current Balance: $75
Deposit:         +$50
-----------------------
New Balance:     $125
```

Refund:

```text
Current Balance: $125
Refund:          +$20
-----------------------
New Balance:     $145
```

Every balance-affecting operation must be recorded as a transaction.

---

# 15. Wallet Rules

1. Members cannot directly edit their balance.
2. Frontend code cannot directly set a wallet balance.
3. Purchases decrease balance.
4. Approved deposits increase balance.
5. Refunds increase balance where applicable.
6. Authorized adjustments may increase/decrease balance.
7. Every balance change must be traceable.
8. Negative balance is disabled by default.

Financial operations should be atomic so a successful charge cannot occur without its corresponding ledger record.

---

# 16. Deposit Request System

Members can request money to be added to their wallet.

## Member Flow

```text
Member Portal
 ↓
Deposit
 ↓
Amount
 ↓
Payment Method
 ↓
Reference
 ↓
Submit
 ↓
Pending
```

## Admin Flow

```text
Admin
 ↓
Deposits
 ↓
Review
 ↓
Approve / Reject
 ↓
If Approved:
    Wallet +
    Transaction
    Member Notification
```

## Deposit Fields

- Request ID
- Member
- Amount
- Payment method
- Reference
- Note
- Attachment where applicable
- Status
- Requested date
- Reviewed by
- Reviewed date

## Statuses

- Pending
- Approved
- Rejected
- Completed
- Cancelled

Members cannot directly increase their wallet balance.

---

# 17. Unique Member URL

Every member gets a unique personal URL.

Recommended structure:

```text
/u/{unique-slug}
```

Example:

```text
/u/ahmed-khan
```

The slug must be unique.

The URL leads to the member portal.

Important:

> A unique URL must not by itself bypass authentication/verification required to view sensitive personal or financial information.

---

# 18. Member Portal

The portal must be mobile-first and responsive.

## Home

Show:

- Member name
- Current balance
- Card status
- Membership level
- Recent transactions
- Recent purchases

## Card

Show:

- Card status
- Masked identifier
- Issue date
- Expiry date
- Membership level

## Transactions

Show:

- Date
- Type
- Amount
- Status
- Reference
- Balance after transaction

## Deposits

Allow:

- Request deposit.
- View pending deposits.
- View completed deposits.
- View rejected deposits.

## Profile

Show:

- Name
- Phone
- Email
- Account information

---

# 19. Orders Management

Admin → Orders

List fields:

- Order number
- Member/customer
- Operator
- Items
- Total
- Payment method
- Status
- Date/time

Statuses:

- Draft
- Pending
- Completed
- Cancelled
- Refunded
- Partially Refunded

Order detail:

- Items
- Quantities
- Prices
- Discounts
- Tax
- Total
- Payment
- Member
- Card
- Operator
- Receipt
- Timestamp

---

# 20. Refunds

Authorized staff can refund completed orders.

Flow:

```text
Completed Order
      ↓
Refund
      ↓
Select amount/items
      ↓
Confirm
      ↓
Refund Payment
      ↓
Create Refund Transaction
      ↓
Update Wallet if applicable
      ↓
Update Order
```

Never delete the original transaction.

---

# 21. Product Management

Admin → Products

Features:

- Create
- Edit
- Archive
- Activate/deactivate
- Duplicate
- Upload image
- Pricing
- Tax
- Discounts
- Variants
- Availability

## Product Fields

- Name
- Description
- Image
- SKU
- Barcode
- Category
- Price
- Cost
- Tax
- Discount
- Variants
- Availability
- Featured
- Badge
- Status

---

# 22. Categories

Admin can:

- Create.
- Edit.
- Archive/delete.
- Reorder.
- Activate/deactivate.

Fields:

- Name
- Icon/image
- Display order
- Status

Changes should immediately affect the POS catalog.

---

# 23. Staff Management

Admin → Staff

Fields:

- Name
- Email
- Phone
- Role
- Status
- Last login

Default roles:

- Owner
- Admin
- Manager
- Cashier
- Accountant
- Read Only

---

# 24. Permissions

Use role-based access control.

Modules:

- Dashboard
- POS
- Products
- Orders
- Users
- Cards
- Deposits
- Transactions
- Analytics
- Reports
- Staff
- Settings

Permission actions:

- View
- Create
- Edit
- Delete
- Approve
- Refund
- Export

Sensitive operations require explicit permissions.

---

# 25. Admin Dashboard

The dashboard should provide a quick overview of business performance.

## Summary Cards

- Today's Sales
- Total Orders
- Active Members
- Active Cards
- Total Wallet Balance
- Pending Deposits
- Revenue

## Dashboard Sections

### Sales Overview

Filters:

- Today
- This Week
- This Month
- This Year
- Custom Date Range

### Recent Orders

Latest orders.

### Recent Transactions

Latest financial activity.

### Pending Deposits

Requests requiring review.

### Low Balance Members

Members below a configurable threshold.

### Quick Actions

- Create Order
- Add Product
- Add Member
- Issue Card
- Review Deposits

---

# 26. Analytics

Analytics should include:

## Sales

- Gross sales
- Net sales
- Revenue
- Average order value

## Orders

- Total
- Completed
- Cancelled
- Refunded

## Membership

- Active members
- Active cards
- Card usage
- Total wallet balance

## Payments

- Cash
- Card
- Bank Transfer
- Digital Wallet
- Membership Card

## Products

- Top products
- Top categories
- Sales by product

## Members

- Top members
- Spending
- Purchase frequency

Date filters:

- Today
- Week
- Month
- Year
- Custom

---

# 27. Reports

Reports:

- Sales
- Orders
- Products
- Members
- Cards
- Deposits
- Transactions
- Refunds
- Staff/operator activity

Filters:

- Date
- Product
- Category
- Member
- Card
- Payment method
- Operator

Exports:

- CSV
- PDF where supported

---

# 28. Transaction Ledger

Admin → Transactions

Each transaction should contain:

- Transaction ID
- Type
- Member
- Card
- Order
- Payment method
- Amount
- Balance before
- Balance after
- Operator
- Status
- Timestamp
- Reference

Types:

- Purchase
- Deposit
- Refund
- Adjustment
- Withdrawal if enabled

The ledger must be auditable and should not be silently altered to hide history.

---

# 29. Audit Log

Track important administrative and financial events.

Examples:

- Card assigned.
- Card blocked.
- Card replaced.
- Deposit approved.
- Deposit rejected.
- Balance adjusted.
- Product price changed.
- Product archived.
- Refund processed.
- Permission changed.

Audit fields:

- Actor
- Action
- Entity
- Entity ID
- Timestamp
- Previous value where relevant
- New value where relevant
- Reason where required

---

# 30. Notifications

## Admin

- New deposit request
- Low balance
- Card expiration
- Failed transaction
- Refund
- Important system events

## Member

- Deposit submitted
- Deposit approved
- Deposit rejected
- Purchase completed
- Card blocked
- Card expiring
- Refund received

Notification center should support:

- Read/unread state
- Timestamp
- Notification detail

---

# 31. Receipt

Receipt must contain:

- Business name
- Logo
- Location/address if configured
- Order number
- Date/time
- Cashier
- Member/customer
- Items
- Quantity
- Price
- Subtotal
- Discount
- Tax
- Total
- Payment method
- Membership Card indicator
- Remaining membership balance where applicable

Actions:

- Print
- Download
- Email
- New Order

Support thermal receipt layout.

---

# 32. Responsive Requirements

## Desktop

Primary target for:

- POS terminals
- Admin dashboard

## Tablet

Support:

- Touch POS
- Tablet administration

## Mobile

Member Portal should be mobile-first.

Admin must remain usable.

POS should transform intelligently rather than simply shrink.

Recommended mobile POS:

```text
Products
   ↓
[ View Cart ]
   ↓
Cart Bottom Sheet
   ↓
Payment
```

Tables may become:

- Cards
- Expandable rows
- Horizontal scrolling

---

# 33. Loading States

Provide clear feedback for:

- Dashboard loading
- Product loading
- Order loading
- User loading
- Card scanning
- Payment processing
- Deposit processing
- Transaction loading

Use skeletons and button loading states.

---

# 34. Error States

Examples:

### NFC

> Card could not be identified.

### Card

> This membership card is blocked.

### Balance

> Insufficient membership balance.

### Payment

> Payment could not be completed.

### Network

> Unable to connect. Please try again.

Every error should communicate:

1. What happened.
2. What the user can do next.

---

# 35. Authentication & Security

## Staff

- Login
- Logout
- Password reset
- Session management

## Members

Use appropriate authentication/verification for private account information.

## Security Requirements

- Role-based access control.
- Server-side authorization.
- Secure sessions.
- Server-side validation.
- Audit logging.
- Financial transaction integrity.
- No client-side balance authority.
- Protected refunds.
- Protected financial adjustments.
- Sensitive identifier masking where appropriate.

---

# 36. Single-Business Data Model

The first release should be modeled around one business.

Core entities:

```text
Business
│
├── Business Settings
├── Staff
├── Roles
├── Permissions
├── Products
│   ├── Categories
│   └── Variants
│
├── Members
│   ├── Wallet
│   └── NFC Cards
│
├── Orders
│   └── Order Items
│
├── Payments
├── Transactions
├── Deposits
├── Refunds
├── Notifications
└── Audit Logs
```

## Relationships

```text
Member
  │
  ├── NFC Cards
  │
  └── Wallet
         │
         └── Transactions
```

```text
Order
 │
 ├── Order Items
 │
 └── Payment
       │
       └── Transaction
```

---

# 37. Financial Integrity

The wallet ledger is the source of truth for member financial activity.

Do not implement wallet changes as arbitrary CRUD.

Preferred conceptual operation:

```text
Financial Operation
       ↓
Validate
       ↓
Create Ledger Transaction
       ↓
Update Wallet / Balance
       ↓
Commit Atomically
```

The system must prevent:

- Duplicate charges.
- Missing transactions.
- Incorrect balance updates.
- Unauthorized adjustments.
- Partial financial operations.

---

# 38. Core Business Rules

### BR-01 — Card Validation

Inactive, blocked, expired, lost, or replaced cards cannot be used for membership payment.

### BR-02 — Balance

Membership payment requires sufficient balance unless credit/overdraft is explicitly enabled.

### BR-03 — Ledger

Every successful wallet-affecting operation creates a transaction.

### BR-04 — Balance Authority

Members cannot directly modify their wallet.

### BR-05 — Refund

Refunds preserve the original transaction and create a compensating record.

### BR-06 — Card Replacement

Historical transactions remain linked to the original card.

### BR-07 — Deposits

Only authorized staff can approve deposits.

### BR-08 — Adjustments

Only authorized staff can perform balance adjustments.

### BR-09 — Refunds

Only authorized staff can process refunds.

### BR-10 — Audit

Sensitive operations are recorded in the audit log.

---

# 39. Business Setup Journey

```text
Open Application
 ↓
Business Profile
 ↓
Business Type
 ↓
Regional Settings
 ↓
POS Settings
 ↓
Payment Methods
 ↓
Membership Settings
 ↓
Products
 ↓
Members
 ↓
NFC Cards
 ↓
Ready
 ↓
Open POS
```

---

# 40. Cashier Journey

```text
Login
 ↓
Open POS
 ↓
Search/Browse Product
 ↓
Add to Cart
 ↓
Adjust Quantity
 ↓
Review
 ↓
Proceed to Payment
 ↓
Select Payment Method
 ↓
If Membership Card:
    NFC Scan
      ↓
    Identify Member
      ↓
    Validate Card
      ↓
    Validate Balance
      ↓
    Confirm
      ↓
    Charge
 ↓
Payment Success
 ↓
Transaction
 ↓
Receipt
 ↓
New Order
```

---

# 41. Member Journey

```text
Member Created
 ↓
NFC Card Assigned
 ↓
Member Receives Card
 ↓
Deposit Requested
 ↓
Admin Approves
 ↓
Wallet Balance
 ↓
Member Purchases
 ↓
NFC Card Used
 ↓
Balance Deducted
 ↓
Transaction Recorded
 ↓
Member Views Portal
```

---

# 42. MVP Scope

The MVP must include:

- Authentication
- Business Setup Wizard
- Business Settings
- Admin Dashboard
- POS
- Products
- Categories
- Orders
- Members
- NFC Cards
- Wallet
- Membership Card Payment
- Deposits
- Transactions
- Refunds
- Receipts
- Staff
- Roles/Permissions
- Analytics
- Reports
- Member Portal
- Unique Member URLs
- Notifications
- Audit Logs
- Responsive UI

---

# 43. MVP End-to-End Definition

The MVP is functionally successful when the business can complete this entire flow:

```text
Business Setup
      ↓
Create Product
      ↓
Create Member
      ↓
Register NFC Card
      ↓
Assign Card
      ↓
Member Requests Deposit
      ↓
Admin Approves Deposit
      ↓
Wallet Balance Updated
      ↓
Cashier Creates Order
      ↓
Membership Card Selected
      ↓
NFC Card Identified
      ↓
Balance Validated
      ↓
Purchase Charged
      ↓
Transaction Created
      ↓
Receipt Generated
      ↓
Member Sees Updated Balance
      ↓
Member Sees Transaction
```

This workflow is the highest-priority acceptance path.

---

# 44. Out of Scope for Current Version

Do **not** build SaaS/multi-business functionality now.

Explicitly postpone:

- Multiple businesses.
- Tenant switching.
- SaaS subscriptions.
- Subscription billing.
- Pricing plans.
- Trials.
- Platform administrator.
- Cross-business analytics.
- Cross-business reports.
- Business marketplace.
- Platform-level billing.
- Multi-business onboarding.

Also postpone optional advanced modules unless required by the actual business:

- Advanced inventory.
- Supplier management.
- Purchase orders.
- Loyalty programs.
- Advanced CRM.
- Advanced accounting integration.
- Advanced API platform.

---

# 45. Future SaaS Expansion

After this single-business product is complete and stable, it can be expanded.

Current:

```text
One Business
   │
   ├── Products
   ├── Members
   ├── Cards
   ├── Orders
   ├── Transactions
   └── Staff
```

Future:

```text
SaaS Platform
   │
   ├── Business A
   │    ├── Products
   │    ├── Members
   │    ├── Cards
   │    └── Transactions
   │
   ├── Business B
   │    ├── Products
   │    ├── Members
   │    ├── Cards
   │    └── Transactions
   │
   └── Business C
        ├── Products
        ├── Members
        ├── Cards
        └── Transactions
```

The future SaaS layer should be introduced only after the single-business product has been validated.

---

# 46. Development Sequence

Build incrementally:

```text
01. Application Foundation
        ↓
02. Authentication
        ↓
03. Business Setup
        ↓
04. Design System
        ↓
05. Admin Application Shell
        ↓
06. Product Management
        ↓
07. POS UI
        ↓
08. Cart
        ↓
09. Orders
        ↓
10. Standard Payments
        ↓
11. Members
        ↓
12. Wallet
        ↓
13. NFC Cards
        ↓
14. NFC Membership Payment
        ↓
15. Deposits
        ↓
16. Transactions
        ↓
17. Refunds
        ↓
18. Receipts
        ↓
19. Member Portal
        ↓
20. Dashboard
        ↓
21. Analytics
        ↓
22. Reports
        ↓
23. Staff & Permissions
        ↓
24. Notifications
        ↓
25. Audit Logs
        ↓
26. Responsive Optimization
        ↓
27. Security / Reliability / QA
```

---

# 47. Definition of Done

The product is ready for real-business testing when:

- Business setup works.
- Staff authentication works.
- Admin can manage products/categories.
- Products appear correctly in POS.
- Cashier can create orders.
- Standard payments work.
- Members can be created.
- NFC cards can be registered and assigned.
- NFC card identification works.
- Deposits can be requested.
- Authorized staff can approve deposits.
- Wallet balance updates correctly.
- Membership Card payments deduct the correct amount.
- Insufficient balances are rejected.
- Invalid/blocked/expired cards are rejected.
- Transactions are recorded correctly.
- Refunds are traceable.
- Receipts are generated.
- Member Portal works.
- Unique member URLs work.
- Members can view balance and transaction history.
- Roles/permissions work.
- Audit logs work.
- Dashboard metrics are accurate.
- Reports work.
- Desktop, tablet, and mobile layouts work.
- Unauthorized users cannot access protected functions.
- Duplicate financial charges are prevented.

---

# 48. Final Product Definition

> **A complete single-business POS and NFC Membership Management application where one business can configure its POS, manage products and members, issue NFC membership cards, receive member deposits, maintain member wallets, process purchases through a modern responsive POS, charge purchases against NFC membership balances, manage transactions and staff, analyze business activity, and provide every member with a personal account portal.**

The immediate objective is **not SaaS**.

The immediate objective is to build one excellent, reliable, production-ready business POS.

Once that product is complete and proven, the architecture can be extended into a multi-business SaaS platform.
