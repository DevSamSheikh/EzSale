import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Hash,
  History,
  MapPin,
  PencilLine,
  Printer,
  Receipt as ReceiptIcon,
  RotateCcw,
  Share2,
  Store,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { DrawerShell } from './Drawer'
import { getProduct } from '../pos-store'
import { getCardDeposits } from '../card-store'
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
  FinancialEvent,
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
  refundTransaction,
  remainingRefundable,
} from '../orders-store'
import { getCurrentOperator, operatorHas } from '../operators-store'
import { paymentMethodLabel } from '../payment-store'

interface TransactionDetailsDrawerProps {
  txn: Transaction
  members: Member[]
  cards: MembershipCard[]
  locations: Location[]
  /** All transactions — used to surface child refund / adjustment transactions in the audit trail */
  allTxns: Transaction[]
  onClose: () => void
  onChanged?: () => void
}

export function TransactionDetailsDrawer({
  txn,
  members,
  cards,
  locations,
  allTxns,
  onClose,
  onChanged,
}: TransactionDetailsDrawerProps) {
  const ctx = useMemo(() => buildOrderContext(txn, members, cards, locations), [
    txn,
    members,
    cards,
    locations,
  ])
  const events = useMemo(() => getFinancialEvents(txn.id), [txn.id])
  const business = getBusiness()
  const currency = '$'

  const children = useMemo(
    () =>
      allTxns
        .filter(
          (t) =>
            t.id !== txn.id &&
            t.createdAt >= txn.createdAt &&
            Math.abs(t.total) <= Math.abs(txn.total) + 0.01 &&
            (t.status === 'refunded' ||
              t.status === 'partially_refunded' ||
              t.status === 'adjusted' ||
              t.total < 0),
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [allTxns, txn],
  )

  const remaining = remainingRefundable(txn.id)
  const refundable = remaining > 0 && (txn.status === 'completed' || txn.status === 'partially_refunded' || txn.status === 'adjusted')
  const me = getCurrentOperator()
  const canRefund = operatorHas(me, 'transactions.refund') || operatorHas(me, 'orders.refund') || operatorHas(me, 'pos.refund')
  const canAdjust = operatorHas(me, 'transactions.adjust') || operatorHas(me, 'pos.adjust')

  const [toast, setToast] = useState<string | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [showCardNumber, setShowCardNumber] = useState(false)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
    onChanged?.()
  }

  return (
    <>
      <DrawerShell
        size="full"
        title={`Transaction ${txn.id}`}
        description={`${methodLabel(txn.method)} · ${formatCurrency(txn.total, currency)} · placed ${formatDateTime(txn.createdAt)}`}
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
              {methodIconJSX(txn.method)}
              {methodLabel(txn.method)}
            </span>
            {canRefund && refundable && (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
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
              Receipt
            </Link>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-ink-500">
              Audit trail · {events.length} event{events.length === 1 ? '' : 's'} on this transaction
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="btn-secondary">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={() => downloadText(buildAuditText(txn, events, business?.name ?? 'EzSale', currency))}
                className="btn-secondary"
              >
                <Download className="h-4 w-4" /> Save audit
              </button>
              <button type="button" onClick={onClose} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,320px]">
          {/* LEFT — audit timeline + children */}
          <div className="space-y-4">
            {/* Top summary card */}
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-500">
                    Transaction ID
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-bold text-ink-900">
                    <Hash className="h-3.5 w-3.5 text-ink-400" /> {txn.id}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-ink-500">Amount</div>
                  <div
                    className={`mt-0.5 text-2xl font-extrabold ${
                      txn.total < 0 ? 'text-rose-600' : 'text-ink-900'
                    }`}
                  >
                    {formatCurrency(txn.total, currency)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryField label="Type" value={txn.total < 0 ? 'Reversal' : txn.method === 'membership' ? 'Card charge' : 'Sale'} />
                <SummaryField
                  label="Status"
                  value={statusLabel(txn.status as TransactionStatus)}
                />
                <SummaryField label="Operator" value={operatorName(txn.operatorEmail)} sub={txn.operatorEmail} />
                <SummaryField label="When" value={formatDateTime(txn.createdAt)} />
              </div>
            </div>

            {/* Card balance card — only for membership txns */}
            {txn.method === 'membership' && ctx.card && (
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-ink-900">Card balance</div>
                  <button
                    type="button"
                    onClick={() => setShowCardNumber((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900"
                  >
                    {showCardNumber ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide number
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Show number
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryField
                    label="Card"
                    value={showCardNumber ? ctx.card.cardNumber : maskCardNumber(ctx.card.cardNumber)}
                    mono
                  />
                  <SummaryField label="Tier" value={ctx.card.tier} />
                  <SummaryField
                    label="Balance (now)"
                    value={formatCurrencyPlain(ctx.card.balance, currency)}
                  />
                  <SummaryField
                    label="Reference"
                    value={txn.reference ?? '—'}
                    mono
                  />
                </div>
                <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-[11px] text-ink-600">
                  <Link
                    to={`/app/cards/${ctx.card.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    Open card profile
                  </Link>
                  <span className="ml-1.5">
                    for full history, deposit ledger, and top-up actions.
                  </span>
                </div>
              </div>
            )}

            {/* Line items */}
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="text-sm font-bold text-ink-900">Items on this transaction</div>
                <div className="text-[11px] text-ink-500">
                  {orderItemsCount(txn)} item{orderItemsCount(txn) === 1 ? '' : 's'}
                </div>
              </div>
              {txn.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-ink-500">
                  No line items — this transaction was a balance adjustment.
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {txn.items.map((it, idx) => {
                    const product = getProduct(it.productId)
                    return (
                      <li key={idx} className="flex items-center gap-3 px-4 py-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                          <ReceiptIcon className="h-4 w-4" />
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
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-ink-500">× {it.qty}</div>
                          <div className="text-sm font-bold text-ink-900">
                            {formatCurrencyPlain(it.price * it.qty, currency)}
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

            {/* Audit trail timeline */}
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  <History className="h-4 w-4 text-ink-500" />
                  Complete audit trail
                </div>
                <span className="text-[11px] text-ink-500">
                  {events.length + 1} entries
                </span>
              </div>
              <div className="relative px-4 py-4 sm:px-5">
                <div className="absolute bottom-4 left-[27px] top-4 w-px bg-ink-100 sm:left-[31px]" />
                <ul className="space-y-3">
                  <TrailItem
                    icon={txn.total < 0 ? RotateCcw : methodIcon(txn.method)}
                    tone={txn.total < 0 ? 'rose' : methodTone(txn.method)}
                    title={
                      txn.total < 0
                        ? 'Reversal recorded'
                        : txn.method === 'membership'
                        ? 'Card charged'
                        : 'Payment received'
                    }
                    amount={txn.total}
                    sub={txn.reference ? `Reference · ${txn.reference}` : undefined}
                    by={operatorName(txn.operatorEmail)}
                    at={txn.createdAt}
                    note={txn.note}
                    currency={currency}
                  />
                  {events.map((e) => (
                    <TrailItem
                      key={e.id}
                      icon={iconForEvent(e)}
                      tone={toneForEvent(e)}
                      title={eventLabel(e.type)}
                      amount={e.amount}
                      sub={e.reason}
                      by={e.by}
                      at={e.at}
                      balanceBefore={e.balanceBefore}
                      balanceAfter={e.balanceAfter}
                      currency={currency}
                    />
                  ))}
                </ul>
              </div>
            </div>

            {/* Child transactions (refunds/adjustments) */}
            {children.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <div className="text-sm font-bold text-ink-900">Linked transactions</div>
                  <span className="text-[11px] text-ink-500">
                    {children.length} child record{children.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="divide-y divide-ink-100">
                  {children.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                        <ReceiptIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/app/transactions?focus=${c.id}`}
                            className="truncate font-mono text-xs font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {c.id}
                          </Link>
                          <span className="rounded-pill border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                            {statusLabel(c.status as TransactionStatus)}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {formatDateTime(c.createdAt)} · by {operatorName(c.operatorEmail)}
                          {c.note ? ` · ${c.note}` : ''}
                        </div>
                      </div>
                      <div
                        className={`text-right text-sm font-bold ${
                          c.total < 0 ? 'text-rose-600' : 'text-ink-900'
                        }`}
                      >
                        {formatCurrency(c.total, currency)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT — meta sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">User</div>
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
                      <div className="text-sm font-semibold text-ink-900">Walk-in</div>
                      <div className="text-[11px] text-ink-500">No member linked.</div>
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
                    <CreditCard className="h-3 w-3" /> Card on file
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <Link
                      to={`/app/cards/${ctx.card.id}`}
                      className="font-mono text-sm font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {ctx.card.cardNumber}
                    </Link>
                    <span className="text-[11px] font-bold text-ink-700">{ctx.card.tier}</span>
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
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">Location</div>
                    <div className="truncate text-sm font-semibold text-ink-900">
                      {ctx.location?.name ?? 'Unknown'}
                    </div>
                    {ctx.location?.code && (
                      <div className="text-[11px] text-ink-500">{ctx.location.code}</div>
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Store className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">Business</div>
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
                    <div className="text-[11px] uppercase tracking-wider text-ink-500">Created</div>
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
                      <div className="text-[11px] uppercase tracking-wider text-ink-500">Settled</div>
                      <div className="text-sm font-semibold text-ink-900">
                        {formatDate(txn.settledAt)}
                      </div>
                      <div className="text-[11px] text-ink-500">{formatTime(txn.settledAt)}</div>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Balance before / after */}
            {(() => {
              const evt = events.find(
                (e) =>
                  typeof e.balanceBefore === 'number' &&
                  typeof e.balanceAfter === 'number',
              )
              if (!evt) return null
              return (
                <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                  <div className="text-sm font-bold text-ink-900">Balance change</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <SummaryField
                      label="Before"
                      value={formatCurrencyPlain(evt.balanceBefore!, currency)}
                    />
                    <SummaryField
                      label="After"
                      value={formatCurrencyPlain(evt.balanceAfter!, currency)}
                    />
                    <SummaryField
                      label="Delta"
                      value={formatCurrencyPlain(
                        evt.balanceAfter! - evt.balanceBefore!,
                        currency,
                      )}
                    />
                  </div>
                </div>
              )
            })()}

            {/* Related deposits (card top-ups + reversals) */}
            {ctx.card && (() => {
              const cardDeposits = getCardDeposits(ctx.card.id)
              if (cardDeposits.length === 0) return null
              const matching = cardDeposits
                .filter((d) => {
                  // The deposit at/created within the same minute is treated
                  // as related to this transaction. Also pull the matching
                  // deposit id if the transaction is a result of a request
                  // approval.
                  return (
                    Math.abs(
                      new Date(d.at).getTime() - new Date(txn.createdAt).getTime(),
                    ) < 60_000
                  )
                })
                .slice(0, 3)
              if (matching.length === 0) return null
              return (
                <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-ink-900">Related deposits</div>
                    <Link
                      to={`/app/cards/${ctx.card.id}`}
                      className="text-[11px] font-semibold text-ink-600 hover:text-ink-900"
                    >
                      View card
                    </Link>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {matching.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/40 p-2"
                      >
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                            d.amount < 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-ink-900">
                            {d.amount < 0 ? 'Reversal' : 'Top-up'} ·{' '}
                            {paymentMethodLabel(d.method)}
                          </div>
                          <div className="truncate text-[11px] text-ink-500">
                            {formatDateTime(d.at)}
                            {d.reference ? ` · ${d.reference}` : ''}
                          </div>
                        </div>
                        <div
                          className={`text-right text-xs font-bold ${
                            d.amount < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrencyPlain(d.amount, currency)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="text-sm font-bold text-ink-900">Quick actions</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => share(txn, business?.name ?? 'EzSale', currency)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <Link
                  to={`/app/pos/receipt/${txn.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <ReceiptIcon className="h-3.5 w-3.5" /> Receipt
                </Link>
                {canRefund && refundable ? (
                  <button
                    type="button"
                    onClick={() => setRefundOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Refund
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> No refund
                  </button>
                )}
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

// ---- Subcomponents --------------------------------------------------------

function SummaryField({
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
        className={`mt-0.5 truncate text-sm font-semibold text-ink-900 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
      {sub && <div className="truncate text-[11px] text-ink-500">{sub}</div>}
    </div>
  )
}

function TrailItem({
  icon: Icon,
  tone,
  title,
  amount,
  sub,
  by,
  at,
  note,
  balanceBefore,
  balanceAfter,
  currency,
}: {
  icon: typeof RotateCcw
  tone: string
  title: string
  amount: number
  sub?: string
  by: string
  at: string
  note?: string
  balanceBefore?: number
  balanceAfter?: number
  currency: string
}) {
  const color =
    tone === 'rose'
      ? 'border-rose-200 text-rose-700 bg-rose-50'
      : tone === 'indigo'
      ? 'border-indigo-200 text-indigo-700 bg-indigo-50'
      : tone === 'emerald'
      ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
      : tone === 'amber'
      ? 'border-amber-200 text-amber-700 bg-amber-50'
      : 'border-ink-200 text-ink-700 bg-white'
  return (
    <li className="relative flex gap-3">
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-ink-100 bg-white p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-ink-900">{title}</div>
          <div
            className={`shrink-0 text-sm font-bold ${
              amount < 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatCurrency(amount, currency)}
          </div>
        </div>
        {sub && <div className="mt-0.5 truncate text-[11px] text-ink-500">{sub}</div>}
        {note && (
          <div className="mt-0.5 truncate text-[11px] text-ink-500">Note · {note}</div>
        )}
        <div className="mt-0.5 text-[11px] text-ink-500">
          {formatDateTime(at)} · by {by}
          {typeof balanceBefore === 'number' && typeof balanceAfter === 'number' && (
            <span className="ml-1.5">
              · card balance {formatCurrencyPlain(balanceBefore, currency)} →{' '}
              {formatCurrencyPlain(balanceAfter, currency)}
            </span>
          )}
        </div>
      </div>
    </li>
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
  const preview = mode === 'full' ? remaining : Math.max(0, Number(amount) || 0)

  function submit() {
    if (preview <= 0) return
    setBusy(true)
    const result = refundTransaction(txn.id, {
      amount: preview,
      reason: reason.trim() || 'No reason provided',
      reverseCardBalance: reverseCard,
    })
    setBusy(false)
    if (result) onDone(`Refund of ${formatCurrency(-preview, currency)} processed.`)
    else onDone('Refund could not be processed.')
  }

  return (
    <ConfirmShell title="Issue refund" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-[11px] text-ink-600">
          Issuing a refund creates a negative transaction linked to this one and
          updates the parent status. Card balance can be reversed if applicable.
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
    if (result) onDone(`Adjustment of ${formatCurrency(a, currency)} recorded.`)
    else onDone('Adjustment could not be applied.')
  }

  return (
    <ConfirmShell title="Manual adjustment" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-[11px] text-ink-600">
          Adjustments modify the recorded total outside of a refund. Use a positive
          amount to add a charge and a negative number for a discount.
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

// ---- helpers --------------------------------------------------------------

function methodIcon(m: string): typeof Banknote {
  switch (m) {
    case 'cash':
      return Banknote
    case 'card':
      return CreditCard
    case 'bank':
      return Wallet
    case 'wallet':
      return Wallet
    case 'membership':
      return CreditCard
    default:
      return ReceiptIcon
  }
}

function methodIconJSX(m: string) {
  const Icon = methodIcon(m)
  return <Icon className="h-3.5 w-3.5" />
}

function methodTone(m: string): string {
  switch (m) {
    case 'cash':
      return 'emerald'
    case 'card':
      return 'sky'
    case 'bank':
      return 'indigo'
    case 'wallet':
      return 'indigo'
    case 'membership':
      return 'amber'
    default:
      return 'neutral'
  }
}

function iconForEvent(e: FinancialEvent): typeof RotateCcw {
  if (e.type === 'refund' || e.type === 'partial_refund') return RotateCcw
  if (e.type === 'adjustment') return PencilLine
  return Wallet
}

function toneForEvent(e: FinancialEvent): string {
  if (e.type === 'refund' || e.type === 'partial_refund') return 'rose'
  if (e.type === 'adjustment') return 'indigo'
  return 'emerald'
}

function eventLabel(t: string) {
  switch (t) {
    case 'refund':
      return 'Full refund'
    case 'partial_refund':
      return 'Partial refund'
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

function maskCardNumber(num: string) {
  if (!num) return ''
  const tail = num.slice(-4)
  return `•••• ${tail}`
}

function buildAuditText(
  t: Transaction,
  events: FinancialEvent[],
  bizName: string,
  currency: string,
) {
  const dash = '--------------------------------'
  const lines: string[] = []
  lines.push(bizName.toUpperCase())
  lines.push('Transaction: ' + t.id)
  lines.push('Date: ' + new Date(t.createdAt).toLocaleString())
  lines.push('Operator: ' + t.operatorEmail)
  lines.push('Method: ' + methodLabel(t.method))
  lines.push('Total: ' + formatCurrencyPlain(t.total, currency))
  lines.push('Status: ' + statusLabel(t.status as TransactionStatus))
  lines.push(dash)
  lines.push('Audit trail:')
  lines.push(
    `- ${new Date(t.createdAt).toLocaleString()} · ${operatorName(t.operatorEmail)} · ${formatCurrencyPlain(t.total, currency)} (initial)`,
  )
  events.forEach((e) => {
    lines.push(
      `- ${new Date(e.at).toLocaleString()} · ${eventLabel(e.type)} · ${formatCurrencyPlain(e.amount, currency)} by ${e.by}${e.reason ? ` · ${e.reason}` : ''}`,
    )
  })
  return lines.join('\n')
}

function share(t: Transaction, bizName: string, currency: string) {
  const text = buildAuditText(t, getFinancialEvents(t.id), bizName, currency)
  if (typeof navigator === 'undefined') return
  if (navigator.share) {
    navigator
      .share({ title: `Transaction ${t.id}`, text })
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
  a.download = `transaction-audit-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}