import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Eye,
  LayoutGrid,
  List,
  Mail,
  MoreVertical,
  Pause,
  Phone,
  Play,
  Plus,
  ShieldOff,
  UserCog,
  Users as UsersIcon,
  Wallet,
  X,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../../components/Primitives'
import { ResponsiveTable, Field, FieldRow } from '../../components/ResponsiveTable'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ToastViewport, useToast } from '../../components/Toast'
import { Pagination } from '../../components/Pagination'
import {
  FilterBarSection,
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import {
  createMember,
  getCards,
  getMembers,
  maskCardNumber,
  memberStatusLabel,
  memberTypeLabel,
  setMemberStatus,
  updateMember,
} from '../../card-store'
import type { Member, MembershipCard, Transaction } from '../../types'
import { getBusiness } from '../../store'
import { playCue } from '../../audio'
import { getTransactions } from '../../payment-store'

type StatusFilter = Member['status'] | 'all'
type QuickFilter = 'all' | 'card_assigned' | 'no_card' | 'low_balance' | 'suspended'
type ViewMode = 'list' | 'grid'
type PageSize = 6 | 12 | 24 | 48

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'card_assigned', label: 'Card assigned' },
  { id: 'no_card', label: 'No card' },
  { id: 'low_balance', label: 'Low balance' },
  { id: 'suspended', label: 'Suspended' },
]

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Any status' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'suspended', label: 'Suspended' },
]

const TYPE_FILTERS: { id: Member['type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'individual', label: 'Individual' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'staff', label: 'Staff' },
]

const AVATAR_PALETTE = ['#84eb0a', '#6cc800', '#559c00', '#437800', '#355c00', '#3a414d', '#7e8694']

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
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {memberStatusLabel(status)}
    </span>
  )
}

function typeBadgeClass(t: Member['type']) {
  switch (t) {
    case 'individual':
      return 'bg-ink-100 text-ink-700 border-ink-200'
    case 'corporate':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'staff':
      return 'bg-brand-50 text-brand-800 border-brand-200'
  }
}

function formatDate(iso?: string) {
  if (!iso) return '—'
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function Avatar({ member, size = 36 }: { member: Member; size?: number }) {
  const bg = member.avatarColor ?? '#3a414d'
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-white shadow-soft"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.max(11, Math.round(size * 0.38)),
      }}
      aria-hidden
    >
      {initials(member.name) || '?'}
    </div>
  )
}

