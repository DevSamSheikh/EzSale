import { getCardDeposits, getCardTransactions, maskCardNumber } from '../card-store'
import type { Business, CardDeposit, MembershipCard, Transaction } from '../types'

export type BillingCategory =
  | 'purchase'
  | 'deposit'
  | 'refund'
  | 'adjustment'
  | 'withdrawal'

export type BillingPeriod = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom'

export interface BillingEntry {
  id: string
  kind: 'transaction' | 'deposit'
  category: BillingCategory
  date: string
  number: string
  cardId: string
  cardNumber: string
  title: string
  description: string
  itemCount: number
  /** Signed amount: positive = credited to card, negative = charged to card */
  amount: number
  method: Transaction['method'] | CardDeposit['method']
  status: string
  location: string
  /** Card balance immediately after this entry */
  resultingBalance: number
  transaction?: Transaction
  deposit?: CardDeposit
}

export interface BillingFilters {
  period: BillingPeriod
  from: string
  to: string
  category: BillingCategory | 'all'
  min?: number
  max?: number
}

export const DEFAULT_BILLING_FILTERS: BillingFilters = {
  period: 'all',
  from: '',
  to: '',
  category: 'all',
}

export function billingCategoryLabel(c: BillingCategory): string {
  switch (c) {
    case 'purchase':
      return 'Purchase'
    case 'deposit':
      return 'Deposit'
    case 'refund':
      return 'Refund'
    case 'adjustment':
      return 'Adjustment'
    case 'withdrawal':
      return 'Withdrawal'
  }
}

export function billingCategoryTone(c: BillingCategory): {
  bg: string
  text: string
  border: string
} {
  switch (c) {
    case 'purchase':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
    case 'deposit':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    case 'refund':
      return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' }
    case 'adjustment':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' }
    case 'withdrawal':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
  }
}

function locationLabel(business: Business | null): string {
  if (!business) return 'EzSale'
  return business.address ? `${business.name} · ${business.address}` : business.name
}

/**
 * Builds a unified, read-only billing history for the given cards.
 * Categories map as: completed transaction -> Purchase, refunded transaction ->
 * Refund, card deposit -> Deposit. (Adjustment / Withdrawal have no producing
 * flow yet but are supported by the type + filters.)
 *
 * `resultingBalance` is derived by replaying each card's events backwards from
 * its current balance, so every row can show the balance after that event.
 */
export function buildBillingHistory(
  cards: MembershipCard[],
  business: Business | null,
): BillingEntry[] {
  const loc = locationLabel(business)
  const entries: BillingEntry[] = []

  for (const card of cards) {
    for (const t of getCardTransactions(card.id)) {
      if (t.status !== 'completed' && t.status !== 'refunded') continue
      const isRefund = t.status === 'refunded'
      const first = t.items[0]?.name
      const more = t.items.length > 1 ? ` +${t.items.length - 1} more` : ''
      entries.push({
        id: t.id,
        kind: 'transaction',
        category: isRefund ? 'refund' : 'purchase',
        date: t.createdAt,
        number: t.id,
        cardId: card.id,
        cardNumber: maskCardNumber(card.cardNumber),
        title: isRefund
          ? `Refund · ${first ?? 'Order'}`
          : first
          ? `${first}${more}`
          : `Order ${t.id}`,
        description:
          t.items.map((i) => `${i.name} ×${i.qty}`).join(', ') ||
          (isRefund ? `Refund for order ${t.id}` : 'Purchase'),
        itemCount: t.items.reduce((s, i) => s + i.qty, 0),
        amount: isRefund ? t.total : -t.total,
        method: t.method,
        status: t.status,
        location: loc,
        resultingBalance: 0,
        transaction: t,
      })
    }
    for (const d of getCardDeposits(card.id)) {
      entries.push({
        id: d.id,
        kind: 'deposit',
        category: 'deposit',
        date: d.at,
        number: d.id,
        cardId: card.id,
        cardNumber: maskCardNumber(card.cardNumber),
        title: 'Balance top-up',
        description: d.note ?? d.reference ?? 'Deposit to card balance',
        itemCount: 0,
        amount: d.amount,
        method: d.method,
        status: 'completed',
        location: loc,
        resultingBalance: 0,
        deposit: d,
      })
    }
  }

  const byCard = new Map<string, BillingEntry[]>()
  entries.forEach((e) => {
    const list = byCard.get(e.cardId) ?? []
    list.push(e)
    byCard.set(e.cardId, list)
  })
  byCard.forEach((list, cardId) => {
    list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const card = cards.find((c) => c.id === cardId)
    let running = card?.balance ?? 0
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].resultingBalance = running
      running -= list[i].amount
    }
  })

  return entries.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function filterBillingEntries(
  entries: BillingEntry[],
  f: BillingFilters,
): BillingEntry[] {
  let start: number | null = null
  let end: number | null = null
  if (f.period === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    start = d.getTime()
  } else if (f.period === '7d') {
    start = Date.now() - 7 * 86400000
  } else if (f.period === '30d') {
    start = Date.now() - 30 * 86400000
  } else if (f.period === '90d') {
    start = Date.now() - 90 * 86400000
  } else if (f.period === 'custom') {
    if (f.from) start = new Date(`${f.from}T00:00:00`).getTime()
    if (f.to) end = new Date(`${f.to}T23:59:59.999`).getTime()
  }

  return entries.filter((e) => {
    const t = new Date(e.date).getTime()
    if (start !== null && t < start) return false
    if (end !== null && t > end) return false
    if (f.category !== 'all' && e.category !== f.category) return false
    const abs = Math.abs(e.amount)
    if (typeof f.min === 'number' && !Number.isNaN(f.min) && abs < f.min) return false
    if (typeof f.max === 'number' && !Number.isNaN(f.max) && abs > f.max) return false
    return true
  })
}

export function billingFilterCount(f: BillingFilters): number {
  let n = 0
  if (f.period !== 'all') n += 1
  if (f.category !== 'all') n += 1
  if (typeof f.min === 'number' && !Number.isNaN(f.min) && f.min > 0) n += 1
  if (typeof f.max === 'number' && !Number.isNaN(f.max) && f.max > 0) n += 1
  return n
}

export function billingPeriodLabel(p: BillingPeriod): string {
  switch (p) {
    case 'all':
      return 'All time'
    case 'today':
      return 'Today'
    case '7d':
      return '7 days'
    case '30d':
      return '30 days'
    case '90d':
      return '90 days'
    case 'custom':
      return 'Custom'
  }
}
