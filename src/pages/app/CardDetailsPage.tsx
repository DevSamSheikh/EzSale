import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CreditCard,
  Hash,
  KeyRound,
  Lock,
  Nfc,
  Pause,
  Play,
  RefreshCw,
  ShieldOff,
  UserMinus,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader } from '../../components/Primitives'
import {
  activateCard,
  blockCard,
  cardStatusLabel,
  cardTypeLabel,
  deactivateCard,
  getCard,
  getCardActivity,
  getCardDeposits,
  getCardTransactions,
  getMember,
  isCardUsable,
  maskCardNumber,
  replaceCard,
  topUpCard,
  unassignCard,
} from '../../card-store'
import { paymentMethodLabel } from '../../payment-store'
import type {
  CardActivity,
  CardDeposit,
  MembershipCard,
  MembershipCardStatus,
  Transaction,
} from '../../types'
import { playCue } from '../../audio'

type Tab = 'transactions' | 'deposits' | 'activity'

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

function statusPillClass(s: MembershipCardStatus) {
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

function StatusPill({ status }: { status: MembershipCardStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${statusPillClass(
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
    default:
      return CreditCard
  }
}

export default function CardDetailsPage() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const [card, setCard] = useState<MembershipCard | null>(null)
  const [activity, setActivity] = useState<CardActivity[]>([])
  const [deposits, setDeposits] = useState<CardDeposit[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tab, setTab] = useState<Tab>('transactions')
  const [topupOpen, setTopupOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [cardId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function refresh() {
    if (!cardId) return
    const c = getCard(cardId)
    setCard(c)
    setActivity(getCardActivity(cardId))
    setDeposits(getCardDeposits(cardId))
    setTransactions(getCardTransactions(cardId))
  }

  const member = useMemo(() => (card ? getMember(card.memberId) : null), [card])
  const usability = card ? isCardUsable(card) : { ok: false }
  const isExpired =
    card && new Date(card.expiresAt).getTime() < Date.now()

  function notify(msg: string) {
    setToast(msg)
  }

  function handleActivate() {
    if (!card) return
    activateCard(card.id)
    refresh()
    notify(`Card ${card.cardNumber} activated.`)
    playCue('success')
  }

  function handleDeactivate() {
    if (!card) return
    deactivateCard(card.id)
    refresh()
    notify(`Card ${card.cardNumber} deactivated.`)
    playCue('info')
  }

  function handleBlock(reason: string) {
    if (!card) return
    blockCard(card.id, reason)
    refresh()
    notify(`Card ${card.cardNumber} blocked.`)
    playCue('warning')
  }

  function handleUnassign() {
    if (!card) return
    unassignCard(card.id)
    refresh()
    notify(`Card unassigned.`)
    playCue('info')
  }

  function handleReplace(opts: { reason: string; transferBalance: boolean }) {
    if (!card) return
    const result = replaceCard(card.id, opts)
    if (result) {
      refresh()
      notify(`Card replaced. New card ${result.newCard.cardNumber}.`)
      playCue('success')
      navigate(`/app/cards/${result.newCard.id}`)
    }
  }

  function handleTopUp(amount: number, method: CardDeposit['method'], reference?: string) {
    if (!card) return
    const res = topUpCard(card.id, amount, method, reference)
    if (res) {
      refresh()
      notify(`Top-up of ${currency(amount)} added.`)
      playCue('success')
    }
  }

  if (!card) {
    return (
      <div>
        <PageHeader
          title="Card not found"
          subtitle="The card may have been removed or replaced."
          actions={
            <Link to="/app/cards" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to cards
            </Link>
          }
        />
        <div className="card p-10 text-center text-sm text-ink-500">No card with this id.</div>
      </div>
    )
  }

  const Icon = typeIcon(card.type)
  const daysToExpiry = Math.round(
    (new Date(card.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  const showNfc = card.nfcUid

  return (
    <div>
      <PageHeader
        title="Card details"
        subtitle={`Card ID · ${card.id}`}
        actions={
          <>
            <Link to="/app/cards" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to cards
            </Link>
            {card.status === 'active' && (
              <button onClick={handleDeactivate} className="btn-secondary">
                <Pause className="h-4 w-4" /> Deactivate
              </button>
            )}
            {card.status === 'inactive' && (
              <button onClick={handleActivate} className="btn-secondary">
                <Play className="h-4 w-4" /> Activate
              </button>
            )}
            {card.status !== 'blocked' && card.status !== 'lost' && card.status !== 'replaced' && (
              <button onClick={() => setBlockOpen(true)} className="btn-secondary">
                <Ban className="h-4 w-4" /> Block card
              </button>
            )}
            <button onClick={() => setReplaceOpen(true)} className="btn-secondary">
              <RefreshCw className="h-4 w-4" /> Replace
            </button>
            <button onClick={() => setTopupOpen(true)} className="btn-primary">
              <ArrowDownToLine className="h-4 w-4" /> Top up
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px,1fr]">
        {/* Left: card visual + key info */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="relative h-44 bg-ink-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                  <Icon className="h-3 w-3" /> {cardTypeLabel(card.type)}
                </span>
                <Nfc className="h-5 w-5 text-brand-400" />
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <div className="text-[10px] uppercase tracking-widest text-white/60">Card number</div>
                <div className="mt-0.5 font-mono text-base tracking-widest">
                  {card.cardNumber}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-white/40">Holder</div>
                    <div className="font-semibold text-white">
                      {member?.name ?? 'Unassigned'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-widest text-white/40">Expires</div>
                    <div className="font-mono text-white">{formatDate(card.expiresAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between">
                <StatusPill status={card.status} />
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-ink-500">Balance</div>
                  <div className="text-xl font-extrabold text-ink-900">
                    {currency(card.balance)}
                  </div>
                </div>
              </div>
              {!usability.ok && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Card cannot be used</div>
                    <div className="text-xs">{usability.reason}</div>
                  </div>
                </div>
              )}
              {usability.ok && isExpired && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Card expired</div>
                    <div className="text-xs">Expired on {formatDate(card.expiresAt)}.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick details */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="text-sm font-bold text-ink-900">Card information</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Row icon={Hash} label="Card ID" value={card.id} mono />
              <Row icon={CreditCard} label="Card number" value={card.cardNumber} mono />
              <Row icon={Nfc} label="NFC UID" value={showNfc && card.nfcUid ? card.nfcUid : '—'} mono muted={!showNfc} />
              <Row icon={ArrowUpRight} label="Type" value={cardTypeLabel(card.type)} />
              <Row icon={KeyRound} label="Status" value={cardStatusLabel(card.status)} />
              <Row icon={Wallet} label="Balance" value={currency(card.balance)} />
              <Row icon={ArrowDownToLine} label="Daily limit" value={currency(card.dailyLimit)} />
              <Row icon={ArrowDownToLine} label="Monthly limit" value={currency(card.monthlyLimit)} />
              <Row label="Issued" value={formatDate(card.issuedAt)} />
              <Row
                label="Expires"
                value={formatDate(card.expiresAt)}
                muted={daysToExpiry < 0}
              />
              <Row
                label="Last transaction"
                value={card.lastTransactionAt ? formatDateTime(card.lastTransactionAt) : '—'}
              />
              <Row
                label="Replaces"
                value={card.replaces ? `#${card.replaces}` : '—'}
                mono
                muted={!card.replaces}
              />
            </div>
            {member && card.memberId && (
              <button
                onClick={() => setUnassignOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                <UserMinus className="h-4 w-4" /> Unassign card
              </button>
            )}
          </div>
        </div>

        {/* Right: tabs + lists */}
        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 sm:px-5">
            <div className="flex items-center gap-1 py-3">
              {(['transactions', 'deposits', 'activity'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    t === tab
                      ? 'rounded-pill bg-ink-900 px-3 py-1.5 text-xs font-semibold capitalize text-white'
                      : 'rounded-pill px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 capitalize'
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-ink-500">
              {tab === 'transactions' && `${transactions.length} entries`}
              {tab === 'deposits' && `${deposits.length} entries`}
              {tab === 'activity' && `${activity.length} events`}
            </div>
          </div>

          {tab === 'transactions' && (
            <CardTransactionsList transactions={transactions} />
          )}
          {tab === 'deposits' && <CardDepositsList deposits={deposits} />}
          {tab === 'activity' && <CardActivityList activity={activity} />}
        </div>
      </div>

      {topupOpen && (
        <TopUpDrawer
          card={card}
          onClose={() => setTopupOpen(false)}
          onSubmit={handleTopUp}
        />
      )}
      {replaceOpen && (
        <ReplaceDrawer
          card={card}
          onClose={() => setReplaceOpen(false)}
          onSubmit={handleReplace}
        />
      )}
      {blockOpen && (
        <BlockDrawer
          card={card}
          onClose={() => setBlockOpen(false)}
          onSubmit={handleBlock}
        />
      )}
      {unassignOpen && (
        <ConfirmDrawer
          title="Unassign card?"
          description="The card will remain in the system but won't be tied to any member. You can reassign it later."
          confirmLabel="Unassign"
          tone="warning"
          icon={UserMinus}
          onClose={() => setUnassignOpen(false)}
          onConfirm={() => {
            handleUnassign()
            setUnassignOpen(false)
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-pill bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
            <CheckCircle2 className="h-4 w-4 text-brand-400" />
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
  muted,
}: {
  icon?: typeof Hash
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-500">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div
        className={`mt-0.5 truncate text-sm font-semibold ${
          muted ? 'text-ink-400' : 'text-ink-900'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function CardTransactionsList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <Empty msg="No transactions for this card yet." />
  }
  return (
    <div className="divide-y divide-ink-100">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold text-ink-900">{t.id}</div>
              <span className="rounded-pill bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                {paymentMethodLabel(t.method)}
              </span>
            </div>
            <div className="text-[11px] text-ink-500">
              {formatDateTime(t.createdAt)} · {t.items.length} item{t.items.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-ink-900">{currency(t.total)}</div>
            <div className="text-[10px] text-ink-500 capitalize">{t.status}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CardDepositsList({ deposits }: { deposits: CardDeposit[] }) {
  if (deposits.length === 0) {
    return <Empty msg="No deposits recorded for this card." />
  }
  return (
    <div className="divide-y divide-ink-100">
      {deposits.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ArrowDownToLine className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold text-ink-900">
                {currency(d.amount)}
              </div>
              <span className="rounded-pill bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                {paymentMethodLabel(d.method)}
              </span>
              {d.reference && (
                <span className="truncate text-[11px] text-ink-500">· {d.reference}</span>
              )}
            </div>
            <div className="text-[11px] text-ink-500">
              {formatDateTime(d.at)}
              {d.by ? ` · by ${d.by}` : ''}
              {d.note ? ` · ${d.note}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CardActivityList({ activity }: { activity: CardActivity[] }) {
  if (activity.length === 0) {
    return <Empty msg="No activity yet for this card." />
  }
  return (
    <div className="relative px-4 py-4 sm:px-5">
      <div className="absolute bottom-4 left-[27px] top-4 w-px bg-ink-100 sm:left-[31px]" />
      <ul className="space-y-3">
        {activity.map((a) => {
          const Icon = iconForActivity(a.type)
          const color = colorForActivity(a.type)
          return (
            <li key={a.id} className="relative flex gap-3">
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${color} bg-white`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-ink-100 bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink-900">
                    {a.description}
                  </div>
                  {typeof a.amount === 'number' && (
                    <div
                      className={`shrink-0 text-xs font-bold ${
                        a.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {a.amount >= 0 ? '+' : ''}
                      {currency(a.amount)}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-500">
                  {formatDateTime(a.at)}
                  {a.by ? ` · by ${a.by}` : ''}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function iconForActivity(t: CardActivity['type']) {
  switch (t) {
    case 'created':
      return CreditCard
    case 'activated':
      return Play
    case 'deactivated':
      return Pause
    case 'blocked':
      return Ban
    case 'replaced':
      return RefreshCw
    case 'unassigned':
      return UserMinus
    case 'assigned':
      return UserMinus
    case 'deposit':
    case 'topup':
      return ArrowDownToLine
    case 'transaction':
      return ArrowUpRight
    default:
      return CheckCircle2
  }
}

function colorForActivity(t: CardActivity['type']) {
  switch (t) {
    case 'created':
    case 'assigned':
      return 'border-emerald-200 text-emerald-700'
    case 'activated':
      return 'border-emerald-200 text-emerald-700'
    case 'deactivated':
      return 'border-ink-200 text-ink-700'
    case 'blocked':
    case 'lost':
      return 'border-rose-200 text-rose-700'
    case 'replaced':
      return 'border-indigo-200 text-indigo-700'
    case 'unassigned':
      return 'border-amber-200 text-amber-700'
    case 'deposit':
    case 'topup':
      return 'border-emerald-200 text-emerald-700'
    case 'transaction':
      return 'border-ink-200 text-ink-700'
    default:
      return 'border-ink-200 text-ink-700'
  }
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-4 py-10 text-center text-sm text-ink-500 sm:px-5">{msg}</div>
}

function DrawerShell({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">{title}</div>
            {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="border-t border-ink-100 p-4">{footer}</div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}

function TopUpDrawer({
  card,
  onClose,
  onSubmit,
}: {
  card: MembershipCard
  onClose: () => void
  onSubmit: (amount: number, method: CardDeposit['method'], reference?: string) => void
}) {
  const [amount, setAmount] = useState('50')
  const [method, setMethod] = useState<CardDeposit['method']>('cash')
  const [reference, setReference] = useState('')

  function submit() {
    const a = Math.max(0, Number(amount) || 0)
    if (a <= 0) return
    onSubmit(a, method, reference.trim() || undefined)
  }

  return (
    <DrawerShell
      title="Top up card"
      description={`Add funds to ${maskCardNumber(card.cardNumber)}.`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-3">
            <ArrowDownToLine className="h-4 w-4" /> Add funds
          </button>
        </div>
      }
    >
      <div>
        <label className="label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
          <input
            type="number"
            min={0}
            className="input pl-6"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[10, 20, 50, 100, 200].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="rounded-pill border border-ink-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
            >
              +${v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Method</label>
        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'card', 'bank', 'wallet'] as CardDeposit['method'][]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={
                m === method
                  ? 'rounded-2xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/40'
                  : 'rounded-2xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
              }
            >
              {paymentMethodLabel(m)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Reference (optional)</label>
        <input
          className="input"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. AUTH-392814"
        />
      </div>
    </DrawerShell>
  )
}

function ReplaceDrawer({
  card,
  onClose,
  onSubmit,
}: {
  card: MembershipCard
  onClose: () => void
  onSubmit: (opts: { reason: string; transferBalance: boolean }) => void
}) {
  const [reason, setReason] = useState('Lost or damaged')
  const [transferBalance, setTransferBalance] = useState(true)
  return (
    <DrawerShell
      title="Replace card"
      description={`Issue a new card and retire ${maskCardNumber(card.cardNumber)}.`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ reason, transferBalance })}
            className="btn-primary flex-1 py-3"
          >
            <RefreshCw className="h-4 w-4" /> Issue replacement
          </button>
        </div>
      }
    >
      <div>
        <label className="label">Reason</label>
        <select
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option>Lost or damaged</option>
          <option>Reported stolen</option>
          <option>Compromised credentials</option>
          <option>Customer request</option>
          <option>Upgrade to new card</option>
        </select>
      </div>
      <label className="flex items-start gap-2 rounded-2xl border border-ink-200 bg-white p-3 text-sm">
        <input
          type="checkbox"
          checked={transferBalance}
          onChange={(e) => setTransferBalance(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          <span className="block font-semibold text-ink-900">Transfer balance</span>
          <span className="text-xs text-ink-500">
            Move the current balance of {currency(card.balance)} to the new card.
          </span>
        </span>
      </label>
      <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3 text-xs text-ink-600">
        The current card will be marked as <b>Replaced</b> and a new card will be created with
        the same holder, type, and limits. A new card number will be suggested automatically.
      </div>
    </DrawerShell>
  )
}

function BlockDrawer({
  card,
  onClose,
  onSubmit,
}: {
  card: MembershipCard
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('Reported suspicious activity')
  return (
    <DrawerShell
      title="Block card"
      description={`Block ${maskCardNumber(card.cardNumber)}. The card cannot be used until reactivated.`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(reason)}
            className="flex-1 rounded-pill bg-rose-500 py-3 text-sm font-bold text-white shadow-soft hover:bg-rose-600"
          >
            <ShieldOff className="h-4 w-4" /> Block card
          </button>
        </div>
      }
    >
      <div>
        <label className="label">Reason</label>
        <select
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option>Reported suspicious activity</option>
          <option>Reported stolen</option>
          <option>Customer request</option>
          <option>Failed verification attempts</option>
          <option>Other</option>
        </select>
      </div>
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
        Blocking is reversible. Use the <b>Activate</b> action later to restore this card.
      </div>
    </DrawerShell>
  )
}

function ConfirmDrawer({
  title,
  description,
  confirmLabel,
  tone = 'info',
  icon: Icon,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  tone?: 'info' | 'warning' | 'danger'
  icon: typeof ShieldOff
  onClose: () => void
  onConfirm: () => void
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-rose-500 hover:bg-rose-600'
      : tone === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600'
      : 'bg-ink-900 hover:bg-ink-800'
  return (
    <DrawerShell
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-pill py-3 text-sm font-bold text-white shadow-soft ${toneClass}`}
          >
            <Icon className="h-4 w-4" /> {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="grid place-items-center py-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <Icon className="h-6 w-6" />
        </div>
        <div className="mt-3 text-sm text-ink-700">{description}</div>
      </div>
    </DrawerShell>
  )
}
