import { useEffect, useMemo, useState } from 'react'
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
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldOff,
  Sparkles,
  Undo2,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, StatCard } from '../../components/Primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ToastViewport, useToast } from '../../components/Toast'
import {
  FilterBarSection,
  FilterDateRange,
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import {
  approveDepositRequest,
  cancelDepositRequest,
  depositRequestStatusLabel,
  depositRequestStatusTone,
  getCard,
  getCards,
  getDepositRequests,
  getMember,
  getMembers,
  maskCardNumber,
  recordDeposit,
  rejectDepositRequest,
  reopenRejectedDepositRequest,
  revertApprovedDepositRequest,
  type ApproveDepositRequestResult,
  type RecordDepositResult,
  type RevertDepositRequestResult,
} from '../../card-store'
import { paymentMethodLabel } from '../../payment-store'
import type {
  DepositRequest,
  DepositRequestStatus,
  PaymentMethod,
} from '../../types'
import { playCue } from '../../audio'

const STATUSES: { value: DepositRequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const METHODS: PaymentMethod[] = ['cash', 'card', 'bank', 'wallet', 'membership']

type StatusFilter = DepositRequestStatus | 'all'
type ViewMode = 'list' | 'grid'
type PageSize = 8 | 16 | 32

function withinRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime()
  if (from) {
    const f = new Date(from + 'T00:00:00').getTime()
    if (t < f) return false
  }
  if (to) {
    const e = new Date(to + 'T23:59:59.999').getTime()
    if (t > e) return false
  }
  return true
}

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
  const [methods, setMethods] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(16)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<DepositRequest | null>(null)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState<DepositRequest | null>(null)
  const [approvalResult, setApprovalResult] =
    useState<ApproveDepositRequestResult | null>(null)
  const [revertConfirm, setRevertConfirm] = useState<DepositRequest | null>(null)
  const [reopening, setReopening] = useState(false)
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [recordedResult, setRecordedResult] = useState<RecordDepositResult | null>(null)

  useEffect(() => {
    refresh()
  }, [])

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
      if (methods.length && !methods.includes(r.method)) return false
      if (!withinRange(r.requestedAt, dateFrom, dateTo)) return false
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
  }, [requests, search, statusFilter, methods, dateFrom, dateTo])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, methods, dateFrom, dateTo, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  function notify(msg: string, tone: 'success' | 'info' | 'warning' = 'success') {
    toast.push({ tone, title: msg })
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
      notify(
        `Approved ${currency(result.deposit.amount)} for ${result.deposit.by ?? 'member'}.`,
        'success',
      )
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
      notify('Deposit request rejected.', 'warning')
      playCue('info')
    } catch (e) {
      setError('An unexpected error occurred while rejecting the request.')
      playCue('warning')
    } finally {
      setRejecting(false)
    }
  }

  function handleCancelRequest(req: DepositRequest) {
    setCancelConfirm(req)
  }

  function commitCancel() {
    if (!cancelConfirm) return
    cancelDepositRequest(cancelConfirm.id)
    refresh()
    notify('Request cancelled.', 'info')
    playCue('info')
    setCancelConfirm(null)
  }

  function promptRevertApproved(req: DepositRequest) {
    setRevertConfirm(req)
  }

  function commitRevertApproved() {
    if (!revertConfirm) return
    const result: RevertDepositRequestResult | null = revertApprovedDepositRequest(
      revertConfirm.id,
    )
    if (!result) {
      setError(
        'Unable to revert — the card balance is below the original deposit amount. Adjust the underlying transactions first.',
      )
      setRevertConfirm(null)
      playCue('warning')
      return
    }
    refresh()
    setRevertConfirm(null)
    if (reviewing && reviewing.id === result.request.id) {
      setReviewing(result.request)
    }
    notify(
      `Approval reverted. ${currency(result.request.amount)} debited from the card.`,
      'warning',
    )
    playCue('info')
  }

  function handleReopen(req: DepositRequest) {
    setReopening(true)
    try {
      const updated = reopenRejectedDepositRequest(req.id)
      if (!updated) {
        setError('Unable to reopen this request.')
        playCue('warning')
        return
      }
      refresh()
      if (reviewing && reviewing.id === updated.id) {
        setReviewing(updated)
      }
      notify('Request reopened. It is back in the pending queue.', 'info')
      playCue('info')
    } finally {
      setReopening(false)
    }
  }

  function handleRecordedDeposit(result: RecordDepositResult) {
    refresh()
    setRecordingOpen(false)
    setRecordedResult(result)
    notify(`Recorded ${currency(result.deposit.amount)} deposit.`, 'success')
    playCue('success')
  }

  const isEmpty = !loading && filtered.length === 0

  function clearAllFilters() {
    setSearch('')
    setStatusFilter('all')
    setMethods([])
    setDateFrom('')
    setDateTo('')
    playCue('tap')
  }

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (methods.length ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0)

  const statusOptions = useMemo(
    () =>
      STATUSES.map((s) => ({ value: s.value as string, label: s.label })),
    [],
  )
  const methodOptions = useMemo(
    () => METHODS.map((m) => ({ value: m as string, label: paymentMethodLabel(m) })),
    [],
  )

  return (
    <div>
      <PageHeader
        title="Deposits"
        subtitle="Review top-up requests from members, manually record deposits, and audit the deposit ledger."
        actions={
          <>
            <button onClick={refresh} className="btn-secondary">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={() => setRecordingOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Record a deposit
            </button>
          </>
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

      <FilterBarSection activeCount={activeFilterCount} onClear={clearAllFilters}>
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by member, card, reference…"
        />
        <FilterDateRange
          from={dateFrom}
          to={dateTo}
          onChange={(next) => {
            setDateFrom(next.from)
            setDateTo(next.to)
          }}
        />
        <FilterSelect
          label="Status"
          icon={<Clock className="h-3.5 w-3.5" />}
          options={statusOptions}
          selected={statusFilter === 'all' ? [] : [statusFilter]}
          onChange={(v) => setStatusFilter((v[0] as StatusFilter) ?? 'all')}
        />
        <FilterSelect
          label="Payment method"
          icon={<Wallet className="h-3.5 w-3.5" />}
          options={methodOptions}
          selected={methods}
          onChange={setMethods}
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
          onClearFilters={clearAllFilters}
        />
      ) : viewMode === 'list' ? (
        <RequestsTable
          requests={paged}
          onReview={openReview}
          onCancel={handleCancelRequest}
          onRevert={promptRevertApproved}
          onReopen={handleReopen}
        />
      ) : (
        <RequestsGrid
          requests={paged}
          onReview={openReview}
          onCancel={handleCancelRequest}
          onRevert={promptRevertApproved}
          onReopen={handleReopen}
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
          reopening={reopening}
          onClose={closeReview}
          onApprove={handleApprove}
          onReject={handleReject}
          onPromptRevert={promptRevertApproved}
          onReopen={handleReopen}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />

      <ConfirmDialog
        open={cancelConfirm !== null}
        title="Cancel this deposit request?"
        description="The member will have to submit a new request if they change their mind."
        impact={cancelConfirm ? `${currency(cancelConfirm.amount)} · ${paymentMethodLabel(cancelConfirm.method)}` : undefined}
        confirmLabel="Cancel request"
        tone="danger"
        onConfirm={commitCancel}
        onClose={() => setCancelConfirm(null)}
      />

      <ConfirmDialog
        open={revertConfirm !== null}
        title="Undo approval of this deposit?"
        description="Reverting will debit the original amount from the member's card and create a matching reversal entry in the deposit ledger. The request moves back to the pending queue."
        impact={
          revertConfirm
            ? `${currency(revertConfirm.amount)} · card balance moves back`
            : undefined
        }
        confirmLabel="Revert approval"
        tone="danger"
        onConfirm={commitRevertApproved}
        onClose={() => setRevertConfirm(null)}
      />

      {recordingOpen && (
        <RecordDepositDrawer
          onClose={() => setRecordingOpen(false)}
          onSaved={handleRecordedDeposit}
        />
      )}

      {recordedResult && (
        <RecordedDepositSuccess
          result={recordedResult}
          onClose={() => setRecordedResult(null)}
        />
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
  onRevert,
  onReopen,
}: {
  requests: DepositRequest[]
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
  onRevert: (r: DepositRequest) => void
  onReopen: (r: DepositRequest) => void
}) {
  return (
    <div className="card scroll-soft p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
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
                      onRevert={onRevert}
                      onReopen={onReopen}
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
  onRevert,
  onReopen,
}: {
  requests: DepositRequest[]
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
  onRevert: (r: DepositRequest) => void
  onReopen: (r: DepositRequest) => void
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
                onRevert={onRevert}
                onReopen={onReopen}
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
  onRevert,
  onReopen,
  fullWidth,
}: {
  req: DepositRequest
  onReview: (r: DepositRequest) => void
  onCancel: (r: DepositRequest) => void
  onRevert: (r: DepositRequest) => void
  onReopen: (r: DepositRequest) => void
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
      <div className={fullWidth ? 'flex gap-2' : 'inline-flex gap-1.5'}>
        <button
          onClick={() => onReview(req)}
          className={
            fullWidth
              ? 'btn-secondary flex-1'
              : 'btn-secondary px-2.5 py-1.5 text-xs'
          }
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={() => onReopen(req)}
          className={
            fullWidth
              ? 'btn-secondary flex-1'
              : 'btn-secondary px-2.5 py-1.5 text-xs'
          }
          title="Move this request back to pending"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reopen
        </button>
      </div>
    )
  }
  // approved / completed
  return (
    <div className={fullWidth ? 'flex gap-2' : 'inline-flex gap-1.5'}>
      <button
        onClick={() => onReview(req)}
        className={
          fullWidth
            ? 'btn-secondary flex-1'
            : 'btn-secondary px-2.5 py-1.5 text-xs'
        }
      >
        <Eye className="h-3.5 w-3.5" /> View
      </button>
      <button
        onClick={() => onRevert(req)}
        className={
          fullWidth
            ? 'btn-danger flex-1'
            : 'btn-danger px-2.5 py-1.5 text-xs'
        }
        title="Debit the member's card and move back to pending"
      >
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </button>
    </div>
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
  reopening,
  onClose,
  onApprove,
  onReject,
  onPromptRevert,
  onReopen,
}: {
  request: DepositRequest
  approving: boolean
  rejecting: boolean
  approvalResult: ApproveDepositRequestResult | null
  reopening: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
  onPromptRevert: (r: DepositRequest) => void
  onReopen: (r: DepositRequest) => void
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
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
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
            <div className="space-y-2">
              <button onClick={onClose} className="btn-primary w-full py-3">
                <CheckCircle2 className="h-4 w-4" /> Done
              </button>
              {!reopening && (
                <button
                  type="button"
                  onClick={() => onPromptRevert(request)}
                  className="btn-secondary w-full py-3"
                >
                  <Undo2 className="h-4 w-4" /> Undo approval
                </button>
              )}
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(reason)}
                disabled={rejecting || approving}
                className="btn-danger flex-1 py-3"
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
          ) : request.status === 'approved' || request.status === 'completed' ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                <div className="flex items-start gap-2">
                  <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Undoing this approval will debit {currency(request.amount)} from the
                    member's card and append a reversal entry to the deposit ledger.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 py-3">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => onPromptRevert(request)}
                  className="btn-danger flex-1 py-3"
                >
                  <Undo2 className="h-4 w-4" /> Undo approval
                </button>
              </div>
            </div>
          ) : request.status === 'rejected' || request.status === 'cancelled' ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-ink-200 bg-ink-50 p-3 text-[11px] text-ink-600">
                <div className="flex items-start gap-2">
                  <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Reopening sends this request back to the pending queue. No money is
                    moved until you approve it.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 py-3">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => onReopen(request)}
                  disabled={reopening}
                  className="btn-primary flex-1 py-3"
                >
                  {reopening ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Reopen
                </button>
              </div>
            </div>
          ) : (
            <button onClick={onClose} className="btn-secondary w-full py-3">
              Close
            </button>
          )}
        </div>
      </div>
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