export default function UsersPage() {
  const navigate = useNavigate()
  const business = getBusiness()
  const termMember = business?.terminology.member ?? 'User'
  const termPlural = business?.terminology.memberPlural ?? 'Users'
  const pageTitle = `${termPlural} management`

  const [members, setMembers] = useState<Member[]>([])
  const [cards, setCards] = useState<MembershipCard[]>([])
  const [txns, setTxns] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [typeFilter, setTypeFilter] = useState<Member['type'] | 'all'>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(12)
const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const toast = useToast()
  const [statusAction, setStatusAction] = useState<{ member: Member; status: Member['status'] } | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setMembers(getMembers())
    setCards(getCards())
    setTxns(getTransactions())
  }

  const tiers = useMemo(() => {
    const set = new Set<string>()
    getCards().forEach((c) => set.add(c.tier))
    return ['all', ...Array.from(set)]
  }, [members])

  const cardsByMember = useMemo(() => {
    const map = new Map<string, MembershipCard[]>()
    cards.forEach((c) => {
      if (!c.memberId) return
      const arr = map.get(c.memberId) ?? []
      arr.push(c)
      map.set(c.memberId, arr)
    })
    return map
  }, [cards])

  const totalsByMember = useMemo(() => {
    const map = new Map<string, number>()
    txns.forEach((t) => {
      if (t.memberId && t.status === 'completed') {
        map.set(t.memberId, (map.get(t.memberId) ?? 0) + t.total)
      }
    })
    return map
  }, [txns])

  const balanceByMember = useMemo(() => {
    const map = new Map<string, number>()
    cards.forEach((c) => {
      if (c.memberId) {
        map.set(c.memberId, (map.get(c.memberId) ?? 0) + c.balance)
      }
    })
    return map
  }, [cards])

  const tierByMember = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => {
      if (c.memberId) {
        if (!map.has(c.memberId)) map.set(c.memberId, c.tier)
      }
    })
    return map
  }, [cards])

  const stats = useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.status === 'active').length
    const inactive = members.filter((m) => m.status === 'inactive').length
    const suspended = members.filter((m) => m.status === 'suspended').length
    const withCard = members.filter((m) => (cardsByMember.get(m.id)?.length ?? 0) > 0).length
    const totalBalance = Array.from(balanceByMember.values()).reduce((s, v) => s + v, 0)
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const newThisWeek = members.filter(
      (m) => now - new Date(m.joinedAt).getTime() <= weekMs,
    ).length
    const cardsOnFile = cards.length
    return {
      total,
      active,
      inactive,
      suspended,
      withCard,
      totalBalance,
      newThisWeek,
      cardsOnFile,
    }
  }, [members, cards, cardsByMember, balanceByMember])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (q) {
        const hay = [m.name, m.email ?? '', m.phone ?? '', m.id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (typeFilter !== 'all' && m.type !== typeFilter) return false
      if (tierFilter !== 'all' && (tierByMember.get(m.id) ?? 'Bronze') !== tierFilter) return false
      if (quickFilter !== 'all') {
        const memberCards = cardsByMember.get(m.id) ?? []
        if (quickFilter === 'card_assigned' && memberCards.length === 0) return false
        if (quickFilter === 'no_card' && memberCards.length > 0) return false
        if (quickFilter === 'low_balance') {
          const usable = memberCards.find((c) => c.status === 'active' || c.status === 'inactive')
          const bal = usable?.balance ?? 0
          if (bal >= 20) return false
        }
        if (quickFilter === 'suspended' && m.status !== 'suspended') return false
      }
      return true
    })
  }, [members, search, statusFilter, typeFilter, tierFilter, quickFilter, cardsByMember])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter, tierFilter, quickFilter, pageSize])

const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setTierFilter('all')
    setQuickFilter('all')
    playCue('tap')
  }

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (tierFilter !== 'all' ? 1 : 0) +
    (quickFilter !== 'all' ? 1 : 0)

  const typeOptions = useMemo(
    () =>
      TYPE_FILTERS.filter((t) => t.id !== 'all').map((t) => ({
        value: t.id as string,
        label: t.label,
      })),
    [],
  )
  const tierOptions = useMemo(
    () =>
      tiers
        .filter((t) => t !== 'all')
        .map((t) => ({ value: t, label: `${t} tier` })),
    [tiers],
  )
  const statusOptions = useMemo(
    () =>
      STATUS_FILTERS.filter((s) => s.id !== 'all').map((s) => ({
        value: s.id as string,
        label: s.label,
      })),
    [],
  )
  const quickOptions = useMemo(
    () =>
      QUICK_FILTERS.filter((q) => q.id !== 'all').map((q) => ({
        value: q.id as string,
        label: q.label,
      })),
    [],
  )

  function setQuick(id: string) {
    const next = id as QuickFilter
    setQuickFilter(next)
    if (next === 'suspended') setStatusFilter('suspended')
    else setStatusFilter('all')
  }

