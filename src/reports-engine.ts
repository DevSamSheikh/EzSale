import {
  getAllCardDeposits,
  getCards,
  getDepositRequests,
  getMemberActivity,
  getMembers,
} from './card-store'
import { getFinancialEvents, getLocations } from './orders-store'
import { getTransactions } from './payment-store'
import { getOperatorActivity, getOperators } from './operators-store'
import { getBusiness } from './store'
import { getProducts } from './pos-store'
import type {
  Location,
  MembershipCard,
  Member,
  Operator,
  PaymentMethod,
  Transaction,
} from './types'

// ---- Report types -------------------------------------------------------

export type ReportCategory =
  | 'sales'
  | 'orders'
  | 'products'
  | 'users'
  | 'cards'
  | 'deposits'
  | 'transactions'
  | 'refunds'
  | 'operators'

export type ReportId =
  | 'sales-daily'
  | 'sales-by-location'
  | 'sales-by-payment-method'
  | 'orders-detail'
  | 'products-performance'
  | 'inventory-snapshot'
  | 'users-detail'
  | 'users-tier-movement'
  | 'cards-detail'
  | 'cards-balance'
  | 'deposits-detail'
  | 'transactions-raw'
  | 'refunds-and-adjustments'
  | 'operators-performance'
  | 'operators-activity'

export interface ReportDefinition {
  id: ReportId
  name: string
  description: string
  category: ReportCategory
  /** Tags surfaced as little pills in the catalog card. */
  tags: string[]
  /** Default filter values when the report opens. */
  defaultFilters: ReportFilters
  /** Whether the report supports CSV export. PDF support is opt-in per
   * report (see `supportsPdf`) so we only enable print for tabular data
   * we can render. */
  supportsCsv: boolean
  supportsPdf: boolean
}

export interface ReportFilters {
  /** ISO date `YYYY-MM-DD`; both inclusive. Empty = no bound. */
  dateFrom: string
  dateTo: string
  locationIds: string[]
  paymentMethods: PaymentMethod[]
  category: string
  operatorIds: string[]
  memberIds: string[]
  cardIds: string[]
}

export const EMPTY_FILTERS: ReportFilters = {
  dateFrom: '',
  dateTo: '',
  locationIds: [],
  paymentMethods: [],
  category: '',
  operatorIds: [],
  memberIds: [],
  cardIds: [],
}

export function activeFilterCount(f: ReportFilters): number {
  let n = 0
  if (f.dateFrom) n++
  if (f.dateTo) n++
  if (f.locationIds.length) n++
  if (f.paymentMethods.length) n++
  if (f.category.trim()) n++
  if (f.operatorIds.length) n++
  if (f.memberIds.length) n++
  if (f.cardIds.length) n++
  return n
}

// ---- Formatters --------------------------------------------------------

export function money(n: number, currency?: string) {
  const sym = currency ?? getBusiness()?.currencyDisplay.symbol ?? '$'
  return `${sym}${n.toFixed(2)}`
}

