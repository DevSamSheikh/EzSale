import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Calendar,
  CreditCard,
  Download,
  Filter,
  MapPin,
  Receipt,
  RotateCcw,
  ShoppingBag,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '../../components/Primitives'
import { OrderDetailsDrawer } from '../../components/OrderDetailsDrawer'
import {
  FilterDateRange,
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { Tooltip } from '../../components/Tooltip'
import {
  activeFilterCount,
  applyBaseFilters,
  EMPTY_FILTER_STATE,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatTime,
  methodLabel,
  methodPillClass,
  operatorName,
  orderItemsCount,
  statusLabel,
  statusPillClass,
  type TransactionFilterState,
} from '../../order-utils'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getCards, getMembers } from '../../card-store'
import { getLocations } from '../../orders-store'
import type {
  Location,
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from '../../types'
import { playCue } from '../../audio'

const STATUSES: { value: TransactionStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially refunded' },
  { value: 'adjusted', label: 'Adjusted' },
  { value: 'failed', label: 'Failed' },
]

const METHODS: PaymentMethod[] = ['cash', 'card', 'bank', 'wallet', 'membership']

export default function OrdersPage() {
  const [tick, setTick] = useState(0)
  const [filters, setFilters] = useState<TransactionFilterState>(EMPTY_FILTER_STATE)
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [drawerMembers, setDrawerMembers] = useState<Member[]>([])
  const [drawerCards, setDrawerCards] = useState<MembershipCard[]>([])
  const [drawerLocations, setDrawerLocations] = useState<Location[]>([])
  const [page, setPage] = useState({ page: 1, pageSize: 10 })

  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    const transactions = getTransactions()
    const members = getMembers()
    const cards = getCards()
    const locations = getLocations()
    return { transactions, members, cards, locations }
    // tick is intentional — recompute on focus refresh
  }, [tick])

  // Load lookups for drawer only when it's opened
  useEffect(() => {
    if (!selectedTxn) return
    setDrawerMembers(getMembers())
    setDrawerCards(getCards())
    setDrawerLocations(getLocations())
  }, [selectedTxn])

  const filtered = useMemo(
    () => applyBaseFilters(data.transactions, filters),
    [data.transactions, filters],
  )

  const summary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    const completed = filtered.filter((t) => t.status === 'completed')
    const refunded = filtered.filter((t) =>
      ['refunded', 'partially_refunded'].includes(t.status),
    )
    const todayOrders = filtered.filter(
      (t) => new Date(t.createdAt).getTime() >= todayMs && t.status === 'completed',
    )
    const revenue = completed.reduce((s, t) => s + t.total, 0)
    return {
      total: filtered.length,
      completed: completed.length,
      refunded: refunded.length,
      todayCount: todayOrders.length,
      todayRevenue: todayOrders.reduce((s, t) => s + t.total, 0),
      revenue,
    }
  }, [filtered])

  const memberOptions = useMemo(() => {
    const seen = new Set<string>()
    data.transactions.forEach((t) => {
      if (t.memberId) seen.add(t.memberId)
    })
    const list = data.members
      .filter((m) => seen.has(m.id))
      .map((m) => ({ value: m.id, label: m.name, hint: m.email }))
    list.push({ value: '__walkin__', label: 'Walk-in customers', hint: undefined })
    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [data.transactions, data.members])

  const locationOptions = useMemo(
    () =>
      data.locations.map((l) => ({
        value: l.id,
        label: l.name,
        hint: l.code,
      })),
    [data.locations],
  )

  const methodOptions = useMemo(
    () =>
      METHODS.map((m) => ({
        value: m,
        label: paymentMethodLabel(m),
        hint: undefined as string | undefined,
      })),
    [],
  )

  const statusOptions = useMemo(
    () => STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      hint: undefined as string | undefined,
    })),
    [],
  )

  const filterCount = activeFilterCount(filters)
  const hasFilters = filterCount > 0

  function clearAll() {
    setFilters(EMPTY_FILTER_STATE)
    playCue('tap')
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="All sales across terminals and channels — with full line-item, payment, and refund history."
        actions={
          <>
            <button
              type="button"
              onClick={() => downloadCsv(filtered, data.members, data.cards, data.locations)}
              className="btn-secondary"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <Link to="/app/pos" className="btn-primary">
              <ShoppingBag className="h-4 w-4" /> New order
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Orders (filtered)"
          value={String(summary.total)}
          sub={
            hasFilters
              ? `${filterCount} filter${filterCount === 1 ? '' : 's'} applied`
              : 'No filters applied'
          }
          icon={Receipt}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Today"
          value={String(summary.todayCount)}
          sub={formatCurrency(summary.todayRevenue)}
          icon={Calendar}
          tone="indigo"
          variant="top"
        />
        <StatCard
          label="Completed"
          value={String(summary.completed)}
          sub="Settled sales"
          icon={ShoppingBag}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Refunded"
          value={String(summary.refunded)}
          sub={
            summary.refunded > 0
              ? `${formatCurrency(
                  filtered
                    .filter((t) =>
                      ['refunded', 'partially_refunded'].includes(t.status),
                    )
                    .reduce((s, t) => s + Math.abs(t.total), 0),
                )} reversed`
              : 'All clear'
          }
          icon={RotateCcw}
          tone={summary.refunded > 0 ? 'rose' : 'neutral'}
          variant="top"
        />
      </div>

      {/* Filter bar */}
      <div className="card mb-4 p-4 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchInput
            value={filters.search}
            onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="Search order ID, operator, card, or item…"
          />
          <FilterDateRange
            from={filters.dateFrom}
            to={filters.dateTo}
            onChange={(next) =>
              setFilters((f) => ({ ...f, dateFrom: next.from, dateTo: next.to }))
            }
          />
          <FilterSelect
            label="Status"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={statusOptions}
            selected={filters.statuses}
            onChange={(v) => setFilters((f) => ({ ...f, statuses: v }))}
          />
          <FilterSelect
            label="Payment method"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            options={methodOptions}
            selected={filters.methods}
            onChange={(v) => setFilters((f) => ({ ...f, methods: v }))}
          />
          <FilterSelect
            label="Customer"
            icon={<UserIcon className="h-3.5 w-3.5" />}
            options={memberOptions}
            selected={filters.memberIds}
            onChange={(v) => setFilters((f) => ({ ...f, memberIds: v }))}
          />
          <FilterSelect
            label="Location"
            icon={<MapPin className="h-3.5 w-3.5" />}
            options={locationOptions}
            selected={filters.locationIds}
            onChange={(v) => setFilters((f) => ({ ...f, locationIds: v }))}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              <X className="h-3 w-3" /> Clear ({filterCount})
            </button>
          )}
        </div>
      </div>

      <OrdersTable
        transactions={filtered}
        members={data.members}
        cards={data.cards}
        locations={data.locations}
        onSelect={(t) => {
          setSelectedTxn(t)
          playCue('tap')
        }}
        page={page.page}
        pageSize={page.pageSize}
        onPageChange={setPage}
      />

      {selectedTxn && (
        <OrderDetailsDrawer
          txn={selectedTxn}
          members={drawerMembers}
          cards={drawerCards}
          locations={drawerLocations}
          onClose={() => setSelectedTxn(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  )
}

// ---- Table ---------------------------------------------------------------

function OrdersTable({
  transactions,
  members,
  cards,
  locations,
  onSelect,
  page,
  pageSize,
  onPageChange,
}: {
  transactions: Transaction[]
  members: Member[]
  cards: MembershipCard[]
  locations: Location[]
  onSelect: (t: Transaction) => void
  page: number
  pageSize: number
  onPageChange: (next: { page: number; pageSize: number }) => void
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-7 w-7" />}
        title="No orders match your filters"
        description="Try clearing the search or expanding the date range."
      />
    )
  }
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const visible = transactions.slice(start, start + pageSize)
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[150px]" />
            <col />
            <col className="w-[170px]" />
            <col className="w-[140px]" />
            <col className="w-[68px]" />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
            <col className="w-[110px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/40 text-left text-[10px] font-bold uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-center">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {visible.map((t) => {
              const member = members.find((m) => m.id === t.memberId) ?? null
              const card = cards.find((c) => c.id === t.cardId) ?? null
              const location = locations.find((l) => l.id === t.locationId) ?? null
              const count = orderItemsCount(t)
              return (
                <tr
                  key={t.id}
                  className="cursor-pointer transition-colors hover:bg-ink-50/70"
                  onClick={() => onSelect(t)}
                >
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-mono text-[13px] font-bold leading-tight text-ink-900">
                      {t.id}
                    </div>
                    {t.reference && (
                      <div className="mt-0.5 truncate text-[10px] text-ink-500">
                        Ref · {t.reference}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {member ? (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                          {member.name}
                        </div>
                        {member.email && (
                          <div className="truncate text-[11px] text-ink-500">
                            {member.email}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                        <UserIcon className="h-3 w-3" /> Walk-in
                      </span>
                    )}
                    {card && (
                      <div className="mt-0.5 truncate font-mono text-[10px] text-ink-500">
                        {card.cardNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                      {operatorName(t.operatorEmail)}
                    </div>
                    <div className="truncate text-[11px] text-ink-500">
                      {t.operatorEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {location ? (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                          {location.name}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">
                          <span className="font-mono">{location.code}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                        <MapPin className="h-3 w-3" /> Unknown
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top text-center">
                    <Tooltip
                      content={
                        t.items.length === 0 ? (
                          <span className="text-ink-500">No items</span>
                        ) : (
                          <ul className="space-y-0.5 text-left">
                            {t.items.map((it, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-700">
                                  {it.qty}
                                </span>
                                <span className="truncate">{it.name}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }
                      className="!whitespace-normal !max-w-[260px]"
                    >
                      <span className="inline-flex h-7 min-w-[28px] cursor-default items-center justify-center rounded-full bg-ink-100 px-2 text-xs font-bold text-ink-700 hover:bg-ink-200">
                        {count}
                      </span>
                    </Tooltip>
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right align-top font-extrabold tabular-nums ${
                      t.total < 0 ? 'text-rose-600' : 'text-ink-900'
                    }`}
                  >
                    {formatCurrency(t.total)}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${methodPillClass(
                        t.method as PaymentMethod,
                      )}`}
                    >
                      {methodIcon(t.method)}
                      {methodLabel(t.method)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
                        t.status as TransactionStatus,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel(t.status as TransactionStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    <div className="text-sm font-medium tabular-nums text-ink-800">
                      {formatDateShort(t.createdAt)}
                    </div>
                    <div className="text-[11px] tabular-nums text-ink-500">
                      {formatTime(t.createdAt)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={transactions.length}
        onChange={onPageChange}
      />
    </div>
  )
}

function methodIcon(m: string) {
  switch (m) {
    case 'cash':
      return <Banknote className="h-3 w-3" />
    case 'card':
      return <CreditCard className="h-3 w-3" />
    case 'bank':
      return <Wallet className="h-3 w-3" />
    case 'wallet':
      return <Wallet className="h-3 w-3" />
    case 'membership':
      return <CreditCard className="h-3 w-3" />
    default:
      return null
  }
}

// ---- CSV export ---------------------------------------------------------

function downloadCsv(
  rows: Transaction[],
  members: Member[],
  cards: MembershipCard[],
  locations: Location[],
) {
  const headers = [
    'Order ID',
    'Customer',
    'Operator',
    'Items',
    'Total',
    'Payment Method',
    'Status',
    'Location',
    'Date',
  ]
  const lines = [headers.join(',')]
  rows.forEach((t) => {
    const member = members.find((m) => m.id === t.memberId)
    const card = cards.find((c) => c.id === t.cardId)
    const location = locations.find((l) => l.id === t.locationId)
    const lines2 = [
      t.id,
      member?.name ?? 'Walk-in',
      operatorName(t.operatorEmail),
      String(orderItemsCount(t)),
      t.total.toFixed(2),
      methodLabel(t.method),
      statusLabel(t.status as TransactionStatus),
      location?.name ?? '—',
      new Date(t.createdAt).toISOString(),
    ]
    if (card) lines2.push(card.cardNumber)
    lines.push(lines2.map(csvCell).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(v: string): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}