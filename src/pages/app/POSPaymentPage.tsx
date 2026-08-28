import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Lock,
  NfcIcon,
  Printer,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  User,
  Wallet,
  X,
} from 'lucide-react'
import {
  getCart,
  getProducts,
  type POSProduct,
  clearCart,
} from '../../pos-store'
import {
  chargeCard,
  createTransaction,
  formatCardNumber,
  getCardByNumber,
  getCards,
  getMember,
  getTransactions,
  isCardUsable,
  paymentMethodLabel,
} from '../../payment-store'
import { getAuth, getBusiness } from '../../store'
import type {
  MembershipCard,
  Member,
  PaymentMethod,
  Transaction,
} from '../../types'
import { playCue } from '../../audio'

function currency(n: number) {
  return `$${n.toFixed(0)}`
}

interface OrderLine {
  product: POSProduct
  qty: number
}

const METHOD_OPTIONS: {
  id: PaymentMethod
  label: string
  Icon: typeof Banknote
  desc: string
}[] = [
  { id: 'cash', label: 'Cash', Icon: Banknote, desc: 'Quick tender with change calculation' },
  { id: 'card', label: 'Card', Icon: CreditCard, desc: 'Debit or credit card swipe/insert' },
  { id: 'bank', label: 'Bank Transfer', Icon: Building2, desc: 'Direct bank transfer' },
  { id: 'wallet', label: 'Digital Wallet', Icon: Smartphone, desc: 'Apple Pay, Google Pay, etc.' },
  { id: 'membership', label: 'Membership Card', Icon: NfcIcon, desc: 'Scan or enter card number' },
]

export default function POSPaymentPage() {
  const navigate = useNavigate()
  const { txnId } = useParams()
  const business = getBusiness()
  const auth = getAuth()

  const [products, setProducts] = useState<POSProduct[]>([])
  const [lines, setLines] = useState<OrderLine[]>([])
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null)

  useEffect(() => {
    setProducts(getProducts())
    const cart = getCart()
    const all = getProducts()
    const mapped: OrderLine[] = cart
      .map((c) => {
        const p = all.find((x) => x.id === c.productId)
        return p ? { product: p, qty: c.qty } : null
      })
      .filter((x): x is OrderLine => x !== null)
    setLines(mapped)
  }, [])

  useEffect(() => {
    if (txnId) {
      const all = getTransactions()
      const t = all.find((x) => x.id === txnId)
      if (t) setCompletedTxn(t)
    }
  }, [txnId])

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0)
  const discount = Math.round(subtotal * 0.1)
  const total = subtotal - discount

  if (lines.length === 0 && !completedTxn) {
    return (
      <div className="min-h-screen bg-ink-50 px-3 py-6 sm:px-6">
        <div className="mx-auto flex h-[calc(100dvh-3rem)] max-w-[1200px] flex-col items-center justify-center gap-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-ink-300 shadow-soft">
            <ShoppingBagIcon />
          </div>
          <h2 className="text-xl font-bold text-ink-900">No items in this order</h2>
          <p className="max-w-sm text-sm text-ink-500">
            Add products to the cart before proceeding to payment.
          </p>
          <button onClick={() => navigate('/app/pos')} className="btn-primary">
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </button>
        </div>
      </div>
    )
  }

  if (completedTxn) {
    return <SuccessScreen txn={completedTxn} onNewSale={() => navigate('/app/pos')} />;
  }

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/app/pos')}
            className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </button>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-ink-500">Order total</div>
            <div className="text-2xl font-extrabold text-ink-900">{currency(total)}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,360px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Choose payment method</h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Select how the customer is paying for this order.
                  </p>
                </div>
                <div className="text-right text-xs text-ink-500">
                  <div className="font-semibold text-ink-700">{business?.name ?? 'EzSale'}</div>
                  <div>Operator · {auth?.email?.split('@')[0] ?? 'demo'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.Icon
                  const active = method === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setMethod(opt.id)}
                      className={`flex h-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/40'
                          : 'border-ink-200 bg-white hover:bg-ink-50'
                      }`}
                    >
                      <div
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          active ? 'bg-brand-500 text-ink-900' : 'bg-ink-100 text-ink-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink-900">{opt.label}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {method === 'cash' && (
              <CashPanel total={total} onPaid={(txn) => finalize(txn, setCompletedTxn, navigate, clearCart, lines, products, business, auth)} />
            )}
            {method === 'card' && (
              <CardPanel total={total} onPaid={(txn) => finalize(txn, setCompletedTxn, navigate, clearCart, lines, products, business, auth)} />
            )}
            {method === 'bank' && (
              <BankPanel total={total} onPaid={(txn) => finalize(txn, setCompletedTxn, navigate, clearCart, lines, products, business, auth)} />
            )}
            {method === 'wallet' && (
              <WalletPanel total={total} onPaid={(txn) => finalize(txn, setCompletedTxn, navigate, clearCart, lines, products, business, auth)} />
            )}
            {method === 'membership' && (
              <MembershipPanel
                total={total}
                onPaid={(txn) => finalize(txn, setCompletedTxn, navigate, clearCart, lines, products, business, auth)}
              />
            )}
          </div>

          <OrderSummaryPanel
            lines={lines}
            subtotal={subtotal}
            discount={discount}
            total={total}
            methodLabel={paymentMethodLabel(method)}
          />
        </div>
      </div>
    </div>
  )
}

