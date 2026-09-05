import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Hash,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Printer,
  Receipt as ReceiptIcon,
  RotateCcw,
  Share2,
  ShoppingBag,
  Store,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { DrawerShell } from './Drawer'
import { getProduct } from '../pos-store'
import {
  buildOrderContext,
  formatCurrency,
  formatCurrencyPlain,
  formatDate,
  formatDateTime,
  formatTime,
  methodLabel,
  methodPillClass,
  operatorName,
  orderItemsCount,
  statusLabel,
  statusPillClass,
  type OrderContext,
} from '../order-utils'
import type {
  Location,
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from '../types'
import { getBusiness } from '../store'
import {
  adjustTransaction,
  getFinancialEvents,
  getReturns,
  refundTransaction,
  remainingRefundable,
} from '../orders-store'
import { getCurrentOperator, operatorHas } from '../operators-store'

interface OrderDetailsDrawerProps {
  txn: Transaction
  members: Member[]
  cards: MembershipCard[]
  locations: Location[]
  onClose: () => void
  onChanged?: () => void
}

export function OrderDetailsDrawer({
  txn,
  members,
  cards,
  locations,
  onClose,
  onChanged,
}: OrderDetailsDrawerProps) {
  const ctx = useMemo(() => buildOrderContext(txn, members, cards, locations), [
    txn,
    members,
    cards,
    locations,
  ])
  const events = useMemo(() => getFinancialEvents(txn.id), [txn.id])
  const business = getBusiness()
  const currency = business?.currency ? '$' : '$'

  const [toast, setToast] = useState<string | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

  const remaining = remainingRefundable(txn.id)
  const refundable = remaining > 0 && (txn.status === 'completed' || txn.status === 'partially_refunded' || txn.status === 'adjusted')
  const me = getCurrentOperator()
  const canRefund = operatorHas(me, 'orders.refund') || operatorHas(me, 'pos.refund') || operatorHas(me, 'transactions.refund')
  const canAdjust = operatorHas(me, 'transactions.adjust') || operatorHas(me, 'pos.adjust')

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
    onChanged?.()
  }

  return (
    <>
      <DrawerShell
        size="full"
        title={`Order ${txn.id}`}
        description={`${orderItemsCount(txn)} item${orderItemsCount(txn) === 1 ? '' : 's'} · placed ${formatDateTime(txn.createdAt)}`}
        onClose={onClose}
        headerExtra={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${statusPillClass(
                txn.status as TransactionStatus,
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel(txn.status as TransactionStatus)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${methodPillClass(
                txn.method as PaymentMethod,
              )}`}
            >
              {methodIcon(txn.method)}
              {methodLabel(txn.method)}
            </span>
            {canRefund && refundable && (
              <Link
                to={`/app/orders/return/${txn.id}`}
                className="inline-flex items-center gap-1.5 rounded-pill border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Add return
              </Link>
            )}
            {canRefund && refundable && (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                title="Issue a quick full or partial refund"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Refund
              </button>
            )}
            {canAdjust && (
              <button
                type="button"
                onClick={() => setAdjustOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Adjust
              </button>
            )}
            <Link
              to={`/app/pos/receipt/${txn.id}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              <ReceiptIcon className="h-3.5 w-3.5" />
              Open receipt
            </Link>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-ink-500">
              Last updated {formatDateTime(txn.createdAt)}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={() => downloadText(buildReceiptText(txn, business?.name ?? 'EzSale', currency))}
                className="btn-secondary"
              >
                <Download className="h-4 w-4" /> Save
              </button>
              <button
                type="button"
                onClick={() => share(txn, business?.name ?? 'EzSale', currency)}
                className="btn-secondary"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,320px]">
          {/* LEFT — line items + totals */}
          <div className="space-y-4">
            {/* Summary header */}
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-500">
                    Order number
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-bold text-ink-900">
                    <Hash className="h-3.5 w-3.5 text-ink-400" />
                    {txn.id}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-ink-500">
                    Total
                  </div>
                  <div className="mt-0.5 text-2xl font-extrabold text-ink-900">
                    {formatCurrency(txn.total, currency)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Items" value={String(orderItemsCount(txn))} />
                <Stat label="Subtotal" value={formatCurrencyPlain(txn.subtotal, currency)} />
                <Stat
                  label="Discount"
                  value={txn.discount > 0 ? `−${formatCurrencyPlain(txn.discount, currency)}` : `${currency}0.00`}
                  tone={txn.discount > 0 ? 'rose' : 'neutral'}
                />
                <Stat label="Tax" value={formatCurrencyPlain(txn.tax, currency)} />
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="text-sm font-bold text-ink-900">Items</div>
                <div className="text-[11px] text-ink-500">
                  {txn.items.length} line{txn.items.length === 1 ? '' : 's'}
                </div>
              </div>
              {txn.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-500">
                  No items recorded on this order.
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {txn.items.map((it, idx) => {
                    const lineTotal = it.price * it.qty - (it.lineDiscount ?? 0)
                    const product = getProduct(it.productId)
                    return (
                      <li key={idx} className="flex items-center gap-3 px-4 py-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink-900">
                            {it.name}
                          </div>
                          {it.variantName && (
                            <div className="mt-0.5 truncate text-[11px] font-semibold text-brand-700">
                              {it.variantName}
                            </div>
                          )}
                          {(product?.productCode || product?.sku) && (
                            <div className="truncate font-mono text-[10px] text-ink-400">
                              {product.productCode ? product.productCode : `SKU ${product.sku}`}
                            </div>
                          )}
                          <div className="text-[11px] text-ink-500">
                            {formatCurrencyPlain(it.price, currency)} each
                            {it.lineDiscount ? (
                              <span className="ml-2 text-rose-600">
                                −{formatCurrencyPlain(it.lineDiscount, currency)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-ink-500">× {it.qty}</div>
                          <div className="text-sm font-bold text-ink-900">
                            {formatCurrencyPlain(lineTotal, currency)}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-3 text-[11px] text-ink-500">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrencyPlain(txn.subtotal, currency)}</span>
                </div>
                {txn.discount > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span>Discount</span>
                    <span className="font-mono text-rose-600">
                      −{formatCurrencyPlain(txn.discount, currency)}
                    </span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrencyPlain(txn.tax, currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-sm font-extrabold text-ink-900">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(txn.total, currency)}</span>
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="text-sm font-bold text-ink-900">Payment</div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${methodPillClass(
                    txn.method as PaymentMethod,
                  )}`}
                >
                  {methodIcon(txn.method)}
                  {methodLabel(txn.method)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2">
                <PaymentRow
                  label="Amount tendered"
                  value={
                    typeof txn.amountTendered === 'number'
                      ? formatCurrencyPlain(txn.amountTendered, currency)
                      : '—'
                  }
                />
                <PaymentRow
                  label="Change returned"
                  value={
                    typeof txn.change === 'number'
                      ? formatCurrencyPlain(txn.change, currency)
                      : '—'
                  }
                />
                {txn.cardNumber && (
                  <PaymentRow label="Card" value={txn.cardNumber} mono />
                )}
                {txn.reference && (
                  <PaymentRow label="Reference" value={txn.reference} mono />
                )}
                <PaymentRow
                  label="Operator"
                  value={operatorName(txn.operatorEmail)}
                  sub={txn.operatorEmail}
                />
                <PaymentRow label="Status" value={statusLabel(txn.status as TransactionStatus)} />
              </div>
            </div>

            {/* Returns / refunds — item-level detail so cashiers can see
                exactly which lines were returned and what's left. */}
            <ReturnsPanel txn={txn} currency={currency} />

            {/* Audit trail */}
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="text-sm font-bold text-ink-900">Audit trail</div>
                <span className="text-[11px] text-ink-500">
                  {events.length} event{events.length === 1 ? '' : 's'}
                </span>
              </div>
              {events.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-ink-500">
                  No adjustments or refunds recorded on this order.
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                        {e.type === 'refund' || e.type === 'partial_refund' || e.type === 'return' ? (
                          <RotateCcw className="h-4 w-4 text-rose-600" />
                        ) : e.type === 'adjustment' ? (
                          <PencilLine className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Wallet className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink-900">
                            {eventLabel(e.type)}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              e.amount < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {formatCurrency(e.amount, currency)}
                          </span>
                        </div>
                        {e.reason && (
                          <div className="text-[11px] text-ink-500">{e.reason}</div>
                        )}
                        <div className="mt-0.5 text-[11px] text-ink-500">
                          {formatDateTime(e.at)} · by {e.by}
                          {typeof e.balanceBefore === 'number' &&
                            typeof e.balanceAfter === 'number' && (
                              <span className="ml-1.5">
                                · card balance {formatCurrencyPlain(e.balanceBefore, currency)} →{' '}
                                {formatCurrencyPlain(e.balanceAfter, currency)}
                              </span>
                            )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {txn.note && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <span className="font-bold">Operator note:</span> {txn.note}
              </div>
            )}
          </div>

          {/* RIGHT — meta */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">Customer</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-ink-900">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {ctx.member ? (
                    <>
                      <Link
                        to={`/app/users/${ctx.member.id}`}
                        className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {ctx.member.name}
                      </Link>
                      <div className="truncate text-[11px] text-ink-500">
                        {ctx.member.email ?? '—'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-ink-900">Walk-in customer</div>
                      <div className="text-[11px] text-ink-500">
                        No member linked to this order.
                      </div>
                    </>
                  )}
                </div>
                {ctx.member && (
                  <Link
                    to={`/app/users/${ctx.member.id}`}
                    className="grid h-7 w-7 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
                    aria-label="View member"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {ctx.card && (
                <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/40 p-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-500">
                    <CreditCard className="h-3 w-3" /> Membership card
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <Link
                      to={`/app/cards/${ctx.card.id}`}
                      className="font-mono text-sm font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {ctx.card.cardNumber}
                    </Link>
                    <span className="text-[11px] font-bold text-ink-700">
                      {ctx.card.tier}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">Operator &amp; terminal</div>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <UserIcon className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">Operator</div>
                    <div className="truncate text-sm font-semibold text-ink-900">
                      {operatorName(txn.operatorEmail)}
                    </div>
                    <div className="truncate text-[11px] text-ink-500">{txn.operatorEmail}</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">
                      Location
                    </div>
                    {ctx.location ? (
                      <Link
                        to="/app/locations"
                        className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {ctx.location.name}
                      </Link>
                    ) : (
                      <div className="truncate text-sm font-semibold text-ink-900">
                        Unknown location
                      </div>
                    )}
                    {ctx.location?.code && (
                      <div className="text-[11px] text-ink-500">{ctx.location.code}</div>
                    )}
                    {ctx.location?.address && (
                      <div className="text-[11px] text-ink-500">{ctx.location.address}</div>
                    )}
                  </div>
                </li>
                {txn.terminalId && (
                  <li className="flex items-start gap-2">
                    <Store className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-ink-500">
                        Terminal
                      </div>
                      <div className="truncate text-sm font-semibold text-ink-900">
                        {ctx.location?.terminals.find((t) => t.id === txn.terminalId)?.name ??
                          txn.terminalId}
                      </div>
                      <div className="font-mono text-[11px] text-ink-500">
                        {ctx.location?.terminals.find((t) => t.id === txn.terminalId)?.code ??
                          ''}
                      </div>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Store className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">
                      Business
                    </div>
                    <div className="truncate text-sm font-semibold text-ink-900">
                      {business?.name ?? 'EzSale'}
                    </div>
                    {business?.address && (
                      <div className="truncate text-[11px] text-ink-500">{business.address}</div>
                    )}
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">Timeline</div>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">Placed</div>
                    <div className="text-sm font-semibold text-ink-900">
                      {formatDate(txn.createdAt)}
                    </div>
                    <div className="text-[11px] text-ink-500">{formatTime(txn.createdAt)}</div>
                  </div>
                </li>
                {txn.settledAt && (
                  <li className="flex items-start gap-2">
                    <Banknote className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-ink-500">
                        Settled
                      </div>
                      <div className="text-sm font-semibold text-ink-900">
                        {formatDate(txn.settledAt)}
                      </div>
                      <div className="text-[11px] text-ink-500">{formatTime(txn.settledAt)}</div>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">Receipt</div>
              <p className="mt-1 text-[11px] text-ink-500">
                Generated automatically once the order completes. Open the receipt to
                print, share, or save it.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  to={`/app/pos/receipt/${txn.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ReceiptIcon className="h-3.5 w-3.5" />
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </DrawerShell>

      {refundOpen && (
        <RefundDialog
          txn={txn}
          remaining={remaining}
          currency={currency}
          ctx={ctx}
          onClose={() => setRefundOpen(false)}
          onDone={(msg) => {
            setRefundOpen(false)
            flash(msg)
          }}
        />
      )}
      {adjustOpen && (
        <AdjustDialog
          txn={txn}
          currency={currency}
          onClose={() => setAdjustOpen(false)}
          onDone={(msg) => {
            setAdjustOpen(false)
            flash(msg)
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-pill bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
            <RotateCcw className="h-4 w-4 text-brand-400" />
            {toast}
          </div>
        </div>
      )}
    </>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'rose'
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
      <div
        className={`mt-0.5 text-base font-extrabold ${
          tone === 'rose' ? 'text-rose-600' : 'text-ink-900'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function PaymentRow({
  label,
  value,
  sub,
  mono,
}: {
  label: string
  value: string
  sub?: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold text-ink-900 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
      {sub && <div className="truncate text-[11px] text-ink-500">{sub}</div>}
    </div>
  )
}

function methodIcon(m: string) {
  switch (m) {
    case 'cash':
      return <Banknote className="h-3.5 w-3.5" />
    case 'card':
      return <CreditCard className="h-3.5 w-3.5" />
    case 'bank':
      return <Wallet className="h-3.5 w-3.5" />
    case 'wallet':
      return <Wallet className="h-3.5 w-3.5" />
    case 'membership':
      return <CreditCard className="h-3.5 w-3.5" />
    default:
      return null
  }
}

function eventLabel(t: string) {
  switch (t) {
    case 'refund':
      return 'Full refund'
    case 'partial_refund':
      return 'Partial refund'
    case 'return':
      return 'Return processed'
    case 'adjustment':
      return 'Manual adjustment'
    case 'topup':
      return 'Top-up'
    case 'fee':
      return 'Fee'
    default:
      return t
  }
}

// ---- Refund dialog -------------------------------------------------------

function RefundDialog({
  txn,
  remaining,
  currency,
  ctx,
  onClose,
  onDone,
}: {
  txn: Transaction
  remaining: number
  currency: string
  ctx: OrderContext
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [mode, setMode] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState(String(remaining.toFixed(2)))
  const [reason, setReason] = useState('Customer request')
  const [reverseCard, setReverseCard] = useState(true)
  const [busy, setBusy] = useState(false)

  function submit() {
    const a = mode === 'full' ? remaining : Math.max(0, Number(amount) || 0)
    if (a <= 0) return
    setBusy(true)
    const result = refundTransaction(txn.id, {
      amount: a,
      reason: reason.trim() || 'No reason provided',
      reverseCardBalance: reverseCard,
    })
    setBusy(false)
    if (result) {
      onDone(`Refund of ${formatCurrency(-a, currency)} processed.`)
    } else {
      onDone('Refund could not be processed.')
    }
  }

  const preview = mode === 'full' ? remaining : Math.max(0, Number(amount) || 0)

  return (
    <ConfirmShell title="Issue refund" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-[11px] text-ink-600">
          Issuing a refund creates a negative transaction linked to this order and
          updates the parent status. If a membership card was charged, you can
          also reverse the card balance here.
        </div>
        <div>
          <label className="label">Amount</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={
                mode === 'full'
                  ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/30'
                  : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
              }
            >
              Full ({formatCurrencyPlain(remaining, currency)})
            </button>
            <button
              type="button"
              onClick={() => setMode('partial')}
              className={
                mode === 'partial'
                  ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-500/30'
                  : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
              }
            >
              Partial
            </button>
          </div>
          {mode === 'partial' && (
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                {currency}
              </span>
              <input
                type="number"
                min={0}
                max={remaining}
                step="0.01"
                className="input pl-6"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <label className="label">Reason</label>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Customer request</option>
            <option>Duplicate charge</option>
            <option>Item not available</option>
            <option>Damaged / wrong item</option>
            <option>Goodwill gesture</option>
            <option>Other</option>
          </select>
        </div>
        {ctx.card && (
          <label className="flex items-start gap-2 rounded-xl border border-ink-200 bg-white p-3 text-sm">
            <input
              type="checkbox"
              checked={reverseCard}
              onChange={(e) => setReverseCard(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
            />
            <span>
              <span className="block font-semibold text-ink-900">
                Reverse card balance
              </span>
              <span className="text-[11px] text-ink-500">
                Add {formatCurrencyPlain(preview, currency)} back to {ctx.card.cardNumber}
                {' '}— current balance {formatCurrencyPlain(ctx.card.balance, currency)}.
              </span>
            </span>
          </label>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-4">
        <button onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || preview <= 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-rose-500 py-3 text-sm font-bold text-white shadow-soft hover:bg-rose-600 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Refund {formatCurrency(preview, currency)}
        </button>
      </div>
    </ConfirmShell>
  )
}

// ---- Adjust dialog -------------------------------------------------------

function AdjustDialog({
  txn,
  currency,
  onClose,
  onDone,
}: {
  txn: Transaction
  currency: string
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [amount, setAmount] = useState('0.00')
  const [reason, setReason] = useState('Goodwill discount')
  const [busy, setBusy] = useState(false)
  const a = Number(amount) || 0

  function submit() {
    if (a === 0) return
    setBusy(true)
    const result = adjustTransaction(txn.id, {
      amount: a,
      reason: reason.trim() || 'Manual adjustment',
    })
    setBusy(false)
    if (result) {
      onDone(`Adjustment of ${formatCurrency(a, currency)} recorded.`)
    } else {
      onDone('Adjustment could not be applied.')
    }
  }

  return (
    <ConfirmShell title="Manual adjustment" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-[11px] text-ink-600">
          Adjustments modify the recorded total outside of a refund. Use a positive
          amount to add a charge (e.g. correction fee) and a negative amount for
          a goodwill discount.
        </div>
        <div>
          <label className="label">Adjustment amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              className="input pl-6"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="mt-1 text-[11px] text-ink-500">
            Use a negative number for discounts (e.g. -5.00).
          </div>
        </div>
        <div>
          <label className="label">Reason</label>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Goodwill discount</option>
            <option>Compensation</option>
            <option>Pricing correction</option>
            <option>Service charge</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-4">
        <button onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || a === 0}
          className="btn-primary flex-1 py-3 disabled:opacity-50"
        >
          <PencilLine className="h-4 w-4" /> Apply adjustment
        </button>
      </div>
    </ConfirmShell>
  )
}

function ConfirmShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="text-base font-bold text-ink-900">{title}</div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function buildReceiptText(t: Transaction, bizName: string, currency: string) {
  const lines: string[] = []
  const dash = '--------------------------------'
  lines.push(bizName.toUpperCase())
  lines.push('Receipt: ' + t.id)
  lines.push('Date: ' + new Date(t.createdAt).toLocaleString())
  lines.push('Operator: ' + t.operatorEmail)
  lines.push('Method: ' + methodLabel(t.method))
  lines.push(dash)
  t.items.forEach((it) => {
    lines.push(
      `${it.name}  x${it.qty}  ${formatCurrencyPlain(it.price * it.qty, currency)}`,
    )
    if (it.variantName) {
      lines.push(`  Variant: ${it.variantName}`)
    }
  })
  lines.push(dash)
  lines.push('Subtotal: ' + formatCurrencyPlain(t.subtotal, currency))
  if (t.discount > 0) lines.push('Discount: -' + formatCurrencyPlain(t.discount, currency))
  if (t.tax > 0) lines.push('Tax: ' + formatCurrencyPlain(t.tax, currency))
  lines.push('TOTAL: ' + formatCurrencyPlain(t.total, currency))
  if (t.method === 'cash' && typeof t.change === 'number') {
    lines.push('Tendered: ' + formatCurrencyPlain(t.amountTendered ?? t.total, currency))
    lines.push('Change: ' + formatCurrencyPlain(t.change, currency))
  }
  if (t.cardNumber) lines.push('Card: ' + t.cardNumber)
  if (t.reference) lines.push('Reference: ' + t.reference)
  lines.push(dash)
  lines.push('Thank you for your visit!')
  return lines.join('\n')
}

function share(t: Transaction, bizName: string, currency: string) {
  const text = buildReceiptText(t, bizName, currency)
  if (typeof navigator === 'undefined') return
  if (navigator.share) {
    navigator
      .share({ title: `Order ${t.id}`, text })
      .catch(() => {
        /* user cancelled */
      })
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      /* ignore */
    })
  }
}

function downloadText(text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `order-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Email/phone icons are referenced but unused in the meta panel; the imports
// keep tree-shaking happy if we extend the right-hand column with them later.
void Mail
void Phone

// ---- Returns panel ------------------------------------------------------
//
// Shows every `ReturnRecord` against the current order — original vs
// returned qty, remaining returnable, refund amount, and card-balance
// snapshot. This sits next to the audit trail so operators can see both
// "what happened" (audit events) and "what was returned" (return records).

function ReturnsPanel({
  txn,
  currency,
}: {
  txn: Transaction
  currency: string
}) {
  const records = useMemo(() => getReturns(txn.id), [txn.id])

  // Per-line roll-up: how much was returned, what's left.
  const rollup = useMemo(() => {
    const map = new Map<
      string,
      { returned: number; amount: number; lastRecordId: string | null }
    >()
    records.forEach((r) => {
      r.lines.forEach((l) => {
        const key = `${l.productId}::${l.variantId ?? ''}`
        const cur = map.get(key) ?? { returned: 0, amount: 0, lastRecordId: null }
        cur.returned += l.qty
        cur.amount += l.amount
        cur.lastRecordId = r.id
        map.set(key, cur)
      })
    })
    return map
  }, [records])

  const totalReturned = records.reduce((s, r) => s + r.amount, 0)
  const hasAny = records.length > 0

  if (!hasAny) return null

  return (
    <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-rose-600" />
          <div className="text-sm font-bold text-ink-900">Returns</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-ink-500">
            {records.length} record{records.length === 1 ? '' : 's'}
          </div>
          <div className="text-sm font-extrabold text-rose-700">
            −{formatCurrency(totalReturned, currency)}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-ink-100">
        {records.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">
                    {r.scope === 'full' ? 'Full return' : 'Item return'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-ink-500">
                    {formatDateTime(r.createdAt)} · by {r.by}
                  </span>
                  {r.restoredToCard && (
                    <span className="inline-flex items-center gap-1 rounded-pill border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Card refunded
                    </span>
                  )}
                </div>
                {r.reason && (
                  <div className="text-[11px] text-ink-500">Reason: {r.reason}</div>
                )}
                {r.restoredToCard &&
                  typeof r.cardBalanceBefore === 'number' &&
                  typeof r.cardBalanceAfter === 'number' && (
                    <div className="text-[11px] text-ink-500">
                      Card balance {formatCurrencyPlain(r.cardBalanceBefore, currency)} →{' '}
                      {formatCurrencyPlain(r.cardBalanceAfter, currency)}
                    </div>
                  )}
              </div>
              <div className="text-right text-sm font-extrabold text-rose-700">
                −{formatCurrency(r.amount, currency)}
              </div>
            </div>
            <ul className="mt-2 space-y-0.5 rounded-xl border border-ink-100 bg-ink-50/40 p-2 text-[11px]">
              {r.lines.map((l) => (
                <li
                  key={`${r.id}-${l.productId}-${l.variantId ?? ''}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-ink-700">
                    {l.qty} × {l.productName}
                    {l.variantName && (
                      <span className="ml-1 text-brand-700">· {l.variantName}</span>
                    )}
                  </span>
                  <span className="font-mono text-rose-700">
                    −{formatCurrencyPlain(l.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {/* Per-line status: how much was returned and what's left. */}
      <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
          Returnable by item
        </div>
        <ul className="space-y-1 text-[11px]">
          {txn.items.map((it) => {
            const key = `${it.productId}::${it.variantId ?? ''}`
            const r = rollup.get(key) ?? { returned: 0, amount: 0, lastRecordId: null }
            const remaining = Math.max(0, it.qty - r.returned)
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-white px-2 py-1.5"
              >
                <span className="truncate text-ink-800">
                  {it.name}
                  {it.variantName && (
                    <span className="ml-1 text-brand-700">· {it.variantName}</span>
                  )}
                </span>
                <span className="shrink-0 text-ink-500">
                  {r.returned} / {it.qty} returned
                </span>
                <span
                  className={
                    remaining === 0
                      ? 'shrink-0 rounded-pill bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-500'
                      : 'shrink-0 rounded-pill bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700'
                  }
                >
                  {remaining === 0 ? 'Done' : `${remaining} left`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}