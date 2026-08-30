import { getTransactions } from './payment-store'
import { getCards, getMembers } from './card-store'
import { getLocations } from './orders-store'
import type { Transaction } from './types'

const KEY_TXNS = 'ezsale:transactions'
const SEED_FLAG = 'ezsale:orders-transactions:seeded:v1'

const now = Date.now()
const day = 1000 * 60 * 60 * 24
const hour = 1000 * 60 * 60
const minute = 1000 * 60

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

const SAMPLE_TXNS: Transaction[] = [
  {
    id: 'EZ-1001042',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm1',
    cardId: 'c1',
    items: [
      { productId: 'p1', name: 'Truffle Mushroom Risotto', price: 24, qty: 1 },
      { productId: 'p2', name: 'Sparkling Water 500ml', price: 5, qty: 2 },
      { productId: 'p3', name: 'Espresso', price: 4, qty: 1 },
    ],
    subtotal: 38,
    discount: 4,
    tax: 2.55,
    total: 36.55,
    method: 'membership',
    cardNumber: 'EZ-1000-4521',
    status: 'completed',
    locationId: 'loc-main',
    createdAt: new Date(now - 10 * minute).toISOString(),
    settledAt: new Date(now - 10 * minute).toISOString(),
  },
  {
    id: 'EZ-1001041',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm2',
    cardId: 'c2',
    items: [
      { productId: 'p4', name: 'Wagyu Smash Burger', price: 22, qty: 2 },
      { productId: 'p5', name: 'Sweet Potato Fries', price: 8, qty: 2 },
      { productId: 'p6', name: 'Iced Caramel Latte', price: 6, qty: 2 },
      { productId: 'p7', name: 'Cheesecake Slice', price: 7, qty: 1 },
    ],
    subtotal: 73,
    discount: 7,
    tax: 4.95,
    total: 70.95,
    method: 'membership',
    cardNumber: 'EZ-1000-7820',
    status: 'completed',
    locationId: 'loc-main',
    createdAt: new Date(now - 32 * minute).toISOString(),
    settledAt: new Date(now - 32 * minute).toISOString(),
  },
  {
    id: 'EZ-1001040',
    businessId: 'preview',
    operatorEmail: 'omar.f@ezsale.app',
    memberId: 'm5',
    cardId: 'c7',
    items: [
      { productId: 'p8', name: 'Pesto Chicken Panini', price: 14, qty: 1 },
      { productId: 'p9', name: 'Tomato Basil Soup', price: 9, qty: 1 },
    ],
    subtotal: 23,
    discount: 0,
    tax: 1.95,
    total: 24.95,
    method: 'card',
    cardNumber: '•••• 4421',
    reference: 'AUTH-849102',
    status: 'completed',
    locationId: 'loc-express',
    createdAt: new Date(now - hour).toISOString(),
    settledAt: new Date(now - hour + 3 * 1000).toISOString(),
  },
  {
    id: 'EZ-1001039',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm8',
    items: [
      { productId: 'p10', name: 'Mediterranean Mezze Platter', price: 28, qty: 1 },
      { productId: 'p11', name: 'House Red Wine (glass)', price: 12, qty: 2 },
    ],
    subtotal: 52,
    discount: 5,
    tax: 3.55,
    total: 50.55,
    method: 'cash',
    status: 'refunded',
    locationId: 'loc-main',
    note: 'Customer left before eating — full refund issued.',
    createdAt: new Date(now - 2 * hour).toISOString(),
    settledAt: new Date(now - 2 * hour).toISOString(),
  },
  {
    id: 'EZ-1001038',
    businessId: 'preview',
    operatorEmail: 'admin@ezsale.app',
    items: [
      { productId: 'p12', name: 'Cold Brew Tonic', price: 7, qty: 1 },
      { productId: 'p13', name: 'Avocado Toast', price: 12, qty: 1 },
    ],
    subtotal: 19,
    discount: 0,
    tax: 1.43,
    total: 20.43,
    method: 'wallet',
    reference: 'WALLET-TX-12041',
    status: 'completed',
    locationId: 'loc-kiosk',
    createdAt: new Date(now - 3 * hour).toISOString(),
    settledAt: new Date(now - 3 * hour).toISOString(),
  },
  {
    id: 'EZ-1001037',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm6',
    cardId: 'c7',
    items: [
      { productId: 'p14', name: 'Family Combo Pack', price: 65, qty: 1 },
      { productId: 'p15', name: 'Birthday Cake', price: 28, qty: 1 },
    ],
    subtotal: 93,
    discount: 9,
    tax: 6.3,
    total: 90.3,
    method: 'bank',
    reference: 'UTR-22818',
    status: 'partially_refunded',
    locationId: 'loc-main',
    note: 'Returned cake — partial refund issued.',
    createdAt: new Date(now - 5 * hour).toISOString(),
    settledAt: new Date(now - 5 * hour).toISOString(),
  },
  {
    id: 'EZ-1001036',
    businessId: 'preview',
    operatorEmail: 'admin@ezsale.app',
    items: [
      { productId: 'p16', name: 'Conference Room Hire (hour)', price: 80, qty: 2 },
    ],
    subtotal: 160,
    discount: 0,
    tax: 12,
    total: 172,
    method: 'bank',
    reference: 'INV-22-118',
    status: 'pending',
    locationId: 'loc-main',
    createdAt: new Date(now - 6 * hour).toISOString(),
  },
  {
    id: 'EZ-1001035',
    businessId: 'preview',
    operatorEmail: 'omar.f@ezsale.app',
    memberId: 'm9',
    items: [
      { productId: 'p17', name: 'Caesar Salad', price: 13, qty: 1 },
      { productId: 'p18', name: 'Sparkling Lemonade', price: 5, qty: 1 },
    ],
    subtotal: 18,
    discount: 0,
    tax: 1.35,
    total: 19.35,
    method: 'cash',
    amountTendered: 20,
    change: 0.65,
    status: 'completed',
    locationId: 'loc-express',
    createdAt: new Date(now - day - 30 * minute).toISOString(),
    settledAt: new Date(now - day - 30 * minute).toISOString(),
  },
  {
    id: 'EZ-1001034',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm10',
    cardId: 'c6',
    items: [
      { productId: 'p19', name: 'Catering Platter (Large)', price: 140, qty: 1 },
      { productId: 'p20', name: 'Bottled Sparkling Water 750ml', price: 9, qty: 6 },
    ],
    subtotal: 194,
    discount: 25,
    tax: 12.68,
    total: 181.68,
    method: 'card',
    cardNumber: '•••• 2210',
    reference: 'AUTH-771002',
    status: 'completed',
    locationId: 'loc-pop',
    createdAt: new Date(now - day - hour).toISOString(),
    settledAt: new Date(now - day - hour + 5 * 1000).toISOString(),
  },
  {
    id: 'EZ-1001033',
    businessId: 'preview',
    operatorEmail: 'mira.hassan@ezsale.app',
    memberId: 'm1',
    cardId: 'c1',
    items: [
      { productId: 'p21', name: 'Truffle Mushroom Risotto', price: 24, qty: 1 },
      { productId: 'p22', name: 'Chocolate Lava Cake', price: 9, qty: 1 },
    ],
    subtotal: 33,
    discount: 0,
    tax: 2.48,
    total: 35.48,
    method: 'membership',
    cardNumber: 'EZ-1000-4521',
    status: 'completed',
    locationId: 'loc-main',
    createdAt: new Date(now - 2 * day).toISOString(),
    settledAt: new Date(now - 2 * day).toISOString(),
  },
  {
    id: 'EZ-1001032',
    businessId: 'preview',
    operatorEmail: 'admin@ezsale.app',
    items: [
      { productId: 'p23', name: 'Office Supplies Bundle', price: 145, qty: 1 },
    ],
    subtotal: 145,
    discount: 15,
    tax: 9.75,
    total: 139.75,
    method: 'bank',
    reference: 'UTR-22811',
    status: 'adjusted',
    locationId: 'loc-main',
    note: 'Volume discount applied after the fact.',
    createdAt: new Date(now - 3 * day).toISOString(),
    settledAt: new Date(now - 3 * day).toISOString(),
  },
  {
    id: 'EZ-1001031',
    businessId: 'preview',
    operatorEmail: 'omar.f@ezsale.app',
    memberId: 'm3',
    cardId: 'c3',
    items: [
      { productId: 'p24', name: 'Yoga Class Drop-in', price: 25, qty: 1 },
      { productId: 'p25', name: 'Smoothie of the Day', price: 8, qty: 1 },
    ],
    subtotal: 33,
    discount: 0,
    tax: 2.48,
    total: 35.48,
    method: 'membership',
    cardNumber: 'EZ-1000-9100',
    status: 'failed',
    locationId: 'loc-kiosk',
    note: 'Card blocked at gateway.',
    createdAt: new Date(now - 4 * day).toISOString(),
  },
]

