import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Mail,
  MapPin,
  Printer,
  RotateCcw,
  Share2,
  Store,
} from 'lucide-react'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getBusiness } from '../../store'
import { getLocations } from '../../orders-store'
import type { Transaction } from '../../types'
import { playCue } from '../../audio'

function currency(n: number) {
  return `$${n.toFixed(0)}`
}

export default function POSReceiptPage() {
  const { txnId } = useParams()
  const navigate = useNavigate()
  const business = getBusiness()
  const [txn, setTxn] = useState<Transaction | null>(null)

  useEffect(() => {
    if (!txnId) return
    const all = getTransactions()
    setTxn(all.find((t) => t.id === txnId) ?? null)
  }, [txnId])

  useEffect(() => {
    if (txn) playCue('success')
  }, [txn])

  if (!txn) {
    return (
      <div className="min-h-screen bg-ink-50 px-3 py-6 sm:px-6">
        <div className="mx-auto flex h-[calc(100dvh-3rem)] max-w-[820px] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-xl font-bold text-ink-900">Receipt not found</h2>
          <p className="text-sm text-ink-500">
            We couldn't find that transaction. It may have been removed.
          </p>
          <Link to="/app/pos" className="btn-primary">
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </Link>
        </div>
      </div>
    )
  }

  const itemsCount = txn.items.reduce((s, i) => s + i.qty, 0)
  const created = new Date(txn.createdAt)
  const locations = getLocations()
  const loc = locations.find((l) => l.id === txn.locationId) ?? null
  const terminal = loc?.terminals.find((t) => t.id === txn.terminalId) ?? null

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4 print:max-w-none print:gap-0 print:bg-white print:p-0">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            to="/app/pos"
            className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </Link>
          <div className="text-left sm:text-right">
            <div className="font-mono text-[11px] uppercase tracking-wide text-ink-500">
              Order ID · {txn.id}
            </div>
            <div className="text-[11px] text-ink-500">Order placed</div>
            <div className="text-lg font-extrabold text-ink-900">{currency(txn.total)}</div>
            {loc && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-500">
                <MapPin className="h-3 w-3" /> {loc.name}
                {terminal ? ` · ${terminal.code}` : ''}
              </div>
            )}
          </div>
        </header>

        {/* Success hero */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-soft sm:p-8 print:hidden">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-ink-900">Payment successful</h1>
          <p className="mt-1 text-sm text-ink-500">
            Transaction recorded. A receipt is ready below.
          </p>
        </section>

        {/* Thermal receipt */}
        <section
          id="thermal-receipt"
          className="mx-auto w-full max-w-[360px] rounded-2xl border border-ink-100 bg-white p-5 shadow-soft print:max-w-none print:rounded-none print:border-0 print:shadow-none print:p-0"
        >
          <div className="text-center">
            <div className="text-base font-extrabold uppercase tracking-wide text-ink-900">
              {business?.name ?? 'EzSale'}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-500">
              {business?.contactEmail || '—'}
            </div>
            <div className="text-[11px] text-ink-500">{business?.contactPhone || '—'}</div>
            {business?.address && (
              <div className="text-[11px] text-ink-500">{business.address}</div>
            )}
          </div>

          <DashedRule />

          <div className="flex items-center justify-between text-[11px] text-ink-600">
            <span>Receipt</span>
            <span className="font-mono">{txn.id}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
            <span>Date</span>
            <span>
              {created.toLocaleDateString()} {created.toLocaleTimeString()}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
            <span>Cashier</span>
            <span>{txn.operatorEmail.split('@')[0]}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
            <span>Method</span>
            <span>{paymentMethodLabel(txn.method)}</span>
          </div>
          {loc && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
              <span>Location</span>
              <span>{loc.name}{terminal ? ` · ${terminal.code}` : ''}</span>
            </div>
          )}

          <DashedRule />

          {/* Items */}
          <div className="space-y-1.5">
            <div className="flex text-[11px] font-bold uppercase tracking-wide text-ink-700">
              <span className="flex-1">Item</span>
              <span className="w-12 text-right">Qty</span>
              <span className="w-16 text-right">Total</span>
            </div>
            {txn.items.map((it, idx) => (
              <div key={idx} className="text-[11px] text-ink-800">
                <div className="truncate font-semibold">{it.name}</div>
                <div className="mt-0.5 flex text-ink-500">
                  <span className="flex-1 truncate">
                    {currency(it.price)} each
                  </span>
                  <span className="w-12 text-right">×{it.qty}</span>
                  <span className="w-16 text-right font-semibold text-ink-900">
                    {currency(it.price * it.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <DashedRule />

          {/* Totals */}
          <div className="space-y-1 text-[12px]">
            <Row label="Items" value={`${itemsCount}`} />
            <Row label="Subtotal" value={currency(txn.subtotal)} />
            {txn.discount > 0 && <Row label="Discount" value={`-${currency(txn.discount)}`} />}
            {txn.tax > 0 && <Row label="Tax" value={currency(txn.tax)} />}
            <div className="pt-1">
              <Row label="TOTAL" value={currency(txn.total)} bold />
            </div>
            {txn.method === 'cash' && typeof txn.change === 'number' && (
              <>
                <Row label="Tendered" value={currency(txn.amountTendered ?? txn.total)} />
                <Row label="Change" value={currency(txn.change)} bold />
              </>
            )}
            {txn.method === 'membership' && txn.cardNumber && (
              <>
                <Row label="Card" value={txn.cardNumber} />
              </>
            )}
            {txn.reference && (txn.method === 'card' || txn.method === 'bank' || txn.method === 'wallet') && (
              <Row label="Reference" value={txn.reference} />
            )}
          </div>

          <DashedRule />

          {/* Barcode-like footer */}
          <div className="text-center">
            <div className="mx-auto flex h-10 items-end justify-center gap-[2px]">
              {Array.from({ length: 36 }).map((_, i) => (
                <span
                  key={i}
                  className="bg-ink-900"
                  style={{
                    width: (i * 13) % 4 === 0 ? '2px' : '1px',
                    height: `${60 + ((i * 17) % 40)}%`,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-widest text-ink-700">
              *{txn.id}*
            </div>
          </div>

          <DashedRule />

          <div className="text-center text-[11px] text-ink-500">
            {business?.receiptHeader || 'Thanks for visiting!'}
          </div>
          <div className="text-center text-[10px] text-ink-400">
            {business?.receiptFooter || 'See you again soon!'}
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="btn-primary py-3"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => {
              const text = receiptText(txn, business?.name ?? 'EzSale')
              const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
              const a = document.createElement('a')
              a.href = url
              a.download = `receipt-${txn.id}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn-secondary py-3"
          >
            <Download className="h-4 w-4" /> Save
          </button>
          <button
            onClick={() => {
              const text = receiptText(txn, business?.name ?? 'EzSale')
              if (navigator.share) {
                navigator
                  .share({ title: `Receipt ${txn.id}`, text })
                  .catch(() => {
                    /* user cancelled */
                  })
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(() => {
                  /* ignore */
                })
              }
            }}
            className="btn-secondary py-3"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={() => {
              try {
                localStorage.setItem('ezsale:pos:promo', 'none')
                localStorage.setItem('ezsale:pos:promoKind', 'percent')
                localStorage.setItem('ezsale:pos:promoValue', '0')
              } catch {
                /* ignore */
              }
              navigate('/app/pos')
            }}
            className="btn-secondary py-3"
          >
            <RotateCcw className="h-4 w-4" /> New Sale
          </button>
        </section>

        <div className="hidden print:block print:mt-4 print:text-center print:text-[10px] print:text-ink-500">
          <p>Powered by EzSale</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? 'text-[14px] font-extrabold uppercase tracking-wide text-ink-900' : 'text-ink-700'
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function DashedRule() {
  return (
    <div
      aria-hidden
      className="my-3 h-px w-full"
      style={{
        backgroundImage:
          'linear-gradient(to right, currentColor 50%, transparent 50%)',
        backgroundSize: '6px 1px',
        backgroundRepeat: 'repeat-x',
        color: '#d5d8dd',
      }}
    />
  )
}

function receiptText(t: Transaction, bizName: string) {
  const lines: string[] = []
  const dash = '--------------------------------'
  lines.push(bizName.toUpperCase())
  lines.push('Receipt: ' + t.id)
  lines.push('Date: ' + new Date(t.createdAt).toLocaleString())
  lines.push('Method: ' + paymentMethodLabel(t.method))
  lines.push('Operator: ' + t.operatorEmail)
  lines.push(dash)
  t.items.forEach((it) => {
    lines.push(
      `${it.name}  x${it.qty}  ${currency(it.price * it.qty)}  (${currency(it.price)} ea)`,
    )
  })
  lines.push(dash)
  lines.push('Subtotal: ' + currency(t.subtotal))
  if (t.discount > 0) lines.push('Discount: -' + currency(t.discount))
  lines.push('TOTAL: ' + currency(t.total))
  if (t.method === 'cash' && typeof t.change === 'number') {
    lines.push('Tendered: ' + currency(t.amountTendered ?? t.total))
    lines.push('Change: ' + currency(t.change))
  }
  if (t.method === 'membership' && t.cardNumber) lines.push('Card: ' + t.cardNumber)
  if (t.reference) lines.push('Reference: ' + t.reference)
  lines.push(dash)
  lines.push('Thank you for your visit!')
  return lines.join('\n')
}
