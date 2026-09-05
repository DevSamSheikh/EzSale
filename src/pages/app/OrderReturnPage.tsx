import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Inbox,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShoppingBag,
  X,
} from 'lucide-react'
import { PageHeader, StatCard } from '../../components/Primitives'
import { ResponsiveTable } from '../../components/ResponsiveTable'
import { FilterSearchInput } from '../../components/FilterBar'
import {
  createReturn,
  getReturnedAmount,
  getReturnedQty,
  getReturns,
  type CreateReturnInput,
} from '../../orders-store'
import {
  formatCurrency,
  formatCurrencyPlain,
  formatDate,
  formatDateTime,
  methodLabel,
  methodPillClass,
  operatorName,
  orderItemsCount,
  statusLabel,
  statusPillClass,
} from '../../order-utils'
import { getTransactions } from '../../payment-store'
import { getCard, getMember, getMembers } from '../../card-store'
import { getProduct } from '../../pos-store'
import { getLocations } from '../../orders-store'
import type {
  Location,
  Member,
  MembershipCard,
  PaymentMethod,
  ReturnLine,
  ReturnScope,
  Transaction,
  TransactionStatus,
} from '../../types'
import { playCue } from '../../audio'

type Step = 'search' | 'type' | 'items' | 'summary' | 'done'

const STEP_TITLES: Record<Step, string> = {
  search: 'Find an order',
  type: 'Choose return type',
  items: 'Select items to return',
  summary: 'Confirm and process',
  done: 'Return processed',
}

const REASONS = [
  'Damaged / wrong item',
  'Customer request',
  'Item not available',
  'Goodwill gesture',
  'Duplicate charge',
  'Other',
]

/**
 * Standalone return / refund wizard. Reached from the Orders page via the
 * "Add return" button or a deep link (`/app/orders/return/:orderId`).
 *
 * Flow:
 *  1. search   — order search + selection
 *  2. type     — Return Order vs Return Items
 *  3. items    — per-line quantity selection (only for "Return Items")
 *  4. summary  — refund breakdown + confirmation
 *  5. done     — success state with link back to the order
 */
