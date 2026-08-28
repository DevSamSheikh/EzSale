import { useEffect, useState } from 'react'
import type { Business, BusinessType } from './types'

const KEY = 'ezsale:business'
const KEY_AUTH = 'ezsale:auth'

export const NAV_LINKS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/app/pos', label: 'POS', icon: 'MonitorPlay' },
  { to: '/app/products', label: 'Products', icon: 'Package' },
  { to: '/app/orders', label: 'Orders', icon: 'Receipt' },
  { to: '/app/users', label: 'Users', icon: 'Users' },
  { to: '/app/cards', label: 'Cards', icon: 'CreditCard' },
  { to: '/app/deposits', label: 'Deposits', icon: 'Wallet' },
  { to: '/app/transactions', label: 'Transactions', icon: 'ArrowLeftRight' },
  { to: '/app/reports', label: 'Reports', icon: 'FileText' },
  { to: '/app/analytics', label: 'Analytics', icon: 'TrendingUp' },
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
    return {
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
      posMode: parsed.posMode ?? 'standard',
      categories: parsed.categories ?? [],
      paymentMethods: parsed.paymentMethods ?? [],
      membership: parsed.membership ?? { enabled: false, tiers: [] },
      terminology: parsed.terminology ?? t,
    }
  } catch {
    return null
  }
}

export function saveBusiness(b: Business) {
  localStorage.setItem(KEY, JSON.stringify(b))
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
