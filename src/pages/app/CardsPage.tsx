import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Nfc,
  Plus,
  Search,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../../components/Primitives'
import { ResponsiveTable, Field, FieldRow } from '../../components/ResponsiveTable'
import {
  cardStatusLabel,
  cardTypeLabel,
  createCard,
  getCards,
  getCardsByMember,
  getMember,
  getMembers,
  maskCardNumber,
  suggestNextCardNumber,
  TIERS,
} from '../../card-store'
import { getLocations } from '../../orders-store'
import { formatCurrency } from '../../order-utils'
import type {
  MembershipCard,
  MembershipCardStatus,
  MembershipCardType,
} from '../../types'
import { playCue } from '../../audio'

type StatusFilter = MembershipCardStatus | 'all'
type TypeFilter = MembershipCardType | 'all'
type ViewMode = 'list' | 'grid'
type PageSize = 6 | 12 | 24 | 48

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
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(12)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setCards(getCards())
    setMemberCount(getMembers().length)
  }

  const tiers = useMemo(() => {
    const set = new Set<string>()
    getCards().forEach((c) => set.add(c.tier))
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
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false
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

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter, tierFilter, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

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
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> New card
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          variant="inline"
          label="Total cards"
          value={String(stats.total)}
        />
        <StatCard
          variant="inline"
          label="Active"
          value={String(stats.active)}
          tone="emerald"
        />
        <StatCard
          variant="inline"
          label="Blocked"
          value={String(stats.blocked)}
          tone="rose"
        />
        <StatCard
          variant="inline"
          label="Outstanding balance"
          value={formatCurrency(stats.balance, '')}
          tone="brand"
        />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:flex-1">
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
              className="h-10 !w-44 shrink-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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
              className="h-10 !w-40 shrink-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-ink-700">
              {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              {'–'}
              {Math.min(safePage * pageSize, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-ink-700">{filtered.length}</span> cards
            {memberCount > 0 ? ` · ${memberCount} members` : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <div
              role="tablist"
              aria-label="View mode"
              className="hidden sm:inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
            >
              <button
                role="tab"
                aria-selected={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                className={
                  viewMode === 'list'
                    ? 'inline-flex h-7 w-8 items-center justify-center rounded-pill bg-ink-900 text-white'
                    : 'inline-flex h-7 w-8 items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50'
                }
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                role="tab"
                aria-selected={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={
                  viewMode === 'grid'
                    ? 'inline-flex h-7 w-8 items-center justify-center rounded-pill bg-ink-900 text-white'
                    : 'inline-flex h-7 w-8 items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50'
                }
                title="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="mt-4">
            <ResponsiveTable
              columns={[
                { label: 'Card' },
                { label: 'Type' },
                { label: 'Assigned to' },
                { label: 'Status' },
                { label: 'Balance', className: 'text-right' },
                { label: 'Limits', className: 'text-right' },
                { label: 'Issued' },
                { label: 'Expires' },
                { label: 'Last transaction' },
                { label: 'Actions', className: 'text-right' },
              ]}
              rows={paged}
              rowKey={(c) => c.id}
              mode="scroll"
              minWidth="860px"
              tableClassName="w-full text-left text-sm"
              empty={
                <EmptyState
                  icon={<CreditCard className="h-7 w-7" />}
                  title="No cards match the current filters"
                  description="Try clearing the search or filters."
                />
              }
              renderRow={(c) => {
                const member = getMember(c.memberId)
                const Icon = typeIcon(c.type)
                return (
                  <>
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
                      <div className="font-bold text-ink-900">{formatCurrency(c.balance, '')}</div>
                    </td>
                    <td className="py-3 pr-4 text-right text-[11px] text-ink-500">
                      <div>{formatCurrency(c.dailyLimit, '')}/day</div>
                      <div>{formatCurrency(c.monthlyLimit, '')}/mo</div>
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                          title="View details"
                          aria-label="View card details"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5 rotate-180" />
                        </Link>
                        <button
                          onClick={() => navigate(`/app/cards/${c.id}`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                          title="Top up"
                          aria-label="Top up card"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )
              }}
              renderCard={(c) => {
                const member = getMember(c.memberId)
                const Icon = typeIcon(c.type)
                return (
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-brand-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/app/cards/${c.id}`}
                          className="block truncate font-mono text-sm font-semibold text-ink-900 hover:underline"
                        >
                          {maskCardNumber(c.cardNumber)}
                        </Link>
                        <div className="truncate text-[11px] text-ink-500">
                          {cardTypeLabel(c.type)} · {c.id}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-extrabold text-ink-900">{formatCurrency(c.balance, '')}</div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-400">
                          Balance
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={c.status} />
                      <span className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                        {cardTypeLabel(c.type)}
                      </span>
                    </div>
                    <FieldRow className="mt-3">
                      <Field label="Assigned to">
                        {member ? (
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-ink-900">
                              {member.name}
                            </div>
                            {member.email && (
                              <div className="truncate text-[11px] text-ink-500">
                                {member.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-ink-500">Unassigned</span>
                        )}
                      </Field>
                      <Field label="Limits">
                        <span className="text-xs">
                          {formatCurrency(c.dailyLimit, '')}/day · {formatCurrency(c.monthlyLimit, '')}/mo
                        </span>
                      </Field>
                      <Field label="Issued">{formatDate(c.issuedAt)}</Field>
                      <Field label="Expires">
                        <span className={isExpired(c) ? 'font-semibold text-rose-600' : ''}>
                          {formatDate(c.expiresAt)}
                        </span>
                      </Field>
                      <Field label="Last transaction">
                        {formatRelative(c.lastTransactionAt)}
                      </Field>
                    </FieldRow>
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-ink-100 pt-3">
                      <Link
                        to={`/app/cards/${c.id}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5 rotate-180" /> Details
                      </Link>
                      <button
                        onClick={() => navigate(`/app/cards/${c.id}`)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand-500 px-3 text-xs font-bold text-ink-900 hover:bg-brand-400"
                        style={{ color: 'rgb(var(--text-on-brand-rgb))' }}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Top up
                      </button>
                    </div>
                  </div>
                )
              }}
            />
          </div>
        ) : (
<div className="mt-4">
            {paged.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-7 w-7" />}
                title="No cards match the current filters"
                description="Try clearing the search or filters."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paged.map((c) => (
                  <CardTile key={c.id} card={c} onOpen={() => navigate(`/app/cards/${c.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        <Pagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => setPageSize(s)}
        />
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

function CardTile({ card, onOpen }: { card: MembershipCard; onOpen: () => void }) {
  const member = getMember(card.memberId)
  const Icon = typeIcon(card.type)
  const expired = isExpired(card)
  const homeLoc = card.homeLocationId
    ? getLocations().find((l) => l.id === card.homeLocationId)
    : null
  const isCrossLocation = card.usableAcrossLocations !== false
  const gradient =
    card.type === 'gift'
      ? 'from-rose-500 to-amber-500'
      : card.type === 'corporate'
      ? 'from-indigo-600 to-blue-500'
      : card.type === 'virtual'
      ? 'from-sky-500 to-cyan-400'
      : 'from-ink-900 to-ink-700'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-card"
    >
      <div
        className={`relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-3 text-white`}
      >
        <div className="flex items-start justify-between">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <Icon className="h-4 w-4" />
          </div>
          <StatusPill status={card.status} />
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="font-mono text-sm font-semibold tracking-wider">
            {maskCardNumber(card.cardNumber)}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/70">
            <span>{card.id}</span>
            <span>Exp {formatDate(card.expiresAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-900">
            {member?.name ?? 'Unassigned'}
          </div>
          <div className="truncate text-[11px] text-ink-500">{member?.email ?? 'No member linked'}</div>
        </div>
        <span className="shrink-0 rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700">
          {cardTypeLabel(card.type)}
        </span>
      </div>

      {(homeLoc || isCrossLocation !== undefined) && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 bg-ink-50/50 px-2.5 py-1.5 text-[11px]">
          {homeLoc ? (
            <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-ink-800">
              <MapPin className="h-3 w-3 text-ink-500" />
              <span className="truncate">{homeLoc.name}</span>
            </span>
          ) : (
            <span className="text-ink-500">No home location</span>
          )}
          {isCrossLocation ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
              CROSS-LOCATION
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold text-ink-700">
              HOME ONLY
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-[11px]">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Balance</div>
          <div className="font-bold text-ink-900">{formatCurrency(card.balance, '')}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Daily</div>
          <div className="font-semibold text-ink-700">{formatCurrency(card.dailyLimit, '')}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Monthly</div>
          <div className="font-semibold text-ink-700">{formatCurrency(card.monthlyLimit, '')}</div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between text-[11px] ${
          expired ? 'text-rose-600' : 'text-ink-500'
        }`}
      >
        <span>Last used {formatRelative(card.lastTransactionAt)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-ink-700 opacity-0 transition-opacity group-hover:opacity-100">
          View <ArrowDownToLine className="h-3 w-3 rotate-180" />
        </span>
      </div>
    </button>
  )
}

function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: PageSize
  totalItems: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: PageSize) => void
}) {
  if (totalItems === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalItems)
  const range = useMemo(() => {
    const total = totalPages
    const current = page
    const span = 5
    if (total <= span) return Array.from({ length: total }, (_, i) => i + 1)
    const end = Math.min(total, current + 2)
    const start = Math.max(1, end - span + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [totalPages, page])
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40'
  const btnActive =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-ink-900 px-2 text-xs font-semibold text-white'

  return (
    <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-ink-100 pt-3 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
        <span>
          <span className="font-semibold text-ink-700">
            {first}–{last}
          </span>{' '}
          of <span className="font-semibold text-ink-700">{totalItems}</span>
        </span>
        <label className="inline-flex items-center gap-1.5">
          Rows
          <select
            className="h-7 rounded-lg border border-ink-200 bg-white px-1.5 text-xs text-ink-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          >
            {[6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          className={btn}
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {range.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={p === page ? btnActive : btn}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        <button
          className={btn}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
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
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [tier, setTier] = useState<string>('Bronze')
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

  function pickTierForMember(id: string) {
    if (!id) {
      setTier('Bronze')
      return
    }
    const existing = getCardsByMember(id)
    if (existing.length > 0) {
      setTier(existing[0].tier)
    } else {
      setTier('Bronze')
    }
  }

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
        tier,
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
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
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
            <MemberPicker
              value={memberId}
              onChange={(id) => {
                setMemberId(id)
                pickTierForMember(id)
              }}
              members={members}
              search={memberSearch}
              onSearchChange={setMemberSearch}
              open={memberPickerOpen}
              onOpenChange={setMemberPickerOpen}
            />
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

          <div>
            <label className="label">Tier</label>
            <div className="grid grid-cols-4 gap-2">
              {TIERS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTier(t)}
                  className={
                    tier === t
                      ? 'rounded-2xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/40'
                      : 'rounded-2xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Tier lives on the card. Tiers can be changed later from the card detail page.
            </p>
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
    </div>
  )
}

function MemberPicker({
  value,
  onChange,
  members,
  search,
  onSearchChange,
  open,
  onOpenChange,
}: {
  value: string
  onChange: (id: string) => void
  members: ReturnType<typeof getMembers>
  search: string
  onSearchChange: (q: string) => void
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const selected = members.find((m) => m.id === value) ?? null

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q
      ? members
      : members.filter((m) => {
          const hay = [m.name, m.email, m.phone, m.id].filter(Boolean).join(' ').toLowerCase()
          return hay.includes(q)
        })
    return list
      .map((m) => ({ m, count: getCardsByMember(m.id).length }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.m.name.localeCompare(b.m.name)
      })
  }, [members, search])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={
          selected
            ? 'input flex items-center justify-between gap-2 text-left'
            : 'input flex items-center justify-between gap-2 text-left text-ink-500'
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: selected.avatarColor ?? '#3a414d' }}
            >
              {selected.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? '')
                .join('') || '?'}
            </span>
            <span className="truncate text-sm font-semibold text-ink-900">
              {selected.name}
            </span>
            <span className="shrink-0 rounded-pill border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
              {getCardsByMember(selected.id).length} card
              {getCardsByMember(selected.id).length === 1 ? '' : 's'} linked
            </span>
          </span>
        ) : (
          <span className="text-sm">Select a member…</span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          <div className="border-b border-ink-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, email, phone…"
                className="input pl-9"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  onOpenChange(false)
                  onSearchChange('')
                }}
                className={
                  !value
                    ? 'flex w-full items-center gap-2 bg-ink-50 px-3 py-2 text-left text-sm font-semibold text-ink-900'
                    : 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50'
                }
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-ink-300 text-ink-400">
                  ?
                </span>
                <span>Select a member…</span>
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-ink-500">
                No members match “{search}”.
              </li>
            ) : (
              filtered.map(({ m, count }) => {
                const active = m.id === value
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(m.id)
                        onOpenChange(false)
                        onSearchChange('')
                      }}
                      className={
                        active
                          ? 'flex w-full items-center gap-2 bg-brand-50 px-3 py-2 text-left text-sm'
                          : 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50'
                      }
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: m.avatarColor ?? '#3a414d' }}
                      >
                        {m.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? '')
                          .join('') || '?'}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate font-semibold text-ink-900">
                          {m.name}
                        </span>
                        {(m.email || m.phone) && (
                          <span className="block truncate text-[11px] text-ink-500">
                            {m.email ?? m.phone}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700">
                        {count} card{count === 1 ? '' : 's'} linked
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