export function moneyCompact(n: number, currency?: string) {
  const sym = currency ?? getBusiness()?.currencyDisplay.symbol ?? '$'
  if (Math.abs(n) >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}k`
  return `${sym}${n.toFixed(0)}`
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export function dateOnly(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString()
}

export function methodLabel(m: PaymentMethod) {
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
  }
}

// ---- Source filtering ---------------------------------------------------

function withinDateRange(iso: string, from: string, to: string) {
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

function txnMatches(t: Transaction, f: ReportFilters) {
  if (!withinDateRange(t.createdAt, f.dateFrom, f.dateTo)) return false
  if (f.locationIds.length && !f.locationIds.includes(t.locationId ?? '')) return false
  if (f.paymentMethods.length && !f.paymentMethods.includes(t.method)) return false
  if (f.operatorIds.length && !f.operatorIds.includes(t.operatorEmail)) return false
  if (f.memberIds.length && !(t.memberId && f.memberIds.includes(t.memberId))) return false
  if (f.cardIds.length && !(t.cardId && f.cardIds.includes(t.cardId))) return false
  if (f.category.trim()) {
    const products = getProducts()
    const cat = products.find((p) => p.category)?.category
    void cat
    const match = t.items.some((it) => {
      const meta = products.find((p) => p.id === it.productId)
      return meta?.category === f.category
    })
    if (!match) return false
  }
  return true
}

export interface ReportRow {
  cells: Array<{ label: string; value: string; align?: 'left' | 'right' | 'center' }>
}

export interface ReportSummary {
  label: string
  value: string
  tone?: 'brand' | 'emerald' | 'rose' | 'neutral' | 'amber' | 'sky' | 'indigo' | 'ink'
  hint?: string
}

export interface ReportResult {
  columns: string[]
  rows: ReportRow[]
  summary: ReportSummary[]
}

// ---- Report definitions ------------------------------------------------

export const REPORT_CATEGORIES: { id: ReportCategory; label: string; tone: string }[] = [
  { id: 'sales', label: 'Sales', tone: 'bg-brand-50 text-brand-800 border-brand-200' },
  { id: 'orders', label: 'Orders', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'products', label: 'Products', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'users', label: 'Users', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'cards', label: 'Cards', tone: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'deposits', label: 'Deposits', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'transactions', label: 'Transactions', tone: 'bg-ink-100 text-ink-800 border-ink-200' },
  { id: 'refunds', label: 'Refunds', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'operators', label: 'Operators', tone: 'bg-violet-50 text-violet-800 border-violet-200' },
]

export const REPORTS: ReportDefinition[] = [
  {
    id: 'sales-daily',
    name: 'Daily sales',
    description: 'End-of-day summary with revenue, taxes, and refund totals for each day in range.',
    category: 'sales',
    tags: ['Daily', 'Finance'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'sales-by-location',
    name: 'Sales by location',
    description: 'Revenue, orders, and average ticket broken down by location.',
    category: 'sales',
    tags: ['Locations', 'Performance'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'sales-by-payment-method',
    name: 'Sales by payment method',
    description: 'Cash, card, wallet, bank, and membership totals side-by-side.',
    category: 'sales',
    tags: ['Payments', 'Mix'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'orders-detail',
    name: 'Order detail',
    description: 'Per-transaction line items with customer, operator, location, and payment method.',
    category: 'orders',
    tags: ['Detail', 'Export'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'products-performance',
    name: 'Product performance',
    description: 'Top sellers by quantity and revenue for the selected period.',
    category: 'products',
    tags: ['Top sellers', 'Mix'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'inventory-snapshot',
    name: 'Inventory snapshot',
    description: 'Current stock and reorder thresholds across every product.',
    category: 'products',
    tags: ['Inventory', 'Stock'],
    defaultFilters: { ...EMPTY_FILTERS },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'users-detail',
    name: 'User detail',
    description: 'Per-member row with type, status, join date, and last activity.',
    category: 'users',
    tags: ['Members', 'Export'],
    defaultFilters: { ...EMPTY_FILTERS },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'users-tier-movement',
    name: 'User tier movement',
    description: 'Member activity counts (top-ups, purchases, login) for the period.',
    category: 'users',
    tags: ['Members', 'Engagement'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'cards-detail',
    name: 'Card detail',
    description: 'All membership cards with member, tier, status, and balance.',
    category: 'cards',
    tags: ['Membership', 'Export'],
    defaultFilters: { ...EMPTY_FILTERS },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'cards-balance',
    name: 'Card balance report',
    description: 'Sum of balances by tier and status, plus low-balance alerts.',
    category: 'cards',
    tags: ['Balance', 'Risk'],
    defaultFilters: { ...EMPTY_FILTERS },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'deposits-detail',
    name: 'Deposit detail',
    description: 'Top-ups and deposit requests with member, card, method, and status.',
    category: 'deposits',
    tags: ['Deposits', 'Export'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'transactions-raw',
    name: 'Transaction ledger',
    description: 'Every transaction (charges, refunds, adjustments) with full audit metadata.',
    category: 'transactions',
    tags: ['Audit', 'Raw'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'refunds-and-adjustments',
    name: 'Refunds & adjustments',
    description: 'Every refund and manual adjustment with reason, by, and amount.',
    category: 'refunds',
    tags: ['Refunds', 'Adjustments', 'Audit'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'operators-performance',
    name: 'Operator performance',
    description: 'Sales rung and refunds handled per operator.',
    category: 'operators',
    tags: ['Staff', 'Performance'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
  {
    id: 'operators-activity',
    name: 'Operator activity',
    description: 'Operator events: logins, role changes, status changes, location changes.',
    category: 'operators',
    tags: ['Staff', 'Audit'],
    defaultFilters: { ...EMPTY_FILTERS, dateFrom: defaultFrom(30), dateTo: defaultTo() },
    supportsCsv: true,
    supportsPdf: true,
  },
]

export function findReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id)
}

function defaultFrom(days = 30): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---- Report runners -----------------------------------------------------

export function runReport(id: string, filters: ReportFilters): ReportResult {
  switch (id) {
    case 'sales-daily':
      return reportSalesDaily(filters)
    case 'sales-by-location':
      return reportSalesByLocation(filters)
    case 'sales-by-payment-method':
      return reportSalesByPaymentMethod(filters)
    case 'orders-detail':
      return reportOrdersDetail(filters)
    case 'products-performance':
      return reportProductsPerformance(filters)
    case 'inventory-snapshot':
      return reportInventorySnapshot(filters)
    case 'users-detail':
      return reportUsersDetail(filters)
    case 'users-tier-movement':
      return reportUsersTierMovement(filters)
    case 'cards-detail':
      return reportCardsDetail(filters)
    case 'cards-balance':
      return reportCardsBalance(filters)
    case 'deposits-detail':
      return reportDepositsDetail(filters)
    case 'transactions-raw':
      return reportTransactionsRaw(filters)
    case 'refunds-and-adjustments':
      return reportRefundsAndAdjustments(filters)
    case 'operators-performance':
      return reportOperatorsPerformance(filters)
    case 'operators-activity':
      return reportOperatorsActivity(filters)
    default:
      return { columns: ['No data'], rows: [], summary: [] }
  }
}

// ---- Individual report implementations --------------------------------

function reportSalesDaily(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => t.status === 'completed' && t.total > 0 && txnMatches(t, f))
  const byDay = new Map<
    string,
    { date: string; revenue: number; tax: number; discount: number; orders: number }
  >()
  for (const t of txns) {
    const d = t.createdAt.slice(0, 10)
    const cur = byDay.get(d) ?? { date: d, revenue: 0, tax: 0, discount: 0, orders: 0 }
    cur.revenue += t.total
    cur.tax += t.tax ?? 0
    cur.discount += t.discount ?? 0
    cur.orders += 1
    byDay.set(d, cur)
  }
  const days = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0)
  const totalTax = days.reduce((s, d) => s + d.tax, 0)
  const totalOrders = days.reduce((s, d) => s + d.orders, 0)
  return {
    columns: ['Date', 'Orders', 'Revenue', 'Tax', 'Discounts', 'Avg ticket'],
    rows: days.map((d) => ({
      cells: [
        { label: 'Date', value: d.date },
        { label: 'Orders', value: String(d.orders), align: 'right' },
        { label: 'Revenue', value: money(d.revenue), align: 'right' },
        { label: 'Tax', value: money(d.tax), align: 'right' },
        { label: 'Discounts', value: money(d.discount), align: 'right' },
        { label: 'Avg', value: money(d.orders ? d.revenue / d.orders : 0), align: 'right' },
      ],
    })),
    summary: [
      { label: 'Days', value: String(days.length), tone: 'brand' },
      { label: 'Orders', value: String(totalOrders), tone: 'emerald' },
      { label: 'Revenue', value: money(totalRevenue), tone: 'brand' },
      { label: 'Tax', value: money(totalTax), tone: 'sky' },
    ],
  }
}

function reportSalesByLocation(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => t.status === 'completed' && t.total > 0 && txnMatches(t, f))
  const locs = getLocations()
  const byLoc = new Map<string, { location: Location | null; revenue: number; orders: number }>()
  for (const t of txns) {
    const lid = t.locationId ?? '__unknown__'
    const cur = byLoc.get(lid) ?? { location: locs.find((l) => l.id === lid) ?? null, revenue: 0, orders: 0 }
    cur.revenue += t.total
    cur.orders += 1
    byLoc.set(lid, cur)
  }
  const total = Array.from(byLoc.values()).reduce((s, r) => s + r.revenue, 0)
  const rows = Array.from(byLoc.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((r) => ({
      cells: [
        { label: 'Location', value: r.location?.name ?? 'Unknown' },
        { label: 'Code', value: r.location?.code ?? '—' },
        { label: 'Orders', value: String(r.orders), align: 'right' as const },
        { label: 'Revenue', value: money(r.revenue), align: 'right' as const },
        { label: 'Avg ticket', value: money(r.orders ? r.revenue / r.orders : 0), align: 'right' as const },
        { label: 'Share', value: pct(total ? r.revenue / total : 0), align: 'right' as const },
      ],
    }))
  return {
    columns: ['Location', 'Code', 'Orders', 'Revenue', 'Avg ticket', 'Share'],
    rows,
    summary: [
      { label: 'Locations', value: String(byLoc.size), tone: 'brand' },
      { label: 'Orders', value: String(txns.length), tone: 'emerald' },
      { label: 'Revenue', value: money(total), tone: 'brand' },
    ],
  }
}

function reportSalesByPaymentMethod(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => t.status === 'completed' && t.total > 0 && txnMatches(t, f))
  const methods: PaymentMethod[] = ['cash', 'card', 'bank', 'wallet', 'membership']
  const byMethod = new Map<PaymentMethod, { revenue: number; orders: number }>()
  for (const m of methods) byMethod.set(m, { revenue: 0, orders: 0 })
  for (const t of txns) {
    const cur = byMethod.get(t.method)!
    cur.revenue += t.total
    cur.orders += 1
  }
  const total = Array.from(byMethod.values()).reduce((s, r) => s + r.revenue, 0)
  return {
    columns: ['Method', 'Orders', 'Revenue', 'Share'],
    rows: methods.map((m) => {
      const v = byMethod.get(m)!
      return {
        cells: [
          { label: 'Method', value: methodLabel(m) },
          { label: 'Orders', value: String(v.orders), align: 'right' as const },
          { label: 'Revenue', value: money(v.revenue), align: 'right' as const },
          { label: 'Share', value: pct(total ? v.revenue / total : 0), align: 'right' as const },
        ],
      }
    }),
    summary: [
      { label: 'Orders', value: String(txns.length), tone: 'emerald' },
      { label: 'Revenue', value: money(total), tone: 'brand' },
    ],
  }
}

function reportOrdersDetail(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => txnMatches(t, f))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const members = getMembers()
  const locs = getLocations()
  const rows: ReportRow[] = []
  for (const t of txns) {
    const member = t.memberId ? members.find((m) => m.id === t.memberId) : null
    const loc = t.locationId ? locs.find((l) => l.id === t.locationId) : null
    const first = t.items[0]?.name ?? '—'
    const more = t.items.length > 1 ? ` +${t.items.length - 1}` : ''
    rows.push({
      cells: [
        { label: 'Order', value: t.id },
        { label: 'Date', value: dateTime(t.createdAt) },
        { label: 'Customer', value: member?.name ?? 'Walk-in' },
        { label: 'Location', value: loc?.name ?? '—' },
        { label: 'Operator', value: t.operatorEmail.split('@')[0] },
        { label: 'Method', value: methodLabel(t.method) },
        { label: 'Items', value: `${first}${more}` },
        { label: 'Total', value: money(t.total), align: 'right' },
        { label: 'Status', value: t.status },
      ],
    })
  }
  return {
    columns: ['Order', 'Date', 'Customer', 'Location', 'Operator', 'Method', 'Items', 'Total', 'Status'],
    rows,
    summary: [
      { label: 'Orders', value: String(txns.length), tone: 'brand' },
      {
        label: 'Revenue (completed)',
        value: money(txns.filter((t) => t.status === 'completed').reduce((s, t) => s + t.total, 0)),
        tone: 'emerald',
      },
      {
        label: 'Refunds',
        value: money(
          Math.abs(
            txns.filter((t) => t.total < 0).reduce((s, t) => s + t.total, 0),
          ),
        ),
        tone: 'rose',
      },
    ],
  }
}

function reportProductsPerformance(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => t.status === 'completed' && t.total > 0 && txnMatches(t, f))
  const products = getProducts()
  const byProduct = new Map<string, { name: string; category: string; qty: number; revenue: number }>()
  for (const t of txns) {
    for (const it of t.items) {
      const meta = products.find((p) => p.id === it.productId)
      const name = meta?.name ?? it.name
      const category = meta?.category ?? 'Other'
      const key = it.productId || name
      const cur = byProduct.get(key) ?? { name, category, qty: 0, revenue: 0 }
      cur.qty += it.qty
      cur.revenue += it.price * it.qty - (it.lineDiscount ?? 0)
      byProduct.set(key, cur)
    }
  }
  const sorted = Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue)
  const total = sorted.reduce((s, r) => s + r.revenue, 0)
  return {
    columns: ['Product', 'Category', 'Qty', 'Revenue', 'Share'],
    rows: sorted.map((p) => ({
      cells: [
        { label: 'Product', value: p.name },
        { label: 'Category', value: p.category },
        { label: 'Qty', value: String(p.qty), align: 'right' as const },
        { label: 'Revenue', value: money(p.revenue), align: 'right' as const },
        { label: 'Share', value: pct(total ? p.revenue / total : 0), align: 'right' as const },
      ],
    })),
    summary: [
      { label: 'Products sold', value: String(sorted.length), tone: 'brand' },
      { label: 'Units', value: String(sorted.reduce((s, r) => s + r.qty, 0)), tone: 'emerald' },
      { label: 'Revenue', value: money(total), tone: 'brand' },
    ],
  }
}

function reportInventorySnapshot(_f: ReportFilters): ReportResult {
  const products = getProducts()
  const rows = products
    .filter((p) => p.stock !== undefined)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .map((p) => {
      const stock = p.stock ?? 0
      const low = p.lowStockAt ?? 5
      return {
        cells: [
          { label: 'Product', value: p.name },
          { label: 'SKU', value: p.sku },
          { label: 'Category', value: p.category },
          { label: 'Stock', value: String(stock), align: 'right' as const },
          { label: 'Reorder at', value: String(low), align: 'right' as const },
          { label: 'Status', value: stock <= 0 ? 'Out' : stock <= low ? 'Low' : 'OK' },
        ],
      }
    })
  const out = products.filter((p) => (p.stock ?? 0) <= 0).length
  const low = products.filter((p) => {
    const s = p.stock ?? 0
    return s > 0 && s <= (p.lowStockAt ?? 5)
  }).length
  return {
    columns: ['Product', 'SKU', 'Category', 'Stock', 'Reorder at', 'Status'],
    rows,
    summary: [
      { label: 'Tracked', value: String(rows.length), tone: 'brand' },
      { label: 'Low stock', value: String(low), tone: 'amber' },
      { label: 'Out of stock', value: String(out), tone: 'rose' },
    ],
  }
}

function reportUsersDetail(f: ReportFilters): ReportResult {
  const members = getMembers().filter((m) => {
    if (f.memberIds.length && !f.memberIds.includes(m.id)) return false
    if (f.dateFrom || f.dateTo) {
      return withinDateRange(m.joinedAt, f.dateFrom, f.dateTo)
    }
    return true
  })
  const cards = getCards()
  return {
    columns: ['Member', 'Type', 'Status', 'Cards', 'Balance', 'Joined', 'Last active'],
    rows: members.map((m: Member) => {
      const ownCards = cards.filter((c) => c.memberId === m.id)
      const balance = ownCards.reduce((s, c) => s + c.balance, 0)
      return {
        cells: [
          { label: 'Member', value: m.name },
          { label: 'Type', value: m.type },
          { label: 'Status', value: m.status },
          { label: 'Cards', value: String(ownCards.length), align: 'right' as const },
          { label: 'Balance', value: money(balance), align: 'right' as const },
          { label: 'Joined', value: dateOnly(m.joinedAt) },
          { label: 'Last active', value: m.lastActiveAt ? dateTime(m.lastActiveAt) : '—' },
        ],
      }
    }),
    summary: [
      { label: 'Members', value: String(members.length), tone: 'brand' },
      { label: 'Active', value: String(members.filter((m) => m.status === 'active').length), tone: 'emerald' },
      { label: 'Inactive', value: String(members.filter((m) => m.status !== 'active').length), tone: 'amber' },
    ],
  }
}

function reportUsersTierMovement(f: ReportFilters): ReportResult {
  const members = getMembers()
  const cards = getCards()
  const rows = members.map((m) => {
    const own = cards.filter((c) => c.memberId === m.id)
    const primary = own[0]
    const activity = getMemberActivity(m.id).filter((a) =>
      withinDateRange(a.at, f.dateFrom, f.dateTo),
    )
    const topups = activity.filter((a) => a.type === 'card_assigned' || a.type === 'note').length
    const logins = activity.filter((a) => a.type === 'login').length
    return {
      cells: [
        { label: 'Member', value: m.name },
        { label: 'Tier', value: primary?.tier ?? '—' },
        { label: 'Top-ups / events', value: String(topups), align: 'right' as const },
        { label: 'Logins', value: String(logins), align: 'right' as const },
        { label: 'Cards', value: String(own.length), align: 'right' as const },
        { label: 'Balance', value: money(own.reduce((s, c) => s + c.balance, 0)), align: 'right' as const },
        { label: 'Last activity', value: m.lastActiveAt ? dateTime(m.lastActiveAt) : '—' },
      ],
    }
  })
  return {
    columns: ['Member', 'Tier', 'Top-ups / events', 'Logins', 'Cards', 'Balance', 'Last activity'],
    rows,
    summary: [
      { label: 'Members', value: String(members.length), tone: 'brand' },
      { label: 'Active in period', value: String(members.filter((m) => m.lastActiveAt && withinDateRange(m.lastActiveAt, f.dateFrom, f.dateTo)).length), tone: 'emerald' },
    ],
  }
}

function reportCardsDetail(f: ReportFilters): ReportResult {
  const cards = getCards().filter((c) => {
    if (f.cardIds.length && !f.cardIds.includes(c.id)) return false
    if (f.memberIds.length && !(c.memberId && f.memberIds.includes(c.memberId))) return false
    return true
  })
  const members = getMembers()
  return {
    columns: ['Card', 'Member', 'Tier', 'Type', 'Status', 'Issued', 'Expires', 'Balance', 'Limits'],
    rows: cards.map((c: MembershipCard) => {
      const member = c.memberId ? members.find((m) => m.id === c.memberId) : null
      return {
        cells: [
          { label: 'Card', value: c.cardNumber },
          { label: 'Member', value: member?.name ?? 'Unassigned' },
          { label: 'Tier', value: c.tier },
          { label: 'Type', value: c.type },
          { label: 'Status', value: c.status },
          { label: 'Issued', value: dateOnly(c.issuedAt) },
          { label: 'Expires', value: dateOnly(c.expiresAt) },
          { label: 'Balance', value: money(c.balance), align: 'right' as const },
          {
            label: 'Limits',
            value: `${money(c.dailyLimit)} / ${money(c.monthlyLimit)}`,
            align: 'right' as const,
          },
        ],
      }
    }),
    summary: [
      { label: 'Cards', value: String(cards.length), tone: 'brand' },
      {
        label: 'Active',
        value: String(cards.filter((c) => c.status === 'active').length),
        tone: 'emerald',
      },
      {
        label: 'Blocked / lost',
        value: String(cards.filter((c) => c.status === 'blocked' || c.status === 'lost').length),
        tone: 'rose',
      },
      { label: 'Total balance', value: money(cards.reduce((s, c) => s + c.balance, 0)), tone: 'sky' },
    ],
  }
}

function reportCardsBalance(_f: ReportFilters): ReportResult {
  const cards = getCards()
  const tiers = Array.from(new Set(cards.map((c) => c.tier)))
  const rows = tiers.map((tier) => {
    const byStatus = new Map<string, { count: number; balance: number }>()
    for (const c of cards.filter((c) => c.tier === tier)) {
      const cur = byStatus.get(c.status) ?? { count: 0, balance: 0 }
      cur.count += 1
      cur.balance += c.balance
      byStatus.set(c.status, cur)
    }
    const totalCount = Array.from(byStatus.values()).reduce((s, v) => s + v.count, 0)
    const totalBal = Array.from(byStatus.values()).reduce((s, v) => s + v.balance, 0)
    return {
      cells: [
        { label: 'Tier', value: tier },
        ...Array.from(byStatus.entries()).map(([status, v]) => ({
          label: status,
          value: `${v.count} (${moneyCompact(v.balance)})`,
        })),
        { label: 'Total', value: `${totalCount} · ${money(totalBal)}`, align: 'right' as const },
      ],
    }
  })
  return {
    columns: ['Tier', 'Active', 'Inactive', 'Blocked', 'Lost', 'Expired', 'Total'],
    rows: rows.map((r) => {
      const get = (label: string) => r.cells.find((c) => c.label === label)?.value ?? '—'
      return {
        cells: [
          r.cells[0],
          { label: 'Active', value: get('active') },
          { label: 'Inactive', value: get('inactive') },
          { label: 'Blocked', value: get('blocked') },
          { label: 'Lost', value: get('lost') },
          { label: 'Expired', value: get('expired') },
          r.cells[r.cells.length - 1],
        ],
      }
    }),
    summary: [
      { label: 'Cards', value: String(cards.length), tone: 'brand' },
      {
        label: 'Total balance',
        value: money(cards.reduce((s, c) => s + c.balance, 0)),
        tone: 'emerald',
      },
      {
        label: 'Low balance',
        value: String(cards.filter((c) => c.status === 'active' && c.balance < 10).length),
        tone: 'amber',
        hint: 'Below $10',
      },
    ],
  }
}

function reportDepositsDetail(f: ReportFilters): ReportResult {
  const deposits = getAllCardDeposits()
  const requests = getDepositRequests()
  const cards = getCards()
  const members = getMembers()
  const depositRows = deposits
    .filter((d) => {
      const card = cards.find((c) => c.id === d.cardId)
      if (f.cardIds.length && !f.cardIds.includes(d.cardId)) return false
      if (f.memberIds.length && !(card?.memberId && f.memberIds.includes(card.memberId))) return false
      if (!withinDateRange(d.at, f.dateFrom, f.dateTo)) return false
      return true
    })
    .map((d) => {
      const card = cards.find((c) => c.id === d.cardId)
      const member = card?.memberId ? members.find((m) => m.id === card.memberId) : null
      return {
        cells: [
          { label: 'Date', value: dateTime(d.at) },
          { label: 'Member', value: member?.name ?? '—' },
          { label: 'Card', value: card?.cardNumber ?? d.cardId.slice(-6) },
          { label: 'Method', value: methodLabel(d.method as PaymentMethod) },
          { label: 'Amount', value: money(d.amount), align: 'right' as const },
          { label: 'Reference', value: d.reference ?? '—' },
        ],
      }
    })
  const requestRows = requests
    .filter((r) => withinDateRange(r.requestedAt, f.dateFrom, f.dateTo))
    .map((r) => {
      const member = members.find((m) => m.id === r.memberId)
      return {
        cells: [
          { label: 'Date', value: dateTime(r.requestedAt) },
          { label: 'Member', value: member?.name ?? '—' },
          { label: 'Card', value: cards.find((c) => c.id === r.cardId)?.cardNumber ?? '—' },
          { label: 'Method', value: methodLabel(r.method) },
          { label: 'Amount', value: money(r.amount), align: 'right' as const },
          { label: 'Status', value: r.status },
        ],
      }
    })
  return {
    columns: ['Date', 'Member', 'Card', 'Method', 'Amount', 'Reference / Status'],
    rows: [...depositRows, ...requestRows],
    summary: [
      { label: 'Total top-ups', value: String(deposits.length), tone: 'brand' },
      {
        label: 'Top-up amount',
        value: money(deposits.reduce((s, d) => s + d.amount, 0)),
        tone: 'emerald',
      },
      {
        label: 'Pending requests',
        value: String(requests.filter((r) => r.status === 'pending').length),
        tone: 'amber',
      },
    ],
  }
}

function reportTransactionsRaw(f: ReportFilters): ReportResult {
  const txns = getTransactions()
    .filter((t) => txnMatches(t, f))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return {
    columns: ['Txn ID', 'Date', 'Member', 'Card', 'Method', 'Operator', 'Status', 'Subtotal', 'Tax', 'Discount', 'Total', 'Reference'],
    rows: txns.map((t) => ({
      cells: [
        { label: 'Txn ID', value: t.id },
        { label: 'Date', value: dateTime(t.createdAt) },
        { label: 'Member', value: t.memberId ?? 'Walk-in' },
        { label: 'Card', value: t.cardNumber ?? '—' },
        { label: 'Method', value: methodLabel(t.method) },
        { label: 'Operator', value: t.operatorEmail },
        { label: 'Status', value: t.status },
        { label: 'Subtotal', value: money(t.subtotal), align: 'right' as const },
        { label: 'Tax', value: money(t.tax ?? 0), align: 'right' as const },
        { label: 'Discount', value: money(t.discount ?? 0), align: 'right' as const },
        { label: 'Total', value: money(t.total), align: 'right' as const },
        { label: 'Reference', value: t.reference ?? '—' },
      ],
    })),
    summary: [
      { label: 'Transactions', value: String(txns.length), tone: 'brand' },
      { label: 'Net', value: money(txns.reduce((s, t) => s + t.total, 0)), tone: 'emerald' },
    ],
  }
}

function reportRefundsAndAdjustments(f: ReportFilters): ReportResult {
  const events = getFinancialEvents()
    .filter((e) => {
      if (e.type !== 'refund' && e.type !== 'partial_refund' && e.type !== 'adjustment') return false
      return withinDateRange(e.at, f.dateFrom, f.dateTo)
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1))
  const txns = getTransactions()
  return {
    columns: ['Date', 'Type', 'Order', 'Amount', 'Reason', 'By', 'Status before / after'],
    rows: events.map((e) => {
      const parent = txns.find((t) => t.id === e.parentTxnId)
      return {
        cells: [
          { label: 'Date', value: dateTime(e.at) },
          { label: 'Type', value: e.type.replace(/_/g, ' ') },
          { label: 'Order', value: e.parentTxnId },
          { label: 'Amount', value: money(e.amount), align: 'right' as const },
          { label: 'Reason', value: e.reason ?? '—' },
          { label: 'By', value: e.by },
          {
            label: 'Status',
            value: parent?.status ?? '—',
          },
        ],
      }
    }),
    summary: [
      { label: 'Events', value: String(events.length), tone: 'rose' },
      {
        label: 'Total adjusted',
        value: money(events.reduce((s, e) => s + e.amount, 0)),
        tone: 'rose',
      },
    ],
  }
}

function reportOperatorsPerformance(f: ReportFilters): ReportResult {
  const txns = getTransactions().filter((t) => txnMatches(t, f))
  const operators = getOperators()
  const events = getFinancialEvents().filter(
    (e) =>
      (e.type === 'refund' || e.type === 'partial_refund' || e.type === 'adjustment') &&
      withinDateRange(e.at, f.dateFrom, f.dateTo),
  )
  const byOp = new Map<string, { operator: Operator | null; sales: number; revenue: number; refunds: number }>()
  for (const t of txns) {
    const key = t.operatorEmail
    const op = operators.find((o) => o.email === key)
    const cur = byOp.get(key) ?? { operator: op ?? null, sales: 0, revenue: 0, refunds: 0 }
    if (t.status === 'completed' && t.total > 0) {
      cur.sales += 1
      cur.revenue += t.total
    }
    byOp.set(key, cur)
  }
  for (const e of events) {
    const parent = txns.find((t) => t.id === e.parentTxnId)
    if (!parent) continue
    const key = parent.operatorEmail
    const op = operators.find((o) => o.email === key)
    const cur = byOp.get(key) ?? { operator: op ?? null, sales: 0, revenue: 0, refunds: 0 }
    cur.refunds += Math.abs(e.amount)
    byOp.set(key, cur)
  }
  const rows = Array.from(byOp.values()).sort((a, b) => b.revenue - a.revenue)
  return {
    columns: ['Operator', 'Email', 'Status', 'Sales rung', 'Revenue', 'Refunds / Adjustments', 'Net'],
    rows: rows.map((r) => ({
      cells: [
        { label: 'Operator', value: r.operator?.name ?? r.operator?.email ?? '—' },
        { label: 'Email', value: r.operator?.email ?? '—' },
        { label: 'Status', value: r.operator?.status ?? '—' },
        { label: 'Sales rung', value: String(r.sales), align: 'right' as const },
        { label: 'Revenue', value: money(r.revenue), align: 'right' as const },
        { label: 'Refunds', value: money(r.refunds), align: 'right' as const },
        { label: 'Net', value: money(r.revenue - r.refunds), align: 'right' as const },
      ],
    })),
    summary: [
      { label: 'Operators', value: String(rows.length), tone: 'brand' },
      { label: 'Sales rung', value: String(rows.reduce((s, r) => s + r.sales, 0)), tone: 'emerald' },
      { label: 'Net', value: money(rows.reduce((s, r) => s + r.revenue - r.refunds, 0)), tone: 'brand' },
    ],
  }
}

function reportOperatorsActivity(f: ReportFilters): ReportResult {
  const operators = getOperators()
  const rows: ReportRow[] = []
  for (const op of operators) {
    const events = getOperatorActivity(op.id).filter((a) =>
      withinDateRange(a.at, f.dateFrom, f.dateTo),
    )
    for (const a of events) {
      rows.push({
        cells: [
          { label: 'Date', value: dateTime(a.at) },
          { label: 'Operator', value: op.name },
          { label: 'Type', value: a.type.replace(/_/g, ' ') },
          { label: 'Description', value: a.description },
          { label: 'By', value: a.by ?? 'system' },
        ],
      })
    }
  }
  rows.sort((a, b) => (a.cells[0].value < b.cells[0].value ? 1 : -1))
  return {
    columns: ['Date', 'Operator', 'Type', 'Description', 'By'],
    rows,
    summary: [
      { label: 'Operators', value: String(operators.length), tone: 'brand' },
      { label: 'Events in period', value: String(rows.length), tone: 'sky' },
    ],
  }
}

// ---- Export helpers -----------------------------------------------------

export function toCSV(result: ReportResult): string {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = result.columns.map(escape).join(',')
  const body = result.rows
    .map((r) => r.cells.map((c) => escape(c.value)).join(','))
    .join('\n')
  return [header, body].filter(Boolean).join('\n')
}

export function downloadCSV(result: ReportResult, filename: string) {
  const csv = toCSV(result)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function reportPrintHtml(
  report: ReportDefinition,
  result: ReportResult,
  businessName: string,
): string {
  const rows = result.rows
    .map(
      (r) =>
        `<tr>${r.cells
          .map((c) => {
            const cls = c.align === 'right' ? 'text-right' : ''
            return `<td class="${cls}" style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtml(c.value)}</td>`
          })
          .join('')}</tr>`,
    )
    .join('')
  const summary = result.summary
    .map(
      (s) =>
        `<div style="display:inline-block;margin-right:14px;"><div style="font-size:10px;color:#7e8694;text-transform:uppercase;">${escapeHtml(s.label)}</div><div style="font-size:18px;font-weight:800;">${escapeHtml(s.value)}</div></div>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(report.name)} · ${escapeHtml(businessName)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#13171c;max-width:1100px;margin:0 auto;padding:24px;}
h1{font-size:18px;margin:0 0 4px;}p{margin:0 0 14px;color:#535b6a;font-size:12px;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th{background:#f6f7f8;text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;}
.summary{margin:14px 0;padding:12px;background:#f6f7f8;border-radius:8px;}
@page{size:A4 landscape;margin:12mm;}</style></head><body>
<h1>${escapeHtml(report.name)}</h1><p>${escapeHtml(report.description)}</p>
<div class="summary">${summary}</div>
<table><thead><tr>${result.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function printReportAsPdf(
  report: ReportDefinition,
  result: ReportResult,
  businessName: string,
) {
  const html = reportPrintHtml(report, result, businessName)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    w.focus()
    w.print()
  }, 200)
}
