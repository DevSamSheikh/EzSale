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

export interface Member {
  id: string
  businessId: string
  name: string
  email?: string
  phone?: string
  tier: string
  joinedAt: string
}

export interface MembershipCard {
  id: string
  businessId: string
  memberId: string | null
  cardNumber: string
  nfcUid?: string
  type: MembershipCardType
  status: MembershipCardStatus
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

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'wallet' | 'membership'

export type TransactionStatus = 'completed' | 'pending' | 'refunded' | 'failed'

export interface Transaction {
  id: string
  businessId: string
  operatorEmail: string
  memberId?: string
  cardId?: string
  items: { productId: string; name: string; price: number; qty: number }[]
  subtotal: number
  discount: number
  total: number
  method: PaymentMethod
  cardNumber?: string
  amountTendered?: number
  change?: number
  reference?: string
  status: TransactionStatus
  createdAt: string
}