function notify(msg: string, tone: 'success' | 'info' | 'warning' = 'success') {
    toast.push({ tone, title: msg })
  }

  function handleDeactivate(m: Member) {
    setMemberStatus(m.id, 'inactive')
    refresh()
    notify(`${m.name} deactivated.`, 'info')
    playCue('info')
  }

  function handleReactivate(m: Member) {
    setMemberStatus(m.id, 'active')
    refresh()
    notify(`${m.name} reactivated.`)
    playCue('success')
  }

  function handleSuspend(m: Member) {
    setMemberStatus(m.id, 'suspended')
    refresh()
    notify(`${m.name} suspended.`, 'warning')
    playCue('warning')
  }

  function openCreate() {
    setCreateOpen(true)
    playCue('tap')
  }

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={`Manage ${termPlural.toLowerCase()}, assign NFC cards, and view balances & history.`}
        actions={
          <>
            <button className="btn-secondary">
              <UserCog className="h-4 w-4" /> Roles
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Add {termMember.toLowerCase()}
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={`Total ${termPlural.toLowerCase()}`}
          value={String(stats.total)}
          sub={
            stats.newThisWeek > 0
              ? `${stats.newThisWeek} new this week`
              : `${stats.total} on file`
          }
          icon={UsersIcon}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Active"
          value={String(stats.active)}
          sub={
            stats.active > 0
              ? 'Can sign in and use the system'
              : 'No active accounts'
          }
          icon={Play}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Suspended"
          value={String(stats.suspended)}
          sub={
            stats.suspended > 0
              ? 'Needs attention'
              : 'All clear'
          }
          icon={Pause}
          tone={stats.suspended > 0 ? 'rose' : 'neutral'}
          variant="top"
        />
        <StatCard
          label="Outstanding balance"
          value={`$${stats.totalBalance.toFixed(2)}`}
          sub={`Across ${stats.cardsOnFile} card${stats.cardsOnFile === 1 ? '' : 's'}`}
          icon={Wallet}
          tone="indigo"
          variant="top"
        />
      </div>

      <FilterBarSection activeCount={activeFilterCount} onClear={resetFilters}>
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search by name, email, phone…`}
        />
        <FilterSelect
          label="Quick filter"
          icon={<UserCog className="h-3.5 w-3.5" />}
          options={quickOptions}
          selected={quickFilter === 'all' ? [] : [quickFilter]}
          onChange={(v) => v[0] && setQuick(v[0])}
        />
        <FilterSelect
          label="Status"
          icon={<ShieldOff className="h-3.5 w-3.5" />}
          options={statusOptions}
          selected={statusFilter === 'all' ? [] : [statusFilter]}
          onChange={(v) => setStatusFilter((v[0] as StatusFilter) ?? 'all')}
        />
        <FilterSelect
          label="Type"
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          options={typeOptions}
          selected={typeFilter === 'all' ? [] : [typeFilter]}
          onChange={(v) =>
            setTypeFilter((v[0] as Member['type'] | 'all') ?? 'all')
          }
        />
        <FilterSelect
          label="Tier"
          icon={<Wallet className="h-3.5 w-3.5" />}
          options={tierOptions}
          selected={tierFilter === 'all' ? [] : [tierFilter]}
          onChange={(v) => setTierFilter(v[0] ?? 'all')}
        />
        <div
          role="tablist"
          aria-label="View mode"
          className="hidden sm:inline-flex items-center rounded-full border border-ink-200 bg-white p-0.5"
        >
          <button
            role="tab"
            aria-selected={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={
              viewMode === 'list'
                ? 'inline-flex h-7 w-8 items-center justify-center rounded-full bg-ink-900 text-white'
                : 'inline-flex h-7 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50'
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
                ? 'inline-flex h-7 w-8 items-center justify-center rounded-full bg-ink-900 text-white'
                : 'inline-flex h-7 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50'
            }
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </FilterBarSection>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-ink-700">
              {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-ink-700">{filtered.length}</span>{' '}
            {termPlural.toLowerCase()}
            {stats.withCard > 0 ? ` · ${stats.withCard} with cards` : ''}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="mt-4">
            <ResponsiveTable
              columns={[
                { label: termMember },
                { label: 'Contact' },
                { label: 'Type' },
                { label: 'Status' },
                { label: 'Card' },
                { label: 'Balance', className: 'text-right' },
                { label: 'Total spent', className: 'text-right' },
                { label: 'Joined' },
                { label: 'Last active' },
                { label: 'Actions', className: 'text-right' },
              ]}
              rows={paged}
              rowKey={(m) => m.id}
              tableClassName="w-full text-left text-sm"
              mode="scroll"
              minWidth="860px"
              empty={
                <EmptyState
                  icon={<UsersIcon className="h-7 w-7" />}
                  title={`No ${termPlural.toLowerCase()} match the current filters`}
                  description="Try clearing one of the filters above."
                />
              }
              renderRow={(m) => {
                const memberCards = cardsByMember.get(m.id) ?? []
                const primary = memberCards[0]
                const balance = balanceByMember.get(m.id) ?? 0
                const totalSpent = totalsByMember.get(m.id) ?? 0
                return (
                  <>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/app/users/${m.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <Avatar member={m} size={36} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-900 group-hover:underline">
                            {m.name}
                          </div>
                          <div className="truncate text-[11px] text-ink-500">
                            {tierByMember.get(m.id) ?? 'Bronze'} · {m.id}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="min-w-0">
                        {m.email && (
                          <div className="flex items-center gap-1.5 truncate text-xs text-ink-700">
                            <Mail className="h-3 w-3 text-ink-400" />
                            <span className="truncate">{m.email}</span>
                          </div>
                        )}
                        {m.phone && (
                          <div className="flex items-center gap-1.5 truncate text-[11px] text-ink-500">
                            <Phone className="h-3 w-3 text-ink-400" />
                            <span className="truncate">{m.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${typeBadgeClass(
                          m.type,
                        )}`}
                      >
                        {memberTypeLabel(m.type)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={m.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {primary ? (
                        <Link
                          to={`/app/cards/${primary.id}`}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-ink-900 hover:underline"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-ink-400" />
                          {maskCardNumber(primary.cardNumber)}
                        </Link>
                      ) : (
                        <span className="text-[11px] italic text-ink-500">No card</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="font-bold text-ink-900">${balance.toFixed(0)}</div>
                    </td>
                    <td className="py-3 pr-4 text-right text-[11px] text-ink-500">
                      ${totalSpent.toFixed(0)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-700">{formatDate(m.joinedAt)}</td>
                    <td className="py-3 pr-4 text-xs text-ink-500">
                      {formatRelative(m.lastActiveAt)}
                    </td>
                    <td className="py-3 text-right">
                      <RowActions
                        member={m}
                        onView={() => navigate(`/app/users/${m.id}`)}
                        onEdit={() => setEditing(m)}
                        onDeactivate={() => setStatusAction({ member: m, status: 'inactive' })}
                        onReactivate={() => handleReactivate(m)}
                        onSuspend={() => setStatusAction({ member: m, status: 'suspended' })}
                      />
                    </td>
                  </>
                )
              }}
              renderCard={(m) => {
                const memberCards = cardsByMember.get(m.id) ?? []
                const primary = memberCards[0]
                const balance = balanceByMember.get(m.id) ?? 0
                const totalSpent = totalsByMember.get(m.id) ?? 0
                return (
                  <div>
                    <div className="flex items-center gap-3">
                      <Avatar member={m} size={40} />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/app/users/${m.id}`}
                          className="block truncate text-sm font-semibold text-ink-900 hover:underline"
                        >
                          {m.name}
                        </Link>
                        <div className="truncate text-[11px] text-ink-500">
                          {tierByMember.get(m.id) ?? 'Bronze'} · {memberTypeLabel(m.type)}
                        </div>
                      </div>
                      <StatusPill status={m.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${typeBadgeClass(
                          m.type,
                        )}`}
                      >
                        {memberTypeLabel(m.type)}
                      </span>
                      {primary && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-900">
                          <CreditCard className="h-3 w-3 text-ink-400" />
                          {maskCardNumber(primary.cardNumber)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-2 text-center">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">
                          Balance
                        </div>
                        <div className="text-sm font-bold text-ink-900">
                          ${balance.toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">
                          Spent
                        </div>
                        <div className="text-sm font-semibold text-ink-700">
                          ${totalSpent.toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">
                          Cards
                        </div>
                        <div className="text-sm font-bold text-ink-900">
                          {memberCards.length}
                        </div>
                      </div>
                    </div>

                    <FieldRow className="mt-3">
                      {m.email && (
                        <Field label="Email">
                          <span className="truncate text-xs">{m.email}</span>
                        </Field>
                      )}
                      {m.phone && (
                        <Field label="Phone">
                          <span className="truncate text-xs">{m.phone}</span>
                        </Field>
                      )}
                      <Field label="Joined">{formatDate(m.joinedAt)}</Field>
                      <Field label="Last active">{formatRelative(m.lastActiveAt)}</Field>
                    </FieldRow>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                      <Link
                        to={`/app/users/${m.id}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <RowActions
                        member={m}
                        onView={() => navigate(`/app/users/${m.id}`)}
                        onEdit={() => setEditing(m)}
                        onDeactivate={() => setStatusAction({ member: m, status: 'inactive' })}
                        onReactivate={() => handleReactivate(m)}
                        onSuspend={() => setStatusAction({ member: m, status: 'suspended' })}
                      />
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
                icon={<UsersIcon className="h-7 w-7" />}
                title={`No ${termPlural.toLowerCase()} match the current filters`}
                description="Try clearing one of the filters above."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paged.map((m) => (
                  <UserTile
                    key={m.id}
                    member={m}
                    tier={tierByMember.get(m.id) ?? 'Bronze'}
                    cardCount={(cardsByMember.get(m.id) ?? []).length}
                    balance={balanceByMember.get(m.id) ?? 0}
                    totalSpent={totalsByMember.get(m.id) ?? 0}
                    onOpen={() => navigate(`/app/users/${m.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

<Pagination
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onChange={(next) => {
            setPage(next.page)
            setPageSize(next.pageSize as PageSize)
          }}
        />
      </div>

      {createOpen && (
        <UserDrawer
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(m) => {
            setCreateOpen(false)
            refresh()
            notify(`Created ${m.name}.`)
            playCue('success')
            navigate(`/app/users/${m.id}`)
          }}
        />
      )}

      {editing && (
        <UserDrawer
          mode="edit"
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null)
            refresh()
            notify(`Updated ${m.name}.`)
            playCue('success')
          }}
        />
      )}

{toast.toasts.length > 0 && (
        <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      )}

      <ConfirmDialog
        open={statusAction !== null}
        title={
          statusAction?.status === 'suspended'
            ? `Suspend ${statusAction.member.name}?`
            : `Deactivate ${statusAction?.member.name ?? ''}?`
        }
        description={
          statusAction?.status === 'suspended'
            ? 'They won\u2019t be able to sign in or make purchases until you reactivate them.'
            : 'Their account will be paused. You can reactivate it any time.'
        }
        confirmLabel={statusAction?.status === 'suspended' ? 'Suspend' : 'Deactivate'}
        tone={statusAction?.status === 'suspended' ? 'danger' : 'warning'}
        onConfirm={() => {
          if (!statusAction) return
          if (statusAction.status === 'suspended') handleSuspend(statusAction.member)
          else handleDeactivate(statusAction.member)
          setStatusAction(null)
        }}
        onClose={() => setStatusAction(null)}
      />
    </div>
  )
}

function UserTile({
  member,
  tier,
  cardCount,
  balance,
  totalSpent,
  onOpen,
}: {
  member: Member
  tier: string
  cardCount: number
  balance: number
  totalSpent: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-card"
    >
      <div className="flex items-center gap-3">
        <Avatar member={member} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink-900">{member.name}</div>
          <div className="truncate text-[11px] text-ink-500">
            {tier} · {memberTypeLabel(member.type)}
          </div>
        </div>
        <StatusPill status={member.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-[11px]">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Cards</div>
          <div className="font-bold text-ink-900">{cardCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Balance</div>
          <div className="font-bold text-ink-900">${balance.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Spent</div>
          <div className="font-semibold text-ink-700">${totalSpent.toFixed(0)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-500">
        <span>Joined {formatDate(member.joinedAt)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-ink-700 opacity-0 transition-opacity group-hover:opacity-100">
          View <Eye className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

function RowActions({
  member,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  onSuspend,
}: {
  member: Member
  onView: () => void
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onSuspend: () => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    function place() {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const menuH = menuRef.current?.offsetHeight ?? 180
      const top = Math.min(window.innerHeight - menuH - 8, r.bottom + 6)
      const right = Math.max(8, window.innerWidth - r.right)
      setPos({ top, right })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-[60] w-44 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-pop"
          >
            <button
              onClick={() => {
                setOpen(false)
                onView()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-700 hover:bg-ink-50"
              role="menuitem"
            >
              <Eye className="h-3.5 w-3.5" /> View profile
            </button>
            <button
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-700 hover:bg-ink-50"
              role="menuitem"
            >
              <UserCog className="h-3.5 w-3.5" /> Edit profile
            </button>
            {member.status === 'active' && (
              <button
                onClick={() => {
                  setOpen(false)
                  onDeactivate()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-700 hover:bg-ink-50"
                role="menuitem"
              >
                <Pause className="h-3.5 w-3.5" /> Deactivate
              </button>
            )}
            {member.status !== 'active' && (
              <button
                onClick={() => {
                  setOpen(false)
                  onReactivate()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-700 hover:bg-ink-50"
                role="menuitem"
              >
                <Play className="h-3.5 w-3.5" /> Reactivate
              </button>
            )}
            {member.status !== 'suspended' && (
              <button
                onClick={() => {
                  setOpen(false)
                  onSuspend()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                role="menuitem"
              >
                <ShieldOff className="h-3.5 w-3.5" /> Suspend
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function UserDrawer({
  mode,
  member,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  member?: Member
  onClose: () => void
  onSaved: (m: Member) => void
}) {
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [type, setType] = useState<Member['type']>(member?.type ?? 'individual')
  const [status, setStatus] = useState<Member['status']>(member?.status ?? 'active')
  const [notes, setNotes] = useState(member?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(member?.avatarColor ?? AVATAR_PALETTE[0])

  function submit() {
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (mode === 'create') {
      const created = createMember({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        type,
        status,
        notes: notes.trim() || undefined,
        avatarColor: color,
      })
      onSaved(created)
    } else if (member) {
      const next = updateMember(member.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        type,
        status,
        notes: notes.trim() || undefined,
        avatarColor: color,
      })
      if (next) onSaved(next)
    }
  }

  const title = mode === 'create' ? `Add a new ${getBusiness()?.terminology.member.toLowerCase() ?? 'user'}` : 'Edit profile'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">{title}</div>
            <p className="mt-0.5 text-xs text-ink-500">
              {mode === 'create'
                ? 'Create an account and start tracking balances.'
                : 'Update personal information and preferences.'}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="label">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sara Khan"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0000"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">User type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['individual', 'corporate', 'staff'] as Member['type'][]).map((t) => (
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
                  {memberTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
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
            <label className="label">Avatar color</label>
            <div className="flex flex-wrap items-center gap-2">
              {AVATAR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={
                    color === c
                      ? 'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-brand-500'
                      : 'h-8 w-8 rounded-full ring-1 ring-ink-200 hover:ring-ink-400'
                  }
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <div className="ml-2 flex items-center gap-2">
                <Avatar
                  member={{ ...(member ?? ({} as Member)), avatarColor: color, name: name || 'A' } as Member}
                  size={32}
                />
                <span className="text-[11px] text-ink-500">Preview</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Internal notes about this account…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {mode === 'create' ? (
                <>
                  <Plus className="h-4 w-4" /> Create {getBusiness()?.terminology.member.toLowerCase() ?? 'user'}
                </>
              ) : (
                <>
                  <UsersIcon className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { UserDrawer, Avatar as UserAvatar }