function getSeedFileKey() {
  // Reset seed if locations list changed shape so the new fields show up.
  return SEED_FLAG
}

export function ensureOrderSeed(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(getSeedFileKey())) return

  const existing = getTransactions()
  const ids = new Set(existing.map((t) => t.id))
  const missing = SAMPLE_TXNS.filter((t) => !ids.has(t.id))
  const all = [...missing, ...existing]
  localStorage.setItem(KEY_TXNS, JSON.stringify(all))

  // Seed financial events for refunds / adjustments so the audit trail has
  // interesting data on first load.
  const KEY_FE = 'ezsale:financial-events'
  const events: unknown[] = []
  const refundTx = all.find((t) => t.id === 'EZ-1001039')
  if (refundTx) {
    events.push({
      id: uid('fev'),
      parentTxnId: refundTx.id,
      type: 'refund',
      amount: -refundTx.total,
      balanceBefore: undefined,
      balanceAfter: undefined,
      reason: 'Customer left before eating — full refund issued.',
      by: 'mira.hassan@ezsale.app',
      at: new Date(now - 2 * hour + 5 * minute).toISOString(),
    })
  }
  const partial = all.find((t) => t.id === 'EZ-1001037')
  if (partial) {
    events.push({
      id: uid('fev'),
      parentTxnId: partial.id,
      type: 'partial_refund',
      amount: -28,
      balanceBefore: undefined,
      balanceAfter: undefined,
      reason: 'Returned birthday cake.',
      by: 'mira.hassan@ezsale.app',
      at: new Date(now - 5 * hour + 20 * minute).toISOString(),
    })
  }
  const adjusted = all.find((t) => t.id === 'EZ-1001032')
  if (adjusted) {
    events.push({
      id: uid('fev'),
      parentTxnId: adjusted.id,
      type: 'adjustment',
      amount: -15,
      reason: 'Volume discount applied after the fact.',
      by: 'admin@ezsale.app',
      at: new Date(now - 3 * day + hour).toISOString(),
    })
  }
  const cardTxn = all.find((t) => t.id === 'EZ-1001042')
  if (cardTxn) {
    // Simulate a card-balance snapshot recorded at sale time (no refund event).
    events.push({
      id: uid('fev'),
      parentTxnId: cardTxn.id,
      type: 'adjustment',
      amount: 0,
      reason: 'Card balance snapshot at sale.',
      balanceBefore: 286.55,
      balanceAfter: 250,
      by: 'mira.hassan@ezsale.app',
      at: new Date(now - 10 * minute).toISOString(),
    })
  }
  if (events.length) {
    localStorage.setItem(KEY_FE, JSON.stringify(events))
  }

  localStorage.setItem(getSeedFileKey(), '1')
}

/** Convenience used by the dashboard / pages to keep cards/members warm. */
export function warmStores() {
  getMembers()
  getCards()
  getLocations()
  ensureOrderSeed()
  // touch getTransactions so the cached list is available
  void safeParse<Transaction[]>(localStorage.getItem(KEY_TXNS), [])
}