import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Filter,
  MapPin,
  MonitorPlay,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader, StatCard, ActionTile, type StatTone } from '../../components/Primitives'
import {
  getCards,
  getCardDeposits,
  getDepositRequests,
  getMember,
  getMembers,
  memberStatusLabel,
} from '../../card-store'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getLocations } from '../../orders-store'
import { getActiveLocationIdSync } from '../../active-location'
import { getAuth, getBusiness } from '../../store'
import type {
  CardDeposit,
  DepositRequest,
  MembershipCard,
  Transaction,
} from '../../types'
import { playCue } from '../../audio'

type ChartRange = 'day' | 'week' | 'month' | 'year'

const QUICK_ACTIONS: {
  label: string
  to: string
  icon: typeof MonitorPlay
  primary?: boolean
}[] = [
  { label: 'Create order', to: '/app/pos', icon: MonitorPlay, primary: true },
  { label: 'Add product', to: '/app/products', icon: Package },
  { label: 'Add user', to: '/app/users', icon: UserPlus },
  { label: 'Issue card', to: '/app/cards', icon: CreditCard },
  { label: 'Review deposits', to: '/app/deposit-requests', icon: Sparkles },
]

function currency(n: number) {
  return `$${n.toFixed(2)}`
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayLabel(t: number) {
  return new Date(t).toLocaleDateString([], { weekday: 'short' })
}
function monthLabel(t: number) {
  return new Date(t).toLocaleDateString([], { month: 'short' })
}

export default function DashboardPage() {
  const business = getBusiness()
  const auth = getAuth()
  const firstName =
    auth?.email?.split('@')[0]?.split(/[._-]/)[0]?.replace(/^./, (c) => c.toUpperCase()) ?? 'there'

  // Refresh on focus so the dashboard reflects new sales without manual reload
  const [tick, setTick] = useState(0)
  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    const allTxns = getTransactions()
    const completed = allTxns.filter((t) => t.status === 'completed' || t.status === 'refunded')
    const completedOnly = allTxns.filter((t) => t.status === 'completed')
    const startToday = startOfToday()
    const dayMs = 86400000
    const startYesterday = startToday - dayMs
    const startWeek = Date.now() - 7 * dayMs
    const startLastWeek = startWeek - 7 * dayMs

    const todaySales = completed
      .filter((t) => new Date(t.createdAt).getTime() >= startToday)
      .reduce((s, t) => s + t.total, 0)
    const yesterdaySales = completed
      .filter((t) => {
        const x = new Date(t.createdAt).getTime()
        return x >= startYesterday && x < startToday
      })
      .reduce((s, t) => s + t.total, 0)
    const totalOrders = completedOnly.length
    const weekSales = completed
      .filter((t) => new Date(t.createdAt).getTime() >= startWeek)
      .reduce((s, t) => s + t.total, 0)
    const prevWeekSales = completed
      .filter((t) => {
        const x = new Date(t.createdAt).getTime()
        return x >= startLastWeek && x < startWeek
      })
      .reduce((s, t) => s + t.total, 0)
    const revenue = completedOnly.reduce((s, t) => s + t.total, 0)

    const members = getMembers()
    const cards = getCards()
    const requests = getDepositRequests()

    const activeUsers = members.filter((m) => m.status === 'active').length
    const activeCards = cards.filter((c) => c.status === 'active').length
    const totalBalance = cards.reduce((s, c) => s + c.balance, 0)
    const pendingRequests = requests.filter((r) => r.status === 'pending')
    const newMembersThisWeek = members.filter(
      (m) => new Date(m.joinedAt).getTime() >= startWeek,
    ).length
    const newCardsThisWeek = cards.filter(
      (c) => new Date(c.issuedAt).getTime() >= startWeek,
    ).length
    const lowBalanceCards = [...cards]
      .filter((c) => c.status === 'active' && c.balance < 10)
      .sort((a, b) => a.balance - b.balance)
      .slice(0, 6)

    // Balance change over last 7 days (rough: membership sales - deposits last 7d)
    let membershipSales7d = 0
    let deposits7d = 0
    completed
      .filter((t) => t.method === 'membership' && new Date(t.createdAt).getTime() >= startWeek)
      .forEach((t) => {
        membershipSales7d += t.total
      })
    cards.forEach((c) => {
      getCardDeposits(c.id).forEach((d) => {
        if (new Date(d.at).getTime() >= startWeek) deposits7d += d.amount
      })
    })
    const balanceChange7d = deposits7d - membershipSales7d

    return {
      allTxns: completedOnly,
      allTxnsForChart: allTxns.filter((t) => t.status === 'completed'),
      members,
      cards,
      requests,
      todaySales,
      yesterdaySales,
      totalOrders,
      weekSales,
      prevWeekSales,
      revenue,
      activeUsers,
      activeCards,
      totalBalance,
      pendingRequests,
      newMembersThisWeek,
      newCardsThisWeek,
      lowBalanceCards,
      balanceChange7d,
    }
    // tick is intentionally included so this recomputes on focus refresh
  }, [tick])

  return (
    <div>
      <PageHeader
        title={`Good ${greeting()}, ${firstName}`}
        subtitle="Here's a quick look at how your business is doing today."
        actions={
          <>
            <BusinessSelector />
            <LocationContext />
            <button onClick={() => setTick((t) => t + 1)} className="btn-secondary">
              <Filter className="h-4 w-4" /> Today
            </button>
            <button className="btn-secondary">
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/app/pos" className="btn-primary">
              <MonitorPlay className="h-4 w-4" /> Open POS
            </Link>
          </>
        }
      />

      <KpiGrid data={data} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart
            transactions={data.allTxnsForChart}
            cards={data.cards}
          />
        </div>
        <QuickActions />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PendingDeposits requests={data.pendingRequests} cards={data.cards} />
        <div className="lg:col-span-2">
          <LowBalanceCards cards={data.lowBalanceCards} />
        </div>
      </div>

      <div className="mt-6">
        <LocationsBreakdown transactions={data.allTxns} />
      </div>

      <div className="mt-6">
        <RecentOrders transactions={data.allTxns.slice(0, 5)} />
      </div>

      <div className="mt-6">
        <RecentTransactionsTable transactions={data.allTxns} />
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

// ---- KPI grid -----------------------------------------------------------

interface KpiData {
  todaySales: number
  yesterdaySales: number
  totalOrders: number
  weekSales: number
  prevWeekSales: number
  revenue: number
  activeUsers: number
  activeCards: number
  totalBalance: number
  pendingRequests: DepositRequest[]
  newMembersThisWeek: number
  newCardsThisWeek: number
  lowBalanceCards: MembershipCard[]
  balanceChange7d: number
  members: ReturnType<typeof getMembers>
  cards: MembershipCard[]
}

function KpiGrid({ data }: { data: KpiData }) {
  const kpis: Array<{
    label: string
    value: string
    sub?: string
    icon: typeof Banknote
    tone: StatTone
    trend?: { direction: 'up' | 'down' | 'flat'; label: string }
    featured?: boolean
  }> = [
    {
      label: "Today's sales",
      value: currency(data.todaySales),
      sub:
        data.yesterdaySales > 0
          ? `vs ${currency(data.yesterdaySales)} yesterday`
          : 'No sales yesterday',
      icon: Banknote,
      tone: 'brand',
    },
    {
      label: 'Total orders',
      value: String(data.totalOrders),
      sub:
        data.weekSales > 0
          ? `${currency(data.weekSales)} this week`
          : 'Completed orders, all time',
      icon: ShoppingBag,
      tone: 'indigo',
    },
    {
      label: 'Active users',
      value: String(data.activeUsers),
      sub:
        data.newMembersThisWeek > 0
          ? `${data.newMembersThisWeek} new this week`
          : `${data.members?.length ?? 0} total`,
      icon: Users,
      tone: 'sky',
    },
    {
      label: 'Active cards',
      value: String(data.activeCards),
      sub:
        data.newCardsThisWeek > 0
          ? `${data.newCardsThisWeek} new this week`
          : `${data.cards?.length ?? 0} total`,
      icon: CreditCard,
      tone: 'amber',
    },
    {
      label: 'Card balance',
      value: currency(data.totalBalance),
      sub: `across ${data.cards?.length ?? 0} card${(data.cards?.length ?? 0) === 1 ? '' : 's'}`,
      icon: Wallet,
      tone: 'emerald',
      trend: balanceTrend(data.balanceChange7d),
    },
    {
      label: 'Deposits pending',
      value: String(data.pendingRequests.length),
      sub:
        data.pendingRequests.length > 0
          ? 'Awaiting review'
          : 'All caught up',
      icon: Sparkles,
      tone: data.pendingRequests.length > 0 ? 'rose' : 'neutral',
    },
    {
      label: 'Revenue',
      value: currency(data.revenue),
      sub:
        data.weekSales > 0
          ? `${currency(data.weekSales)} this week`
          : 'All time',
      icon: BarChart3,
      tone: 'ink',
      featured: true,
      trend: data.prevWeekSales > 0 ? revenueTrend(data.weekSales, data.prevWeekSales) : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
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
          featured={k.featured}
        />
      ))}
    </div>
  )
}

