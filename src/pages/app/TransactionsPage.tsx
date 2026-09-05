import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  Calendar,
  CreditCard,
  Download,
  Filter,
  MapPin,
  RotateCcw,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '../../components/Primitives'
import { ResponsiveTable, Field, FieldRow } from '../../components/ResponsiveTable'
import { TransactionDetailsDrawer } from '../../components/TransactionDetailsDrawer'
import {
  FilterBarSection,
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
  formatCurrencyPlain,
  formatDate,
  formatDateShort,
  formatTime,
  methodLabel,
  methodPillClass,
  operatorName,
  statusLabel,
  statusPillClass,
  type TransactionFilterState,
} from '../../order-utils'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getCards, getMembers } from '../../card-store'
import { getFinancialEvents, getLocations } from '../../orders-store'
import type {
  FinancialEvent,
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

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
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

  // Lookups for the detail drawer
  useEffect(() => {
    if (!selectedTxn) return
    setDrawerMembers(getMembers())
    setDrawerCards(getCards())
    setDrawerLocations(getLocations())
  }, [selectedTxn])

  // If `?focus=ID` is set (deep link from a child record), auto-open that
  // transaction in the drawer.
  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (!focusId) return
    const t = getTransactions().find((x) => x.id === focusId)
    if (t) setSelectedTxn(t)
    setSearchParams((p) => {
      const next = new URLSearchParams(p)
      next.delete('focus')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams])

  const filtered = useMemo(
    () => applyBaseFilters(data.transactions, filters),
    [data.transactions, filters],
  )

  const summary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    const completed = filtered.filter((t) => t.status === 'completed' && t.total >= 0)
    const todayIn = filtered.filter(
      (t) => new Date(t.createdAt).getTime() >= todayMs && t.total > 0 && t.status === 'completed',
    )
    const todayOut = filtered.filter(
      (t) =>
        new Date(t.createdAt).getTime() >= todayMs &&
        (t.total < 0 || t.status === 'refunded' || t.status === 'partially_refunded'),
    )
    return {
      total: filtered.length,
      todayCount: todayIn.length + todayOut.length,
      inflow: todayIn.reduce((s, t) => s + t.total, 0),
      outflow: todayOut.reduce((s, t) => s + Math.abs(t.total), 0),
      gross: completed.reduce((s, t) => s + t.total, 0),
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

  const cardOptions = useMemo(
    () =>
      data.cards.map((c) => ({
        value: c.id,
        label: c.cardNumber,
        hint: c.tier,
      })),
    [data.cards],
  )

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
    () => METHODS.map((m) => ({
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
        title="Transactions"
        subtitle="Every payment, refund, and top-up — with full audit-trail history."
        actions={
          <>
            <button
              type="button"
              onClick={() => downloadCsv(filtered, data.members, data.cards, data.locations)}
              className="btn-secondary"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button className="btn-secondary">
              <ArrowLeftRight className="h-4 w-4" /> Reconcile
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Transactions (filtered)"
          value={String(summary.total)}
          sub={
            hasFilters
              ? `${filterCount} filter${filterCount === 1 ? '' : 's'} applied`
              : 'No filters applied'
          }
          icon={ArrowLeftRight}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Inflow today"
          value={formatCurrencyPlain(summary.inflow)}
          sub={`${summary.todayCount - 0} settled`}
          icon={ArrowDownToLine}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Outflow today"
          value={formatCurrencyPlain(summary.outflow)}
          sub="Refunds & reversals"
          icon={RotateCcw}
          tone={summary.outflow > 0 ? 'rose' : 'neutral'}
          variant="top"
        />
        <StatCard
          label="Gross (filtered)"
          value={formatCurrencyPlain(summary.gross)}
          sub="Completed sales only"
          icon={Banknote}
          tone="indigo"
          variant="top"
        />
      </div>

      <FilterBarSection activeCount={filterCount} onClear={clearAll}>
        <FilterSearchInput
          value={filters.search}
          onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder="Search TX ID, reference, card, operator…"
        />
        <FilterDateRange
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(next) =>
            setFilters((f) => ({ ...f, dateFrom: next.from, dateTo: next.to }))
          }
        />
        <FilterSelect
          label="Type"
          icon={<Filter className="h-3.5 w-3.5" />}
          options={statusOptions}
          selected={filters.statuses}
          onChange={(v) => setFilters((f) => ({ ...f, statuses: v }))}
        />
        <FilterSelect
          label="Method"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          options={methodOptions}
          selected={filters.methods}
          onChange={(v) => setFilters((f) => ({ ...f, methods: v }))}
        />
        <FilterSelect
          label="User"
          icon={<UserIcon className="h-3.5 w-3.5" />}
          options={memberOptions}
          selected={filters.memberIds}
          onChange={(v) => setFilters((f) => ({ ...f, memberIds: v }))}
        />
        <FilterSelect
          label="Card"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          options={cardOptions}
          selected={filters.cardIds ?? []}
          onChange={(v) => setFilters((f) => ({ ...f, cardIds: v }))}
        />
        <FilterSelect
          label="Location"
          icon={<MapPin className="h-3.5 w-3.5" />}
          options={locationOptions}
          selected={filters.locationIds}
          onChange={(v) => setFilters((f) => ({ ...f, locationIds: v }))}
        />
      </FilterBarSection>

      <TransactionsTable
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
        <TransactionDetailsDrawer
          txn={selectedTxn}
          members={drawerMembers}
          cards={drawerCards}
          locations={drawerLocations}
          allTxns={data.transactions}
          onClose={() => setSelectedTxn(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  )
}

// ---- Table ---------------------------------------------------------------

function TransactionsTable({
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
        icon={<ArrowLeftRight className="h-7 w-7" />}
        title="No transactions match your filters"
        description="Try clearing the search or expanding the date range."
      />
    )
  }
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const visible = transactions.slice(start, start + pageSize)

  const columns = [
    { label: 'Transaction ID', className: 'w-[160px]' },
    { label: 'User' },
    { label: 'Card', className: 'w-[140px]' },
    { label: 'Type', className: 'w-[110px]' },
    { label: 'Amount', className: 'w-[110px] text-right' },
    { label: 'Before', className: 'w-[110px] text-right' },
    { label: 'After', className: 'w-[110px] text-right' },
    { label: 'Location', className: 'w-[140px]' },
    { label: 'Operator', className: 'w-[160px]' },
    { label: 'Date', className: 'w-[110px]' },
  ]

  const renderRow = (t: Transaction) => {
    const member = members.find((m) => m.id === t.memberId) ?? null
    const card = cards.find((c) => c.id === t.cardId) ?? null
    const location = locations.find((l) => l.id === t.locationId) ?? null
    const events = getFinancialEvents(t.id)
    const cardEvent = events.find(
      (e: FinancialEvent) =>
        typeof e.balanceBefore === 'number' &&
        typeof e.balanceAfter === 'number',
    )
    const txnType = txnTypeLabel(t)
    return (
      <>
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
        </td>
        <td className="px-4 py-3.5 align-top">
          {card ? (
            <div className="min-w-0">
              <div className="truncate font-mono text-[12px] font-semibold leading-tight text-ink-900">
                {card.cardNumber}
              </div>
              <div className="truncate text-[10px] text-ink-500">{card.tier}</div>
            </div>
          ) : (
            <span className="text-[11px] text-ink-500">—</span>
          )}
        </td>
        <td className="px-4 py-3.5 align-top">
          <Tooltip
            content={
              t.items.length === 0 ? (
                <span className="text-ink-500">Balance adjustment</span>
              ) : (
                <ul className="space-y-0.5 text-left">
                  {t.items.map((it, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-700">
                        {it.qty}
                      </span>
                      <span className="truncate">
                        {it.name}
                        {it.variantName && (
                          <span className="ml-1 text-[10px] font-semibold text-brand-700">
                            · {it.variantName}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
            className="!whitespace-normal !max-w-[260px]"
          >
            <span className="inline-flex h-7 min-w-[28px] cursor-default items-center justify-center gap-1 rounded-full bg-ink-100 px-2 text-xs font-bold text-ink-700 hover:bg-ink-200">
              {txnType.icon}
              {txnType.label}
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
        <td className="px-4 py-3.5 text-right align-top font-mono text-[12px] tabular-nums text-ink-700">
          {typeof cardEvent?.balanceBefore === 'number'
            ? formatCurrencyPlain(cardEvent.balanceBefore)
            : card
            ? formatCurrencyPlain(card.balance)
            : '—'}
        </td>
        <td className="px-4 py-3.5 text-right align-top font-mono text-[12px] tabular-nums text-ink-700">
          {typeof cardEvent?.balanceAfter === 'number'
            ? formatCurrencyPlain(cardEvent.balanceAfter)
            : '—'}
        </td>
        <td className="px-4 py-3.5 align-top">
          {location ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                {location.name}
              </div>
              <div className="truncate font-mono text-[10px] text-ink-500">
                {location.code}
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
              <MapPin className="h-3 w-3" /> —
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 align-top">
          <div className="truncate text-sm font-semibold leading-tight text-ink-900">
            {operatorName(t.operatorEmail)}
          </div>
          <div className="truncate text-[11px] text-ink-500">{t.operatorEmail}</div>
        </td>
        <td className="px-4 py-3.5 align-top whitespace-nowrap">
          <div className="text-sm font-medium tabular-nums text-ink-800">
            {formatDateShort(t.createdAt)}
          </div>
          <div className="text-[11px] tabular-nums text-ink-500">
            {formatTime(t.createdAt)}
          </div>
        </td>
      </>
    )
  }

  const renderCard = (t: Transaction) => {
    const member = members.find((m) => m.id === t.memberId) ?? null
    const card = cards.find((c) => c.id === t.cardId) ?? null
    const location = locations.find((l) => l.id === t.locationId) ?? null
    const events = getFinancialEvents(t.id)
    const cardEvent = events.find(
      (e: FinancialEvent) =>
        typeof e.balanceBefore === 'number' &&
        typeof e.balanceAfter === 'number',
    )
    const txnType = txnTypeLabel(t)
    return (
      <button
        type="button"
        onClick={() => onSelect(t)}
        className="-m-1 block w-full rounded-xl p-1 text-left transition-colors hover:bg-ink-50/60"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-bold leading-tight text-ink-900">
              {t.id}
            </div>
            {t.reference && (
              <div className="mt-0.5 truncate text-[10px] text-ink-500">
                Ref · {t.reference}
              </div>
            )}
          </div>
          <div
            className={`shrink-0 text-right font-extrabold tabular-nums ${
              t.total < 0 ? 'text-rose-600' : 'text-ink-900'
            }`}
          >
            {formatCurrency(t.total)}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ink-100 px-2 text-[11px] font-bold text-ink-700">
            {txnType.icon} {txnType.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
              t.status as TransactionStatus,
            )}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel(t.status as TransactionStatus)}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${methodPillClass(
              t.method as PaymentMethod,
            )}`}
          >
            {methodIcon(t.method)}
            {methodLabel(t.method)}
          </span>
        </div>

        <FieldRow className="mt-3">
          <Field label="User">
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
          </Field>
          {card && (
            <Field label="Card">
              <span className="font-mono text-xs">{card.cardNumber}</span>
            </Field>
          )}
          <Field label="Location">{location ? location.name : '—'}</Field>
          <Field label="Operator">{operatorName(t.operatorEmail)}</Field>
          <Field label="Balance change">
            <span className="font-mono text-xs tabular-nums">
              {typeof cardEvent?.balanceBefore === 'number'
                ? formatCurrencyPlain(cardEvent.balanceBefore)
                : '—'}{' '}
              →{' '}
              {typeof cardEvent?.balanceAfter === 'number'
                ? formatCurrencyPlain(cardEvent.balanceAfter)
                : '—'}
            </span>
          </Field>
          <Field label="Date">
            <span className="text-xs">
              {formatDateShort(t.createdAt)} · {formatTime(t.createdAt)}
            </span>
          </Field>
        </FieldRow>
      </button>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <ResponsiveTable
        columns={columns}
        rows={visible}
        rowKey={(t) => t.id}
        renderRow={renderRow}
        renderCard={renderCard}
        tableClassName="w-full text-sm"
        onRowClick={(t) => onSelect(t)}
        empty={
          <EmptyState
            icon={<ArrowLeftRight className="h-7 w-7" />}
            title="No transactions match your filters"
            description="Try clearing the search or expanding the date range."
          />
        }
      />
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

function txnTypeLabel(t: Transaction): { label: string; icon: JSX.Element } {
  if (t.total < 0) return { label: 'Refund', icon: <RotateCcw className="h-3 w-3 text-rose-600" /> }
  if (t.status === 'pending') return { label: 'Pending', icon: <Calendar className="h-3 w-3 text-amber-600" /> }
  if (t.status === 'failed') return { label: 'Failed', icon: <X className="h-3 w-3 text-rose-600" /> }
  if (t.status === 'adjusted') return { label: 'Adjusted', icon: <Calendar className="h-3 w-3 text-indigo-600" /> }
  if (t.method === 'membership') return { label: 'Card charge', icon: <CreditCard className="h-3 w-3 text-amber-600" /> }
  return { label: 'Sale', icon: <ArrowLeftRight className="h-3 w-3 text-emerald-600" /> }
}

// ---- CSV export ---------------------------------------------------------

function downloadCsv(
  rows: Transaction[],
  members: Member[],
  cards: MembershipCard[],
  locations: Location[],
) {
  const headers = [
    'Transaction ID',
    'User',
    'Card',
    'Type',
    'Amount',
    'Balance Before',
    'Balance After',
    'Payment Method',
    'Operator',
    'Location',
    'Status',
    'Date',
  ]
  const lines = [headers.join(',')]
  rows.forEach((t) => {
    const member = members.find((m) => m.id === t.memberId)
    const card = cards.find((c) => c.id === t.cardId)
    const location = locations.find((l) => l.id === t.locationId)
    const events = getFinancialEvents(t.id)
    const cardEvent = events.find(
      (e) => typeof e.balanceBefore === 'number' && typeof e.balanceAfter === 'number',
    )
    const row = [
      t.id,
      member?.name ?? 'Walk-in',
      card?.cardNumber ?? '—',
      txnTypeLabel(t).label,
      t.total.toFixed(2),
      typeof cardEvent?.balanceBefore === 'number'
        ? cardEvent.balanceBefore.toFixed(2)
        : '—',
      typeof cardEvent?.balanceAfter === 'number'
        ? cardEvent.balanceAfter.toFixed(2)
        : '—',
      methodLabel(t.method),
      operatorName(t.operatorEmail),
      location?.name ?? '—',
      statusLabel(t.status as TransactionStatus),
      new Date(t.createdAt).toISOString(),
    ]
    lines.push(row.map(csvCell).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(v: string): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}