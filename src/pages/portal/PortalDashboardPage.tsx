import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Hash,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Nfc,
  Paperclip,
  Phone,
  Receipt,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { PortalShell } from './PortalShell'
import {
  cancelDepositRequest,
  cardStatusLabel,
  cardTypeLabel,
  createDepositRequest,
  depositRequestStatusLabel,
  depositRequestStatusTone,
  getCardActivity,
  getCardDeposits,
  getCardTransactions,
  getCardsByMember,
  getDepositRequest,
  getDepositRequestsByMember,
  getMember,
  getMemberBySlug,
  getMemberTier,
  isCardUsable,
  maskCardNumber,
  memberStatusLabel,
  memberTypeLabel,
} from '../../card-store'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getBusiness } from '../../store'
import {
  getMemberNotifications,
  markAllMemberRead,
  useNotificationsTick,
} from '../../notifications-store'
import { StatCard, type StatTone } from '../../components/Primitives'
import {
  billingCategoryLabel,
  billingCategoryTone,
  billingFilterCount,
  billingPeriodLabel,
  buildBillingHistory,
  DEFAULT_BILLING_FILTERS,
  filterBillingEntries,
  type BillingCategory,
  type BillingEntry,
  type BillingFilters,
  type BillingPeriod,
} from '../../lib/billing-history'
import type {
  CardActivity,
  CardDeposit,
  DepositRequest,
  DepositRequestStatus,
  MembershipCard,
  Notification,
  Transaction,
} from '../../types'
import { playCue } from '../../audio'