// ---- Record a deposit (manual entry) -----------------------------------

interface RecordDepositForm {
  memberId: string
  cardId: string
  amount: string
  method: 'cash' | 'card' | 'bank' | 'wallet'
  reference: string
  at: string
  note: string
  status: 'completed' | 'pending'
}

function RecordDepositDrawer({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (r: RecordDepositResult) => void
}) {
  const members = getMembers()
  const cards = getCards()
  const [form, setForm] = useState<RecordDepositForm>({
    memberId: '',
    cardId: '',
    amount: '',
    method: 'cash',
    reference: '',
    at: toLocalInput(new Date()),
    note: '',
    status: 'completed',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Filter cards by the selected member so they always match.
  const eligibleCards = useMemo(() => {
    if (!form.memberId) return cards
    return cards.filter((c) => c.memberId === form.memberId)
  }, [cards, form.memberId])

  // When the user picks a member, default the card to their first eligible
  // card. The operator can override.
  useEffect(() => {
    if (form.memberId && !eligibleCards.find((c) => c.id === form.cardId)) {
      setForm((f) => ({ ...f, cardId: eligibleCards[0]?.id ?? '' }))
    }
    if (!form.memberId) {
      setForm((f) => ({ ...f, cardId: '' }))
    }
  }, [form.memberId, eligibleCards, form.cardId])

  function set<K extends keyof RecordDepositForm>(
    key: K,
    value: RecordDepositForm[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setError(null)
    if (!form.memberId) {
      setError('Pick a member first.')
      return
    }
    if (!form.cardId) {
      setError('Pick a card to credit.')
      return
    }
    const amount = Number(form.amount)
    if (!isFinite(amount) || amount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    const atIso = fromLocalInput(form.at) ?? new Date().toISOString()
    setSaving(true)
    try {
      const result = recordDeposit({
        cardId: form.cardId,
        amount,
        method: form.method,
        reference: form.reference.trim() || undefined,
        note: form.note.trim() || undefined,
        at: form.status === 'completed' ? atIso : atIso,
      })
      if (!result) {
        setError('Could not record the deposit. Check the card and try again.')
        setSaving(false)
        playCue('warning')
        return
      }
      onSaved(result)
    } catch {
      setError('An unexpected error occurred while recording the deposit.')
      setSaving(false)
      playCue('warning')
    }
  }

  const selectedCard = form.cardId ? cards.find((c) => c.id === form.cardId) : null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-md md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
        <div className="flex items-start justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">Record a deposit</div>
            <p className="mt-0.5 text-xs text-ink-500">
              Manually credit a member's card. A new deposit entry will be added to the
              ledger and the wallet balance will update immediately.
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
            <label className="label">Member</label>
            <select
              className="input"
              value={form.memberId}
              onChange={(e) => set('memberId', e.target.value)}
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.email ? `· ${m.email}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Card</label>
            <select
              className="input"
              value={form.cardId}
              onChange={(e) => set('cardId', e.target.value)}
              disabled={eligibleCards.length === 0}
            >
              <option value="">
                {eligibleCards.length === 0
                  ? form.memberId
                    ? 'No cards on file for this member'
                    : 'Pick a member first'
                  : 'Select a card…'}
              </option>
              {eligibleCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {maskCardNumber(c.cardNumber)} · Balance {currency(c.balance)}
                </option>
              ))}
            </select>
            {selectedCard && (
              <p className="mt-1 text-[11px] text-ink-500">
                Current balance {currency(selectedCard.balance)} → will become{' '}
                <span className="font-semibold text-ink-700">
                  {currency(
                    selectedCard.balance + (Number(form.amount) || 0),
                  )}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input pl-6"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="label">Payment method</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) =>
                  set('method', e.target.value as RecordDepositForm['method'])
                }
              >
                {(['cash', 'card', 'bank', 'wallet'] as const).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Reference (optional)</label>
            <input
              className="input"
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder="e.g. receipt number, transfer id"
            />
          </div>

          <div>
            <label className="label">Date / time</label>
            <input
              type="datetime-local"
              className="input"
              value={form.at}
              onChange={(e) => set('at', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['completed', 'pending'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={
                    form.status === s
                      ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-ink-900 ring-1 ring-brand-500/40'
                      : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  {s === 'completed' ? 'Completed (credit now)' : 'Pending (record only)'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Completed credits the wallet immediately. Pending stores the entry without
              changing the balance — you'll approve it later.
            </p>
          </div>

          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input min-h-[64px] resize-none"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Any context the audit log should capture"
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
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Record deposit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecordedDepositSuccess({
  result,
  onClose,
}: {
  result: RecordDepositResult
  onClose: () => void
}) {
  const member = getMember(getCards().find((c) => c.id === result.deposit.cardId)?.memberId ?? null)
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-3 sm:p-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-pop">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid place-items-center gap-2 px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="text-base font-bold text-ink-900">Deposit recorded</div>
            <p className="max-w-sm text-sm text-ink-600">
              <span className="font-bold text-ink-900">
                {currency(result.deposit.amount)}
              </span>{' '}
              has been credited to {member?.name ?? 'the member'}'s card.
            </p>
            <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left text-[11px]">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Card
                </div>
                <div className="font-mono text-xs font-semibold text-ink-900">
                  {maskCardNumber(result.card.cardNumber)}
                </div>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  New balance
                </div>
                <div className="text-xs font-bold text-ink-900">
                  {currency(result.card.balance)}
                </div>
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-ink-50 px-3 py-1 text-[11px] font-mono text-ink-700">
              <FileText className="h-3 w-3" /> {result.deposit.id}
            </div>
            <button onClick={onClose} className="btn-primary mt-4 w-full py-3">
              <Check className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- date helpers -------------------------------------------------------

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

function fromLocalInput(s: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