function balanceTrend(delta: number) {
  if (delta === 0) return { direction: 'flat' as const, label: 'no change' }
  const sign = delta > 0 ? '+' : '−'
  return {
    direction: delta > 0 ? ('up' as const) : ('down' as const),
    label: `${sign}${currency(Math.abs(delta))} · 7d`,
  }
}

function revenueTrend(week: number, prev: number) {
  if (prev === 0) return undefined
  const pct = ((week - prev) / prev) * 100
  if (pct === 0) return { direction: 'flat' as const, label: '0% wk' }
  return {
    direction: pct > 0 ? ('up' as const) : ('down' as const),
    label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% wk`,
  }
}

// ---- Business selector --------------------------------------------------

function BusinessSelector() {
  const business = getBusiness()
  const locations = getLocations()
  const activeId = getActiveLocationIdSync()
  const activeLocation = locations.find((l) => l.id === activeId) ?? locations[0]
  const [open, setOpen] = useState(false)
  const list = business ? [business] : []
  if (list.length <= 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700">
        <Store className="h-3.5 w-3.5 text-ink-500" />
        {business?.name ?? 'Main location'}
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
        {business?.name ?? 'Select location'}
        <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          {list.map((b) => (
            <button
              key={b.id}
              onClick={() => setOpen(false)}
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

function LocationContext() {
  const locations = getLocations()
  const activeId = getActiveLocationIdSync()
  const activeLocation = locations.find((l) => l.id === activeId)
  if (!activeLocation) return null
  return (
    <Link
      to="/app/locations"
      className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
      title="Active location · click to manage"
    >
      <MapPin className="h-3.5 w-3.5 text-ink-500" />
      <span className="truncate max-w-[160px]">{activeLocation.name}</span>
      <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-700">
        {activeLocation.code}
      </span>
    </Link>
  )
}

// ---- Sales chart --------------------------------------------------------

function SalesChart({
  transactions,
  cards,
}: {
  transactions: Transaction[]
  cards: MembershipCard[]
}) {
  const [range, setRange] = useState<ChartRange>('day')

  const data = useMemo(() => buildChartData(transactions, cards, range), [transactions, cards, range])
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  const periodLabel =
    range === 'day' ? 'Last 7 days' : range === 'week' ? 'Last 8 weeks' : range === 'month' ? 'Last 12 months' : 'Last 5 years'
  const cadence = range === 'day' ? 'Daily' : range === 'week' ? 'Weekly' : range === 'month' ? 'Monthly' : 'Yearly'

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Sales overview</div>
          <div className="text-xs text-ink-500">
            {cadence} breakdown · {periodLabel} · {currency(total)} total
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Sales range"
          className="inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
        >
          {(['day', 'week', 'month', 'year'] as ChartRange[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => {
                setRange(r)
                playCue('tap')
              }}
              className={
                range === r
                  ? 'inline-flex items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                  : 'inline-flex items-center rounded-pill px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              {r === 'day' ? 'Daily' : r === 'week' ? 'Weekly' : r === 'month' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0
          const isLatest = i === data.length - 1
          return (
            <div key={i} className="group flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full">
                <div
                  className={
                    isLatest
                      ? 'w-full rounded-t-lg bg-brand-500'
                      : 'w-full rounded-t-lg bg-brand-400/80 group-hover:bg-brand-500'
                  }
                  style={{ height: `${Math.max(2, pct * 1.6)}px` }}
                />
                <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white group-hover:block">
                  {currency(d.value)}
                </div>
              </div>
              <div className="text-[10px] text-ink-400">{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildChartData(
  txns: Transaction[],
  cards: MembershipCard[],
  range: ChartRange,
): { label: string; value: number }[] {
  const now = new Date()
  const dayMs = 86400000
  if (range === 'day') {
    const buckets: { label: string; start: number; end: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = startOfToday() - i * dayMs
      buckets.push({
        label: dayLabel(start),
        start,
        end: start + dayMs,
      })
    }
    return buckets.map((b) => ({
      label: b.label,
      value: txns
        .filter((t) => {
          const x = new Date(t.createdAt).getTime()
          return x >= b.start && x < b.end
        })
        .reduce((s, t) => s + t.total, 0),
    }))
  }
  if (range === 'week') {
    // 8 weekly buckets, oldest first
    const buckets: { label: string; start: number; end: number }[] = []
    const thisWeekStart = startOfToday() - 6 * dayMs
    for (let i = 7; i >= 0; i--) {
      const start = thisWeekStart - i * 7 * dayMs
      buckets.push({
        label: i === 0 ? 'This' : `-${i}w`,
        start,
        end: start + 7 * dayMs,
      })
    }
    return buckets.map((b) => ({
      label: b.label,
      value: txns
        .filter((t) => {
          const x = new Date(t.createdAt).getTime()
          return x >= b.start && x < b.end
        })
        .reduce((s, t) => s + t.total, 0),
    }))
  }
  if (range === 'month') {
    const buckets: { label: string; year: number; month: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ label: monthLabel(d.getTime()), year: d.getFullYear(), month: d.getMonth() })
    }
    return buckets.map((b) => ({
      label: b.label,
      value: txns
        .filter((t) => {
          const d = new Date(t.createdAt)
          return d.getFullYear() === b.year && d.getMonth() === b.month
        })
        .reduce((s, t) => s + t.total, 0),
    }))
  }
  // year
  const buckets: { label: string; year: number }[] = []
  for (let i = 4; i >= 0; i--) {
    buckets.push({ label: String(now.getFullYear() - i), year: now.getFullYear() - i })
  }
  return buckets.map((b) => ({
    label: b.label,
    value: txns
      .filter((t) => new Date(t.createdAt).getFullYear() === b.year)
      .reduce((s, t) => s + t.total, 0),
  }))
  // cards param kept so future chart overlays (e.g. membership top-ups) can be added
  void cards
}

// ---- Quick actions ------------------------------------------------------

function QuickActions() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-900">Quick actions</div>
        <span className="text-[11px] text-ink-500">One-tap shortcuts</span>
      </div>
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2.5">
        {QUICK_ACTIONS.map((a) => (
          <ActionTile
            key={a.to + a.label}
            icon={a.icon}
            label={a.label}
            to={a.to}
            onClick={() => playCue('tap')}
            primary={a.primary}
            tone={a.primary ? 'brand' : 'neutral'}
            variant="stacked"
            className="h-full py-4"
          />
        ))}
      </div>
    </div>
  )
}

// ---- Pending deposit requests -------------------------------------------

function PendingDeposits({
  requests,
  cards,
}: {
  requests: DepositRequest[]
  cards: MembershipCard[]
}) {
  const top = requests.slice(0, 5)
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Pending deposits</div>
          <div className="text-xs text-ink-500">
            {requests.length > 0
              ? `${requests.length} awaiting review`
              : 'All caught up'}
          </div>
        </div>
        <Link
          to="/app/deposit-requests"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
        >
          Review <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="mt-2 text-sm font-bold text-ink-900">No pending requests</div>
          <div className="mt-0.5 text-xs text-ink-500">
            Members' top-up requests will appear here for review.
          </div>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((r) => {
            const member = getMember(r.memberId)
            const card = cards.find((c) => c.id === r.cardId)
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-2.5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink-900">
                    {member?.name ?? 'Member'}
                  </div>
                  <div className="truncate text-[11px] text-ink-500">
                    {paymentMethodLabel(r.method)}
                    {card ? ` · ${card.cardNumber.slice(-4)}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink-900">
                    {currency(r.amount)}
                  </div>
                  <div className="text-[10px] text-ink-500">{formatTime(r.requestedAt)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---- Low balance cards --------------------------------------------------

function LowBalanceCards({ cards }: { cards: MembershipCard[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Low-balance cards</div>
          <div className="text-xs text-ink-500">
            {cards.length > 0
              ? `${cards.length} card${cards.length === 1 ? '' : 's'} under $10.00`
              : 'No cards below the $10 threshold'}
          </div>
        </div>
        <Link
          to="/app/cards"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
        >
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {cards.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-soft">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="mt-2 text-sm font-bold text-ink-900">All balances healthy</div>
          <div className="mt-0.5 text-xs text-ink-500">
            Active cards are above the $10.00 low-balance threshold.
          </div>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cards.map((c) => {
            const m = getMember(c.memberId)
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-2.5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink-900">
                    {m?.name ?? 'Unassigned'}
                  </div>
                  <div className="truncate font-mono text-[11px] text-ink-500">
                    •••• {c.cardNumber.slice(-4)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-rose-700">
                    {currency(c.balance)}
                  </div>
                  <Link
                    to={`/app/cards/${c.id}`}
                    className="text-[10px] font-semibold text-ink-600 hover:text-ink-900"
                  >
                    Top up
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---- Recent orders (compact) --------------------------------------------

function RecentOrders({ transactions }: { transactions: Transaction[] }) {
  const locations = getLocations()
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Recent orders</div>
          <div className="text-xs text-ink-500">
            The 5 most recent completed orders
          </div>
        </div>
        <Link
          to="/app/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
        >
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {transactions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-xs text-ink-500">
          No orders yet. Run a sale from the POS to see it here.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-ink-100">
          {transactions.map((t) => {
            const m = getMember(t.memberId)
            const loc = locations.find((l) => l.id === t.locationId)
            const first = t.items[0]?.name
            const more = t.items.length > 1 ? ` +${t.items.length - 1} more` : ''
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-ink-900">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-ink-900">
                      {first ? `${first}${more}` : `Order ${t.id}`}
                    </span>
                    <span className="shrink-0 rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700">
                      {paymentMethodLabel(t.method)}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {m?.name ?? 'Walk-in'} · {formatDateTime(t.createdAt)} ·{' '}
                    <span className="font-mono">{t.id}</span>
                    {loc && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3 text-ink-400" /> {loc.code}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm font-extrabold text-ink-900">
                  {currency(t.total)}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---- Locations breakdown -----------------------------------------------

function LocationsBreakdown({ transactions }: { transactions: Transaction[] }) {
  const locations = getLocations()
  const breakdown = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; location: typeof locations[number] | null }>()
    let unassigned = 0
    for (const t of transactions) {
      const lid = t.locationId ?? ''
      const loc = locations.find((l) => l.id === lid) ?? null
      if (!loc) {
        unassigned += t.total
        continue
      }
      const e = map.get(lid) ?? { orders: 0, revenue: 0, location: loc }
      e.orders += 1
      e.revenue += t.total
      map.set(lid, e)
    }
    const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
    return { rows, unassigned }
  }, [transactions, locations])

  const total = breakdown.rows.reduce((s, r) => s + r.revenue, 0)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Sales by location</div>
          <div className="text-xs text-ink-500">
            Revenue breakdown across all stores, kiosks &amp; counters
          </div>
        </div>
        <Link
          to="/app/locations"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
        >
          Manage locations <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {breakdown.rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-xs text-ink-500">
          No sales tagged to a location yet.
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {breakdown.rows.map((row) => {
            const pct = total > 0 ? (row.revenue / total) * 100 : 0
            return (
              <li key={row.location?.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-ink-500" />
                    <span className="truncate font-semibold text-ink-900">
                      {row.location?.name ?? 'Unknown'}
                    </span>
                    {row.location?.isPrimary && (
                      <span className="rounded-full bg-brand-500 px-1 py-0.5 text-[9px] font-bold text-ink-900">
                        Primary
                      </span>
                    )}
                    <span className="rounded-full border border-ink-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-700">
                      {row.location?.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <span className="font-mono text-[11px] text-ink-500">
                      {row.orders} ord
                    </span>
                    <span className="font-extrabold">{currency(row.revenue)}</span>
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

// ---- Recent transactions table ------------------------------------------

function RecentTransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const locations = getLocations()
  const top = transactions.slice(0, 10)
  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b border-ink-100 p-5">
        <div>
          <div className="text-sm font-semibold text-ink-900">Recent transactions</div>
          <div className="text-xs text-ink-500">Latest activity across all terminals</div>
        </div>
        <Link
          to="/app/transactions"
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-900"
        >
          View all <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-50 text-ink-500">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="mt-3 text-sm font-bold text-ink-900">No transactions yet</div>
          <div className="mt-1 text-xs text-ink-500">
            Run a sale from the POS to see it here in real time.
          </div>
          <Link to="/app/pos" className="btn-primary mx-auto mt-4 w-fit">
            <MonitorPlay className="h-4 w-4" /> Open POS
          </Link>
        </div>
      ) : (
        <div className="scroll-soft overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {top.map((t) => {
                const m = getMember(t.memberId)
                const loc = locations.find((l) => l.id === t.locationId)
                return (
                  <tr key={t.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3">
                      <Link
                        to={`/app/pos/receipt/${t.id}`}
                        className="font-mono text-xs font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {t.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-700">
                      {m ? (
                        <div>
                          <div className="font-semibold text-ink-900">{m.name}</div>
                          <div className="text-[11px] text-ink-500">
                            {memberStatusLabel(m.status)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-500">Walk-in</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-700">
                      {loc ? (
                        <div>
                          <div className="font-semibold text-ink-900">{loc.name}</div>
                          <div className="font-mono text-[10px] text-ink-500">{loc.code}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                          <MapPin className="h-3 w-3" /> —
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          t.method === 'membership'
                            ? 'pill border-brand-200 bg-brand-50 text-ink-900'
                            : 'pill'
                        }
                      >
                        {t.method === 'membership' && <CreditCard className="h-3 w-3" />}
                        {paymentMethodLabel(t.method)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-extrabold text-ink-900">
                      {currency(t.total)}
                    </td>
                    <td className="px-5 py-3 text-ink-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-ink-400" />
                        {formatDate(t.createdAt)}
                        <span className="text-ink-300">·</span>
                        {formatTime(t.createdAt)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
