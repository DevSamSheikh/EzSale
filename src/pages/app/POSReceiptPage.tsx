import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Mail,
  Printer,
  RotateCcw,
  Share2,
} from 'lucide-react'
import {
  ReceiptDocument,
  receiptToText,
  type ReceiptContext,
} from '../../components/ReceiptDocument'
import { ReceiptPreviewModal } from '../../components/ReceiptPreviewModal'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getCard, getMember } from '../../card-store'
import { getBusiness } from '../../store'
import { getLocation, getTerminal } from '../../orders-store'
import { getOperatorByEmail } from '../../operators-store'
import { playCue } from '../../audio'
import type { Transaction } from '../../types'

export default function POSReceiptPage() {
  const { txnId } = useParams()
  const navigate = useNavigate()
  const [txn, setTxn] = useState<Transaction | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!txnId) return
    const all = getTransactions()
    setTxn(all.find((t) => t.id === txnId) ?? null)
  }, [txnId])

  useEffect(() => {
    if (txn) playCue('success')
  }, [txn])

  const ctx = useMemo<ReceiptContext | null>(() => {
    if (!txn) return null
    const business = getBusiness()
    if (!business) return null
    const member = txn.memberId ? getMember(txn.memberId) : null
    const card = txn.cardId ? getCard(txn.cardId) : null
    const location = txn.locationId ? getLocation(txn.locationId) : null
    const { terminal } = getTerminal(txn.terminalId)
    const operator = getOperatorByEmail(txn.operatorEmail)
    return {
      business,
      transaction: txn,
      member,
      card,
      cardBalanceAfter:
        card && txn.method === 'membership'
          ? Math.max(0, card.balance - txn.total)
          : undefined,
      location,
      terminal,
      operatorName: operator?.name || txn.operatorEmail.split('@')[0],
    }
  }, [txn])

  if (!txn || !ctx) {
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

  function startNewOrder() {
    try {
      localStorage.setItem('ezsale:pos:promo', 'none')
      localStorage.setItem('ezsale:pos:promoKind', 'percent')
      localStorage.setItem('ezsale:pos:promoValue', '0')
    } catch {
      /* ignore */
    }
    navigate('/app/pos')
  }

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4 print:gap-0 print:bg-white print:p-0">
        {/* Hero */}
        <header className="card p-5 text-center print:hidden">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
            Payment successful
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            <span className="font-mono font-semibold text-ink-700">{txn.id}</span> · {paymentMethodLabel(txn.method)} · {ctx.business.name}
          </p>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50"
          >
            <Eye className="h-3.5 w-3.5" /> View full receipt
          </button>
        </header>

        {/* Compact receipt preview (always visible) */}
        <section className="card flex flex-col items-center p-5 print:hidden">
          <ReceiptDocument ctx={ctx} layout="thermal" />
        </section>

        {/* Printable thermal receipt (hidden in screen, shown by print stylesheet) */}
        <section
          id="thermal-receipt"
          className="hidden print:block"
          aria-hidden
        >
          <ReceiptDocument ctx={ctx} layout="thermal" />
        </section>

        {/* Quick action grid */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5 print:hidden">
          <button
            onClick={() => window.print()}
            className="btn-primary py-3"
            title="Print thermal receipt"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="btn-secondary py-3"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={() => {
              const text = receiptToText(ctx)
              const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
              const a = document.createElement('a')
              a.href = url
              a.download = `receipt-${txn.id}.txt`
              a.click()
              URL.revokeObjectURL(url)
              playCue('success')
            }}
            className="btn-secondary py-3"
          >
            <Download className="h-4 w-4" /> Save
          </button>
          <button
            onClick={() => {
              const to = ctx.member?.email ?? ''
              const subject = encodeURIComponent(
                `Receipt ${txn.id} · ${ctx.business.name}`,
              )
              const body = encodeURIComponent(receiptToText(ctx))
              window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
            }}
            className="btn-secondary py-3"
            disabled={!ctx.member?.email}
            title={ctx.member?.email ? 'Email to customer' : 'No email on file'}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
          <button
            onClick={() => {
              const text = receiptToText(ctx)
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
        </section>

        <section className="print:hidden">
          <button onClick={startNewOrder} className="btn-primary w-full rounded-pill py-3 text-base">
            <RotateCcw className="h-4 w-4" /> New order
          </button>
        </section>

        <div className="hidden print:block print:mt-4 print:text-center print:text-[10px] print:text-ink-500">
          <p>Powered by EzSale</p>
        </div>
      </div>

      <ReceiptPreviewModal
        ctx={ctx}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onNewOrder={startNewOrder}
      />
    </div>
  )
}