function ShoppingBagIcon() {
  return (
    <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 7h14l-1.5 12.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 7Z" />
      <path d="M9 7V5a3 3 0 1 1 6 0v2" />
    </svg>
  )
}

function finalize(
  txn: Omit<Transaction, 'id' | 'createdAt'>,
  setCompletedTxn: (t: Transaction | null) => void,
  navigate: (to: string) => void,
  clearCartFn: () => void,
  lines: OrderLine[],
  products: POSProduct[],
  business: ReturnType<typeof getBusiness>,
  auth: ReturnType<typeof getAuth>,
) {
  const created = createTransaction(txn)
  clearCartFn()
  setCompletedTxn(created)
  navigate(`/app/pos/success/${created.id}`)
}

function OrderSummaryPanel({
  lines,
  subtotal,
  discount,
  total,
  methodLabel,
}: {
  lines: OrderLine[]
  subtotal: number
  discount: number
  total: number
  methodLabel: string
}) {
  return (
    <aside className="flex h-fit flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-5 py-4">
        <div className="text-lg font-bold text-ink-900">Order summary</div>
        <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
          <span>{lines.length} item{lines.length === 1 ? '' : 's'}</span>
          <span>Method · {methodLabel}</span>
        </div>
      </div>
      <div className="max-h-[360px] space-y-2 overflow-y-auto px-5 py-4">
        {lines.map((l) => (
          <div key={l.product.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink-900">{l.product.name}</div>
              <div className="text-[11px] text-ink-500">
                {currency(l.product.price)} × {l.qty}
              </div>
            </div>
            <div className="shrink-0 font-bold text-ink-900">
              {currency(l.product.price * l.qty)}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 border-t border-ink-100 px-5 py-4 text-sm">
        <div className="flex justify-between text-ink-600">
          <span>Subtotal</span>
          <span className="font-semibold text-ink-900">{currency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-600">
          <span>Promo 10%</span>
          <span className="font-semibold text-ink-900">-{currency(discount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-dashed border-ink-200 pt-2 text-base font-bold text-ink-900">
          <span>Total</span>
          <span>{currency(total)}</span>
        </div>
      </div>
    </aside>
  )
}

function CashPanel({
  total,
  onPaid,
}: {
  total: number
  onPaid: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [tendered, setTendered] = useState<string>(String(Math.ceil(total)))
  const value = Math.max(0, Math.round(Number(tendered) || 0))
  const change = Math.max(0, value - total)
  const auth = getAuth()
  const business = getBusiness()

  const quickAmounts = useMemo(() => {
    const base = [Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100]
    return Array.from(new Set(base.filter((v) => v > 0))).slice(0, 6)
  }, [total])

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="text-sm font-bold text-ink-900">Cash payment</div>
      <p className="mt-1 text-xs text-ink-500">Enter the amount tendered to calculate change.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          onClick={() => setTendered(String(total))}
          className="rounded-2xl border border-ink-200 bg-white p-3 text-left transition-colors hover:bg-ink-50"
        >
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Exact</div>
          <div className="mt-0.5 text-base font-bold text-ink-900">{currency(total)}</div>
        </button>
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => setTendered(String(q))}
            className="rounded-2xl border border-ink-200 bg-white p-3 text-left transition-colors hover:bg-ink-50"
          >
            <div className="text-[11px] uppercase tracking-wide text-ink-500">Quick</div>
            <div className="mt-0.5 text-base font-bold text-ink-900">{currency(q)}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="label">Amount tendered</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
            $
          </span>
          <input
            type="number"
            min={0}
            className="input pl-7"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-600">Change due</span>
          <span className="text-lg font-bold text-ink-900">{currency(change)}</span>
        </div>
      </div>

      <button
        disabled={value < total}
        onClick={() => {
          const items = buildItemsFromCart()
          const { subtotal, discount, total: t } = totalsFor()
          onPaid({
            businessId: business?.id ?? 'preview',
            operatorEmail: auth?.email ?? 'demo@ezsale.app',
            items,
            subtotal,
            discount,
            total: t,
            method: 'cash',
            amountTendered: value,
            change,
            status: 'completed',
          })
        }}
        className="btn-primary mt-4 w-full py-3 disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Confirm & Complete Payment
      </button>
    </div>
  )
}

function CardPanel({
  total,
  onPaid,
}: {
  total: number
  onPaid: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [processing, setProcessing] = useState(false)
  const [ref, setRef] = useState('')
  const auth = getAuth()
  const business = getBusiness()

  function pay() {
    setProcessing(true)
    playCue('tap')
    setTimeout(() => {
      setProcessing(false)
      const items = buildItemsFromCart()
      const { subtotal, discount, total: t } = totalsFor()
      onPaid({
        businessId: business?.id ?? 'preview',
        operatorEmail: auth?.email ?? 'demo@ezsale.app',
        items,
        subtotal,
        discount,
        total: t,
        method: 'card',
        reference: ref || `AUTH-${Date.now().toString().slice(-6)}`,
        status: 'completed',
      })
    }, 1200)
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="text-sm font-bold text-ink-900">Card payment</div>
      <p className="mt-1 text-xs text-ink-500">
        Insert, swipe, or tap the customer's card on the terminal.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,180px]">
        <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 text-center">
          <div>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-700 shadow-soft">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="mt-2 text-sm font-semibold text-ink-900">
              {processing ? 'Processing…' : 'Ready for card'}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-500">
              Insert, swipe, or tap · {currency(total)}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Auth code (optional)</label>
          <input
            className="input"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. AUTH-392814"
          />
        </div>
      </div>

      <button onClick={pay} disabled={processing} className="btn-primary mt-4 w-full py-3 disabled:opacity-50">
        <ShieldCheck className="h-4 w-4" /> {processing ? 'Processing…' : 'Charge Card'}
      </button>
    </div>
  )
}

function BankPanel({
  total,
  onPaid,
}: {
  total: number
  onPaid: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [ref, setRef] = useState('')
  const auth = getAuth()
  const business = getBusiness()

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="text-sm font-bold text-ink-900">Bank transfer</div>
      <p className="mt-1 text-xs text-ink-500">
        Customer transfers {currency(total)} to your business account, then enter the reference.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Account name</div>
          <div className="mt-0.5 text-sm font-bold text-ink-900">
            {business?.name ?? 'EzSale Business'}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wide text-ink-500">Reference</div>
          <div className="mt-0.5 text-sm font-bold text-ink-900">EZ-{Date.now().toString().slice(-6)}</div>
        </div>
        <div>
          <label className="label">Transfer reference</label>
          <input
            className="input"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Enter reference / UTR number"
          />
        </div>
      </div>
      <button
        disabled={!ref.trim()}
        onClick={() => {
          const items = buildItemsFromCart()
          const { subtotal, discount, total: t } = totalsFor()
          onPaid({
            businessId: business?.id ?? 'preview',
            operatorEmail: auth?.email ?? 'demo@ezsale.app',
            items,
            subtotal,
            discount,
            total: t,
            method: 'bank',
            reference: ref.trim(),
            status: 'completed',
          })
        }}
        className="btn-primary mt-4 w-full py-3 disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Mark as Received
      </button>
    </div>
  )
}

function WalletPanel({
  total,
  onPaid,
}: {
  total: number
  onPaid: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [processing, setProcessing] = useState(false)
  const auth = getAuth()
  const business = getBusiness()

  function pay() {
    setProcessing(true)
    playCue('tap')
    setTimeout(() => {
      setProcessing(false)
      const items = buildItemsFromCart()
      const { subtotal, discount, total: t } = totalsFor()
      onPaid({
        businessId: business?.id ?? 'preview',
        operatorEmail: auth?.email ?? 'demo@ezsale.app',
        items,
        subtotal,
        discount,
        total: t,
        method: 'wallet',
        reference: `WAL-${Date.now().toString().slice(-6)}`,
        status: 'completed',
      })
    }, 1000)
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="text-sm font-bold text-ink-900">Digital wallet</div>
      <p className="mt-1 text-xs text-ink-500">
        Customer scans the QR or taps to pay via their preferred wallet.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid h-44 place-items-center rounded-2xl border border-ink-100 bg-ink-50/60">
          <QrPreview />
        </div>
        <div className="flex flex-col justify-between gap-3">
          <div className="rounded-2xl border border-ink-100 bg-white p-3 text-sm">
            <div className="flex items-center justify-between text-ink-600">
              <span>Amount</span>
              <span className="font-bold text-ink-900">{currency(total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-ink-600">
              <span>Status</span>
              <span className="font-semibold text-ink-900">
                {processing ? 'Awaiting tap…' : 'Ready'}
              </span>
            </div>
          </div>
          <button onClick={pay} disabled={processing} className="btn-primary py-3 disabled:opacity-50">
            <Wallet className="h-4 w-4" /> {processing ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QrPreview() {
  const cells = Array.from({ length: 121 }, (_, i) => (i * 31) % 7 < 3)
  return (
    <div className="grid grid-cols-11 gap-[2px] rounded-xl bg-white p-3">
      {cells.map((on, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-[1px] ${on ? 'bg-ink-900' : 'bg-transparent'}`}
        />
      ))}
    </div>
  )
}

interface CardLookup {
  card: MembershipCard
  member: Member
}

function MembershipPanel({
  total,
  onPaid,
}: {
  total: number
  onPaid: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [cardInput, setCardInput] = useState('')
  const [lookup, setLookup] = useState<CardLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [processing, setProcessing] = useState(false)

  const auth = getAuth()
  const business = getBusiness()

  function scan() {
    setError(null)
    setLookup(null)
    const formatted = formatCardNumber(cardInput)
    if (!formatted) {
      setError('Enter or scan a card number.')
      return
    }
    const result = getCardByNumber(formatted)
    if (!result) {
      setError('Card not found. Please check the number and try again.')
      playCue('error')
      return
    }
    setLookup(result)
    setCardInput(result.card.cardNumber)
    playCue('success')
  }

  function reset() {
    setLookup(null)
    setError(null)
    setConfirming(false)
    setCardInput('')
  }

  const usable = lookup ? isCardUsable(lookup.card) : { ok: false }
  const insufficient = lookup ? lookup.card.balance < total : false
  const afterBalance = lookup ? Math.max(0, lookup.card.balance - total) : 0

  function charge() {
    if (!lookup) return
    setProcessing(true)
    playCue('tap')
    setTimeout(() => {
      const items = buildItemsFromCart()
      const { subtotal, discount, total: t } = totalsFor()
      const updated = chargeCard(lookup.card.id, t)
      onPaid({
        businessId: business?.id ?? 'preview',
        operatorEmail: auth?.email ?? 'demo@ezsale.app',
        memberId: lookup.member.id,
        cardId: lookup.card.id,
        cardNumber: lookup.card.cardNumber,
        items,
        subtotal,
        discount,
        total: t,
        method: 'membership',
        status: 'completed',
      })
      // updated card is captured implicitly via onPaid
      void updated
    }, 900)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="text-sm font-bold text-ink-900">Membership card</div>
        <p className="mt-1 text-xs text-ink-500">
          Scan the customer's card or enter the card number manually.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9 font-mono tracking-wide"
              value={cardInput}
              onChange={(e) => setCardInput(formatCardNumber(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && scan()}
              placeholder="EZ-1000-0000"
              disabled={!!lookup}
            />
          </div>
          {lookup ? (
            <button onClick={reset} className="btn-secondary">
              <X className="h-4 w-4" /> Clear
            </button>
          ) : (
            <button onClick={scan} className="btn-primary">
              <Search className="h-4 w-4" /> Find Card
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
          <span>Try a sample card:</span>
          {['EZ-1000-4521', 'EZ-1000-7820', 'EZ-1000-9100', 'EZ-1000-3356'].map((n) => (
            <button
              key={n}
              onClick={() => {
                setCardInput(n)
                setError(null)
              }}
              className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {lookup && (
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-ink-900">{lookup.member.name}</div>
              <div className="text-[11px] text-ink-500">
                {lookup.member.email || lookup.member.phone || '—'}
              </div>
            </div>
            <StatusPill status={lookup.card.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Card" value={lookup.card.cardNumber} mono />
            <Stat label="Tier" value={lookup.member.tier} />
            <Stat
              label="Available balance"
              value={currency(lookup.card.balance)}
              highlight
            />
            <Stat
              label="Expires"
              value={new Date(lookup.card.expiresAt).toLocaleDateString()}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Daily limit" value={currency(lookup.card.dailyLimit)} />
            <Stat label="Monthly limit" value={currency(lookup.card.monthlyLimit)} />
            <Stat
              label="Issuing business"
              value={business?.name ?? 'EzSale'}
            />
            <Stat
              label="Issued"
              value={new Date(lookup.card.issuedAt).toLocaleDateString()}
            />
          </div>

          {!usable.ok && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Transaction blocked</div>
                <div className="text-xs">{usable.reason}</div>
              </div>
            </div>
          )}

          {usable.ok && (
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Amount</div>
                <div className="mt-0.5 text-lg font-bold text-ink-900">{currency(total)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Balance before</div>
                <div className="mt-0.5 text-lg font-bold text-ink-900">
                  {currency(lookup.card.balance)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-500">
                  Balance after
                </div>
                <div
                  className={`mt-0.5 text-lg font-bold ${
                    insufficient ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {currency(afterBalance)}
                </div>
              </div>
            </div>
          )}

          {usable.ok && insufficient && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Insufficient balance</div>
                <div className="text-xs">
                  Available balance is {currency(lookup.card.balance)} but the order total is{' '}
                  {currency(total)}.
                </div>
              </div>
            </div>
          )}

          {usable.ok && !insufficient && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-ink-500">
                Tap confirm to charge {currency(total)} from this membership card.
              </div>
              {!confirming ? (
                <button onClick={() => setConfirming(true)} className="btn-primary py-3">
                  <Check className="h-4 w-4" /> Confirm Charge
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="btn-secondary"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={charge}
                    disabled={processing}
                    className="btn-primary py-3 disabled:opacity-50"
                  >
                    {processing ? 'Processing…' : 'Charge Card'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: MembershipCard['status'] }) {
  const map: Record<MembershipCard['status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    inactive: { label: 'Inactive', cls: 'bg-ink-100 text-ink-600 border-ink-200' },
    blocked: { label: 'Blocked', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const m = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${m.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  )
}

function Stat({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
      <div
        className={`mt-0.5 text-sm font-bold ${
          highlight ? 'text-brand-700' : 'text-ink-900'
        } ${mono ? 'font-mono tracking-wide' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function SuccessScreen({ txn, onNewSale }: { txn: Transaction; onNewSale: () => void }) {
  const member = txn.memberId ? getMember(txn.memberId) : null
  const card = txn.cardId ? getCards().find((c) => c.id === txn.cardId) : null
  const itemsCount = txn.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="mt-4 text-2xl font-extrabold text-ink-900">Payment successful</div>
            <div className="mt-1 text-sm text-ink-500">
              Transaction completed and recorded.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Transaction" value={txn.id} mono />
            <Stat label="Method" value={paymentMethodLabel(txn.method)} />
            <Stat label="Items" value={`${itemsCount}`} />
            <Stat label="Amount" value={currency(txn.total)} highlight />
          </div>

          {txn.method === 'membership' && txn.cardId && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Card" value={txn.cardNumber ?? '—'} mono />
              <Stat label="Member" value={member?.name ?? '—'} />
              <Stat
                label="Remaining balance"
                value={currency(card?.balance ?? 0)}
                highlight
              />
            </div>
          )}

          {txn.method === 'cash' && typeof txn.change === 'number' && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                label="Tendered"
                value={currency(txn.amountTendered ?? txn.total)}
              />
              <Stat label="Change" value={currency(txn.change)} highlight />
              <Stat label="Status" value={txn.status} />
            </div>
          )}

          {(txn.method === 'card' || txn.method === 'bank' || txn.method === 'wallet') && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat label="Reference" value={txn.reference ?? '—'} mono />
              <Stat label="Status" value={txn.status} />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            <button onClick={onNewSale} className="btn-primary py-3">
              <User className="h-4 w-4" /> Start New Sale
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
            <button className="btn-ghost">
              <Download className="h-4 w-4" /> Email Receipt
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-ink-900">Items</div>
            <Link to="/app/transactions" className="text-xs font-semibold text-ink-700 hover:underline">
              View all transactions
            </Link>
          </div>
          <div className="space-y-2">
            {txn.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-900">{it.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {currency(it.price)} × {it.qty}
                  </div>
                </div>
                <div className="font-bold text-ink-900">
                  {currency(it.price * it.qty)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers — these are evaluated at finalize time using the latest cart/products snapshot.
// We re-read from localStorage to avoid passing the entire cart list down through every panel.
function buildItemsFromCart() {
  const cart = getCart()
  const products = getProducts()
  return cart.map((c) => {
    const p = products.find((x) => x.id === c.productId)
    return {
      productId: c.productId,
      name: p?.name ?? 'Item',
      price: p?.price ?? 0,
      qty: c.qty,
    }
  })
}

function totalsFor() {
  const items = buildItemsFromCart()
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = Math.round(subtotal * 0.1)
  const total = Math.max(0, subtotal - discount)
  return { items, subtotal, discount, total }
}
