import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  CreditCard,
  Filter,
  Nfc,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader } from '../../components/Primitives'
import {
  cardStatusLabel,
  cardTypeLabel,
  createCard,
  getCards,
  getMember,
  getMembers,
  maskCardNumber,
  suggestNextCardNumber,
} from '../../card-store'
import type {
  MembershipCard,
  MembershipCardStatus,
  MembershipCardType,
} from '../../types'
import { playCue } from '../../audio'

type StatusFilter = MembershipCardStatus | 'all'
type TypeFilter = MembershipCardType | 'all'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'expired', label: 'Expired' },
  { id: 'lost', label: 'Lost' },
  { id: 'replaced', label: 'Replaced' },
]

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'nfc', label: 'NFC' },
  { id: 'standard', label: 'Standard' },
  { id: 'virtual', label: 'Virtual' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'gift', label: 'Gift' },
]

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
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cardStatusLabel(status)}
    </span>
  )
}

function typeIcon(t: MembershipCardType) {
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

function isExpired(c: MembershipCard) {
  return c.status === 'expired' || new Date(c.expiresAt).getTime() < Date.now()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
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

export default function CardsPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<MembershipCard[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setCards(getCards())
    setMemberCount(getMembers().length)
  }

  const tiers = useMemo(() => {
    const set = new Set<string>()
    getMembers().forEach((m) => set.add(m.tier))
    return ['all', ...Array.from(set)]
  }, [cards])

  const stats = useMemo(() => {
    return {
      total: cards.length,
      active: cards.filter((c) => c.status === 'active').length,
      blocked: cards.filter((c) => c.status === 'blocked').length,
      expired: cards.filter((c) => isExpired(c)).length,
      balance: cards.reduce((s, c) => s + c.balance, 0),
    }
  }, [cards])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
      if (tierFilter !== 'all') {
        const m = getMember(c.memberId)
        if (!m || m.tier !== tierFilter) return false
      }
      if (q) {
        const member = getMember(c.memberId)
        const hay = [
          c.cardNumber,
          c.nfcUid,
          c.id,
          member?.name,
          member?.email,
          member?.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [cards, search, statusFilter, typeFilter, tierFilter])

  function openAdd() {
    setAddOpen(true)
    playCue('tap')
  }

  return (
    <div>
      <PageHeader
        title="NFC membership cards"
        subtitle="Issue, search, and manage member cards across your business."
        actions={
          <>
            <button onClick={openAdd} className="btn-secondary">
              <Nfc className="h-4 w-4" /> Tap to enroll
            </button>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="h-4 w-4" /> New card
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total cards" value={String(stats.total)} />
        <Stat label="Active" value={String(stats.active)} tone="emerald" />
        <Stat label="Blocked" value={String(stats.blocked)} tone="rose" />
        <Stat
          label="Outstanding balance"
          value={`$${stats.balance.toFixed(0)}`}
          tone="brand"
        />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by card number, NFC UID, or member…"
              className="input pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-100"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-pill border border-ink-200 bg-white p-1">
              <Filter className="ml-2 h-3.5 w-3.5 text-ink-400" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={
                    f.id === statusFilter
                      ? 'rounded-pill bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-white'
                      : 'rounded-pill px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              className="input h-10"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="input h-10"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All tiers' : `${t} tier`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
          <div>
            Showing <span className="font-semibold text-ink-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-ink-700">{cards.length}</span> cards
            {memberCount > 0 ? ` · ${memberCount} members` : ''}
          </div>
          {(statusFilter !== 'all' || typeFilter !== 'all' || tierFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setTypeFilter('all')
                setTierFilter('all')
              }}
              className="text-xs font-semibold text-ink-700 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-500">
                <th className="py-2 pr-4 font-semibold">Card</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Assigned to</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 text-right font-semibold">Balance</th>
                <th className="py-2 pr-4 text-right font-semibold">Limits</th>
                <th className="py-2 pr-4 font-semibold">Issued</th>
                <th className="py-2 pr-4 font-semibold">Expires</th>
                <th className="py-2 pr-4 font-semibold">Last transaction</th>
                <th className="py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-ink-500">
                    No cards match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const member = getMember(c.memberId)
                const Icon = typeIcon(c.type)
                return (
                  <tr
                    key={c.id}
                    className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-brand-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/app/cards/${c.id}`}
                            className="block truncate font-mono text-sm font-semibold text-ink-900 hover:underline"
                          >
                            {maskCardNumber(c.cardNumber)}
                          </Link>
                          <div className="text-[10px] uppercase tracking-wide text-ink-400">
                            {c.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                        {cardTypeLabel(c.type)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {member ? (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-900">
                            {member.name}
                          </div>
                          <div className="truncate text-[11px] text-ink-500">{member.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-ink-500">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="font-bold text-ink-900">${c.balance.toFixed(0)}</div>
                    </td>
                    <td className="py-3 pr-4 text-right text-[11px] text-ink-500">
                      <div>${c.dailyLimit.toFixed(0)}/day</div>
                      <div>${c.monthlyLimit.toFixed(0)}/mo</div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-700">{formatDate(c.issuedAt)}</td>
                    <td className="py-3 pr-4 text-xs text-ink-700">
                      <span
                        className={
                          isExpired(c) ? 'font-semibold text-rose-600' : 'text-ink-700'
                        }
                      >
                        {formatDate(c.expiresAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-500">
                      {formatRelative(c.lastTransactionAt)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/app/cards/${c.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                          title="View details"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5 rotate-180" />
                        </Link>
                        <button
                          onClick={() => navigate(`/app/cards/${c.id}`)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                          title="Top up"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddCardDrawer
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'emerald' | 'rose' | 'brand'
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'rose'
      ? 'text-rose-700'
      : tone === 'brand'
      ? 'text-brand-700'
      : 'text-ink-900'
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-0.5 text-lg font-extrabold ${color}`}>{value}</div>
    </div>
  )
}

function AddCardDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [cardNumber, setCardNumber] = useState('')
  const [nfcUid, setNfcUid] = useState('')
  const [type, setType] = useState<MembershipCardType>('nfc')
  const [memberId, setMemberId] = useState<string>('')
  const [balance, setBalance] = useState<string>('0')
  const [dailyLimit, setDailyLimit] = useState<string>('500')
  const [monthlyLimit, setMonthlyLimit] = useState<string>('5000')
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [initialStatus, setInitialStatus] = useState<MembershipCardStatus>('active')
  const [error, setError] = useState<string | null>(null)
  const [nfcReading, setNfcReading] = useState(false)
  const [tapHint, setTapHint] = useState(true)

  const members = useMemo(() => getMembers(), [])

  function simulateNfcRead() {
    if (nfcReading) return
    setNfcReading(true)
    setTapHint(false)
    setTimeout(() => {
      const hex = Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, '0')
          .toUpperCase(),
      ).join(':')
      setNfcUid(hex)
      setNfcReading(false)
    }, 900)
  }

  function submit() {
    setError(null)
    if (!cardNumber.trim()) {
      setError('Card number is required.')
      return
    }
    if (!memberId) {
      setError('Please assign the card to a member.')
      return
    }
    const balanceN = Math.max(0, Number(balance) || 0)
    const dailyN = Math.max(0, Number(dailyLimit) || 0)
    const monthlyN = Math.max(0, Number(monthlyLimit) || 0)
    const expiresAt = new Date(expiryDate + 'T23:59:59').toISOString()
    try {
      createCard({
        cardNumber: cardNumber.trim().toUpperCase(),
        nfcUid: nfcUid.trim().toUpperCase() || undefined,
        type,
        memberId,
        balance: balanceN,
        dailyLimit: dailyN,
        monthlyLimit: monthlyN,
        expiresAt,
        status: initialStatus,
      })
      playCue('success')
      onCreated()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">Add a new card</div>
            <p className="mt-0.5 text-xs text-ink-500">Register an NFC card and assign it.</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="label">Card number</label>
            <div className="flex items-center gap-2">
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
                placeholder="EZ-1000-1234"
                className="input flex-1 font-mono tracking-wider"
              />
              <button
                onClick={() => setCardNumber(suggestNextCardNumber())}
                className="btn-secondary h-10 shrink-0 text-xs"
                type="button"
              >
                Suggest
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Use a unique ID printed on the physical card.
            </p>
          </div>

          <div>
            <label className="label">NFC UID (optional)</label>
            <div className="flex items-center gap-2">
              <input
                value={nfcUid}
                onChange={(e) => setNfcUid(e.target.value.toUpperCase())}
                placeholder="04:A3:BC:11:80:5F:90"
                className="input flex-1 font-mono tracking-wider"
              />
              <button
                onClick={simulateNfcRead}
                disabled={nfcReading}
                className="btn-primary h-10 shrink-0 text-xs disabled:opacity-50"
                type="button"
              >
                <Nfc className="h-3.5 w-3.5" /> {nfcReading ? 'Reading…' : 'Tap to read'}
              </button>
            </div>
            {tapHint && !nfcUid && (
              <p className="mt-1 text-[11px] text-ink-500">
                Hold an NFC card against the reader to auto-fill its UID.
              </p>
            )}
          </div>

          <div>
            <label className="label">Card type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(['nfc', 'standard', 'virtual', 'corporate', 'gift'] as MembershipCardType[]).map(
                (t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      type === t
                        ? 'rounded-2xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/40'
                        : 'rounded-2xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
                    }
                  >
                    {cardTypeLabel(t)}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="label">Assign to member</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="input"
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.tier}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-500">
              Use a new member record if this card is for someone not yet in the system.
            </p>
          </div>

          <div>
            <label className="label">Initial status</label>
            <select
              className="input"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as MembershipCardStatus)}
            >
              <option value="active">Active — ready to use</option>
              <option value="inactive">Inactive — issue but don't enable</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Balance</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  className="input pl-6"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Daily limit</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  className="input pl-6"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Monthly limit</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  className="input pl-6"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Expiry date</label>
            <input
              type="date"
              className="input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={submit} className="btn-primary flex-1 py-3">
              <Plus className="h-4 w-4" /> Issue card
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}
