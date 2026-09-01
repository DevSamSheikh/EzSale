import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Hash,
  KeyRound,
  Mail,
  Nfc,
  Pause,
  Phone,
  Play,
  Plus,
  Settings as SettingsIcon,
  ShieldOff,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserMinus,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, StatCard } from '../../components/Primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ProfileUrlBlock } from '../../components/ProfileUrlBlock'
import { ToastViewport, useToast } from '../../components/Toast'
import {
  assignCardToMember,
  cardStatusLabel,
  cardTypeLabel,
  getCard,
  getCards,
  getCardActivity,
  getCardDeposits,
  getCardTransactions,
  getCardsByMember,
  getMember,
  getMemberActivity,
  getMembers,
  isCardUsable,
  maskCardNumber,
  memberStatusLabel,
  memberTypeLabel,
  setMemberStatus,
  unassignCard,
  updateMember,
} from '../../card-store'
import { paymentMethodLabel, getTransactions } from '../../payment-store'
import type {
  CardActivity,
  CardDeposit,
  Member,
  MemberActivity,
  MembershipCard,
  MembershipCardStatus,
  Transaction,
} from '../../types'
import { getBusiness } from '../../store'
import { playCue } from '../../audio'
import { UserAvatar } from './UsersPage'

type Tab =
  | 'overview'
  | 'cards'
  | 'balance'
  | 'deposits'
  | 'transactions'
  | 'orders'
  | 'activity'
  | 'settings'

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

function statusPillClass(s: Member['status']) {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive':
      return 'bg-ink-100 text-ink-700 border-ink-200'
    case 'suspended':
      return 'bg-rose-50 text-rose-700 border-rose-200'
  }
}

