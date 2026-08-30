export type BusinessType = 'restaurant' | 'school' | 'mall' | 'gaming' | 'retail' | 'custom'

export interface Terminology {
  product: string
  productPlural: string
  member: string
  memberPlural: string
  unit: string
  order: string
}

export interface MembershipTier {
  name: string
  discount: number
}

export interface Business {
  id: string
  name: string
  type: BusinessType
  logo?: string
  currency: string
  timezone: string
  taxRate: number
  taxInclusive: boolean
  receiptHeader: string
  receiptFooter: string
  contactEmail: string
  contactPhone: string
  address?: string
  posMode: 'standard' | 'restaurant' | 'quick'
  categories: string[]
  paymentMethods: string[]
  membership: {
    enabled: boolean
    tiers: MembershipTier[]
  }
  terminology: Terminology
}

export interface NavLink {
  to: string
  label: string
  icon: string
}

export type MembershipCardStatus =
  | 'active'
  | 'inactive'
  | 'blocked'
  | 'expired'
  | 'lost'
  | 'replaced'

export type MembershipCardType = 'standard' | 'nfc' | 'virtual' | 'corporate' | 'gift'

export type MemberStatus = 'active' | 'inactive' | 'suspended'
export type MemberType = 'individual' | 'corporate' | 'staff'

export interface MemberActivity {
  id: string
  memberId: string
  type:
    | 'created'
    | 'updated'
    | 'activated'
    | 'deactivated'
    | 'suspended'
    | 'card_assigned'
    | 'card_removed'
    | 'note'
    | 'login'
  description: string
  meta?: Record<string, string>
  by?: string
  at: string
}

export interface Member {
  id: string
  businessId: string
  slug?: string
  name: string
  email?: string
  phone?: string
  avatarColor?: string
  password?: string
  type: MemberType
  status: MemberStatus
  notes?: string
  address?: string
  joinedAt: string
  lastActiveAt?: string
  lastLoginAt?: string
}

export interface MembershipCard {
  id: string
  businessId: string
  memberId: string | null
  cardNumber: string
  nfcUid?: string
  type: MembershipCardType
  status: MembershipCardStatus
  tier: string
  balance: number
  dailyLimit: number
  monthlyLimit: number
  issuedAt: string
  expiresAt: string
  lastTransactionAt?: string
  lastTransactionId?: string
  replacedBy?: string
  replaces?: string
}

export interface CardActivity {
  id: string
  cardId: string
  type:
    | 'created'
    | 'activated'
    | 'deactivated'
    | 'blocked'
    | 'lost'
    | 'replaced'
    | 'unassigned'
    | 'assigned'
    | 'deposit'
    | 'transaction'
    | 'topup'
    | 'expiry_warning'
  description: string
  amount?: number
  meta?: Record<string, string>
  by?: string
  at: string
}

export interface CardDeposit {
  id: string
  cardId: string
  amount: number
  method: 'cash' | 'card' | 'bank' | 'wallet'
  reference?: string
  by?: string
  at: string
  note?: string
}

export type DepositRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'

export interface DepositRequest {
  id: string
  businessId: string
  cardId: string
  memberId: string
  amount: number
  method: 'cash' | 'card' | 'bank' | 'wallet'
  reference?: string
  note?: string
  attachmentName?: string
  status: DepositRequestStatus
  requestedAt: string
  requestedBy: string
  reviewedAt?: string
  reviewedBy?: string
  rejectionReason?: string
  resultingDepositId?: string
  resultingTransactionId?: string
}

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'wallet' | 'membership'

export type TransactionStatus = 'completed' | 'pending' | 'refunded' | 'failed' | 'partially_refunded' | 'adjusted'

export interface OrderLineItem {
  productId: string
  name: string
  price: number
  qty: number
  /** Optional line-level discount in the order currency */
  lineDiscount?: number
}

export interface Transaction {
  id: string
  businessId: string
  operatorEmail: string
  memberId?: string
  cardId?: string
  items: OrderLineItem[]
  subtotal: number
  discount: number
  /** Tax charged on this order (separate from item price) */
  tax: number
  /** Convenience computed total = subtotal - discount + tax */
  total: number
  method: PaymentMethod
  cardNumber?: string
  amountTendered?: number
  change?: number
  reference?: string
  status: TransactionStatus
  /** Identifier of the location / terminal this order was rung up at */
  locationId?: string
  /** Free-form note attached by the operator */
  note?: string
  createdAt: string
  /** When the transaction was refunded/adjusted — convenience for audit views */
  settledAt?: string
}

