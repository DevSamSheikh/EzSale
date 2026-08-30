import { useEffect, useState } from 'react'
import type { Business, BusinessType, POSSettings, ReceiptSettings, TaxSettings, CurrencyDisplay, NotificationSettings, MembershipCardSettings, NFCSettings, SecuritySettings, BusinessLocationSettings } from './types'

const KEY = 'ezsale:business'
const KEY_AUTH = 'ezsale:auth'

export const NAV_LINKS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/app/pos', label: 'POS', icon: 'MonitorPlay' },
  { to: '/app/products', label: 'Products', icon: 'Package' },
  { to: '/app/categories', label: 'Categories', icon: 'Layers' },
  { to: '/app/orders', label: 'Orders', icon: 'Receipt' },
  { to: '/app/users', label: 'Users', icon: 'Users' },
  { to: '/app/cards', label: 'Cards', icon: 'CreditCard' },
  { to: '/app/deposits', label: 'Deposits', icon: 'Wallet' },
  { to: '/app/deposit-requests', label: 'Requests', icon: 'Inbox' },
  { to: '/app/transactions', label: 'Transactions', icon: 'ArrowLeftRight' },
  { to: '/app/reports', label: 'Reports', icon: 'FileText' },
  { to: '/app/analytics', label: 'Analytics', icon: 'TrendingUp' },
  { to: '/app/staff', label: 'Staff', icon: 'UserCog' },
  { to: '/app/roles', label: 'Roles', icon: 'ShieldCheck' },
  { to: '/app/locations', label: 'Locations', icon: 'MapPin' },
  { to: '/app/settings', label: 'Settings', icon: 'Settings' },
] as const

export const BUSINESS_TYPES: { value: BusinessType; label: string; description: string }[] = [
  { value: 'restaurant', label: 'Restaurant', description: 'Dine-in, takeaway, tables & courses.' },
  { value: 'school', label: 'School', description: 'Tuition, canteen, library & services.' },
  { value: 'mall', label: 'Shopping Mall', description: 'Multi-tenant stores & gift cards.' },
  { value: 'gaming', label: 'Gaming Zone', description: 'Time-based play, tokens & rewards.' },
  { value: 'retail', label: 'Retail Shop', description: 'Catalog, stock & barcode scanning.' },
  { value: 'custom', label: 'Custom', description: 'Start from scratch and configure later.' },
]

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'AUD', 'CAD', 'JPY']
export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function getBusiness(): Business | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Business>
    const t = TERMINOLOGY_BY_TYPE[parsed.type ?? 'restaurant']
    const base = {
      id: parsed.id ?? 'preview',
      name: parsed.name ?? 'Bistro Aurora',
      type: parsed.type ?? 'restaurant',
      logo: parsed.logo,
      currency: parsed.currency ?? 'USD',
      timezone: parsed.timezone ?? 'UTC',
      taxRate: parsed.taxRate ?? 0,
      taxInclusive: parsed.taxInclusive ?? false,
      receiptHeader: parsed.receiptHeader ?? '',
      receiptFooter: parsed.receiptFooter ?? '',
      contactEmail: parsed.contactEmail ?? '',
      contactPhone: parsed.contactPhone ?? '',
      address: parsed.address ?? '',
      website: parsed.website ?? '',
      posMode: parsed.posMode ?? 'standard',
      categories: parsed.categories ?? [],
      paymentMethods: parsed.paymentMethods ?? [],
      membership: parsed.membership ?? { enabled: false, tiers: [] },
      terminology: parsed.terminology ?? t,
    }
    return withDefaults(base)
  } catch {
    return null
  }
}

export function saveBusiness(b: Business) {
  localStorage.setItem(KEY, JSON.stringify(b))
}

// ---- Defaults for new settings sections ----------------------------------

export const DEFAULT_POS_SETTINGS: POSSettings = {
  showQuantityStepper: true,
  productSort: 'popularity',
  defaultCategoryFilter: 'all',
  showFavorites: true,
  allowDuplicateLines: false,
  autoClearCart: true,
  requireCustomer: false,
  defaultTipPercent: 0,
  showRunningSubtotal: true,
  alwaysShowChangeDue: false,
  roundCashToNickel: false,
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  showLogo: true,
  showAddress: true,
  showEmail: true,
  showPhone: true,
  showCashier: true,
  showCustomer: true,
  showBarcode: true,
  autoPrint: false,
  autoOpenPreview: true,
  copies: 1,
  footer: '',
  showReturnPolicy: false,
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  inclusive: false,
  rate: 0,
  categoryRates: [],
  showOnReceipt: true,
  taxId: '',
}

export const DEFAULT_CURRENCY_DISPLAY: CurrencyDisplay = {
  code: 'USD',
  symbol: '$',
  decimal: '.',
  thousands: ',',
  decimals: 2,
  position: 'before',
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  lowBalanceThreshold: 10,
  emailNewOrder: true,
  emailRefund: true,
  emailLowStock: true,
  emailLowBalance: true,
  dailyDigest: false,
  pushCritical: true,
}