function StatusPill({ status }: { status: Member['status'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${statusPillClass(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {memberStatusLabel(status)}
    </span>
  )
}

function cardStatusPillClass(s: MembershipCardStatus) {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive':
      return 'bg-ink-100 text-ink-700 border-ink-200'
    case 'blocked':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'expired':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'lost':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'replaced':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
}

function CardStatusPill({ status }: { status: MembershipCardStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${cardStatusPillClass(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cardStatusLabel(status)}
    </span>
  )
}

function typeIcon(t: MembershipCard['type']) {
  switch (t) {
    case 'nfc':
      return Nfc
    case 'virtual':
      return CreditCard
    case 'gift':
      return Wallet
    case 'corporate':
      return Building2
    default:
      return CreditCard
  }
}

export default function UserDetailsPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const business = getBusiness()
  const termMember = business?.terminology.member ?? 'User'

  const [member, setMember] = useState<Member | null>(null)
  const [cards, setCards] = useState<MembershipCard[]>([])
  const [allCards, setAllCards] = useState<MembershipCard[]>([])
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([])
  const [cardActivity, setCardActivity] = useState<CardActivity[]>([])
  const [deposits, setDeposits] = useState<CardDeposit[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [assignOpen, setAssignOpen] = useState(false)
  const [removeCardId, setRemoveCardId] = useState<string | null>(null)
  const toast = useToast()
  const [statusConfirm, setStatusConfirm] = useState<Member['status'] | null>(null)

  useEffect(() => {
    refresh()
  }, [memberId])

  function refresh() {
    if (!memberId) return
    const m = getMember(memberId)
    setMember(m)
    if (!m) return
    const mc = getCardsByMember(memberId)
    setCards(mc)
    setAllCards(getCards())
    setMemberActivity(getMemberActivity(memberId))
    const allActivity: CardActivity[] = []
    const allDeposits: CardDeposit[] = []
    const allTxns: Transaction[] = []
    mc.forEach((c) => {
      allActivity.push(...getCardActivity(c.id))
      allDeposits.push(...getCardDeposits(c.id))
      allTxns.push(...getCardTransactions(c.id))
    })
    setCardActivity(allActivity.sort((a, b) => (a.at < b.at ? 1 : -1)))
    setDeposits(allDeposits.sort((a, b) => (a.at < b.at ? 1 : -1)))
    setTransactions(
      getTransactions()
        .filter((t) => t.memberId === memberId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    )
  }

  const memberTier = useMemo(() => {
    const primary = cards.find((c) => c.status !== 'replaced') ?? cards[0]
    return primary?.tier ?? 'Bronze'
  }, [cards])

  const stats = useMemo(() => {
    const totalBalance = cards.reduce((s, c) => s + c.balance, 0)
    const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0)
    const totalSpent = transactions
      .filter((t) => t.status === 'completed')
      .reduce((s, t) => s + t.total, 0)
    const orderCount = transactions.length
    return { totalBalance, totalDeposits, totalSpent, orderCount }
  }, [cards, deposits, transactions])

  function notify(msg: string, tone: 'success' | 'info' | 'warning' = 'success') {
    toast.push({ tone, title: msg })
  }

  function handleAssign(cardId: string) {
    if (!member) return
    const res = assignCardToMember(cardId, member.id)
    if (res) {
      refresh()
      notify(`Card ${maskCardNumber(res.cardNumber)} assigned.`, 'success')
      playCue('success')
    }
    setAssignOpen(false)
  }

  function handleRemove(cardId: string) {
    const card = getCard(cardId)
    if (!card) return
    unassignCard(cardId)
    refresh()
    notify(`Card ${maskCardNumber(card.cardNumber)} unassigned.`, 'info')
    playCue('info')
    setRemoveCardId(null)
  }

  function handleStatus(status: Member['status']) {
    if (!member) return
    setMemberStatus(member.id, status)
    refresh()
    const tone =
      status === 'suspended' ? 'warning' : status === 'active' ? 'success' : 'info'
    notify(`${member.name} ${status}.`, tone)
    playCue(tone === 'warning' ? 'warning' : tone === 'info' ? 'info' : 'success')
  }

  if (!member) {
    return (
      <div>
        <PageHeader
          title={`${termMember} not found`}
          subtitle="The record may have been removed."
          actions={
            <Link to="/app/users" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to {business?.terminology.memberPlural.toLowerCase() ?? 'users'}
            </Link>
          }
        />
        <div className="card p-10 text-center text-sm text-ink-500">No record with this id.</div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; Icon: typeof UserIcon }[] = [
    { id: 'overview', label: 'Overview', Icon: UserIcon },
    { id: 'cards', label: 'Cards', Icon: CreditCard },
    { id: 'balance', label: 'Balance', Icon: Wallet },
    { id: 'deposits', label: 'Deposits', Icon: Sparkles },
    { id: 'transactions', label: 'Transactions', Icon: ArrowUpRight },
    { id: 'orders', label: 'Orders', Icon: Building2 },
    { id: 'activity', label: 'Activity', Icon: KeyRound },
    { id: 'settings', label: 'Account', Icon: SettingsIcon },
  ]

  return (
    <div>
      <PageHeader
        title={member.name}
        subtitle={`${memberTypeLabel(member.type)} · ${memberTier} tier · ${member.id}`}
        actions={
          <>
            <Link to="/app/users" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {member.status === 'active' && (
              <button onClick={() => setStatusConfirm('inactive')} className="btn-secondary">
                <Pause className="h-4 w-4" /> Deactivate
              </button>
            )}
            {member.status !== 'active' && (
              <button onClick={() => handleStatus('active')} className="btn-secondary">
                <Play className="h-4 w-4" /> Reactivate
              </button>
            )}
            {member.status !== 'suspended' && (
              <button onClick={() => setStatusConfirm('suspended')} className="btn-secondary">
                <ShieldOff className="h-4 w-4" /> Suspend
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
        <ProfileSidebar
          member={member}
          stats={stats}
          cardCount={cards.length}
          memberTier={memberTier}
          onAssignCard={() => setAssignOpen(true)}
        />

        <div>
          <div className="card mb-3 p-2">
            <div role="tablist" className="flex flex-wrap items-center gap-1">
              {tabs.map((t) => {
                const Icon = t.Icon
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={
                      tab === t.id
                        ? 'inline-flex items-center gap-1.5 rounded-pill bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white'
                        : 'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                    }
                  >
                    <Icon className="h-3.5 w-3.5" /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {tab === 'overview' && (
            <OverviewTab
              member={member}
              cards={cards}
              transactions={transactions.slice(0, 5)}
              deposits={deposits.slice(0, 5)}
              activity={memberActivity.slice(0, 6)}
            />
          )}
          {tab === 'cards' && (
            <CardsTab
              member={member}
              cards={cards}
              allCards={allCards}
              onAssign={() => setAssignOpen(true)}
              onRemove={(id) => setRemoveCardId(id)}
            />
          )}
          {tab === 'balance' && <BalanceTab member={member} cards={cards} deposits={deposits} />}
          {tab === 'deposits' && <DepositsTab deposits={deposits} cards={cards} />}
          {tab === 'transactions' && <TransactionsTab transactions={transactions} cards={cards} />}
          {tab === 'orders' && <OrdersTab transactions={transactions} cards={cards} />}
          {tab === 'activity' && (
            <ActivityTab memberActivity={memberActivity} cardActivity={cardActivity} />
          )}
          {tab === 'settings' && (
            <SettingsTab
              member={member}
              onSave={(patch) => {
                updateMember(member.id, patch)
                refresh()
                notify('Profile updated.')
                playCue('success')
              }}
            />
          )}
        </div>
      </div>

      {assignOpen && (
        <AssignCardDrawer
          member={member}
          allCards={allCards}
          onClose={() => setAssignOpen(false)}
          onAssign={handleAssign}
        />
      )}

      {removeCardId && (
        <ConfirmRemoveCardDrawer
          card={cards.find((c) => c.id === removeCardId)!}
          onClose={() => setRemoveCardId(null)}
          onConfirm={() => handleRemove(removeCardId)}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />

      <ConfirmDialog
        open={statusConfirm !== null}
        title={
          statusConfirm === 'suspended'
            ? `Suspend ${member.name}?`
            : `Deactivate ${member.name}?`
        }
        description={
          statusConfirm === 'suspended'
            ? 'They won\u2019t be able to sign in or make purchases until you reactivate them.'
            : 'Their account will be paused. You can reactivate it any time.'
        }
        confirmLabel={statusConfirm === 'suspended' ? 'Suspend' : 'Deactivate'}
        tone={statusConfirm === 'suspended' ? 'danger' : 'warning'}
        onConfirm={() => {
          if (statusConfirm) handleStatus(statusConfirm)
          setStatusConfirm(null)
        }}
        onClose={() => setStatusConfirm(null)}
      />
    </div>
  )
}

function ProfileSidebar({
  member,
  stats,
  cardCount,
  memberTier,
  onAssignCard,
}: {
  member: Member
  stats: { totalBalance: number; totalSpent: number; orderCount: number; totalDeposits: number }
  cardCount: number
  memberTier: string
  onAssignCard: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="bg-gradient-to-br from-ink-900 to-ink-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <UserAvatar member={member} size={56} />
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{member.name}</div>
              <div className="truncate text-xs text-white/70">
                {memberTypeLabel(member.type)} · {memberTier}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <StatusPill status={member.status} />
          </div>
        </div>
        <div className="space-y-2 p-4 text-sm">
          {member.email && (
            <Row icon={Mail} label="Email" value={member.email} />
          )}
          {member.phone && <Row icon={Phone} label="Phone" value={member.phone} />}
          <Row icon={Calendar} label="Joined" value={formatDate(member.joinedAt)} />
          <Row icon={KeyRound} label="Last active" value={formatRelative(member.lastActiveAt)} />
          <Row icon={Hash} label="Account ID" value={member.id} mono />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="text-[11px] uppercase tracking-wide text-ink-500">Current balance</div>
        <div className="mt-0.5 text-2xl font-extrabold text-ink-900">
          {currency(stats.totalBalance)}
        </div>
        <div className="mt-1 text-[11px] text-ink-500">
          {cardCount} card{cardCount === 1 ? '' : 's'} assigned
        </div>
        <button
          onClick={onAssignCard}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          <Plus className="h-4 w-4" /> Assign a card
        </button>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-3">
          <StatCard variant="inline" label="Spent" value={currency(stats.totalSpent)} />
          <StatCard variant="inline" label="Orders" value={String(stats.orderCount)} />
          <StatCard variant="inline" label="Top-ups" value={currency(stats.totalDeposits)} />
          <StatCard variant="inline" label="Cards" value={String(cardCount)} />
        </div>
      </div>

      <ProfileUrlBlock
        slug={member.slug ?? member.id}
        label="Member portal"
        hint="Share this link so the member can sign in with their card or password."
      />
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof UserIcon
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-ink-500">{label}</div>
        <div className={`truncate text-sm text-ink-800 ${mono ? 'font-mono' : 'font-medium'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({
  member,
  cards,
  transactions,
  deposits,
  activity,
}: {
  member: Member
  cards: MembershipCard[]
  transactions: Transaction[]
  deposits: CardDeposit[]
  activity: MemberActivity[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard
          title="Cards"
          cta={
            <Link
              to={`/app/cards`}
              className="text-xs font-semibold text-ink-700 hover:underline"
            >
              Manage
            </Link>
          }
        >
          {cards.length === 0 ? (
            <div className="text-sm text-ink-500">No cards assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {cards.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-ink-400" />
                    <span className="font-mono text-xs font-semibold">
                      {maskCardNumber(c.cardNumber)}
                    </span>
                  </div>
                  <CardStatusPill status={c.status} />
                </div>
              ))}
            </div>
          )}
        </SummaryCard>
        <SummaryCard
          title="Recent activity"
          cta={
            <Link
              to={`/app/orders`}
              className="text-xs font-semibold text-ink-700 hover:underline"
            >
              See all
            </Link>
          }
        >
          {activity.length === 0 ? (
            <div className="text-sm text-ink-500">No activity yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-ink-800">{a.description}</div>
                    <div className="text-[11px] text-ink-500">{formatRelative(a.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SummaryCard
          title="Recent transactions"
          cta={
            <Link
              to={`/app/transactions`}
              className="text-xs font-semibold text-ink-700 hover:underline"
            >
              See all
            </Link>
          }
        >
          {transactions.length === 0 ? (
            <div className="text-sm text-ink-500">No transactions yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-ink-900">{t.id}</div>
                    <div className="text-[11px] text-ink-500">
                      {formatDateTime(t.createdAt)} · {paymentMethodLabel(t.method)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-ink-900">{currency(t.total)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-500">
                      {t.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>
        <SummaryCard title="Recent top-ups">
          {deposits.length === 0 ? (
            <div className="text-sm text-ink-500">No deposits yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {deposits.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-ink-900">{currency(d.amount)}</div>
                    <div className="text-[11px] text-ink-500">
                      {formatDateTime(d.at)} · {paymentMethodLabel(d.method as never)}
                    </div>
                  </div>
                  {d.reference && (
                    <span className="font-mono text-[11px] text-ink-500">{d.reference}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  cta,
  children,
}: {
  title: string
  cta?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-ink-900">{title}</div>
        {cta}
      </div>
      {children}
    </div>
  )
}

function CardsTab({
  member,
  cards,
  allCards,
  onAssign,
  onRemove,
}: {
  member: Member
  cards: MembershipCard[]
  allCards: MembershipCard[]
  onAssign: () => void
  onRemove: (id: string) => void
}) {
  const available = allCards.filter(
    (c) => !c.memberId || c.memberId === member.id,
  )
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-ink-900">Membership cards</div>
        <button onClick={onAssign} className="btn-primary">
          <Plus className="h-4 w-4" /> Assign card
        </button>
      </div>
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-8 text-center text-sm text-ink-500">
          {member.name} has no membership card yet. Assign an NFC card to enable reloadable
          balances and tier-based rewards.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = typeIcon(c.type)
            const usability = isCardUsable(c)
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft"
              >
                <div className="bg-gradient-to-br from-ink-900 to-ink-700 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      <Icon className="h-3 w-3" /> {cardTypeLabel(c.type)}
                    </span>
                    <Nfc className="h-4 w-4 text-brand-400" />
                  </div>
                  <div className="mt-3 font-mono text-sm tracking-widest">{c.cardNumber}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
                    <span>Exp {formatDate(c.expiresAt)}</span>
                    <span>{c.nfcUid ?? '—'}</span>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <CardStatusPill status={c.status} />
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-ink-500">
                        Balance
                      </div>
                      <div className="text-lg font-extrabold text-ink-900">
                        {currency(c.balance)}
                      </div>
                    </div>
                  </div>
                  {!usability.ok && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                      {usability.reason}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-500">
                    <div>Daily limit · {currency(c.dailyLimit)}</div>
                    <div>Monthly limit · {currency(c.monthlyLimit)}</div>
                    <div>Issued · {formatDate(c.issuedAt)}</div>
                    <div>Last used · {formatRelative(c.lastTransactionAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link to={`/app/cards/${c.id}`} className="btn-secondary flex-1 text-xs">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Card details
                    </Link>
                    <button
                      onClick={() => onRemove(c.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" /> Unassign
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {available.length > 0 && cards.length > 0 && (
        <div className="mt-4 text-[11px] text-ink-500">
          {available.length} card(s) in inventory. Use "Assign card" to add another.
        </div>
      )}
    </div>
  )
}

function BalanceTab({
  member,
  cards,
  deposits,
}: {
  member: Member
  cards: MembershipCard[]
  deposits: CardDeposit[]
}) {
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0)
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0)
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="text-[11px] uppercase tracking-wide text-ink-500">Current balance</div>
        <div className="mt-0.5 text-3xl font-extrabold text-ink-900">
          {currency(totalBalance)}
        </div>
        <div className="mt-1 text-xs text-ink-500">
          Across {cards.length} card{cards.length === 1 ? '' : 's'} · Total top-ups{' '}
          {currency(totalDeposits)}
        </div>
      </div>
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <div className="mb-3 text-sm font-bold text-ink-900">Per-card balances</div>
        {cards.length === 0 ? (
          <div className="text-sm text-ink-500">No cards assigned.</div>
        ) : (
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-500">
                  <th className="py-2 font-semibold">Card</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2 font-mono text-xs">{c.cardNumber}</td>
                    <td className="py-2 text-xs">{cardTypeLabel(c.type)}</td>
                    <td className="py-2">
                      <CardStatusPill status={c.status} />
                    </td>
                    <td className="py-2 text-right font-bold text-ink-900">
                      {currency(c.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DepositsTab({
  deposits,
  cards,
}: {
  deposits: CardDeposit[]
  cards: MembershipCard[]
}) {
  if (deposits.length === 0) {
    return <EmptyState message="No deposits recorded yet for this account." />
  }
  return (
    <div className="scroll-soft overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Card</th>
              <th className="px-4 py-3 font-semibold">Method</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => {
              const card = cards.find((c) => c.id === d.cardId)
              return (
                <tr key={d.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                  <td className="px-4 py-3 text-xs text-ink-700">{formatDateTime(d.at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {card ? maskCardNumber(card.cardNumber) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">{paymentMethodLabel(d.method as never)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                    {d.reference ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-ink-900">
                    {currency(d.amount)}
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

function TransactionsTab({
  transactions,
  cards,
}: {
  transactions: Transaction[]
  cards: MembershipCard[]
}) {
  if (transactions.length === 0) {
    return <EmptyState message="No transactions yet for this account." />
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-500">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Txn ID</th>
            <th className="px-4 py-3 font-semibold">Card</th>
            <th className="px-4 py-3 font-semibold">Method</th>
            <th className="px-4 py-3 text-right font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const card = cards.find((c) => c.id === t.cardId)
            return (
              <tr key={t.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                <td className="px-4 py-3 text-xs text-ink-700">{formatDateTime(t.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-900">{t.id}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {card ? maskCardNumber(card.cardNumber) : '—'}
                </td>
                <td className="px-4 py-3 text-xs">{paymentMethodLabel(t.method)}</td>
                <td className="px-4 py-3 text-right font-bold text-ink-900">
                  {currency(t.total)}
                </td>
                <td className="px-4 py-3 text-[11px] uppercase tracking-wide text-ink-500">
                  {t.status}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTab({
  transactions,
  cards,
}: {
  transactions: Transaction[]
  cards: MembershipCard[]
}) {
  if (transactions.length === 0) {
    return <EmptyState message="No orders yet for this account." />
  }
  return (
    <div className="space-y-3">
      {transactions.map((t) => {
        const card = cards.find((c) => c.id === t.cardId)
        return (
          <div
            key={t.id}
            className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
              <div>
                <div className="font-mono text-xs font-semibold text-ink-900">{t.id}</div>
                <div className="text-[11px] text-ink-500">
                  {formatDateTime(t.createdAt)} · {paymentMethodLabel(t.method)}
                  {card && (
                    <>
                      {' '}
                      · {maskCardNumber(card.cardNumber)}
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-ink-900">{currency(t.total)}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink-500">
                  {t.status}
                </div>
              </div>
            </div>
            <ul className="divide-y divide-ink-100">
              {t.items.map((it, idx) => (
                <li key={idx} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <div className="text-ink-900">{it.name}</div>
                    <div className="text-[11px] text-ink-500">Qty {it.qty}</div>
                  </div>
                  <div className="font-semibold text-ink-700">{currency(it.price * it.qty)}</div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between bg-ink-50/40 px-4 py-2 text-xs text-ink-500">
              <span>Subtotal {currency(t.subtotal)}</span>
              {t.discount > 0 && <span>Discount −{currency(t.discount)}</span>}
              <span className="font-semibold text-ink-900">Total {currency(t.total)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivityTab({
  memberActivity,
  cardActivity,
}: {
  memberActivity: MemberActivity[]
  cardActivity: CardActivity[]
}) {
  const merged = useMemo(() => {
    type Row = { id: string; at: string; description: string; by?: string; kind: string }
    const rows: Row[] = []
    memberActivity.forEach((a) =>
      rows.push({
        id: a.id,
        at: a.at,
        description: a.description,
        by: a.by,
        kind: a.type,
      }),
    )
    cardActivity.forEach((a) =>
      rows.push({
        id: a.id,
        at: a.at,
        description: a.description,
        by: a.by,
        kind: a.type,
      }),
    )
    return rows.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [memberActivity, cardActivity])

  if (merged.length === 0) {
    return <EmptyState message="No activity recorded yet." />
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
      <ul className="divide-y divide-ink-100">
        {merged.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-ink-100 text-ink-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-ink-900">{r.description}</div>
              <div className="text-[11px] text-ink-500">
                {formatDateTime(r.at)}
                {r.by ? ` · by ${r.by}` : ''} · {r.kind}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SettingsTab({
  member,
  onSave,
}: {
  member: Member
  onSave: (patch: Partial<Member>) => void
}) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email ?? '')
  const [phone, setPhone] = useState(member.phone ?? '')
  const [type, setType] = useState<Member['type']>(member.type)
  const [status, setStatus] = useState<Member['status']>(member.status)
  const [notes, setNotes] = useState(member.notes ?? '')

  useEffect(() => {
    setName(member.name)
    setEmail(member.email ?? '')
    setPhone(member.phone ?? '')
    setType(member.type)
    setStatus(member.status)
    setNotes(member.notes ?? '')
  }, [member])

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="text-sm font-bold text-ink-900">Account settings</div>
      <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-[11px] text-ink-600">
        Tier is set on the member's card. Open a card to change tier, limits, or status.
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">User type</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as Member['type'])}
          >
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Member['status'])}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Internal notes</label>
        <textarea
          className="input min-h-[100px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes visible only to administrators…"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() =>
            onSave({
              name: name.trim(),
              email: email.trim() || undefined,
              phone: phone.trim() || undefined,
              type,
              status,
              notes: notes.trim() || undefined,
            })
          }
          className="btn-primary"
        >
          <CheckCircle2 className="h-4 w-4" /> Save changes
        </button>
      </div>
    </div>
  )
}

function AssignCardDrawer({
  member,
  allCards,
  onClose,
  onAssign,
}: {
  member: Member
  allCards: MembershipCard[]
  onClose: () => void
  onAssign: (cardId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>('')
  const available = allCards.filter(
    (c) => !c.memberId || c.memberId === member.id,
  )
  const filtered = available.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      c.cardNumber.toLowerCase().includes(q) ||
      (c.nfcUid?.toLowerCase().includes(q) ?? false) ||
      c.id.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">Assign a card</div>
            <p className="mt-0.5 text-xs text-ink-500">
              Link an NFC or virtual card to {member.name}.
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

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by card number, NFC UID, or ID…"
              className="input pl-9"
            />
            <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-sm text-ink-500">
              No available cards match your search.
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => {
                const Icon = typeIcon(c.type)
                const isSelected = selected === c.id
                const reassign = c.memberId === member.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={
                        isSelected
                          ? 'flex w-full items-center gap-3 rounded-2xl border border-brand-500 bg-brand-50 p-3 text-left'
                          : 'flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left hover:bg-ink-50'
                      }
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-brand-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-semibold text-ink-900">
                          {c.cardNumber}
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {cardTypeLabel(c.type)} · {c.nfcUid ?? '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <CardStatusPill status={c.status} />
                        {reassign && (
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-500">
                            already on this account
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              disabled={!selected}
              onClick={() => selected && onAssign(selected)}
              className="btn-primary flex-1 py-3 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Assign card
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmRemoveCardDrawer({
  card,
  onClose,
  onConfirm,
}: {
  card: MembershipCard
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">Unassign card</div>
            <p className="mt-0.5 text-xs text-ink-500">
              Unassign {maskCardNumber(card.cardNumber)} from this account.
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
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            The card will be returned to inventory and can be reassigned later. The current
            balance stays on the card.
          </div>
        </div>
        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-rose-500 py-3 text-sm font-bold text-white shadow-soft hover:bg-rose-600"
            >
              <Trash2 className="h-4 w-4" /> Unassign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-8 text-center text-sm text-ink-500">
      {message}
    </div>
  )
}
