import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  Filter,
  Layers,
  LineChart as LineChartIcon,
  ListOrdered,
  Package,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader, StatCard, type StatTone } from '../../components/Primitives'
import {
  getCardDeposits,
  getCards,
  getMembers,
} from '../../card-store'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getBusiness } from '../../store'
import type { PaymentMethod, Transaction } from '../../types'
import { playCue } from '../../audio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Preset = 'today' | 'week' | 'month' | 'year' | 'custom'

type ComparisonMode = 'previous' | 'none'

interface FilterState {
  preset: Preset
  /** inclusive start timestamp (ms) for the *current* period */
  start: number
  /** exclusive end timestamp (ms) for the *current* period */
  end: number
  /** label describing the current period (used in subtitles) */
  label: string
  location: string
  category: string
  method: 'all' | PaymentMethod
  operator: 'all' | string
  customStart?: string
  customEnd?: string
}

interface PeriodTotals {
  revenue: number
  netSales: number
  orders: number
  refunds: number
  refundCount: number
  membershipSales: number
  cashSales: number
  cardSales: number
  bankSales: number
  walletSales: number
  deposits: number
  activeUsers: number
  avgOrder: number
  byMethod: Record<PaymentMethod, number>
}

interface TimeBucket {
  label: string
  start: number
  end: number
  revenue: number
  orders: number
}

interface ProductAgg {
  productId: string
  name: string
  category: string
  qty: number
  revenue: number
}

interface UserAgg {
  memberId: string | null
  name: string
  orders: number
  spend: number
}

interface CardAgg {
  cardId: string
  cardNumber: string
  owner: string
  tier: string
  spend: number
  uses: number
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const METHOD_KEYS: PaymentMethod[] = ['cash', 'card', 'bank', 'wallet', 'membership']

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: '#84eb0a',
  card: '#3a82f6',
  bank: '#8b5cf6',
  wallet: '#f59e0b',
  membership: '#ec4899',
}

const METHOD_BG: Record<PaymentMethod, string> = {
  cash: 'bg-brand-500',
  card: 'bg-sky-500',
  bank: 'bg-indigo-500',
  wallet: 'bg-amber-500',
  membership: 'bg-rose-500',
}

const CATEGORY_PALETTE = [
  '#84eb0a',
  '#3a82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
  '#6366f1',
  '#10b981',
  '#a855f7',
]

const dayMs = 86400000