export const DEFAULT_MEMBERSHIP_CARD_SETTINGS: MembershipCardSettings = {
  cardLabel: 'Loyalty Card',
  defaultStartingBalance: 0,
  defaultStatus: 'active',
  defaultDailyLimit: 250,
  defaultMonthlyLimit: 5000,
  validityMonths: 24,
  lowBalanceWarning: 10,
  blockOnLost: true,
  allowOverdraft: false,
  requireApprovalForRefund: true,
}

export const DEFAULT_NFC_SETTINGS: NFCSettings = {
  enabled: true,
  readerProtocol: 'generic',
  tapSound: true,
  autoFillMember: true,
  autoChargeOnSale: false,
  uidPrefix: '',
  note: 'Card reader keys and API credentials are managed outside this dashboard.',
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  requirePinForRefund: false,
  requirePinForManager: false,
  autoLockMinutes: 15,
  twoFactorAdmin: false,
  sessionHours: 8,
  forceHttps: true,
  ipAllowList: '',
}

export const DEFAULT_LOCATION_SETTINGS: BusinessLocationSettings = {
  multiLocation: true,
  defaultLocationId: 'loc-main',
  tagTransactionsWithTerminal: true,
  cardsUsableAcrossLocations: true,
  requireLocationSelectionAtPOS: false,
}

/** Ensure all nested settings objects are populated with defaults. */
export function withDefaults(b: Partial<Business> & Pick<Business, 'id' | 'name' | 'type' | 'currency' | 'timezone' | 'taxRate' | 'taxInclusive' | 'receiptHeader' | 'receiptFooter' | 'contactEmail' | 'contactPhone' | 'posMode' | 'categories' | 'paymentMethods' | 'membership' | 'terminology'>): Business {
  const merged: Business = {
    ...(b as Business),
    pos: { ...DEFAULT_POS_SETTINGS, ...(b.pos ?? {}) },
    receipt: { ...DEFAULT_RECEIPT_SETTINGS, ...(b.receipt ?? {}) },
    tax: {
      inclusive: b.tax?.inclusive ?? b.taxInclusive ?? false,
      rate: b.tax?.rate ?? b.taxRate ?? 0,
      categoryRates: b.tax?.categoryRates ?? [],
      showOnReceipt: b.tax?.showOnReceipt ?? true,
      taxId: b.tax?.taxId ?? '',
    },
    currencyDisplay: {
      code: b.currencyDisplay?.code ?? b.currency ?? 'USD',
      symbol: b.currencyDisplay?.symbol ?? '$',
      decimal: b.currencyDisplay?.decimal ?? '.',
      thousands: b.currencyDisplay?.thousands ?? ',',
      decimals: b.currencyDisplay?.decimals ?? 2,
      position: b.currencyDisplay?.position ?? 'before',
    },
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(b.notifications ?? {}) },
    membershipCards: { ...DEFAULT_MEMBERSHIP_CARD_SETTINGS, ...(b.membershipCards ?? {}) },
    nfc: { ...DEFAULT_NFC_SETTINGS, ...(b.nfc ?? {}) },
    security: { ...DEFAULT_SECURITY_SETTINGS, ...(b.security ?? {}) },
    locations: { ...DEFAULT_LOCATION_SETTINGS, ...(b.locations ?? {}) },
  }
  return merged
}

export function getAuth(): { email: string } | null {
  const raw = localStorage.getItem(KEY_AUTH)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(email: string) {
  localStorage.setItem(KEY_AUTH, JSON.stringify({ email }))
}

export function clearAuth() {
  localStorage.removeItem(KEY_AUTH)
}

export function memberTermPlural(): string {
  return getBusiness()?.terminology.memberPlural ?? 'Users'
}

export function memberTerm(): string {
  return getBusiness()?.terminology.member ?? 'User'
}

export const TERMINOLOGY_BY_TYPE: Record<BusinessType, import('./types').Terminology> = {
  restaurant: { product: 'Menu item', productPlural: 'Menu items', member: 'Guest', memberPlural: 'Guests', unit: 'Table', order: 'Ticket' },
  school: { product: 'Service', productPlural: 'Services', member: 'Student', memberPlural: 'Students', unit: 'Class', order: 'Invoice' },
  mall: { product: 'Product', productPlural: 'Products', member: 'Shopper', memberPlural: 'Shoppers', unit: 'Store', order: 'Receipt' },
  gaming: { product: 'Game', productPlural: 'Games', member: 'Player', memberPlural: 'Players', unit: 'Station', order: 'Session' },
  retail: { product: 'Product', productPlural: 'Products', member: 'Customer', memberPlural: 'Customers', unit: 'Location', order: 'Receipt' },
  custom: { product: 'Item', productPlural: 'Items', member: 'Member', memberPlural: 'Members', unit: 'Unit', order: 'Order' },
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [query])
  return matches
}