function currency(n: number) {
  return `$${n.toFixed(2)}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatRelative(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(iso)
}

type Tab = 'overview' | 'transactions' | 'deposits' | 'billing' | 'account'

export default function PortalDashboardPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const business = getBusiness()
  const termMember = business?.terminology.member ?? 'member'

  const [member, setMember] = useState(getMemberBySlug(slug))
  const [tab, setTab] = useState<Tab>('overview')
  const notifTick = useNotificationsTick()
  const [topupOpen, setTopupOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setMember(getMemberBySlug(slug))
  }, [slug])

  const cards = useMemo(() => (member ? getCardsByMember(member.id) : []), [member])
  const primary = cards[0]
  const totalBalance = useMemo(() => cards.reduce((s, c) => s + c.balance, 0), [cards])
  const memberTier = useMemo(() => (member ? getMemberTier(member.id) : 'Bronze'), [member, cards])
  const memberNotifications = useMemo(
    () => (member ? getMemberNotifications(member.id) : []),
    [member, notifTick],
  )
  const unreadNotifs = useMemo(
    () => memberNotifications.filter((n) => !n.read).length,
    [memberNotifications],
  )

  // Auto-mark all member notifications as read once the portal is opened.
  // (They've "seen" the inbox on the dashboard.)
  useEffect(() => {
    if (member && unreadNotifs > 0) {
      // Defer a tick so we don't fight the initial read in the same render.
      const t = setTimeout(() => markAllMemberRead(member.id), 1500)
      return () => clearTimeout(t)
    }
    return
  }, [member?.id, unreadNotifs])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const deposits = useMemo(() => {
    if (!member) return [] as CardDeposit[]
    const all: CardDeposit[] = []
    cards.forEach((c) => all.push(...getCardDeposits(c.id)))
    return all.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [member, cards])

  const transactions = useMemo(() => {
    if (!member) return [] as Transaction[]
    const all: Transaction[] = []
    cards.forEach((c) => all.push(...getCardTransactions(c.id)))
    all.push(
      ...getTransactions()
        .filter((t) => t.memberId === member.id)
        .filter((t) => !t.cardId || !cards.find((c) => c.id === t.cardId)),
    )
    const dedup = new Map<string, Transaction>()
    all.forEach((t) => dedup.set(t.id, t))
    return Array.from(dedup.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [member, cards])

  const cardActivity = useMemo(() => {
    if (!member) return [] as CardActivity[]
    const all: CardActivity[] = []
    cards.forEach((c) => all.push(...getCardActivity(c.id)))
    return all.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [member, cards])

  const billingEntries = useMemo(() => {
    if (!member) return [] as BillingEntry[]
    return buildBillingHistory(cards, business)
  }, [member, cards])

  const myRequests = useMemo(() => {
    if (!member) return [] as DepositRequest[]
    return getDepositRequestsByMember(member.id)
  }, [member, deposits, topupOpen])

  const pendingRequest = useMemo(
    () => myRequests.find((r) => r.status === 'pending') ?? null,
    [myRequests],
  )

  const stats = useMemo(() => {
    const totalSpent = transactions
      .filter((t) => t.status === 'completed')
      .reduce((s, t) => s + t.total, 0)
    const totalTopUps = deposits.reduce((s, d) => s + d.amount, 0)
    const thisMonthSpent = transactions
      .filter((t) => {
        if (t.status !== 'completed') return false
        const d = new Date(t.createdAt)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, t) => s + t.total, 0)
    return { totalSpent, totalTopUps, thisMonthSpent, txnCount: transactions.length }
  }, [transactions, deposits])

  if (!member) {
    return (
      <PortalShell>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-bold text-ink-900">Account not found</h2>
          <p className="mt-1 text-xs text-ink-500">
            The link you used may be incorrect or your account may have been removed.
          </p>
          <button
            onClick={() => navigate('/u/identify')}
            className="btn-primary mt-4 w-full"
          >
            Try a different way
          </button>
        </div>
      </PortalShell>
    )
  }

  if (member.status === 'suspended') {
    return (
      <PortalShell>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-600">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-bold text-ink-900">Account suspended</h2>
          <p className="mt-1 text-xs text-ink-500">
            Please contact staff to reactivate your account.
          </p>
        </div>
      </PortalShell>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Billing' },
    { id: 'deposits', label: 'Top-ups' },
    { id: 'billing', label: 'Insights' },
    { id: 'account', label: 'Account' },
  ]

  return (
    <PortalShell title={member.name} showBack>
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-5 text-white shadow-pop">
        <div className="flex items-center gap-3">
          <Avatar member={member} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-white/60">
              {business?.name ?? 'EzSale'} · {memberTier} {termMember}
            </div>
            <div className="truncate text-base font-bold">{member.name}</div>
          </div>
          {cards.length > 0 && (
            <span className="rounded-pill bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {cards.length} card{cards.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-white/60">
            Current balance
          </div>
          <div className="mt-0.5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {currency(totalBalance)}
          </div>
          <div className="mt-1 text-xs text-white/70">
            Across {cards.length} card{cards.length === 1 ? '' : 's'} ·{' '}
            {memberStatusLabel(member.status)}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ActionTile
            Icon={Sparkles}
            label={pendingRequest ? `Pending · ${currency(pendingRequest.amount)}` : 'Request top-up'}
            onClick={() => {
              setTopupOpen(true)
              playCue('tap')
            }}
          />
          <ActionTile Icon={Nfc} label="My card" onClick={() => setTab('overview')} />
          <ActionTile
            Icon={ArrowUpRight}
            label="Spending"
            onClick={() => setTab('billing')}
          />
        </div>
        {pendingRequest && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-[11px] text-white backdrop-blur">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
            <div>
              <div className="font-bold text-white">
                Pending top-up request · {currency(pendingRequest.amount)}
              </div>
              <div className="text-white/70">
                Via {paymentMethodLabel(pendingRequest.method)} · submitted{' '}
                {formatRelative(pendingRequest.requestedAt)}. Balance will update once staff
                approve.
              </div>
            </div>
          </div>
        )}
      </section>

      <nav
        role="tablist"
        aria-label="Portal sections"
        className="mt-4 -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'inline-flex shrink-0 items-center justify-center rounded-pill bg-ink-900 px-4 py-2 text-xs font-bold text-white shadow-soft'
                : 'inline-flex shrink-0 items-center justify-center rounded-pill border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50'
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        {tab === 'overview' && (
          <OverviewTab
            member={member}
            cards={cards}
            primary={primary}
            transactions={transactions}
            deposits={deposits}
            stats={stats}
            memberTier={memberTier}
            memberNotifications={memberNotifications}
            unreadNotifs={unreadNotifs}
          />
        )}
        {tab === 'transactions' && <BillingHistoryTab entries={billingEntries} />}
        {tab === 'deposits' && (
          <DepositsTab
            deposits={deposits}
            requests={myRequests}
            cards={cards}
            onRequest={() => setTopupOpen(true)}
            onCancelRequest={(id) => {
              cancelDepositRequest(id)
              notify('Request cancelled.')
              playCue('info')
            }}
          />
        )}
        {tab === 'billing' && <BillingTab transactions={transactions} stats={stats} />}
        {tab === 'account' && (
          <AccountTab member={member} cards={cards} memberTier={memberTier} />
        )}
      </div>

      {topupOpen && (
        <TopupRequestDrawer
          member={member}
          cards={cards}
          existingPending={pendingRequest}
          onClose={() => setTopupOpen(false)}
          onSubmit={(input) => {
            const result = createDepositRequest({
              ...input,
              requestedBy: 'self',
            })
            if (result.error) {
              notify(result.error)
              playCue('warning')
              return
            }
            setTopupOpen(false)
            notify(
              `Top-up request for ${currency(input.amount)} (${paymentMethodLabel(input.method)}) sent. Status: pending.`,
            )
            playCue('success')
          }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-3">
          <div className="max-w-md rounded-pill bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
            {toast}
          </div>
        </div>
      )}
    </PortalShell>
  )

  function notify(msg: string) {
    setToast(msg)
  }
}

function Avatar({ member, size = 36 }: { member: { name: string; avatarColor?: string }; size?: number }) {
  const bg = member.avatarColor ?? '#3a414d'
  const initials = member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-white shadow-soft"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials || '?'}
    </div>
  )
}

function ActionTile({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof Sparkles
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function CardVisual({ card, gradient }: { card: MembershipCard; gradient: string }) {
  const Icon = card.type === 'gift' ? Wallet : card.type === 'corporate' ? Building2 : Nfc
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-pop`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <Icon className="h-3 w-3" /> {cardTypeLabel(card.type)}
        </span>
        <Nfc className="h-4 w-4 text-brand-400" />
      </div>
      <div className="mt-3 font-mono text-sm tracking-widest">{card.cardNumber}</div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
        <span>Exp {formatDate(card.expiresAt)}</span>
        <span>{card.nfcUid ?? '—'}</span>
      </div>
    </div>
  )
}

