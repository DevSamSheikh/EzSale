import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Hash,
  KeyRound,
  Lock,
  Mail,
  Nfc,
  Phone,
  Receipt,
  Sparkles,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { PortalShell } from './PortalShell'
import {
  cardStatusLabel,
  cardTypeLabel,
  getCardActivity,
  getCardDeposits,
  getCardTransactions,
  getCardsByMember,
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
import type {
  CardActivity,
  CardDeposit,
  MembershipCard,
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
  const [topupOpen, setTopupOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setMember(getMemberBySlug(slug))
  }, [slug])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const cards = useMemo(() => (member ? getCardsByMember(member.id) : []), [member])
  const primary = cards[0]
  const totalBalance = useMemo(() => cards.reduce((s, c) => s + c.balance, 0), [cards])
  const memberTier = useMemo(() => (member ? getMemberTier(member.id) : 'Bronze'), [member, cards])

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
    { id: 'transactions', label: 'Charges' },
    { id: 'deposits', label: 'Top-ups' },
    { id: 'billing', label: 'Billing' },
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
            label="Request top-up"
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
          />
        )}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} />}
        {tab === 'deposits' && (
          <DepositsTab deposits={deposits} cards={cards} onRequest={() => setTopupOpen(true)} />
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
          onClose={() => setTopupOpen(false)}
          onSubmit={(amount, method) => {
            setTopupOpen(false)
            notify(
              `Top-up request for ${currency(amount)} (${paymentMethodLabel(method)}) sent. Staff will be notified.`,
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
}: {
  member: ReturnType<typeof getMember>
  cards: MembershipCard[]
  primary: MembershipCard | undefined
  transactions: Transaction[]
  deposits: CardDeposit[]
  stats: { totalSpent: number; totalTopUps: number; thisMonthSpent: number; txnCount: number }
  memberTier: string
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
            <MiniStat label="Status" value={cardStatusLabel(primary.status)} />
            <MiniStat label="Daily" value={currency(primary.dailyLimit)} />
            <MiniStat label="Monthly" value={currency(primary.monthlyLimit)} />
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
        <SummaryTile
          Icon={ArrowUpRight}
          tone="bg-rose-50 text-rose-700 border-rose-200"
          label="Spent this month"
          value={currency(stats.thisMonthSpent)}
        />
        <SummaryTile
          Icon={Sparkles}
          tone="bg-emerald-50 text-emerald-700 border-emerald-200"
          label="Top-ups"
          value={currency(stats.totalTopUps)}
        />
        <SummaryTile
          Icon={ArrowUpRight}
          tone="bg-indigo-50 text-indigo-700 border-indigo-200"
          label="All-time spent"
          value={currency(stats.totalSpent)}
        />
        <SummaryTile
          Icon={Receipt}
          tone="bg-ink-100 text-ink-700 border-ink-200"
          label="Charges"
          value={String(stats.txnCount)}
        />
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

function TransactionsTab({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No charges yet"
        description="Purchases made with your membership card will appear here."
        Icon={ArrowUpRight}
      />
    )
  }
  return (
    <ul className="space-y-2">
      {transactions.map((t) => {
        const first = t.items[0]?.name
        const more = t.items.length > 1 ? ` · +${t.items.length - 1} more` : ''
        return (
          <li
            key={t.id}
            className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink-900">
                    {first ? `${first}${more}` : `Order ${t.id}`}
                  </div>
                  <div className="shrink-0 text-sm font-bold text-rose-700">
                    −{currency(t.total)}
                  </div>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500">
                  <span>{formatDateTime(t.createdAt)}</span>
                  <span>·</span>
                  <span>{paymentMethodLabel(t.method)}</span>
                  <span>·</span>
                  <span className="font-mono">{t.id}</span>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function DepositsTab({
  deposits,
  cards,
  onRequest,
}: {
  deposits: CardDeposit[]
  cards: MembershipCard[]
  onRequest: () => void
}) {
  if (deposits.length === 0) {
    return (
      <div>
        <button
          onClick={onRequest}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-white shadow-pop"
        >
          <Sparkles className="h-4 w-4" /> Request a top-up
        </button>
        <EmptyState
          title="No top-ups yet"
          description="Use the button above to ask staff to add funds to your card."
          Icon={ArrowDownToLine}
        />
      </div>
    )
  }
  return (
    <div>
      <button
        onClick={onRequest}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-white shadow-pop"
      >
        <Sparkles className="h-4 w-4" /> Request a top-up
      </button>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-center shadow-soft">
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-xs font-bold text-ink-900">{value}</div>
    </div>
  )
}

function SummaryTile({
  Icon,
  tone,
  label,
  value,
}: {
  Icon: typeof Sparkles
  tone: string
  label: string
  value: string
}) {
  return (
    <div className={`rounded-2xl border bg-white p-3 shadow-soft ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
      </div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
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
}: {
  title: string
  subtitle?: string
  meta?: string
  value: string
  valueTone: string
  Icon: typeof ArrowUpRight
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3 py-2.5 shadow-soft">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700">
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
  onClose,
  onSubmit,
}: {
  member: NonNullable<ReturnType<typeof getMember>>
  cards: MembershipCard[]
  onClose: () => void
  onSubmit: (amount: number, method: 'cash' | 'card' | 'bank' | 'wallet') => void
}) {
  const [amount, setAmount] = useState('50')
  const [method, setMethod] = useState<'cash' | 'card' | 'bank' | 'wallet'>('cash')
  const [cardId, setCardId] = useState<string>(cards[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-[slideUp_0.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div>
            <div className="text-base font-bold text-ink-900">Request a top-up</div>
            <p className="text-[11px] text-ink-500">
              Staff will be notified and confirm the request shortly.
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

          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            You'll get a notification once staff confirms. No money moves until then.
          </div>
        </div>
        <div className="border-t border-ink-100 p-3">
          <button
            onClick={() => onSubmit(Math.max(1, Number(amount) || 0), method)}
            className="btn-primary w-full py-3"
          >
            <Sparkles className="h-4 w-4" /> Send request
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
