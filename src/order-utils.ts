import type {
  Location,
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from './types'

export function formatCurrency(n: number, currency = '$'): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  return `${sign}${currency}${abs.toFixed(2)}`
}

export function formatCurrencyPlain(n: number, currency = '$'): string {
  return `${currency}${n.toFixed(2)}`
}

export function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateInputValue(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

export function statusPillClass(s: TransactionStatus): string {
  switch (s) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'refunded':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'partially_refunded':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'failed':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'adjusted':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
}

export function statusLabel(s: TransactionStatus): string {
  switch (s) {
    case 'completed':
      return 'Completed'
    case 'pending':
      return 'Pending'
    case 'refunded':
      return 'Refunded'
    case 'partially_refunded':
      return 'Partially refunded'
    case 'failed':
      return 'Failed'
    case 'adjusted':
      return 'Adjusted'
  }
}

export function methodLabel(m: string): string {
  switch (m) {
    case 'cash':
      return 'Cash'
    case 'card':
      return 'Card'
    case 'bank':
      return 'Bank Transfer'
    case 'wallet':
      return 'Digital Wallet'
    case 'membership':
      return 'Membership Card'
    default:
      return m
  }
}

export function methodPillClass(m: PaymentMethod): string {
  switch (m) {
    case 'cash':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'card':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'bank':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'wallet':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'membership':
      return 'bg-brand-50 text-ink-900 border-brand-200'
  }
}

export function orderItemsCount(t: Transaction): number {
  return t.items.reduce((s, i) => s + i.qty, 0)
}

export function operatorName(email?: string): string {
  if (!email) return 'Unknown'
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

export interface OrderContext {
  member: Member | null
  card: MembershipCard | null
  location: Location | null
  operatorEmail: string
  operatorName: string
}

export function buildOrderContext(
  t: Transaction,
  members: Member[],
  cards: MembershipCard[],
  locations: Location[],
): OrderContext {
  return {
    member: t.memberId ? members.find((m) => m.id === t.memberId) ?? null : null,
    card: t.cardId ? cards.find((c) => c.id === t.cardId) ?? null : null,
    location: t.locationId
      ? locations.find((l) => l.id === t.locationId) ?? null
      : locations[0] ?? null,
    operatorEmail: t.operatorEmail,
    operatorName: operatorName(t.operatorEmail),
  }
}

export interface TransactionFilterState {
  search: string
  dateFrom: string
  dateTo: string
  methods: string[]
  statuses: string[]
  memberIds: string[]
  locationIds: string[]
  cardIds?: string[]
}

export const EMPTY_FILTER_STATE: TransactionFilterState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  methods: [],
  statuses: [],
  memberIds: [],
  locationIds: [],
  cardIds: [],
}

export function withinDateRange(
  iso: string,
  from: string,
  to: string,
): boolean {
  const t = new Date(iso).getTime()
  if (from) {
    const f = new Date(from + 'T00:00:00').getTime()
    if (t < f) return false
  }
  if (to) {
    const e = new Date(to + 'T23:59:59.999').getTime()
    if (t > e) return false
  }
  return true
}

export function applyBaseFilters(
  list: Transaction[],
  f: TransactionFilterState,
): Transaction[] {
  const q = f.search.trim().toLowerCase()
  return list.filter((t) => {
    if (q) {
      const hay = [
        t.id,
        t.operatorEmail,
        t.reference ?? '',
        t.cardNumber ?? '',
        t.items.map((i) => i.name).join(' '),
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (!withinDateRange(t.createdAt, f.dateFrom, f.dateTo)) return false
    if (f.methods.length && !f.methods.includes(t.method)) return false
    if (f.statuses.length && !f.statuses.includes(t.status)) return false
    if (f.memberIds.length) {
      const mid = t.memberId ?? '__walkin__'
      if (!f.memberIds.includes(mid)) return false
    }
    if (f.locationIds.length) {
      const lid = t.locationId ?? '__unknown__'
      if (!f.locationIds.includes(lid)) return false
    }
    if (f.cardIds && f.cardIds.length) {
      const cid = t.cardId ?? '__none__'
      if (!f.cardIds.includes(cid)) return false
    }
    return true
  })
}

export function activeFilterCount(f: TransactionFilterState): number {
  let n = 0
  if (f.search.trim()) n++
  if (f.dateFrom || f.dateTo) n++
  if (f.methods.length) n++
  if (f.statuses.length) n++
  if (f.memberIds.length) n++
  if (f.locationIds.length) n++
  if (f.cardIds && f.cardIds.length) n++
  return n
}