/** Linked child record for refund / partial refund / manual adjustment. */
export type FinancialEventType =
  | 'refund'
  | 'partial_refund'
  | 'adjustment'
  | 'topup'
  | 'fee'

export interface FinancialEvent {
  id: string
  parentTxnId: string
  type: FinancialEventType
  amount: number
  /** Snapshot of the card balance immediately before this event was applied */
  balanceBefore?: number
  /** Snapshot of the card balance immediately after this event was applied */
  balanceAfter?: number
  reason?: string
  by: string
  at: string
}

export interface Location {
  id: string
  businessId: string
  name: string
  /** Short code shown on receipts / order rows */
  code: string
  address?: string
  timezone?: string
  active: boolean
}

/** Permissions for the currently signed-in operator (admin by default) */
export interface OperatorPermissions {
  canRefund: boolean
  canAdjust: boolean
  canViewAuditTrail: boolean
}

export const DEFAULT_OPERATOR_PERMISSIONS: OperatorPermissions = {
  canRefund: true,
  canAdjust: true,
  canViewAuditTrail: true,
}

// ---- Operators, Roles & Permissions -------------------------------------

export type StaffStatus = 'active' | 'invited' | 'suspended' | 'deactivated'

/**
 * Granular permission keys. Each module has a `view` + (optional) `manage`
 * flag. Some modules also expose specific actions (e.g. refunds, adjustments).
 *
 * Always keep these in sync with `PERMISSION_GROUPS` so the permission UI
 * can render the same set.
 */
export type PermissionKey =
  | 'dashboard.view'
  | 'pos.use'
  | 'pos.refund'
  | 'pos.adjust'
  | 'products.view'
  | 'products.manage'
  | 'categories.view'
  | 'categories.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'orders.refund'
  | 'users.view'
  | 'users.manage'
  | 'cards.view'
  | 'cards.manage'
  | 'deposits.view'
  | 'deposits.manage'
  | 'depositRequests.view'
  | 'depositRequests.manage'
  | 'transactions.view'
  | 'transactions.refund'
  | 'transactions.adjust'
  | 'reports.view'
  | 'analytics.view'
  | 'staff.view'
  | 'staff.manage'
  | 'roles.view'
  | 'roles.manage'
  | 'settings.view'
  | 'settings.manage'

export interface PermissionGroup {
  /** Stable id used by PermissionKey prefixes */
  id:
    | 'dashboard'
    | 'pos'
    | 'products'
    | 'categories'
    | 'orders'
    | 'users'
    | 'cards'
    | 'deposits'
    | 'depositRequests'
    | 'transactions'
    | 'reports'
    | 'analytics'
    | 'staff'
    | 'roles'
    | 'settings'
  label: string
  description: string
  /** Each permission listed under this group */
  permissions: { key: PermissionKey; label: string; description?: string }[]
}

export interface Role {
  id: string
  /** Display name, e.g. "Super Admin" */
  name: string
  /** Short description shown in pickers */
  description: string
  /** System roles can't be deleted; user roles can */
  system: boolean
  /** Permissions this role grants */
  permissions: PermissionKey[]
}

export interface Operator {
  id: string
  businessId: string
  name: string
  email: string
  avatarColor?: string
  roleId: string
  /** Optional per-location access; empty = all locations */
  locationIds: string[]
  status: StaffStatus
  password?: string
  phone?: string
  joinedAt: string
  lastLoginAt?: string
  lastActiveAt?: string
}

export type OperatorActivityType =
  | 'login'
  | 'logout'
  | 'role_assigned'
  | 'status_changed'
  | 'location_assigned'
  | 'created'
  | 'updated'
  | 'note'
  | 'invited'
  | 'password_reset'

export interface OperatorActivity {
  id: string
  operatorId: string
  type: OperatorActivityType
  description: string
  meta?: Record<string, string>
  by?: string
  at: string
}