function OverviewTab({
  member,
  cards,
  primary,
  transactions,
  deposits,
  stats,
  memberTier,
  memberNotifications,
  unreadNotifs,
}: {
  member: ReturnType<typeof getMember>
  cards: MembershipCard[]
  primary: MembershipCard | undefined
  transactions: Transaction[]
  deposits: CardDeposit[]
  stats: { totalSpent: number; totalTopUps: number; thisMonthSpent: number; txnCount: number }
  memberTier: string
  memberNotifications: Notification[]
  unreadNotifs: number
}) {
  if (!member) return null
  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-ink-900">Membership card</div>
          {cards.length > 1 && (
            <span className="text-[11px] text-ink-500">+{cards.length - 1} more</span>
          )}
        </div>
        {primary ? (
          <CardVisual card={primary} gradient="from-ink-900 to-ink-700" />
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-center text-xs text-ink-500">
            No membership card linked yet. Ask staff to issue one.
          </div>
        )}
        {primary && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <StatCard variant="inline" label="Status" value={cardStatusLabel(primary.status)} />
            <StatCard variant="inline" label="Daily" value={currency(primary.dailyLimit)} />
            <StatCard variant="inline" label="Monthly" value={currency(primary.monthlyLimit)} />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-ink-100 bg-white p-3 text-[11px] text-ink-600 shadow-soft">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span>
            Your tier is{' '}
            <span className="rounded-pill bg-brand-50 px-2 py-0.5 font-bold text-brand-800">
              {memberTier}
            </span>
            . Tier benefits apply on every charge.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={ArrowUpRight}
          tone="rose"
          variant="top"
          label="Spent this month"
          value={currency(stats.thisMonthSpent)}
        />
        <StatCard
          icon={Sparkles}
          tone="emerald"
          variant="top"
          label="Top-ups"
          value={currency(stats.totalTopUps)}
        />
        <StatCard
          icon={ArrowUpRight}
          tone="indigo"
          variant="top"
          label="All-time spent"
          value={currency(stats.totalSpent)}
        />
        <StatCard
          icon={Receipt}
          tone="neutral"
          variant="top"
          label="Charges"
          value={String(stats.txnCount)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-ink-900">Recent activity</div>
          {memberNotifications.length > 0 && (
            <span className="text-[11px] text-ink-500">
              {unreadNotifs > 0 ? `${unreadNotifs} unread` : 'All caught up'}
            </span>
          )}
        </div>
        {memberNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-center text-xs text-ink-500">
            Nothing new. We'll let you know when something changes.
          </div>
        ) : (
          <ul className="space-y-2">
            {memberNotifications.slice(0, 4).map((n) => {
              const sev =
                n.severity === 'critical' || n.severity === 'warning'
                  ? 'rose'
                  : n.severity === 'success'
                  ? 'emerald'
                  : 'ink'
              return (
                <Row
                  key={n.id}
                  title={n.title}
                  subtitle={n.body}
                  meta={formatDateTime(n.createdAt)}
                  value={n.read ? '·' : 'New'}
                  valueTone={n.read ? 'text-ink-400' : 'text-brand-700'}
                  Icon={
                    n.category === 'transaction'
                      ? Receipt
                      : n.category === 'card_expiry'
                      ? CalendarClock
                      : n.category === 'low_balance'
                      ? Wallet
                      : n.category === 'deposit_status'
                      ? CheckCircle2
                      : n.category === 'card_status'
                      ? CreditCard
                      : Bell
                  }
                  severity={sev}
                />
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-ink-900">Recent charges</div>
        </div>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-center text-xs text-ink-500">
            No charges yet — your first purchase will appear here.
          </div>
        ) : (
          <ul className="space-y-2">
            {transactions.slice(0, 4).map((t) => (
              <Row
                key={t.id}
                title={`Order ${t.id}`}
                subtitle={t.items[0]?.name ?? `${t.items.length} items`}
                meta={formatDateTime(t.createdAt)}
                value={`−${currency(t.total)}`}
                valueTone="text-rose-700"
                Icon={ArrowUpRight}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-ink-900">Recent top-ups</div>
        {deposits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-center text-xs text-ink-500">
            No top-ups yet. Tap "Request top-up" to add funds.
          </div>
        ) : (
          <ul className="space-y-2">
            {deposits.slice(0, 3).map((d) => (
              <Row
                key={d.id}
                title={currency(d.amount)}
                subtitle={`${paymentMethodLabel(d.method as never)} · ${d.reference ?? d.note ?? 'Top-up'}`}
                meta={formatDateTime(d.at)}
                value="+"
                valueTone="text-emerald-700"
                Icon={ArrowDownToLine}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

const BILLING_CATEGORY_CHIPS: { id: BillingCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'refund', label: 'Refunds' },
  { id: 'adjustment', label: 'Adjustments' },
  { id: 'withdrawal', label: 'Withdrawals' },
]

const BILLING_PERIOD_CHIPS: { id: BillingPeriod; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'custom', label: 'Custom' },
]

function categoryIcon(c: BillingCategory) {
  switch (c) {
    case 'purchase':
      return ShoppingBag
    case 'deposit':
      return ArrowDownToLine
    case 'refund':
      return RotateCcw
    case 'adjustment':
      return SlidersHorizontal
    case 'withdrawal':
      return ArrowUpRight
  }
}

function BillingHistoryTab({ entries }: { entries: BillingEntry[] }) {
  const [filters, setFilters] = useState<BillingFilters>(DEFAULT_BILLING_FILTERS)
  const [selected, setSelected] = useState<BillingEntry | null>(null)

  const filtered = useMemo(() => filterBillingEntries(entries, filters), [entries, filters])
  const summary = useMemo(() => {
    let moneyIn = 0
    let moneyOut = 0
    filtered.forEach((e) => {
      if (e.amount >= 0) moneyIn += e.amount
      else moneyOut += Math.abs(e.amount)
    })
    return { moneyIn, moneyOut }
  }, [filtered])

  const activeFilterCount = billingFilterCount(filters)
  const hasAnyFilter = activeFilterCount > 0

  function setFilter(patch: Partial<BillingFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No billing history yet"
        description="Purchases, top-ups and refunds on your membership cards will appear here."
        Icon={Receipt}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Money in
          </div>
          <div className="text-sm font-extrabold text-emerald-800">
            +{currency(summary.moneyIn)}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Money out
          </div>
          <div className="text-sm font-bold text-rose-700">
            −{currency(summary.moneyOut)}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Records
          </div>
          <div className="text-sm font-bold text-ink-900">{filtered.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="rounded-pill bg-ink-900 px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasAnyFilter && (
            <button
              onClick={() => setFilters(DEFAULT_BILLING_FILTERS)}
              className="text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <nav className="mt-2 -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BILLING_PERIOD_CHIPS.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter({ period: p.id })}
              className={
                filters.period === p.id
                  ? 'inline-flex shrink-0 items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                  : 'inline-flex shrink-0 items-center rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              {p.label}
            </button>
          ))}
        </nav>

        {filters.period === 'custom' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                From
              </label>
              <input
                type="date"
                className="input py-1.5 text-xs"
                value={filters.from}
                onChange={(e) => setFilter({ from: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                To
              </label>
              <input
                type="date"
                className="input py-1.5 text-xs"
                value={filters.to}
                onChange={(e) => setFilter({ to: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="mt-2 -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BILLING_CATEGORY_CHIPS.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter({ category: c.id })}
              className={
                filters.category === c.id
                  ? 'inline-flex shrink-0 items-center rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white'
                  : 'inline-flex shrink-0 items-center rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">
              Min $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              className="input py-1.5 pl-11 text-xs"
              value={filters.min ?? ''}
              onChange={(e) =>
                setFilter({ min: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              placeholder="0"
              aria-label="Minimum amount"
            />
          </div>
          <span className="text-xs text-ink-400">–</span>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">
              Max $
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="input py-1.5 pl-11 text-xs"
              value={filters.max ?? ''}
              onChange={(e) =>
                setFilter({ max: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              placeholder="Any"
              aria-label="Maximum amount"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-8 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft">
            <Receipt className="h-4 w-4" />
          </div>
          <div className="mt-3 text-sm font-bold text-ink-900">No matching records</div>
          <div className="mt-1 text-xs text-ink-500">
            Try a different period, type or amount range.
          </div>
          <button
            onClick={() => setFilters(DEFAULT_BILLING_FILTERS)}
            className="btn-secondary mx-auto mt-4"
          >
            <X className="h-4 w-4" /> Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => {
            const Icon = categoryIcon(e.category)
            const tone = billingCategoryTone(e.category)
            const credit = e.amount >= 0
            return (
              <li key={`${e.kind}-${e.id}`}>
                <button
                  onClick={() => setSelected(e)}
                  className="w-full rounded-2xl border border-ink-100 bg-white p-3 text-left shadow-soft transition-colors hover:bg-ink-50/60"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone.bg} ${tone.text}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {e.title}
                        </div>
                        <div
                          className={`shrink-0 text-sm font-bold ${
                            credit ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {credit ? '+' : '−'}
                          {currency(Math.abs(e.amount))}
                        </div>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500">
                        <span>{formatDateTime(e.date)}</span>
                        <span>·</span>
                        <span>{paymentMethodLabel(e.method)}</span>
                        <span>·</span>
                        <span className="font-mono">{e.number}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] font-bold ${tone.bg} ${tone.text} ${tone.border}`}
                        >
                          {billingCategoryLabel(e.category)}
                        </span>
                        {e.status === 'refunded' && (
                          <span className="inline-flex items-center rounded-pill border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            Refunded
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                          Balance {currency(e.resultingBalance)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-ink-300" />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <BillingDetailDrawer entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function BillingDetailDrawer({ entry, onClose }: { entry: BillingEntry; onClose: () => void }) {
  const business = getBusiness()
  const t = entry.transaction
  const d = entry.deposit
  const tone = billingCategoryTone(entry.category)

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-[slideUp_0.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[10px] font-bold ${tone.bg} ${tone.text} ${tone.border}`}
            >
              {billingCategoryLabel(entry.category)}
            </span>
            <span
              className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                entry.status === 'refunded'
                  ? 'bg-sky-50 text-sky-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {entry.status === 'refunded' ? 'Refunded' : 'Completed'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Receipt */}
          <div className="mx-auto w-full max-w-[360px] rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="text-center">
              <div className="text-base font-extrabold uppercase tracking-wide text-ink-900">
                {business?.name ?? 'EzSale'}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-500">{entry.location}</div>
              {(business?.contactEmail || business?.contactPhone) && (
                <div className="text-[11px] text-ink-500">
                  {[business?.contactEmail, business?.contactPhone].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>

            <DashedRule />

            <div className="flex items-center justify-between text-[11px] text-ink-600">
              <span>{entry.kind === 'deposit' ? 'Deposit' : 'Receipt'}</span>
              <span className="font-mono">{entry.number}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
              <span>Date</span>
              <span>{formatDateTime(entry.date)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
              <span>Card</span>
              <span className="font-mono">{entry.cardNumber}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
              <span>Method</span>
              <span>{paymentMethodLabel(entry.method)}</span>
            </div>
            {t && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
                <span>Cashier</span>
                <span>{t.operatorEmail.split('@')[0]}</span>
              </div>
            )}
            {d?.by && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
                <span>Received by</span>
                <span>{d.by}</span>
              </div>
            )}

            <DashedRule />

            {t ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex text-[11px] font-bold uppercase tracking-wide text-ink-700">
                    <span className="flex-1">Item</span>
                    <span className="w-10 text-right">Qty</span>
                    <span className="w-16 text-right">Total</span>
                  </div>
                  {t.items.map((it, idx) => (
                    <div key={idx} className="text-[11px] text-ink-800">
                      <div className="truncate font-semibold">{it.name}</div>
                      <div className="mt-0.5 flex text-ink-500">
                        <span className="flex-1 truncate">{currency(it.price)} each</span>
                        <span className="w-10 text-right">×{it.qty}</span>
                        <span className="w-16 text-right font-semibold text-ink-900">
                          {currency(it.price * it.qty)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <DashedRule />

                <div className="space-y-1 text-[12px]">
                  <ReceiptRow label="Items" value={String(entry.itemCount)} />
                  <ReceiptRow label="Subtotal" value={currency(t.subtotal)} />
                  {t.discount > 0 && (
                    <ReceiptRow label="Discount" value={`-${currency(t.discount)}`} />
                  )}
                  <div className="pt-1">
                    <ReceiptRow
                      label={entry.category === 'refund' ? 'REFUNDED' : 'TOTAL'}
                      value={currency(t.total)}
                      bold
                    />
                  </div>
                  {t.method === 'cash' && typeof t.change === 'number' && (
                    <>
                      <ReceiptRow
                        label="Tendered"
                        value={currency(t.amountTendered ?? t.total)}
                      />
                      <ReceiptRow label="Change" value={currency(t.change)} bold />
                    </>
                  )}
                  {t.reference && <ReceiptRow label="Reference" value={t.reference} />}
                </div>
              </>
            ) : d ? (
              <div className="space-y-1 text-[12px]">
                <ReceiptRow label="Deposit" value={currency(d.amount)} bold />
                {d.reference && <ReceiptRow label="Reference" value={d.reference} />}
                {d.note && (
                  <div className="pt-1 text-[11px] text-ink-600">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      Note
                    </div>
                    <div className="mt-0.5">{d.note}</div>
                  </div>
                )}
              </div>
            ) : null}

            <DashedRule />

            <div className="rounded-xl bg-ink-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-600">
                  Balance after
                </span>
                <span className="font-mono text-sm font-extrabold text-ink-900">
                  {currency(entry.resultingBalance)}
                </span>
              </div>
              <div className="mt-0.5 text-right text-[10px] text-ink-500">
                Card {entry.cardNumber}
              </div>
            </div>

            <DashedRule />

            <div className="text-center text-[11px] text-ink-500">
              {business?.receiptHeader || 'Thanks for visiting!'}
            </div>
            <div className="text-center text-[10px] text-ink-400">
              {business?.receiptFooter || 'See you again soon!'}
            </div>
          </div>

          <div className="mx-auto mt-3 w-full max-w-[360px] rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-[11px] leading-relaxed text-ink-500">
            This is a read-only record of activity on your card. Balances can only be
            changed by staff — contact the store if anything looks wrong.
          </div>
        </div>

        <div className="border-t border-ink-100 p-3">
          <button onClick={onClose} className="btn-secondary w-full py-3">
            Close
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? 'text-[14px] font-extrabold uppercase tracking-wide text-ink-900' : 'text-ink-700'
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function DashedRule() {
  return (
    <div
      aria-hidden
      className="my-3 h-px w-full"
      style={{
        backgroundImage: 'linear-gradient(to right, currentColor 50%, transparent 50%)',
        backgroundSize: '6px 1px',
        backgroundRepeat: 'repeat-x',
        color: '#d5d8dd',
      }}
    />
  )
}

function DepositsTab({
  deposits,
  requests,
  cards,
  onRequest,
  onCancelRequest,
}: {
  deposits: CardDeposit[]
  requests: DepositRequest[]
  cards: MembershipCard[]
  onRequest: () => void
  onCancelRequest: (id: string) => void
}) {
  const pending = requests.filter((r) => r.status === 'pending')
  const historical = requests.filter((r) => r.status !== 'pending')

  return (
    <div>
      <button
        onClick={onRequest}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-white shadow-pop disabled:opacity-50"
        disabled={pending.length > 0}
      >
        <Sparkles className="h-4 w-4" /> Request a top-up
      </button>

      {pending.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Pending requests
          </div>
          {pending.map((r) => {
            const card = cards.find((c) => c.id === r.cardId)
            const tone = depositRequestStatusTone(r.status)
            return (
              <div
                key={r.id}
                className={`rounded-2xl border ${tone.border} ${tone.bg} p-3`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone.bg} ${tone.text}`}
                  >
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-bold text-ink-900">
                        +{currency(r.amount)}
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-pill border ${tone.border} bg-white px-2 py-0.5 text-[10px] font-bold ${tone.text}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {depositRequestStatusLabel(r.status)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-600">
                      <span>{paymentMethodLabel(r.method)}</span>
                      {card && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{maskCardNumber(card.cardNumber)}</span>
                        </>
                      )}
                      {r.reference && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.reference}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>submitted {formatRelative(r.requestedAt)}</span>
                    </div>
                    {r.note && (
                      <div className="mt-1.5 rounded-lg bg-white/60 p-2 text-[11px] text-ink-700">
                        {r.note}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onCancelRequest(r.id)}
                    className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    Cancel request
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {historical.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Request history
          </div>
          <ul className="space-y-2">
            {historical.map((r) => {
              const card = cards.find((c) => c.id === r.cardId)
              const display = displayStatus(r.status)
              const tone = display.tone
              const reviewedAt = r.reviewedAt ?? r.requestedAt
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone.bg} ${tone.text}`}>
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {currency(r.amount)}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] font-bold ${tone.bg} ${tone.text} ${tone.border}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {display.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500">
                        <span>{paymentMethodLabel(r.method)}</span>
                        {card && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{maskCardNumber(card.cardNumber)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDateTime(reviewedAt)}</span>
                      </div>
                      {r.rejectionReason && (
                        <div className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                          <b>Rejected:</b> {r.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {deposits.length === 0 ? (
        <EmptyState
          title="No top-ups yet"
          description="Use the button above to ask staff to add funds to your card."
          Icon={ArrowDownToLine}
        />
      ) : (
        <>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Credited top-ups
          </div>
          <ul className="space-y-2">
            {deposits.map((d) => {
              const card = cards.find((c) => c.id === d.cardId)
              return (
                <li
                  key={d.id}
                  className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          +{currency(d.amount)}
                        </div>
                        <div className="shrink-0 text-[11px] text-ink-500">
                          {formatDateTime(d.at)}
                        </div>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500">
                        <span>{paymentMethodLabel(d.method as never)}</span>
                        {card && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{maskCardNumber(card.cardNumber)}</span>
                          </>
                        )}
                        {d.reference && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{d.reference}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

function BillingTab({
  transactions,
  stats,
}: {
  transactions: Transaction[]
  stats: { totalSpent: number; totalTopUps: number; thisMonthSpent: number; txnCount: number }
}) {
  const monthly = useMemo(() => {
    const buckets = new Map<string, { label: string; total: number; count: number; sortKey: string }>()
    transactions.forEach((t) => {
      if (t.status !== 'completed') return
      const d = new Date(t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      const cur = buckets.get(key) ?? { label, total: 0, count: 0, sortKey: key }
      cur.total += t.total
      cur.count += 1
      buckets.set(key, cur)
    })
    return Array.from(buckets.values())
      .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
      .slice(0, 6)
  }, [transactions])
  const max = Math.max(1, ...monthly.map((m) => m.total))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="text-[11px] uppercase tracking-wider text-ink-500">
          This month
        </div>
        <div className="mt-0.5 text-2xl font-extrabold text-ink-900">
          {currency(stats.thisMonthSpent)}
        </div>
        <div className="mt-1 text-[11px] text-ink-500">
          All-time {currency(stats.totalSpent)} · Top-ups {currency(stats.totalTopUps)}
        </div>
      </div>

      {monthly.length > 0 ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="mb-3 text-sm font-bold text-ink-900">Monthly spending</div>
          <ul className="space-y-2">
            {monthly.map((m) => (
              <li key={m.sortKey} className="text-xs">
                <div className="mb-1 flex items-center justify-between text-ink-700">
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-ink-500">
                    {currency(m.total)} · {m.count} charge{m.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ink-900 to-ink-600"
                    style={{ width: `${Math.max(6, (m.total / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="Nothing to bill yet"
          description="Once you start spending, your monthly summary will appear here."
          Icon={ArrowUpRight}
        />
      )}
    </div>
  )
}

function AccountTab({
  member,
  cards,
  memberTier,
}: {
  member: NonNullable<ReturnType<typeof getMember>>
  cards: MembershipCard[]
  memberTier: string
}) {
  if (!member) return null
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <Avatar member={member} size={48} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink-900">{member.name}</div>
            <div className="text-[11px] text-ink-500">
              {memberTypeLabel(member.type)} · {memberTier} tier
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {member.email && <AccountRow Icon={Mail} label="Email" value={member.email} />}
          {member.phone && <AccountRow Icon={Phone} label="Phone" value={member.phone} />}
          <AccountRow Icon={Calendar} label="Member since" value={formatDate(member.joinedAt)} />
          <AccountRow Icon={UserIcon} label="Status" value={memberStatusLabel(member.status)} />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="mb-2 text-sm font-bold text-ink-900">Your portal link</div>
        <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2">
          <Hash className="h-3.5 w-3.5 text-ink-400" />
          <code className="flex-1 truncate text-xs text-ink-700">/u/{member.slug}</code>
          <span className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-600">
            Private
          </span>
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          Bookmark this on your phone to come back without signing in.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="mb-2 text-sm font-bold text-ink-900">Security</div>
        <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2">
          <KeyRound className="h-3.5 w-3.5 text-ink-400" />
          <span className="text-[11px] text-ink-600">
            Password protected. Default password is{' '}
            <span className="font-mono font-semibold text-ink-800">1234</span> for demo
            accounts. Contact staff to change.
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="mb-2 text-sm font-bold text-ink-900">Cards on file</div>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-4 text-center text-xs text-ink-500">
            No cards linked.
          </div>
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => {
              const usable = isCardUsable(c)
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2"
                >
                  <div>
                    <div className="font-mono text-xs font-semibold text-ink-900">
                      {maskCardNumber(c.cardNumber)}
                    </div>
                    <div className="text-[11px] text-ink-500">
                      {cardTypeLabel(c.type)} · {c.tier} · Exp {formatDate(c.expiresAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-ink-900">{currency(c.balance)}</div>
                    <div
                      className={
                        usable.ok
                          ? 'text-[10px] font-semibold text-emerald-700'
                          : 'text-[10px] font-semibold text-rose-700'
                      }
                    >
                      {usable.ok ? 'Active' : cardStatusLabel(c.status)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function AccountRow({
  Icon,
  label,
  value,
}: {
  Icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="truncate text-right text-sm font-medium text-ink-800">{value}</div>
    </div>
  )
}

function Row({
  title,
  subtitle,
  meta,
  value,
  valueTone,
  Icon,
  severity,
}: {
  title: string
  subtitle?: string
  meta?: string
  value: string
  valueTone: string
  Icon: typeof ArrowUpRight
  severity?: 'rose' | 'emerald' | 'ink'
}) {
  const iconTone =
    severity === 'rose'
      ? 'bg-rose-50 text-rose-700'
      : severity === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-ink-100 text-ink-700'
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3 py-2.5 shadow-soft">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900">{title}</div>
        <div className="truncate text-[11px] text-ink-500">{subtitle}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-sm font-bold ${valueTone}`}>{value}</div>
        {meta && <div className="text-[10px] text-ink-500">{meta}</div>}
      </div>
    </li>
  )
}

function displayStatus(s: DepositRequestStatus): {
  label: string
  tone: { bg: string; text: string; border: string }
} {
  if (s === 'completed') {
    return { label: 'Approved', tone: depositRequestStatusTone('approved') }
  }
  return { label: depositRequestStatusLabel(s), tone: depositRequestStatusTone(s) }
}

function EmptyState({
  title,
  description,
  Icon,
}: {
  title: string
  description: string
  Icon: typeof Sparkles
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-8 text-center">
      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-sm font-bold text-ink-900">{title}</div>
      <div className="mt-1 text-xs text-ink-500">{description}</div>
    </div>
  )
}

function TopupRequestDrawer({
  member,
  cards,
  existingPending,
  onClose,
  onSubmit,
}: {
  member: NonNullable<ReturnType<typeof getMember>>
  cards: MembershipCard[]
  existingPending: DepositRequest | null
  onClose: () => void
  onSubmit: (input: {
    cardId: string
    amount: number
    method: 'cash' | 'card' | 'bank' | 'wallet'
    reference?: string
    note?: string
    attachmentName?: string
  }) => void
}) {
  const [amount, setAmount] = useState('50')
  const [method, setMethod] = useState<'cash' | 'card' | 'bank' | 'wallet'>('cash')
  const [cardId, setCardId] = useState<string>(cards[0]?.id ?? '')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  function submit() {
    if (submitting) return
    const amt = Math.max(1, Number(amount) || 0)
    if (amt <= 0) {
      setLocalError('Please enter an amount greater than zero.')
      return
    }
    if (!cardId) {
      setLocalError('Please select a card to apply the top-up to.')
      return
    }
    setLocalError(null)
    setSubmitting(true)
    onSubmit({
      cardId,
      amount: amt,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
      attachmentName: attachmentName.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-[slideUp_0.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div>
            <div className="text-base font-bold text-ink-900">Request a top-up</div>
            <p className="text-[11px] text-ink-500">
              Staff will review and confirm. Your balance won't change until they approve.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {existingPending && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-semibold">You already have a pending request</div>
                <div className="text-amber-700">
                  For {currency(existingPending.amount)} via{' '}
                  {paymentMethodLabel(existingPending.method)} ·{' '}
                  {formatRelative(existingPending.requestedAt)}. Cancel it from the
                  Top-ups tab before submitting a new one.
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {['20', '50', '100', '200'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={
                    amount === v
                      ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-bold text-ink-900 ring-1 ring-brand-500/30'
                      : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-700 hover:bg-ink-50'
                  }
                >
                  ${v}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-7 text-base font-bold"
                aria-label="Amount"
              />
            </div>
          </div>

          <div>
            <label className="label">Pay with</label>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'card', 'bank', 'wallet'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    method === m
                      ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/30'
                      : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  {paymentMethodLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {cards.length > 0 && (
            <div>
              <label className="label">Apply to</label>
              <select
                className="input"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {maskCardNumber(c.cardNumber)} · {currency(c.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Reference / transaction number</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TRF-392814 or transfer ID"
              />
            </div>
          </div>

          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input min-h-[64px] resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything staff should know about this request?"
              maxLength={240}
            />
            <div className="mt-1 text-right text-[10px] text-ink-400">
              {note.length}/240
            </div>
          </div>

          <div>
            <label className="label">Receipt attachment (optional)</label>
            <label
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/40 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
            >
              <Paperclip className="h-4 w-4 text-ink-500" />
              <span className="flex-1 truncate">
                {attachmentName || 'Attach a file name (receipt.jpg, transfer.pdf)'}
              </span>
              {attachmentName ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setAttachmentName('')
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-brand-700">Browse</span>
              )}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setAttachmentName(f.name)
                }}
              />
            </label>
            <div className="mt-1 text-[10px] text-ink-400">
              File name is shared with staff for reference. The file itself stays on your
              device — bring the original to staff if they need to verify.
            </div>
          </div>

          {localError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">No money moves until staff approve</div>
              <div>
                You'll see this request as <b>Pending</b> on the Top-ups tab. Once staff
                approve, your balance updates automatically.
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-ink-100 p-3">
          <button
            onClick={submit}
            disabled={submitting || !!existingPending}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Send request
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