function currency(n: number) {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function startOfDay(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function endOfDay(t: number) {
  const d = new Date(t)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

function startOfWeek(t: number) {
  // Treat Monday as the first day of the week
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

function startOfMonth(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d.getTime()
}

function startOfYear(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setMonth(0, 1)
  return d.getTime()
}

function periodForPreset(preset: Preset, customStart?: string, customEnd?: string): {
  start: number
  end: number
  label: string
  customStart?: string
  customEnd?: string
} {
  const now = Date.now()
  if (preset === 'today') {
    const s = startOfDay(now)
    return { start: s, end: endOfDay(now) + 1, label: 'Today' }
  }
  if (preset === 'week') {
    const s = startOfWeek(now)
    return { start: s, end: now, label: 'This week' }
  }
  if (preset === 'month') {
    const s = startOfMonth(now)
    return { start: s, end: now, label: 'This month' }
  }
  if (preset === 'year') {
    const s = startOfYear(now)
    return { start: s, end: now, label: 'This year' }
  }
  // custom
  const cs = customStart ? startOfDay(new Date(customStart).getTime()) : startOfDay(now - 6 * dayMs)
  const ce = customEnd ? endOfDay(new Date(customEnd).getTime()) + 1 : endOfDay(now) + 1
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return {
    start: cs,
    end: ce,
    label: `${fmt(cs)} – ${fmt(ce - 1)}`,
    customStart,
    customEnd,
  }
}

function previousPeriod(start: number, end: number) {
  const length = end - start
  return { start: start - length, end: start }
}

function trendFor(current: number, previous: number): {
  direction: 'up' | 'down' | 'flat'
  label: string
  delta: number
} {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', label: '0%', delta: 0 }
    return { direction: 'up', label: 'new', delta: current }
  }
  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 0.05) return { direction: 'flat', label: '0%', delta: pct }
  const rounded = Math.round(pct * 10) / 10
  return {
    direction: pct > 0 ? 'up' : 'down',
    label: `${pct > 0 ? '+' : ''}${rounded.toFixed(1)}%`,
    delta: rounded,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const business = getBusiness()

  const [filter, setFilter] = useState<FilterState>(() => {
    const p = periodForPreset('week')
    return {
      preset: 'week',
      start: p.start,
      end: p.end,
      label: p.label,
      location: 'all',
      category: 'all',
      method: 'all',
      operator: 'all',
    }
  })

  const [comparison, setComparison] = useState<ComparisonMode>('previous')
  const [refreshTick, setRefreshTick] = useState(0)

  // Auto-refresh on focus so the page picks up new sales without manual reload
  useEffect(() => {
    function onFocus() {
      setRefreshTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Available option sources (from the same data set the dashboard reads).
  const options = useMemo(() => {
    const all = getTransactions()
    const products = import_pos_products()
    const operators = Array.from(
      new Set(
        all
          .map((t) => t.operatorEmail)
          .filter((e): e is string => !!e && e.length > 0),
      ),
    ).sort()
    const categories = Array.from(
      new Set(products.map((p) => p.category).filter((c): c is string => !!c)),
    ).sort()
    return { operators, categories, products }
    // tick used so we re-read the source on focus refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  function setPreset(preset: Preset) {
    const p = periodForPreset(preset, filter.customStart, filter.customEnd)
    setFilter((f) => ({
      ...f,
      preset,
      start: p.start,
      end: p.end,
      label: p.label,
      customStart: p.customStart,
      customEnd: p.customEnd,
    }))
    playCue('tap')
  }

  function setCustomRange(startStr: string, endStr: string) {
    if (!startStr || !endStr) return
    const p = periodForPreset('custom', startStr, endStr)
    setFilter((f) => ({
      ...f,
      preset: 'custom',
      start: p.start,
      end: p.end,
      label: p.label,
      customStart: startStr,
      customEnd: endStr,
    }))
    playCue('tap')
  }

  const data = useMemo(
    () => buildAnalytics(filter, options),
    // refreshTick forces a recompute on focus
    [filter, options, refreshTick],
  )

  const previousTotals = useMemo(() => {
    if (comparison === 'none') return null
    const prev = previousPeriod(filter.start, filter.end)
    return computeTotals(prev.start, prev.end, filter, options)
  }, [filter, options, comparison])

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Trends, comparisons, and forecasts across your business."
        actions={
          <>
            <LocationChip value={filter.location} onChange={(v) => setFilter((f) => ({ ...f, location: v }))} />
            <button
              onClick={() => setRefreshTick((t) => t + 1)}
              className="btn-secondary"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button className="btn-secondary">
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      <FilterBar
        filter={filter}
        onPreset={setPreset}
        onCustom={setCustomRange}
        onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))}
        categories={options.categories}
        operators={options.operators}
        comparison={comparison}
        onComparison={setComparison}
      />

      <KpiGrid current={data.totals} previous={previousTotals} />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueOrdersChart
            buckets={data.buckets}
            previousBuckets={previousTotals ? data.previousBuckets : undefined}
            periodLabel={filter.label}
            preset={filter.preset}
          />
        </div>
        <PaymentMethodDistribution totals={data.totals} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TopProducts products={data.topProducts} />
        <TopCategories categories={data.topCategories} />
        <MembershipCardUsage usage={data.cardUsage} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UserSpending users={data.topUsers} />
        <OperatorRanking operators={data.operatorRank} />
      </div>

      <div className="mt-4">
        <ComparisonSummary
          current={data.totals}
          previous={previousTotals}
          enabled={comparison !== 'none'}
        />
      </div>

      <div className="mt-4 text-center text-[11px] text-ink-400">
        Period: {filter.label} · {data.totals.orders} orders · {business?.name ?? 'Your business'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  filter,
  onPreset,
  onCustom,
  onChange,
  categories,
  operators,
  comparison,
  onComparison,
}: {
  filter: FilterState
  onPreset: (p: Preset) => void
  onCustom: (start: string, end: string) => void
  onChange: (patch: Partial<FilterState>) => void
  categories: string[]
  operators: string[]
  comparison: ComparisonMode
  onComparison: (m: ComparisonMode) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [localStart, setLocalStart] = useState(filter.customStart ?? '')
  const [localEnd, setLocalEnd] = useState(filter.customEnd ?? '')

  const presets: { value: Preset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="card mb-6 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex w-fit items-center rounded-pill border border-ink-200 bg-white p-0.5"
        >
          {presets.map((p) => (
            <button
              key={p.value}
              role="tab"
              aria-selected={filter.preset === p.value}
              onClick={() => {
                if (p.value === 'custom') {
                  setCustomOpen((o) => !o)
                } else {
                  onPreset(p.value)
                }
              }}
              className={
                filter.preset === p.value
                  ? 'inline-flex items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                  : 'inline-flex items-center rounded-pill px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SelectChip
            label="Category"
            value={filter.category}
            onChange={(v) => onChange({ category: v })}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <SelectChip
            label="Payment"
            value={filter.method}
            onChange={(v) => onChange({ method: v as FilterState['method'] })}
            options={[
              { value: 'all', label: 'All methods' },
              ...METHOD_KEYS.map((m) => ({ value: m, label: paymentMethodLabel(m) })),
            ]}
          />
          <SelectChip
            label="Operator"
            value={filter.operator}
            onChange={(v) => onChange({ operator: v })}
            options={[
              { value: 'all', label: 'All operators' },
              ...operators.map((o) => ({ value: o, label: o.split('@')[0] })),
            ]}
          />
          <div
            role="tablist"
            aria-label="Comparison"
            className="inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
          >
            {(
              [
                { v: 'previous', label: 'vs Previous' },
                { v: 'none', label: 'No compare' },
              ] as { v: ComparisonMode; label: string }[]
            ).map((o) => (
              <button
                key={o.v}
                role="tab"
                aria-selected={comparison === o.v}
                onClick={() => {
                  onComparison(o.v)
                  playCue('tap')
                }}
                className={
                  comparison === o.v
                    ? 'inline-flex items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                    : 'inline-flex items-center rounded-pill px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {customOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3">
          <div>
            <label className="label text-xs">From</label>
            <input
              type="date"
              className="input"
              value={localStart}
              max={localEnd || undefined}
              onChange={(e) => setLocalStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input
              type="date"
              className="input"
              value={localEnd}
              min={localStart || undefined}
              onChange={(e) => setLocalEnd(e.target.value)}
            />
          </div>
          <button
            disabled={!localStart || !localEnd}
            onClick={() => {
              onCustom(localStart, localEnd)
              setCustomOpen(false)
            }}
            className="btn-primary"
          >
            <Calendar className="h-4 w-4" /> Apply
          </button>
        </div>
      )}
    </div>
  )
}

function SelectChip({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-50"
      >
        <Filter className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-500">{label}:</span>
        <span>{current?.label ?? value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1.5 max-h-64 w-56 overflow-auto rounded-2xl border border-ink-200 bg-white py-1 shadow-pop">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  playCue('tap')
                }}
                className={
                  o.value === value
                    ? 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-ink-900 bg-brand-50'
                    : 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50'
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LocationChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const business = getBusiness()
  const [open, setOpen] = useState(false)
  // Single-tenant in this build; dropdown is in place for multi-location.
  const list = business ? [{ id: 'all', name: 'All locations' }, { id: business.id, name: business.name }] : []
  const current = list.find((b) => b.id === value) ?? list[0]
  if (list.length <= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700">
        <Store className="h-3.5 w-3.5 text-ink-500" />
        {current?.name ?? 'Main location'}
      </span>
    )
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-50"
      >
        <Store className="h-3.5 w-3.5 text-ink-500" />
        {current?.name ?? 'Select location'}
        <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          {list.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                onChange(b.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50"
            >
              <Store className="h-3.5 w-3.5 text-ink-500" />
              <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI grid
// ---------------------------------------------------------------------------

function KpiGrid({
  current,
  previous,
}: {
  current: PeriodTotals
  previous: PeriodTotals | null
}) {
  const kpis: Array<{
    label: string
    value: string
    sub?: string
    icon: typeof Banknote
    tone: StatTone
    trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  }> = [
    {
      label: 'Total revenue',
      value: currency(current.revenue),
      sub: 'Gross of all sales',
      icon: Banknote,
      tone: 'brand',
      trend: previous ? trendFor(current.revenue, previous.revenue) : undefined,
    },
    {
      label: 'Net sales',
      value: currency(current.netSales),
      sub: 'Revenue minus refunds',
      icon: TrendingUp,
      tone: 'emerald',
      trend: previous ? trendFor(current.netSales, previous.netSales) : undefined,
    },
    {
      label: 'Orders',
      value: String(current.orders),
      sub: `${currency(current.avgOrder)} avg order value`,
      icon: ShoppingBag,
      tone: 'indigo',
      trend: previous ? trendFor(current.orders, previous.orders) : undefined,
    },
    {
      label: 'Avg order value',
      value: currency(current.avgOrder),
      sub: 'Per completed order',
      icon: BarChart3,
      tone: 'sky',
      trend: previous ? trendFor(current.avgOrder, previous.avgOrder) : undefined,
    },
    {
      label: 'Membership card sales',
      value: currency(current.membershipSales),
      sub: `${current.byMethod.membership} txn`,
      icon: CreditCard,
      tone: 'rose',
      trend: previous ? trendFor(current.membershipSales, previous.membershipSales) : undefined,
    },
    {
      label: 'Cash sales',
      value: currency(current.cashSales),
      sub: `${current.byMethod.cash} txn`,
      icon: Banknote,
      tone: 'amber',
      trend: previous ? trendFor(current.cashSales, previous.cashSales) : undefined,
    },
    {
      label: 'Refunds',
      value: currency(current.refunds),
      sub: `${current.refundCount} refund txn`,
      icon: ArrowDownRight,
      tone: 'rose',
      trend: previous ? trendFor(current.refunds, previous.refunds) : undefined,
    },
    {
      label: 'Deposits',
      value: currency(current.deposits),
      sub: 'Top-ups + initial loads',
      icon: Wallet,
      tone: 'sky',
      trend: previous ? trendFor(current.deposits, previous.deposits) : undefined,
    },
    {
      label: 'Active users',
      value: String(current.activeUsers),
      sub: 'Distinct customers in period',
      icon: Users,
      tone: 'indigo',
      trend: previous ? trendFor(current.activeUsers, previous.activeUsers) : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
      {kpis.map((k) => (
        <StatCard
          key={k.label}
          label={k.label}
          value={k.value}
          sub={k.sub}
          icon={k.icon}
          tone={k.tone}
          variant="top"
          trend={k.trend}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Revenue & Orders chart
// ---------------------------------------------------------------------------

function RevenueOrdersChart({
  buckets,
  previousBuckets,
  periodLabel,
  preset,
}: {
  buckets: TimeBucket[]
  previousBuckets?: TimeBucket[]
  periodLabel: string
  preset: Preset
}) {
  const [mode, setMode] = useState<'revenue' | 'orders'>('revenue')
  const total = buckets.reduce((s, b) => s + (mode === 'revenue' ? b.revenue : b.orders), 0)

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">
            {mode === 'revenue' ? 'Revenue over time' : 'Orders over time'}
          </div>
          <div className="text-xs text-ink-500">
            {periodLabel} · {buckets.length} {bucketUnit(preset)} · {formatTotal(mode, total)} total
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Metric"
          className="inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
        >
          {(['revenue', 'orders'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                playCue('tap')
              }}
              className={
                mode === m
                  ? 'inline-flex items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                  : 'inline-flex items-center rounded-pill px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              {m === 'revenue' ? 'Revenue' : 'Orders'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <LineChart
          buckets={buckets}
          previousBuckets={previousBuckets}
          mode={mode}
          preset={preset}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
          Current period
        </span>
        {previousBuckets && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink-300" />
            Previous period
          </span>
        )}
      </div>
    </div>
  )
}

function bucketUnit(preset: Preset) {
  if (preset === 'today') return 'hours'
  if (preset === 'week') return 'days'
  if (preset === 'month') return 'days'
  if (preset === 'year') return 'months'
  return 'days'
}

function formatTotal(mode: 'revenue' | 'orders', value: number) {
  return mode === 'revenue' ? currency(value) : `${value} orders`
}

function LineChart({
  buckets,
  previousBuckets,
  mode,
  preset,
}: {
  buckets: TimeBucket[]
  previousBuckets?: TimeBucket[]
  mode: 'revenue' | 'orders'
  preset: Preset
}) {
  const width = 720
  const height = 220
  const padX = 24
  const padY = 16

  const data = buckets.map((b) => (mode === 'revenue' ? b.revenue : b.orders))
  const prevData = previousBuckets?.map((b) => (mode === 'revenue' ? b.revenue : b.orders)) ?? []

  const max = Math.max(1, ...data, ...prevData)
  const niceMax = niceCeil(max)

  const xFor = (i: number) =>
    padX + (buckets.length <= 1 ? width / 2 : (i * (width - padX * 2)) / (buckets.length - 1))
  const yFor = (v: number) => height - padY - (v / niceMax) * (height - padY * 2)

  const linePath = buildSmoothPath(data.map((v, i) => [xFor(i), yFor(v)] as [number, number]))
  const areaPath = linePath
    ? `${linePath} L ${xFor(data.length - 1)},${height - padY} L ${xFor(0)},${height - padY} Z`
    : ''
  const prevPath = prevData.length
    ? buildSmoothPath(prevData.map((v, i) => [xFor(i), yFor(v)] as [number, number]))
    : ''

  const showLabels = buckets.length <= 31
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8))

  // 4 horizontal grid lines
  const gridLines = Array.from({ length: 4 }, (_, i) => padY + ((height - padY * 2) * i) / 3)

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#84eb0a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#84eb0a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="#eceef0"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
        ))}
        {areaPath && <path d={areaPath} fill="url(#rev-area)" />}
        {prevPath && (
          <path d={prevPath} fill="none" stroke="#b1b7c0" strokeWidth="2" strokeDasharray="4 4" />
        )}
        {linePath && (
          <path d={linePath} fill="none" stroke="#84eb0a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {data.map((v, i) => {
          const cx = xFor(i)
          const cy = yFor(v)
          const showLabel = showLabels && i % labelStep === 0
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={i === data.length - 1 ? 4 : 2.5} fill="#84eb0a" />
              {showLabel && (
                <text
                  x={cx}
                  y={height - 2}
                  fontSize="10"
                  fill="#7e8694"
                  textAnchor="middle"
                >
                  {buckets[i].label}
                </text>
              )}
            </g>
          )
        })}
        {/* Y axis hints */}
        {[0, 0.5, 1].map((p) => (
          <text
            key={p}
            x={padX - 6}
            y={yFor(niceMax * p) + 3}
            fontSize="9"
            fill="#7e8694"
            textAnchor="end"
          >
            {mode === 'revenue'
              ? currency(niceMax * p).replace('.00', '')
              : Math.round(niceMax * p).toString()}
          </text>
        ))}
        {/* Hide unused preset param to keep the linter quiet */}
        {void preset}
      </svg>
    </div>
  )
}

function niceCeil(v: number) {
  if (v <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const norm = v / mag
  let nice = 1
  if (norm <= 1) nice = 1
  else if (norm <= 2) nice = 2
  else if (norm <= 5) nice = 5
  else nice = 10
  return nice * mag
}

// Catmull-Rom-ish smoothing → cubic bezier
function buildSmoothPath(pts: [number, number][]) {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return d
}

// ---------------------------------------------------------------------------
// Payment method distribution
// ---------------------------------------------------------------------------

function PaymentMethodDistribution({ totals }: { totals: PeriodTotals }) {
  const total = METHOD_KEYS.reduce((s, m) => s + totals.byMethod[m], 0)
  const entries = METHOD_KEYS.map((m) => ({
    method: m,
    label: paymentMethodLabel(m),
    value: totals.byMethod[m],
  })).filter((e) => e.value > 0)

  const cx = 90
  const cy = 90
  const r = 70

  // Donut slices
  let acc = 0
  const slices = entries.map((e) => {
    const start = acc / total
    acc += e.value
    const end = acc / total
    return { ...e, start, end }
  })

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Payment method distribution</div>
          <div className="text-xs text-ink-500">{total} transactions</div>
        </div>
        <PieChartIcon className="h-4 w-4 text-ink-400" />
      </div>

      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eceef0" strokeWidth="22" />
          ) : (
            slices.map((s) => (
              <path
                key={s.method}
                d={donutSlice(cx, cy, r, 22, s.start, s.end)}
                fill={METHOD_COLORS[s.method]}
              />
            ))
          )}
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#13171c">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#7e8694">
            transactions
          </text>
        </svg>

        <ul className="w-full space-y-1.5">
          {entries.length === 0 && (
            <li className="text-xs text-ink-500">No transactions in this period.</li>
          )}
          {entries.map((e) => {
            const pct = total > 0 ? (e.value / total) * 100 : 0
            return (
              <li key={e.method} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${METHOD_BG[e.method]}`} />
                <span className="flex-1 font-semibold text-ink-800">{e.label}</span>
                <span className="font-mono text-ink-600">{e.value}</span>
                <span className="w-10 text-right text-ink-500">{pct.toFixed(0)}%</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function donutSlice(
  cx: number,
  cy: number,
  r: number,
  thickness: number,
  startFrac: number,
  endFrac: number,
) {
  if (endFrac - startFrac >= 1) {
    // full ring → render outer + inner circles via even-odd
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 M ${cx - (r - thickness)} ${cy} a ${r - thickness} ${r - thickness} 0 1 1 ${(r - thickness) * 2} 0 a ${r - thickness} ${r - thickness} 0 1 1 ${-(r - thickness) * 2} 0`
  }
  const a0 = startFrac * Math.PI * 2 - Math.PI / 2
  const a1 = endFrac * Math.PI * 2 - Math.PI / 2
  const large = endFrac - startFrac > 0.5 ? 1 : 0
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const ri = r - thickness
  const xi0 = cx + ri * Math.cos(a0)
  const yi0 = cy + ri * Math.sin(a0)
  const xi1 = cx + ri * Math.cos(a1)
  const yi1 = cy + ri * Math.sin(a1)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi0} ${yi0} Z`
}

// ---------------------------------------------------------------------------
// Top products / categories
// ---------------------------------------------------------------------------

function TopProducts({ products }: { products: ProductAgg[] }) {
  const top = products.slice(0, 6)
  const max = Math.max(1, ...top.map((p) => p.revenue))
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Top products</div>
          <div className="text-xs text-ink-500">Best sellers in this period</div>
        </div>
        <ListOrdered className="h-4 w-4 text-ink-400" />
      </div>
      {top.length === 0 ? (
        <EmptyHint label="No product sales in this period." />
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map((p, i) => {
            const pct = (p.revenue / max) * 100
            return (
              <li key={p.productId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-ink-900 text-[10px] font-extrabold text-brand-400">
                      {i + 1}
                    </span>
                    <span className="truncate font-semibold text-ink-800">{p.name}</span>
                    <span className="rounded-pill bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                      {p.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <span className="font-mono text-[11px] text-ink-500">{p.qty}×</span>
                    <span className="font-extrabold">{currency(p.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TopCategories({ categories }: { categories: { name: string; revenue: number; qty: number }[] }) {
  const top = categories.slice(0, 6)
  const max = Math.max(1, ...top.map((c) => c.revenue))
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Top categories</div>
          <div className="text-xs text-ink-500">Revenue share by category</div>
        </div>
        <Layers className="h-4 w-4 text-ink-400" />
      </div>
      {top.length === 0 ? (
        <EmptyHint label="No category sales in this period." />
      ) : (
        <div className="mt-3 space-y-3">
          {top.map((c, i) => {
            const pct = (c.revenue / max) * 100
            const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]
            return (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: color }}
                    />
                    <span className="font-semibold text-ink-800">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-500">{c.qty} sold</span>
                    <span className="font-extrabold text-ink-900">{currency(c.revenue)}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Membership card usage
// ---------------------------------------------------------------------------

function MembershipCardUsage({ usage }: { usage: CardAgg[] }) {
  const top = usage.slice(0, 6)
  const max = Math.max(1, ...top.map((c) => c.spend))
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Membership card usage</div>
          <div className="text-xs text-ink-500">Top cards by spend in this period</div>
        </div>
        <CreditCard className="h-4 w-4 text-ink-400" />
      </div>
      {top.length === 0 ? (
        <EmptyHint label="No membership card usage in this period." />
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map((c, i) => {
            const pct = (c.spend / max) * 100
            return (
              <li key={c.cardId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-rose-100 text-[10px] font-extrabold text-rose-700">
                      {i + 1}
                    </span>
                    <span className="truncate font-semibold text-ink-800">{c.owner}</span>
                    <span className="rounded-pill bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                      {c.tier}
                    </span>
                    <span className="font-mono text-[10px] text-ink-500">•••• {c.cardNumber.slice(-4)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <span className="font-mono text-[11px] text-ink-500">{c.uses}×</span>
                    <span className="font-extrabold">{currency(c.spend)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// User spending / Operator ranking
// ---------------------------------------------------------------------------

function UserSpending({ users }: { users: UserAgg[] }) {
  const top = users.slice(0, 8)
  const max = Math.max(1, ...top.map((u) => u.spend))
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Top users by spending</div>
          <div className="text-xs text-ink-500">Highest spenders this period</div>
        </div>
        <Link
          to="/app/users"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
        >
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {top.length === 0 ? (
        <EmptyHint label="No user spending in this period." />
      ) : (
        <ol className="mt-3 space-y-2.5">
          {top.map((u, i) => {
            const pct = (u.spend / max) * 100
            const initials = u.name
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? '')
              .join('')
            return (
              <li key={u.memberId ?? i} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-[10px] font-extrabold text-brand-400">
                  {i + 1}
                </span>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-ink-900">
                  {initials || '·'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink-900">{u.name}</div>
                  <div className="h-1.5 mt-1 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink-900">{currency(u.spend)}</div>
                  <div className="text-[10px] text-ink-500">{u.orders} orders</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function OperatorRanking({ operators }: { operators: UserAgg[] }) {
  const top = operators.slice(0, 8)
  const max = Math.max(1, ...top.map((o) => o.spend))
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Operator performance</div>
          <div className="text-xs text-ink-500">Sales by cashier / terminal operator</div>
        </div>
        <Users className="h-4 w-4 text-ink-400" />
      </div>
      {top.length === 0 ? (
        <EmptyHint label="No operator activity in this period." />
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map((o, i) => {
            const pct = (o.spend / max) * 100
            const handle = o.name.includes('@') ? o.name.split('@')[0] : o.name
            return (
              <li key={o.memberId ?? o.name} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-[10px] font-extrabold text-brand-400">
                  {i + 1}
                </span>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-extrabold text-indigo-700">
                  {handle.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink-900">{handle}</div>
                  <div className="h-1.5 mt-1 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink-900">{currency(o.spend)}</div>
                  <div className="text-[10px] text-ink-500">{o.orders} orders</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comparison summary
// ---------------------------------------------------------------------------

function ComparisonSummary({
  current,
  previous,
  enabled,
}: {
  current: PeriodTotals
  previous: PeriodTotals | null
  enabled: boolean
}) {
  if (!enabled || !previous) {
    return (
      <div className="card flex items-center gap-3 p-5 text-sm text-ink-500">
        <LineChartIcon className="h-4 w-4 text-ink-400" />
        Period-over-period comparison is off. Toggle <em className="mx-1">vs Previous</em> to see growth indicators.
      </div>
    )
  }
  const rows: { label: string; cur: number; prev: number; fmt: (n: number) => string }[] = [
    { label: 'Revenue', cur: current.revenue, prev: previous.revenue, fmt: currency },
    { label: 'Net sales', cur: current.netSales, prev: previous.netSales, fmt: currency },
    { label: 'Orders', cur: current.orders, prev: previous.orders, fmt: (n) => String(n) },
    { label: 'Avg order value', cur: current.avgOrder, prev: previous.avgOrder, fmt: currency },
    { label: 'Refunds', cur: current.refunds, prev: previous.refunds, fmt: currency },
    { label: 'Membership sales', cur: current.membershipSales, prev: previous.membershipSales, fmt: currency },
    { label: 'Cash sales', cur: current.cashSales, prev: previous.cashSales, fmt: currency },
    { label: 'Deposits', cur: current.deposits, prev: previous.deposits, fmt: currency },
    { label: 'Active users', cur: current.activeUsers, prev: previous.activeUsers, fmt: (n) => String(n) },
  ]
  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b border-ink-100 p-5">
        <div>
          <div className="text-sm font-semibold text-ink-900">Period comparison</div>
          <div className="text-xs text-ink-500">Current period vs previous period of equal length</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Metric</th>
              <th className="px-5 py-3 font-semibold text-right">Current</th>
              <th className="px-5 py-3 font-semibold text-right">Previous</th>
              <th className="px-5 py-3 font-semibold text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r) => {
              const t = trendFor(r.cur, r.prev)
              const up = t.direction === 'up'
              const down = t.direction === 'down'
              return (
                <tr key={r.label} className="hover:bg-ink-50/60">
                  <td className="px-5 py-2.5 font-semibold text-ink-800">{r.label}</td>
                  <td className="px-5 py-2.5 text-right font-extrabold text-ink-900">
                    {r.fmt(r.cur)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-500">{r.fmt(r.prev)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span
                      className={
                        up
                          ? 'inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700'
                          : down
                          ? 'inline-flex items-center gap-0.5 rounded-pill bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700'
                          : 'inline-flex items-center gap-0.5 rounded-pill bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-700'
                      }
                    >
                      {up ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : down ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      {t.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Misc small components
// ---------------------------------------------------------------------------

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center">
      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft">
        <Package className="h-4 w-4" />
      </div>
      <div className="mt-2 text-sm font-bold text-ink-900">No data</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------

// Import pos products lazily to avoid pulling the whole module into this file's
// static analysis. We only need categories for grouping; the products are
// resolved by id from the catalog at runtime.
function import_pos_products(): { id: string; name: string; category: string }[] {
  // Pulled from pos-store (kept inline to avoid a hard dependency cycle).
  const map: Record<string, { name: string; category: string }> = {
    p1: { name: 'BBQ Pizza', category: 'Pizza' },
    p2: { name: 'Biryani', category: 'Biryani' },
    p3: { name: 'Pasta', category: 'Pasta' },
    p4: { name: 'Noodles', category: 'Pasta' },
    p5: { name: 'Pasta al Forno', category: 'Pasta' },
    p6: { name: 'Margherita Pizza', category: 'Pizza' },
    p7: { name: 'Burger', category: 'Burger' },
    p8: { name: 'Salad Bowl', category: 'Salad' },
    p9: { name: 'Iced Latte', category: 'Drinks' },
    p10: { name: 'Chocolate Cake', category: 'Dessert' },
    p11: { name: 'Fried Rice', category: 'Rice' },
    p12: { name: 'Cold Drink', category: 'Drinks' },
  }
  return Object.entries(map).map(([id, v]) => ({ id, ...v }))
}

interface BuildOptions {
  operators: string[]
  categories: string[]
  products: { id: string; name: string; category: string }[]
}

interface AnalyticsData {
  totals: PeriodTotals
  buckets: TimeBucket[]
  previousBuckets: TimeBucket[]
  topProducts: ProductAgg[]
  topCategories: { name: string; revenue: number; qty: number }[]
  topUsers: UserAgg[]
  operatorRank: UserAgg[]
  cardUsage: CardAgg[]
}

function buildAnalytics(filter: FilterState, options: BuildOptions): AnalyticsData {
  const totals = computeTotals(filter.start, filter.end, filter, options)
  const buckets = buildBuckets(filter, options)
  const previousBuckets = buildBuckets(
    {
      ...filter,
      start: filter.start - (filter.end - filter.start),
      end: filter.start,
    },
    options,
  )
  return {
    totals,
    buckets,
    previousBuckets,
    topProducts: totals._topProducts,
    topCategories: totals._topCategories,
    topUsers: totals._topUsers,
    operatorRank: totals._operatorRank,
    cardUsage: totals._cardUsage,
  }
}

function matchesFilter(
  t: Transaction,
  filter: FilterState,
  products: { id: string; category: string }[],
): boolean {
  const x = new Date(t.createdAt).getTime()
  if (x < filter.start || x >= filter.end) return false
  if (filter.method !== 'all' && t.method !== filter.method) return false
  if (filter.operator !== 'all' && t.operatorEmail !== filter.operator) return false
  if (filter.category !== 'all') {
    // Transactions store productId but not category on each line; resolve the
    // category from the catalog (same lookup used in computeTotals).
    const matches = t.items.some((i) => {
      const meta = products.find((p) => p.id === i.productId)
      return meta?.category === filter.category
    })
    if (!matches) return false
  }
  return true
}

function computeTotals(
  start: number,
  end: number,
  filter: FilterState,
  options: BuildOptions,
): PeriodTotals & {
  _topProducts: ProductAgg[]
  _topCategories: { name: string; revenue: number; qty: number }[]
  _topUsers: UserAgg[]
  _operatorRank: UserAgg[]
  _cardUsage: CardAgg[]
} {
  const all = getTransactions()
  const filtered = all.filter((t) => matchesFilter(t, filter, options.products))

  const completed = filtered.filter((t) => t.status === 'completed')
  const refunded = filtered.filter((t) => t.status === 'refunded')
  const refundCount = refunded.length

  const byMethod: Record<PaymentMethod, number> = {
    cash: 0,
    card: 0,
    bank: 0,
    wallet: 0,
    membership: 0,
  }

  let revenue = 0
  let refunds = 0
  let membershipSales = 0
  let cashSales = 0
  let cardSales = 0
  let bankSales = 0
  let walletSales = 0

  const productMap = new Map<string, ProductAgg>()
  const categoryMap = new Map<string, { name: string; revenue: number; qty: number }>()
  const userMap = new Map<string, UserAgg>()
  const operatorMap = new Map<string, UserAgg>()
  const cardMap = new Map<string, CardAgg>()

  // Active users in this window (any member with at least one completed txn)
  const activeUserIds = new Set<string>()

  for (const t of completed) {
    revenue += t.total
    byMethod[t.method] += 1
    if (t.method === 'membership') membershipSales += t.total
    if (t.method === 'cash') cashSales += t.total
    if (t.method === 'card') cardSales += t.total
    if (t.method === 'bank') bankSales += t.total
    if (t.method === 'wallet') walletSales += t.total

    if (t.memberId) activeUserIds.add(t.memberId)

    // Products
    for (const it of t.items) {
      const meta = options.products.find((p) => p.id === it.productId)
      const name = meta?.name ?? it.name
      const category = meta?.category ?? 'Other'
      const key = it.productId || name
      const existing = productMap.get(key) ?? {
        productId: key,
        name,
        category,
        qty: 0,
        revenue: 0,
      }
      existing.qty += it.qty
      existing.revenue += it.qty * it.price
      productMap.set(key, existing)

      const c = categoryMap.get(category) ?? { name: category, revenue: 0, qty: 0 }
      c.revenue += it.qty * it.price
      c.qty += it.qty
      categoryMap.set(category, c)
    }

    // Users
    const userKey = t.memberId ?? '__walkin__'
    const u = userMap.get(userKey) ?? {
      memberId: t.memberId ?? null,
      name: t.memberId
        ? getMembers().find((m) => m.id === t.memberId)?.name ?? 'Unknown'
        : 'Walk-in',
      orders: 0,
      spend: 0,
    }
    u.orders += 1
    u.spend += t.total
    userMap.set(userKey, u)

    // Operator
    if (t.operatorEmail) {
      const o = operatorMap.get(t.operatorEmail) ?? {
        memberId: t.operatorEmail,
        name: t.operatorEmail,
        orders: 0,
        spend: 0,
      }
      o.orders += 1
      o.spend += t.total
      operatorMap.set(t.operatorEmail, o)
    }

    // Card usage
    if (t.cardId) {
      const card = getCards().find((c) => c.id === t.cardId)
      const owner = card
        ? getMembers().find((m) => m.id === card.memberId)?.name ?? 'Unassigned'
        : 'Unassigned'
      const cKey = t.cardId
      const existing = cardMap.get(cKey) ?? {
        cardId: t.cardId,
        cardNumber: card?.cardNumber ?? '————',
        owner,
        tier: card?.tier ?? '—',
        spend: 0,
        uses: 0,
      }
      existing.spend += t.total
      existing.uses += 1
      cardMap.set(cKey, existing)
    }
  }

  for (const t of refunded) {
    refunds += Math.abs(t.total)
  }

  // Active users: union of members with completed txns + members active in window
  // (lastActiveAt). When there's no data, we still want a non-zero hint for the
  // empty-state card to show structure.
  const membersAll = getMembers()
  const memberWindow = membersAll.filter((m) => {
    const a = m.lastActiveAt ? new Date(m.lastActiveAt).getTime() : 0
    return a >= start && a < end
  })
  for (const m of memberWindow) activeUserIds.add(m.id)
  const activeUsers = activeUserIds.size

  // Deposits
  const cards = getCards()
  let deposits = 0
  for (const c of cards) {
    for (const d of getCardDeposits(c.id)) {
      const x = new Date(d.at).getTime()
      if (x >= start && x < end) deposits += d.amount
    }
  }

  const orders = completed.length
  const avgOrder = orders > 0 ? revenue / orders : 0
  const netSales = revenue - refunds

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
  const topCategories = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue)
  const topUsers = Array.from(userMap.values()).sort((a, b) => b.spend - a.spend)
  const operatorRank = Array.from(operatorMap.values()).sort((a, b) => b.spend - a.spend)
  const cardUsage = Array.from(cardMap.values()).sort((a, b) => b.spend - a.spend)

  return {
    revenue,
    netSales,
    orders,
    refunds,
    refundCount,
    membershipSales,
    cashSales,
    cardSales,
    bankSales,
    walletSales,
    deposits,
    activeUsers,
    avgOrder,
    byMethod,
    _topProducts: topProducts,
    _topCategories: topCategories,
    _topUsers: topUsers,
    _operatorRank: operatorRank,
    _cardUsage: cardUsage,
  }
}

function buildBuckets(filter: FilterState, options: BuildOptions): TimeBucket[] {
  const length = filter.end - filter.start
  if (length <= dayMs) {
    // today → 24 hourly buckets
    const startHour = startOfDay(filter.start)
    const buckets: TimeBucket[] = []
    for (let i = 0; i < 24; i++) {
      const s = startHour + i * 60 * 60 * 1000
      const e = s + 60 * 60 * 1000
      buckets.push({ label: `${i}:00`, start: s, end: e, revenue: 0, orders: 0 })
    }
    fillBuckets(buckets, filter, options)
    // If the period hasn't ended yet, drop future hours from the rendered chart
    return buckets.filter((b) => b.start <= Date.now())
  }
  if (length <= 8 * dayMs) {
    // up to 8 days → daily buckets
    const startDay = startOfDay(filter.start)
    const endDay = startOfDay(filter.end)
    const days = Math.max(1, Math.round((endDay - startDay) / dayMs))
    const buckets: TimeBucket[] = []
    for (let i = 0; i < days; i++) {
      const s = startDay + i * dayMs
      buckets.push({
        label: new Date(s).toLocaleDateString([], { weekday: 'short' }),
        start: s,
        end: s + dayMs,
        revenue: 0,
        orders: 0,
      })
    }
    fillBuckets(buckets, filter, options)
    return buckets
  }
  if (length <= 35 * dayMs) {
    // up to ~5 weeks → daily buckets
    return buildDailyBuckets(filter, options)
  }
  if (length <= 400 * dayMs) {
    // up to ~13 months → monthly buckets
    return buildMonthlyBuckets(filter, options)
  }
  return buildYearlyBuckets(filter, options)
}

function buildDailyBuckets(filter: FilterState, options: BuildOptions): TimeBucket[] {
  const startDay = startOfDay(filter.start)
  const endDay = startOfDay(filter.end)
  const days = Math.max(1, Math.round((endDay - startDay) / dayMs))
  const buckets: TimeBucket[] = []
  for (let i = 0; i < days; i++) {
    const s = startDay + i * dayMs
    buckets.push({
      label: new Date(s).toLocaleDateString([], { day: 'numeric', month: 'short' }),
      start: s,
      end: s + dayMs,
      revenue: 0,
      orders: 0,
    })
  }
  fillBuckets(buckets, filter, options)
  return buckets
}

function buildMonthlyBuckets(filter: FilterState, options: BuildOptions): TimeBucket[] {
  const start = new Date(filter.start)
  const end = new Date(filter.end)
  const buckets: TimeBucket[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor.getTime() < end.getTime()) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({
      label: cursor.toLocaleDateString([], { month: 'short' }),
      start: Math.max(cursor.getTime(), filter.start),
      end: Math.min(next.getTime(), filter.end),
      revenue: 0,
      orders: 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  fillBuckets(buckets, filter, options)
  return buckets
}

function buildYearlyBuckets(filter: FilterState, options: BuildOptions): TimeBucket[] {
  const start = new Date(filter.start)
  const end = new Date(filter.end)
  const buckets: TimeBucket[] = []
  const cursor = new Date(start.getFullYear(), 0, 1)
  while (cursor.getTime() < end.getTime()) {
    const next = new Date(cursor.getFullYear() + 1, 0, 1)
    buckets.push({
      label: String(cursor.getFullYear()),
      start: Math.max(cursor.getTime(), filter.start),
      end: Math.min(next.getTime(), filter.end),
      revenue: 0,
      orders: 0,
    })
    cursor.setFullYear(cursor.getFullYear() + 1)
  }
  fillBuckets(buckets, filter, options)
  return buckets
}

function fillBuckets(buckets: TimeBucket[], filter: FilterState, options: BuildOptions) {
  const txns = getTransactions().filter(
    (t) => matchesFilter(t, filter, options.products) && t.status === 'completed',
  )
  for (const t of txns) {
    const x = new Date(t.createdAt).getTime()
    for (const b of buckets) {
      if (x >= b.start && x < b.end) {
        b.revenue += t.total
        b.orders += 1
        break
      }
    }
  }
  void options
}