export default function OrderReturnPage() {
  const navigate = useNavigate()
  const { orderId: orderIdParam } = useParams<{ orderId?: string }>()

  const [step, setStep] = useState<Step>(orderIdParam ? 'type' : 'search')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orderIdParam ?? null,
  )
  const [scope, setScope] = useState<ReturnScope>('full')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<string>(REASONS[0])
  const [restoreToCard, setRestoreToCard] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedRecordId, setCompletedRecordId] = useState<string | null>(null)
  // Tracks the "I picked an order" state even if the deep-link orderId
  // is invalid, so the page can render the "not found" state instead of
  // silently switching back to the search step.
  const [deepLinkMissing, setDeepLinkMissing] = useState<boolean>(
    Boolean(orderIdParam),
  )

  // All searchable orders (most recent first). Limit to a reasonable window
  // so the search stays snappy — a 100-row table is more than enough for the
  // typeahead experience.
  const orders = useMemo(() => getTransactions().slice(0, 200), [])
  const members = useMemo(() => getMembers(), [])

  // Force "items" scope when the URL is opened directly with ?orderId=… and
  // the order is empty (no items to fully return).
  useEffect(() => {
    if (orderIdParam) {
      setSelectedOrderId(orderIdParam)
    }
  }, [orderIdParam])

  // If the user lands on this page with a deep-link ?orderId=… that
  // doesn't exist (typo / already-deleted / wrong business), surface an
  // empty state instead of silently routing them back to search.
  useEffect(() => {
    if (!orderIdParam) {
      setDeepLinkMissing(false)
      return
    }
    if (orders.length === 0) return
    const exists = orders.some((o) => o.id === orderIdParam)
    setDeepLinkMissing(!exists)
  }, [orderIdParam, orders])

  // Card lookup table — populated when the user selects an order.
  const [selectedCard, setSelectedCard] = useState<MembershipCard | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const selectedOrder: Transaction | null = useMemo(() => {
    if (!selectedOrderId) return null
    return orders.find((o) => o.id === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedCard(null)
      setSelectedMember(null)
      setSelectedLocation(null)
      return
    }
    setSelectedMember(selectedOrder.memberId ? getMember(selectedOrder.memberId) : null)
    setSelectedCard(selectedOrder.cardId ? getCard(selectedOrder.cardId) : null)
    const locs = getLocations()
    setSelectedLocation(
      selectedOrder.locationId
        ? locs.find((l) => l.id === selectedOrder.locationId) ?? null
        : null,
    )
    // Default the card-reverse checkbox based on payment method.
    setRestoreToCard(selectedOrder.method === 'membership')
    // Reset per-line qtys when the selected order changes.
    setQtys({})
  }, [selectedOrder])

  // Search results. The search matches id, member name, member email,
  // member phone, item name, item SKU, or operator name.
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders.slice(0, 30)
    return orders.filter((o) => {
      if (o.id.toLowerCase().includes(q)) return true
      if (o.operatorEmail.toLowerCase().includes(q)) return true
      if (o.reference?.toLowerCase().includes(q)) return true
      const member = o.memberId ? members.find((m) => m.id === o.memberId) : null
      if (member) {
        if (member.name.toLowerCase().includes(q)) return true
        if (member.email?.toLowerCase().includes(q)) return true
        if (member.phone?.toLowerCase().includes(q)) return true
      }
      return o.items.some((it) => {
        if (it.name.toLowerCase().includes(q)) return true
        if (it.productId.toLowerCase().includes(q)) return true
        return false
      })
    })
  }, [orders, search, members])

  // Per-line state for "Return Items".
  const itemRows = useMemo(() => {
    if (!selectedOrder) return []
    return selectedOrder.items.map((it) => {
      const key = `${it.productId}::${it.variantId ?? ''}`
      const alreadyReturned = getReturnedQty(
        selectedOrder.id,
        it.productId,
        it.variantId,
      )
      const remaining = Math.max(0, it.qty - alreadyReturned)
      const qty = qtys[key] ?? 0
      const unitPrice =
        it.qty > 0
          ? (it.price * it.qty - (it.lineDiscount ?? 0)) / it.qty
          : it.price
      const amount = Math.round(qty * unitPrice * 100) / 100
      return {
        key,
        productId: it.productId,
        variantId: it.variantId,
        name: it.name,
        variantName: it.variantName,
        originalQty: it.qty,
        alreadyReturned,
        remaining,
        qty,
        unitPrice: Math.round(unitPrice * 100) / 100,
        amount,
      }
    })
  }, [selectedOrder, qtys])

  const totalRefund = useMemo(() => {
    if (!selectedOrder) return 0
    if (scope === 'full') {
      return Math.round(
        selectedOrder.items.reduce(
          (s, it) => s + (it.price * it.qty - (it.lineDiscount ?? 0)),
          0,
        ) * 100,
      ) / 100
    }
    return Math.round(itemRows.reduce((s, r) => s + r.amount, 0) * 100) / 100
  }, [selectedOrder, scope, itemRows])

  // Returns already on this order.
  const previousReturns = useMemo(
    () => (selectedOrder ? getReturns(selectedOrder.id) : []),
    [selectedOrder],
  )
  const alreadyReturnedAmount = useMemo(
    () => (selectedOrder ? getReturnedAmount(selectedOrder.id) : 0),
    [selectedOrder],
  )

  // ---- Step transitions ------------------------------------------------

  function pickOrder(id: string) {
    setSelectedOrderId(id)
    setStep('type')
    setError(null)
    playCue('tap')
  }

  function pickScope(s: ReturnScope) {
    setScope(s)
    // Pre-populate the items qty map with "1" for every line so the user
    // sees immediate movement; they can change or zero out as needed.
    if (s === 'items' && selectedOrder) {
      const init: Record<string, number> = {}
      selectedOrder.items.forEach((it) => {
        const key = `${it.productId}::${it.variantId ?? ''}`
        init[key] = 1
      })
      setQtys(init)
    } else {
      setQtys({})
    }
    setStep(s === 'full' ? 'summary' : 'items')
    setError(null)
    playCue('tap')
  }

  function setQty(key: string, next: number, remaining: number) {
    setQtys((q) => ({
      ...q,
      [key]: Math.max(0, Math.min(remaining, next)),
    }))
    setError(null)
  }

  function goToSummary() {
    if (scope === 'items') {
      const anySelected = itemRows.some((r) => r.qty > 0)
      if (!anySelected) {
        setError('Pick at least one item and a quantity to return.')
        return
      }
      // Verify nothing exceeds remaining.
      for (const r of itemRows) {
        if (r.qty > r.remaining) {
          setError(
            `Can't return more of “${r.name}${r.variantName ? ` — ${r.variantName}` : ''}” than was originally sold minus previous returns.`,
          )
          return
        }
      }
    }
    setError(null)
    setStep('summary')
    playCue('tap')
  }

  function processReturn() {
    if (!selectedOrder) return
    setBusy(true)
    setError(null)

    const lines: ReturnLine[] =
      scope === 'full'
        ? []
        : itemRows
            .filter((r) => r.qty > 0)
            .map((r) => ({
              productId: r.productId,
              variantId: r.variantId,
              productName: r.name,
              variantName: r.variantName,
              qty: r.qty,
              unitPrice: r.unitPrice,
              amount: r.amount,
            }))

    const input: CreateReturnInput = {
      orderId: selectedOrder.id,
      scope,
      lines,
      reason,
      restoreToCard,
    }
    const result = createReturn(input)
    setBusy(false)
    if (!result) {
      setError(
        'Return could not be processed. The order may have already been fully returned, or the quantities you entered are no longer valid.',
      )
      playCue('warning')
      return
    }
    setCompletedRecordId(result.returnRecord.id)
    setStep('done')
    playCue('success')
  }

  // ---- Render helpers --------------------------------------------------

  function totalRow(label: string, value: string, sub?: string) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-600">{label}</div>
        <div className="text-right">
          <div className="text-sm font-bold text-ink-900">{value}</div>
          {sub && <div className="text-[10px] text-ink-500">{sub}</div>}
        </div>
      </div>
    )
  }

  function methodIcon(m: string) {
    if (m === 'cash') return <CreditCard className="h-3.5 w-3.5" />
    return <CreditCard className="h-3.5 w-3.5" />
  }

  // ---- Step components --------------------------------------------------

  function renderSearch() {
    return (
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-bold text-ink-900">Step 1 · Find the order</div>
            <p className="mt-0.5 text-xs text-ink-500">
              Search by order number, customer, product, or operator email.
            </p>
          </div>
          <FilterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search orders…"
          />
        </div>

        {searchResults.length === 0 ? (
          <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink-500 shadow-soft">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-bold text-ink-900">
              No orders match your search
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Try a different keyword, or clear the search to see the most
              recent orders.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100">
            {searchResults.slice(0, 20).map((o) => {
              const member = o.memberId
                ? members.find((m) => m.id === o.memberId)
                : null
              const alreadyReturned = getReturnedAmount(o.id)
              const fullyReturned = o.status === 'refunded'
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pickOrder(o.id)}
                    disabled={fullyReturned}
                    className={
                      fullyReturned
                        ? 'flex w-full items-center gap-3 px-4 py-3 text-left opacity-50'
                        : 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50/60'
                    }
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-ink-900">
                          {o.id}
                        </span>
                        {fullyReturned && (
                          <span className="rounded-pill border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                            Fully returned
                          </span>
                        )}
                        {alreadyReturned > 0 && !fullyReturned && (
                          <span className="rounded-pill border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                            Partial
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-ink-500">
                        {member ? member.name : 'Walk-in'} · {orderItemsCount(o)} item
                        {orderItemsCount(o) === 1 ? '' : 's'} · {formatDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-ink-900">
                        {formatCurrency(o.total)}
                      </div>
                      {alreadyReturned > 0 && (
                        <div className="text-[10px] text-amber-700">
                          {formatCurrency(-alreadyReturned)} returned
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  function renderType() {
    if (!selectedOrder) return null
    const member = selectedMember
    return (
      <div className="space-y-4">
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Selected order
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-ink-900">
                  {selectedOrder.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(
                    selectedOrder.status as TransactionStatus,
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel(selectedOrder.status as TransactionStatus)}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-ink-500">
                {member ? member.name : 'Walk-in'} · {formatDateTime(selectedOrder.createdAt)} ·{' '}
                {operatorName(selectedOrder.operatorEmail)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Total
              </div>
              <div className="text-base font-extrabold text-ink-900">
                {formatCurrency(selectedOrder.total)}
              </div>
              <div className="text-[11px] text-ink-500">
                {alreadyReturnedAmount > 0
                  ? `${formatCurrency(alreadyReturnedAmount)} already returned`
                  : 'No returns yet'}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="text-sm font-bold text-ink-900">Step 2 · Choose return type</div>
          <p className="mt-0.5 text-xs text-ink-500">
            Return the complete eligible order, or pick specific items to
            return.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => pickScope('full')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-ink-900">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">Return order</div>
                <p className="mt-0.5 text-xs text-ink-500">
                  Refund the complete eligible order — every remaining
                  item in one go.
                </p>
                <div className="mt-2 text-sm font-extrabold text-ink-900">
                  {formatCurrency(
                    selectedOrder.total - alreadyReturnedAmount,
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-ink-500">
                  Refundable amount
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => pickScope('items')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-brand-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">Return items</div>
                <p className="mt-0.5 text-xs text-ink-500">
                  Pick which line items and quantities to return. Useful
                  for partial refunds.
                </p>
                <div className="mt-2 text-sm font-extrabold text-ink-900">
                  {selectedOrder.items.length} item
                  {selectedOrder.items.length === 1 ? '' : 's'} eligible
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderItems() {
    if (!selectedOrder) return null
    return (
      <div className="space-y-4">
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Selected order
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-ink-900">
                  {selectedOrder.id}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Order total
              </div>
              <div className="text-base font-extrabold text-ink-900">
                {formatCurrency(selectedOrder.total)}
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-100 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink-900">Step 3 · Select items</div>
                <p className="mt-0.5 text-xs text-ink-500">
                  Choose the quantity to return for each line. The
                  "Returnable" column shows what's left after previous
                  returns.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Refund total
                </div>
                <div className="text-base font-extrabold text-ink-900">
                  {formatCurrency(totalRefund)}
                </div>
              </div>
            </div>
          </div>
          <ResponsiveTable
            mode="scroll"
            columns={[
              { label: 'Product / variant' },
              { label: 'Original', className: 'w-[80px] text-right' },
              { label: 'Returned', className: 'w-[90px] text-right' },
              { label: 'Returnable', className: 'w-[90px] text-right' },
              { label: 'Unit price', className: 'w-[100px] text-right' },
              { label: 'Return qty', className: 'w-[160px] text-center' },
              { label: 'Refund', className: 'w-[100px] text-right' },
            ]}
            rows={itemRows}
            rowKey={(r) => r.key}
            minWidth="760px"
            renderRow={(r) => (
              <>
                <td className="px-4 py-3 align-top">
                  <div className="truncate text-sm font-semibold text-ink-900">
                    {r.name}
                  </div>
                  {r.variantName && (
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-brand-700">
                      {r.variantName}
                    </div>
                  )}
                  <div className="truncate font-mono text-[10px] text-ink-400">
                    {r.productId}
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink-700">
                  {r.originalQty}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-amber-700">
                  {r.alreadyReturned}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink-700">
                  {r.remaining}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink-700">
                  {formatCurrencyPlain(r.unitPrice)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="mx-auto flex w-fit items-center gap-1 rounded-xl border border-ink-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setQty(r.key, r.qty - 1, r.remaining)}
                      disabled={r.remaining === 0 || r.qty <= 0}
                      className="grid h-7 w-7 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Decrease return qty for ${r.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-ink-900">
                      {r.qty}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(r.key, r.qty + 1, r.remaining)}
                      disabled={r.remaining === 0 || r.qty >= r.remaining}
                      className="grid h-7 w-7 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Increase return qty for ${r.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums">
                  <span className={r.qty > 0 ? 'font-extrabold text-rose-700' : 'text-ink-500'}>
                    {r.qty > 0 ? formatCurrency(-r.amount) : formatCurrencyPlain(0)}
                  </span>
                </td>
              </>
            )}
            renderCard={() => null}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep('type')}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={goToSummary}
            className="btn-primary"
          >
            Review summary <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  function renderSummary() {
    if (!selectedOrder) return null
    const canRefundCard =
      !!selectedOrder.cardId &&
      (selectedOrder.method === 'membership' || restoreToCard)
    return (
      <div className="space-y-4">
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Order
              </div>
              <div className="mt-1 font-mono text-base font-extrabold text-ink-900">
                {selectedOrder.id}
              </div>
              <div className="mt-0.5 text-xs text-ink-500">
                {selectedMember?.name ?? 'Walk-in'} · {formatDateTime(selectedOrder.createdAt)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${methodPillClass(
                    selectedOrder.method as PaymentMethod,
                  )}`}
                >
                  {methodIcon(selectedOrder.method)}
                  {methodLabel(selectedOrder.method)}
                </span>
                {selectedCard && (
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-2.5 py-0.5 text-[11px] font-mono font-semibold text-ink-700">
                    <CreditCard className="h-3 w-3" />
                    {selectedCard.cardNumber}
                  </span>
                )}
                {selectedLocation && (
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink-700">
                    {selectedLocation.name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Refund amount
              </div>
              <div className="text-2xl font-extrabold text-ink-900">
                {formatCurrency(totalRefund)}
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-100 px-5 py-3">
            <div className="text-sm font-bold text-ink-900">
              Step 4 · Review &amp; confirm
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              Double-check the items and amount, then process the return.
            </p>
          </div>
          <ul className="divide-y divide-ink-100">
            {scope === 'full'
              ? selectedOrder.items.map((it) => {
                  const gross = it.price * it.qty - (it.lineDiscount ?? 0)
                  return (
                    <li
                      key={`${it.productId}::${it.variantId ?? ''}`}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {it.name}
                          {it.variantName && (
                            <span className="ml-1 text-[11px] font-semibold text-brand-700">
                              · {it.variantName}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">
                          {it.qty} × {formatCurrencyPlain(it.price)} ={' '}
                          {formatCurrencyPlain(gross)}
                        </div>
                      </div>
                      <div className="text-right text-sm font-bold text-rose-700">
                        −{formatCurrencyPlain(gross)}
                      </div>
                    </li>
                  )
                })
              : itemRows
                  .filter((r) => r.qty > 0)
                  .map((r) => (
                    <li
                      key={r.key}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {r.name}
                          {r.variantName && (
                            <span className="ml-1 text-[11px] font-semibold text-brand-700">
                              · {r.variantName}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">
                          {r.qty} × {formatCurrencyPlain(r.unitPrice)} ={' '}
                          {formatCurrencyPlain(r.amount)}
                        </div>
                      </div>
                      <div className="text-right text-sm font-bold text-rose-700">
                        −{formatCurrencyPlain(r.amount)}
                      </div>
                    </li>
                  ))}
          </ul>
          <div className="space-y-1 border-t border-ink-100 bg-ink-50/40 px-5 py-3 text-xs text-ink-600">
            {totalRow('Items subtotal', formatCurrencyPlain(totalRefund))}
            <div className="border-t border-ink-100 pt-2 text-sm font-extrabold text-ink-900">
              <div className="flex items-center justify-between">
                <span>Total refund</span>
                <span className="font-mono">{formatCurrency(totalRefund)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div>
            <label className="label">Reason</label>
            <select
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedCard && (
            <label className="mt-3 flex items-start gap-2 rounded-2xl border border-ink-200 bg-white p-3 text-sm">
              <input
                type="checkbox"
                checked={canRefundCard}
                onChange={(e) => setRestoreToCard(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
              />
              <span>
                <span className="block font-semibold text-ink-900">
                  Refund to membership card
                </span>
                <span className="text-[11px] text-ink-500">
                  Add {formatCurrencyPlain(totalRefund)} back to{' '}
                  {selectedCard.cardNumber} (current balance{' '}
                  {formatCurrencyPlain(selectedCard.balance)}).
                  {selectedOrder.method !== 'membership' &&
                    ' This order was paid via ' +
                      methodLabel(selectedOrder.method) +
                      ' — uncheck if you want to refund externally.'}
                </span>
              </span>
            </label>
          )}

          <div className="mt-3 rounded-2xl border border-ink-200 bg-ink-50/50 p-3 text-xs text-ink-600">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
              What happens next
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>The original order is preserved (no deletion).</li>
              <li>A negative refund transaction is created and linked.</li>
              <li>
                The order status updates to{' '}
                {totalRefund + alreadyReturnedAmount >= selectedOrder.total
                  ? 'refunded'
                  : 'partially refunded'}
                .
              </li>
              <li>
                {selectedCard && restoreToCard
                  ? `The card balance is credited by ${formatCurrencyPlain(totalRefund)}.`
                  : 'No card balance change.'}
              </li>
              <li>Returned products are restocked to inventory.</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep(scope === 'full' ? 'type' : 'items')}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={processReturn}
            disabled={busy || totalRefund <= 0}
            className="inline-flex items-center gap-2 rounded-pill bg-rose-500 py-3 text-sm font-bold text-white shadow-soft hover:bg-rose-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {busy ? 'Processing…' : `Process return · ${formatCurrency(totalRefund)}`}
          </button>
        </div>
      </div>
    )
  }

  function renderDone() {
    if (!selectedOrder) return null
    return (
      <div className="card grid place-items-center px-6 py-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="mt-3 text-base font-bold text-ink-900">Return processed</div>
        <p className="mt-1 max-w-md text-sm text-ink-600">
          <span className="font-bold text-ink-900">
            {formatCurrency(totalRefund)}
          </span>{' '}
          was refunded on order{' '}
          <span className="font-mono font-bold">{selectedOrder.id}</span>. The
          original order is preserved.
        </p>
        {selectedCard && restoreToCard && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-ink-50 px-3 py-1 text-[11px] font-mono text-ink-700">
            <CreditCard className="h-3 w-3" /> {selectedCard.cardNumber}
            {' · '}balance{' '}
            {formatCurrencyPlain(
              (selectedCard.balance + (selectedOrder.method === 'membership' || restoreToCard ? totalRefund : 0)),
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/app/orders?focus=${selectedOrder.id}`)}
            className="btn-primary"
          >
            <Check className="h-4 w-4" /> View order
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('search')
              setSelectedOrderId(null)
              setScope('full')
              setQtys({})
              setReason(REASONS[0])
              setRestoreToCard(true)
              setCompletedRecordId(null)
              setError(null)
            }}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4" /> Process another return
          </button>
          <Link to="/app/orders" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>
        {completedRecordId && (
          <div className="mt-4 text-[11px] text-ink-500">
            Reference: <span className="font-mono">{completedRecordId}</span>
          </div>
        )}
      </div>
    )
  }

  // ---- Stepper --------------------------------------------------------

  function stepBadge(label: string, active: boolean, done: boolean) {
    return (
      <div
        className={
          active
            ? 'flex items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white'
            : done
            ? 'flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-ink-900'
            : 'flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500'
        }
      >
        <span
          className={
            active
              ? 'grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] font-extrabold text-ink-900'
              : done
              ? 'grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] font-extrabold text-ink-900'
              : 'grid h-5 w-5 place-items-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-700'
          }
        >
          {done ? <Check className="h-3 w-3" /> : ''}
        </span>
        {label}
      </div>
    )
  }

  function Stepper() {
    const order: Step[] = ['search', 'type', 'items', 'summary', 'done']
    const idx = order.indexOf(step)
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {order.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {stepBadge(
              STEP_TITLES[s],
              s === step,
              i < idx,
            )}
            {i < order.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-ink-400" />}
          </div>
        ))}
      </div>
    )
  }

  // Top-level summary stats (visible at the page top across all steps).
  const pageSummary = useMemo(() => {
    const total = orders.length
    const refundable = orders.filter(
      (o) => o.status !== 'refunded' && o.status !== 'failed',
    ).length
    const fullyRefunded = orders.filter((o) => o.status === 'refunded').length
    return { total, refundable, fullyRefunded }
  }, [orders])

  return (
    <div>
      <PageHeader
        title="Add return"
        subtitle="Process a return / refund against an existing order. The original order and transaction are preserved."
        actions={
          <Link to="/app/orders" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Orders on file"
          value={String(pageSummary.total)}
          icon={Inbox}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Eligible for return"
          value={String(pageSummary.refundable)}
          icon={RotateCcw}
          tone="indigo"
          variant="top"
        />
        <StatCard
          label="Already fully returned"
          value={String(pageSummary.fullyRefunded)}
          icon={CheckCircle2}
          tone="rose"
          variant="top"
        />
      </div>

      <Stepper />

      {step === 'search' && !deepLinkMissing && renderSearch()}
      {step === 'type' && !deepLinkMissing && renderType()}
      {step === 'items' && !deepLinkMissing && renderItems()}
      {step === 'summary' && !deepLinkMissing && renderSummary()}
      {step === 'done' && renderDone()}
      {deepLinkMissing && (
        <div className="card grid place-items-center px-6 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="mt-3 text-base font-bold text-ink-900">Order not found</div>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            We couldn't find an order with the id{' '}
            <span className="font-mono text-ink-700">{orderIdParam}</span>. It may
            have been deleted, or the link is from a different business.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('search')
                setDeepLinkMissing(false)
              }}
              className="btn-primary"
            >
              Find another order
            </button>
            <Link to="/app/orders" className="btn-secondary">
              Back to orders
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
