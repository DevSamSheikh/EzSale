import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Inbox,
  LayoutGrid,
  List,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  ShieldOff,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, StatCard, type StatTone } from '../../components/Primitives'
import {
  approveDepositRequest,
  cancelDepositRequest,
  depositRequestStatusLabel,
  depositRequestStatusTone,
  getCard,
  getDepositRequests,
  getMember,
  maskCardNumber,
  rejectDepositRequest,
  type ApproveDepositRequestResult,
} from '../../card-store'
import { paymentMethodLabel } from '../../payment-store'
import type {
  DepositRequest,
  DepositRequestStatus,
} from '../../types'
import { playCue } from '../../audio'

type StatusFilter = DepositRequestStatus | 'all'
type ViewMode = 'list' | 'grid'
type PageSize = 8 | 16 | 32

const QUICK_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
]

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

function displayStatus(s: DepositRequestStatus): {
  label: string
  tone: { bg: string; text: string; border: string }
} {
  if (s === 'completed') {
    return { label: 'Approved', tone: depositRequestStatusTone('approved') }
  }
  return { label: depositRequestStatusLabel(s), tone: depositRequestStatusTone(s) }
}

function StatusPill({ status }: { status: DepositRequestStatus }) {
  const { label, tone } = displayStatus(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export default function DepositRequestsPage() {
  const [requests, setRequests] = useState<DepositRequest[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(16)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<DepositRequest | null>(null)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [approvalResult, setApprovalResult] =
    useState<ApproveDepositRequestResult | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  function refresh() {
    setLoading(true)
    setError(null)
    try {
      setRequests(getDepositRequests())
    } catch (e) {
      setError('Failed to load deposit requests.')
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
      cancelled: requests.filter((r) => r.status === 'cancelled').length,
      completed: requests.filter((r) => r.status === 'completed').length,
      pendingAmount: requests
        .filter((r) => r.status === 'pending')
        .reduce((s, r) => s + r.amount, 0),
    }
  }, [requests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (statusFilter === 'pending') {
        if (r.status !== 'pending') return false
      } else if (statusFilter === 'approved') {
        if (r.status !== 'approved' && r.status !== 'completed') return false
      } else if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false
      }
      if (q) {
        const card = getCard(r.cardId)
        const member = getMember(r.memberId)
        const hay = [
          r.id,
          r.amount.toString(),
          r.reference,
          r.note,
          r.attachmentName,
          card?.cardNumber,
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
  }, [requests, search, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  function notify(msg: string) {
    setToast(msg)
  }

  function openReview(req: DepositRequest) {
    setApprovalResult(null)
    setReviewing(req)
  }

  function closeReview() {
    setReviewing(null)
    setApproving(false)
    setRejecting(false)
    setApprovalResult(null)
  }

  function handleApprove() {
    if (!reviewing) return
    setApproving(true)
    setError(null)
    try {
      const result = approveDepositRequest(reviewing.id)
      if (!result) {
        setError('Unable to approve — the request may have already been reviewed.')
        setApproving(false)
        playCue('warning')
        return
      }
      setApprovalResult(result)
      refresh()
      notify(`Approved ${currency(result.deposit.amount)} for ${result.deposit.by ?? 'member'}.`)
      playCue('success')
    } catch (e) {
      setError('An unexpected error occurred while approving the request.')
      playCue('warning')
    } finally {
      setApproving(false)
    }
  }

  function handleReject(reason: string) {
    if (!reviewing) return
    setRejecting(true)
    setError(null)
    try {
      const result = rejectDepositRequest(reviewing.id, reason)
      if (!result) {
        setError('Unable to reject — the request may have already been reviewed.')
        setRejecting(false)
        playCue('warning')
        return
      }
      closeReview()
      refresh()
      notify('Deposit request rejected.')
      playCue('info')
    } catch (e) {
      setError('An unexpected error occurred while rejecting the request.')
      playCue('warning')
    } finally {
      setRejecting(false)
    }
  }

  function handleCancelRequest(req: DepositRequest) {
    cancelDepositRequest(req.id)
    refresh()
    notify('Request cancelled.')
    playCue('info')
  }

  const isEmpty = !loading && filtered.length === 0

  return (
    <div>
      <PageHeader
        title="Deposit requests"
        subtitle="Review top-up requests from members. Approve to credit the card or reject with a reason."
        actions={
          <button onClick={refresh} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Clock}
          tone="amber"
          variant="top"
          label="Pending"
          value={String(counts.pending)}
          sub={currency(counts.pendingAmount)}
        />
        <StatCard
          icon={Check}
          tone="emerald"
          variant="top"
          label="Approved"
          value={String(counts.approved + counts.completed)}
        />
        <StatCard
          icon={ShieldOff}
          tone="rose"
          variant="top"
          label="Rejected"
          value={String(counts.rejected)}
        />
        <StatCard
          icon={Inbox}
          tone="neutral"
          variant="top"
          label="All requests"
          value={String(counts.total)}
        />
      </div>

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="-mx-1 flex items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={
                  statusFilter === t.id
                    ? 'inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-ink-900 px-3 py-1.5 text-xs font-bold text-white shadow-soft'
                    : 'inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50'
                }
              >
                {t.label}
                {t.id !== 'all' && (
                  <span
                    className={
                      statusFilter === t.id
                        ? 'rounded-pill bg-white/20 px-1.5 text-[10px]'
                        : 'rounded-pill bg-ink-100 px-1.5 text-[10px] text-ink-700'
                    }
                  >
                    {t.id === 'approved'
                      ? counts.approved + counts.completed
                      : counts[t.id as Exclude<StatusFilter, 'all'>]}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by member, card, reference…"
                className="input w-full min-w-0 pl-9 sm:w-64"
              />
            </div>
            <div
              role="tablist"
              aria-label="View mode"
              className="inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
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
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Something went wrong</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : isEmpty ? (
        <EmptyState
          statusFilter={statusFilter}
          hasAny={requests.length > 0}
          onClearFilters={() => {
            setSearch('')
            setStatusFilter('all')
          }}
        />
      ) : viewMode === 'list' ? (
        <RequestsTable
          requests={paged}
          onReview={openReview}
          onCancel={handleCancelRequest}
        />
      ) : (
        <RequestsGrid
          requests={paged}
          onReview={openReview}
          onCancel={handleCancelRequest}
        />
      )}

      {!loading && !isEmpty && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {reviewing && (
        <ReviewDrawer
          request={reviewing}
          approving={approving}
          rejecting={rejecting}
          approvalResult={approvalResult}
          onClose={closeReview}
          onApprove={handleApprove}
          onReject={handleReject}
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

function LoadingState() {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-ink-400" />
      <div className="text-sm font-semibold text-ink-900">Loading deposit requests…</div>
      <div className="mt-1 text-xs text-ink-500">Fetching the latest member submissions.</div>
    </div>
  )
}

function EmptyState({
  statusFilter,
  hasAny,
  onClearFilters,
}: {
  statusFilter: StatusFilter
  hasAny: boolean
  onClearFilters: () => void
}) {
  const isPendingTab = statusFilter === 'pending'
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-50 text-ink-500">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-bold text-ink-900">
        {isPendingTab
          ? 'No pending requests'
          : hasAny
          ? 'No requests match your filters'
          : 'No deposit requests yet'}
      </h3>
      <p className="mt-1 max-w-md text-sm text-ink-500">
        {isPendingTab
          ? "You're all caught up. New requests from members will appear here for review."
          : hasAny
          ? 'Try adjusting your search or status filter to find what you need.'
          : 'When a member requests a top-up from their portal, the request will show up here.'}
      </p>
      {hasAny && (
        <button onClick={onClearFilters} className="btn-secondary mt-5">
          <X className="h-4 w-4" /> Clear filters
        </button>
      )}
    </div>
  )
}

function RequestsTable({
  requests,
  onReview,
  onCancel,
}: {
  requests: DepositRequest[]
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
}) {
  return (
    <div className="card p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
            <tr className="border-b border-ink-100">
              <th className="px-5 py-3 font-semibold">Member</th>
              <th className="px-5 py-3 font-semibold">Card</th>
              <th className="px-5 py-3 font-semibold text-right">Amount</th>
              <th className="px-5 py-3 font-semibold">Method</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Activity</th>
              <th className="px-5 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {requests.map((r) => {
              const member = getMember(r.memberId)
              const card = getCard(r.cardId)
              return (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink-900">
                      {member?.name ?? 'Unknown member'}
                    </div>
                    <div className="text-[11px] text-ink-500">{member?.email ?? '—'}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-ink-700">
                    {card ? maskCardNumber(card.cardNumber) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold text-ink-900">
                    {currency(r.amount)}
                  </td>
                  <td className="px-5 py-3 text-ink-700">{paymentMethodLabel(r.method)}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {r.status === 'pending'
                      ? formatRelative(r.requestedAt)
                      : formatDateTime(r.reviewedAt ?? r.requestedAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <RequestActions
                      req={r}
                      onReview={onReview}
                      onCancel={onCancel}
                    />
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

function RequestsGrid({
  requests,
  onReview,
  onCancel,
}: {
  requests: DepositRequest[]
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {requests.map((r) => {
        const member = getMember(r.memberId)
        const card = getCard(r.cardId)
        return (
          <div
            key={r.id}
            className="card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink-900">
                  {member?.name ?? 'Unknown member'}
                </div>
                <div className="font-mono text-[11px] text-ink-500">
                  {card ? maskCardNumber(card.cardNumber) : '—'}
                </div>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-ink-900">
                {currency(r.amount)}
              </div>
              <div className="text-[11px] text-ink-500">
                {paymentMethodLabel(r.method)}
              </div>
            </div>
            {r.note && (
              <div className="mt-2 line-clamp-2 rounded-xl border border-ink-100 bg-ink-50/50 p-2 text-[11px] text-ink-700">
                {r.note}
              </div>
            )}
            {r.attachmentName && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-500">
                <Paperclip className="h-3 w-3" />
                <span className="truncate">{r.attachmentName}</span>
              </div>
            )}
            <div className="mt-3 text-[11px] text-ink-500">
              {r.status === 'pending'
                ? `Requested ${formatRelative(r.requestedAt)}`
                : `${displayStatus(r.status).label} ${formatDateTime(r.reviewedAt ?? r.requestedAt)}`}
            </div>
            <div className="mt-3 border-t border-ink-100 pt-3">
              <RequestActions
                req={r}
                onReview={onReview}
                onCancel={onCancel}
                fullWidth
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RequestActions({
  req,
  onReview,
  onCancel,
  fullWidth,
}: {
  req: DepositRequest
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
  fullWidth?: boolean
}) {
  if (req.status === 'pending') {
    return (
      <div className={fullWidth ? 'flex gap-2' : 'inline-flex gap-1.5'}>
        <button
          onClick={() => onReview(req)}
          className={
            fullWidth
              ? 'btn-primary flex-1'
              : 'btn-primary px-2.5 py-1.5 text-xs'
          }
        >
          <Eye className="h-3.5 w-3.5" /> Review
        </button>
        <button
          onClick={() => onCancel(req)}
          className={
            fullWidth
              ? 'btn-secondary flex-1'
              : 'btn-secondary px-2.5 py-1.5 text-xs'
          }
        >
          Cancel
        </button>
      </div>
    )
  }
  if (req.status === 'rejected' || req.status === 'cancelled') {
    return (
      <button
        onClick={() => onReview(req)}
        className={
          fullWidth
            ? 'btn-secondary w-full'
            : 'btn-secondary px-2.5 py-1.5 text-xs'
        }
      >
        <Eye className="h-3.5 w-3.5" /> View
      </button>
    )
  }
  return (
    <Link
      to={`/app/cards/${req.cardId}`}
      className={
        fullWidth
          ? 'btn-secondary w-full'
          : 'btn-secondary px-2.5 py-1.5 text-xs'
      }
    >
      <Eye className="h-3.5 w-3.5" /> View card
    </Link>
  )
}

function Pagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: PageSize
  total: number
  onPageChange: (p: number) => void
  onPageSizeChange: (n: PageSize) => void
}) {
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="text-[11px] text-ink-500">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          className="input w-auto py-1.5 text-xs"
        >
          <option value={8}>8 / page</option>
          <option value={16}>16 / page</option>
          <option value={32}>32 / page</option>
        </select>
        <div className="flex items-center gap-1">
          <PageBtn disabled={page === 1} onClick={() => onPageChange(1)} aria-label="First page">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </PageBtn>
          <PageBtn
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageBtn>
          <span className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800">
            {page} / {totalPages}
          </span>
          <PageBtn
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </PageBtn>
          <PageBtn
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </PageBtn>
        </div>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  onClick,
  disabled,
  ...rest
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  )
}

function ReviewDrawer({
  request,
  approving,
  rejecting,
  approvalResult,
  onClose,
  onApprove,
  onReject,
}: {
  request: DepositRequest
  approving: boolean
  rejecting: boolean
  approvalResult: ApproveDepositRequestResult | null
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  const [reason, setReason] = useState('Insufficient payment confirmation')
  const member = getMember(request.memberId)
  const card = getCard(request.cardId)
  const isPending = request.status === 'pending'
  const status = displayStatus(request.status)
  const tone = status.tone

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop">
        <div className="flex items-start justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-bold text-ink-900">Deposit request</div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              Request {request.id} · {formatDateTime(request.requestedAt)}
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
          {approvalResult ? (
            <ApprovalSuccess
              amount={approvalResult.deposit.amount}
              memberName={member?.name ?? 'member'}
              transactionId={approvalResult.transaction.id}
            />
          ) : (
            <>
              <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
                <div className="text-[11px] uppercase tracking-wider text-ink-500">
                  Amount requested
                </div>
                <div className="mt-1 text-3xl font-extrabold text-ink-900">
                  {currency(request.amount)}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700 border border-ink-200">
                  {paymentMethodLabel(request.method)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Member</div>
                  <div className="mt-0.5 truncate font-semibold text-ink-900">
                    {member?.name ?? 'Unknown'}
                  </div>
                  <div className="truncate text-[11px] text-ink-500">
                    {member?.email ?? '—'}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Card</div>
                  <div className="mt-0.5 truncate font-mono font-semibold text-ink-900">
                    {card ? maskCardNumber(card.cardNumber) : '—'}
                  </div>
                  <div className="truncate text-[11px] text-ink-500">
                    Current balance {card ? currency(card.balance) : '—'}
                  </div>
                </div>
              </div>

              {(request.reference || request.attachmentName) && (
                <div className="rounded-2xl border border-ink-100 bg-white p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">
                    Payment details
                  </div>
                  {request.reference && (
                    <div className="mt-1 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-ink-500" />
                      <span className="text-[11px] text-ink-500">Reference</span>
                      <span className="font-mono text-xs font-semibold text-ink-900">
                        {request.reference}
                      </span>
                    </div>
                  )}
                  {request.attachmentName && (
                    <div className="mt-1 flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-ink-500" />
                      <span className="text-[11px] text-ink-500">Attachment</span>
                      <span className="truncate text-xs font-semibold text-ink-900">
                        {request.attachmentName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {request.note && (
                <div className="rounded-2xl border border-ink-100 bg-white p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">
                    Note from member
                  </div>
                  <div className="mt-1 text-sm text-ink-700">{request.note}</div>
                </div>
              )}

              {request.rejectionReason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <div className="text-[10px] uppercase tracking-wider text-rose-700">
                    Rejection reason
                  </div>
                  <div className="mt-1 font-semibold">{request.rejectionReason}</div>
                </div>
              )}

              {request.reviewedAt && (
                <div className="text-[11px] text-ink-500">
                  Reviewed {formatDateTime(request.reviewedAt)}
                  {request.reviewedBy ? ` by ${request.reviewedBy}` : ''}
                </div>
              )}

              {isPending && (
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">
                    Rejection reason (only if rejecting)
                  </div>
                  <input
                    className="input mt-1.5"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Payment not received"
                  />
                </div>
              )}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
                <div className="flex items-start gap-2">
                  <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Approving will credit the member's card by{' '}
                    <span className="font-bold">{currency(request.amount)}</span> and record a
                    matching transaction. The member cannot modify their own balance.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-ink-100 p-4">
          {approvalResult ? (
            <button onClick={onClose} className="btn-primary w-full py-3">
              <CheckCircle2 className="h-4 w-4" /> Done
            </button>
          ) : isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(reason)}
                disabled={rejecting || approving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4" />
                )}
                Reject
              </button>
              <button
                onClick={onApprove}
                disabled={approving || rejecting}
                className="btn-primary flex-1 py-3"
              >
                {approving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Approve & credit
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="btn-secondary w-full py-3">
              Close
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}

function ApprovalSuccess({
  amount,
  memberName,
  transactionId,
}: {
  amount: number
  memberName: string
  transactionId: string
}) {
  return (
    <div className="grid place-items-center gap-2 py-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <div className="text-base font-bold text-ink-900">Request approved</div>
      <p className="max-w-sm text-sm text-ink-600">
        <span className="font-bold text-ink-900">{currency(amount)}</span> has been credited to{' '}
        {memberName}'s card. A matching transaction was recorded.
      </p>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-ink-50 px-3 py-1 text-[11px] font-mono text-ink-700">
        <CreditCard className="h-3 w-3" /> {transactionId}
      </div>
    </div>
  )
}

