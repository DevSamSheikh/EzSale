import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  NfcIcon,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react'
import {
  chargeCard,
  createTransaction,
  formatCardNumber,
  getCardByNumber,
  getCards,
  getMember,
  isCardUsable,
  paymentMethodLabel,
} from '../../payment-store'
import { clearCart, getCart, getProducts } from '../../pos-store'
import { getAuth, getBusiness } from '../../store'
import type {
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
} from '../../types'
import { playCue } from '../../audio'

function currency(n: number) {
  return `$${n.toFixed(0)}`
}

interface OrderLine {
  productId: string
  name: string
  price: number
  qty: number
  image: string
}

interface Promo {
  label: string
  kind: 'percent' | 'amount'
  value: number
}

const PROMO_OPTIONS: { id: string; promo: Promo }[] = [
  { id: 'none', promo: { label: 'No discount', kind: 'percent', value: 0 } },
  { id: 'default', promo: { label: 'Promo Every User (10%)', kind: 'percent', value: 10 } },
  { id: 'first5', promo: { label: 'First 5% Off', kind: 'percent', value: 5 } },
  { id: 'weekend', promo: { label: 'Weekend 15% Off', kind: 'percent', value: 15 } },
]

const METHOD_OPTIONS: {
  id: PaymentMethod
  label: string
  Icon: typeof Banknote
  desc: string
}[] = [
  { id: 'cash', label: 'Cash', Icon: Banknote, desc: 'Tender with change' },
  { id: 'card', label: 'Card', Icon: CreditCard, desc: 'Debit / credit' },
  { id: 'bank', label: 'Bank', Icon: Building2, desc: 'Bank transfer' },
  { id: 'wallet', label: 'Wallet', Icon: Smartphone, desc: 'Apple / Google Pay' },
  { id: 'membership', label: 'Membership', Icon: NfcIcon, desc: 'Scan member card' },
]

function applyPromo(subtotal: number, p: Promo) {
  if (p.value <= 0) return 0
  if (p.kind === 'percent') return Math.min(subtotal, Math.round((subtotal * p.value) / 100))
  return Math.min(subtotal, Math.round(p.value))
}

export default function POSPaymentPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const business = getBusiness()

  const [lines, setLines] = useState<OrderLine[]>([])
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [promoId, setPromoId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default'
    return localStorage.getItem('ezsale:pos:promo') || 'default'
  })
  const [customKind, setCustomKind] = useState<'percent' | 'amount'>(() => {
    if (typeof window === 'undefined') return 'percent'
    return (localStorage.getItem('ezsale:pos:promoKind') as 'percent' | 'amount') || 'percent'
  })
  const [customValue, setCustomValue] = useState<string>(() => {
    if (typeof window === 'undefined') return '0'
    return localStorage.getItem('ezsale:pos:promoValue') || '0'
  })

  useEffect(() => {
    localStorage.setItem('ezsale:pos:promo', promoId)
  }, [promoId])
  useEffect(() => {
    localStorage.setItem('ezsale:pos:promoKind', customKind)
  }, [customKind])
  useEffect(() => {
    localStorage.setItem('ezsale:pos:promoValue', customValue)
  }, [customValue])

  useEffect(() => {
    const cart = getCart()
    const products = getProducts()
    const mapped: OrderLine[] = cart
      .map((c) => {
        const p = products.find((x) => x.id === c.productId)
        if (!p) return null
        return {
          productId: c.productId,
          name: p.name,
          price: p.price,
          qty: c.qty,
          image: p.image,
        }
      })
      .filter((x): x is OrderLine => x !== null)
    setLines(mapped)
  }, [])

  const customPromo: Promo = useMemo(
    () => ({
      label: customKind === 'percent' ? `Custom (${customValue || 0}%)` : `Custom ($${customValue || 0})`,
      kind: customKind,
      value: Math.max(0, Number(customValue) || 0),
    }),
    [customKind, customValue],
  )
  const activePromo: Promo = useMemo(() => {
    if (promoId === 'custom') return customPromo
    return PROMO_OPTIONS.find((o) => o.id === promoId)?.promo ?? PROMO_OPTIONS[0].promo
  }, [promoId, customPromo])

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const discount = applyPromo(subtotal, activePromo)
  const total = Math.max(0, subtotal - discount)

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-ink-50 px-3 py-6 sm:px-6">
        <div className="mx-auto flex h-[calc(100dvh-3rem)] max-w-[1200px] flex-col items-center justify-center gap-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-ink-300 shadow-soft">
            <Banknote className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink-900">No items in this order</h2>
          <p className="max-w-sm text-sm text-ink-500">
            Add products to the cart before proceeding to payment.
          </p>
          <Link to="/app/pos" className="btn-primary">
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </Link>
        </div>
      </div>
    )
  }

  function finalize(extra: Partial<Transaction>) {
    const items = lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      price: l.price,
      qty: l.qty,
    }))
    const created = createTransaction({
      businessId: business?.id ?? 'preview',
      operatorEmail: auth?.email ?? 'demo@ezsale.app',
      items,
      subtotal,
      discount,
      total,
      method,
      status: 'completed',
      ...extra,
    })
    if (method === 'membership' && extra.cardId) {
      chargeCard(extra.cardId, total)
    }
    clearCart()
    playCue('success')
    navigate(`/app/pos/receipt/${created.id}`)
  }

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/app/pos"
            className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </Link>
          <div className="text-left sm:text-right">
            <div className="text-[11px] uppercase tracking-wide text-ink-500">Order total</div>
            <div className="text-2xl font-extrabold text-ink-900">{currency(total)}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,360px] xl:grid-cols-[1fr,380px]">
          {/* Left — payment flow */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Choose payment method</h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Select how the customer is paying for this order.
                  </p>
                </div>
                <div className="hidden text-right text-xs text-ink-500 sm:block">
                  <div className="font-semibold text-ink-700">{business?.name ?? 'EzSale'}</div>
                  <div>Operator · {auth?.email?.split('@')[0] ?? 'demo'}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
              <CashPanel total={total} onPay={finalize} />
            )}
            {method === 'card' && (
              <CardPanel total={total} onPay={finalize} />
            )}
            {method === 'bank' && (
              <BankPanel total={total} onPay={finalize} />
            )}
            {method === 'wallet' && (
              <WalletPanel total={total} onPay={finalize} />
            )}
            {method === 'membership' && (
              <MembershipPanel
                total={total}
                onPay={finalize}
              />
            )}
          </div>

          {/* Right — order summary */}
          <OrderSummaryPanel
            lines={lines}
            subtotal={subtotal}
            discount={discount}
            total={total}
            promoLabel={activePromo.label}
            methodLabel={paymentMethodLabel(method)}
            promoId={promoId}
            onSelectPromo={setPromoId}
            customKind={customKind}
            customValue={customValue}
            onCustomKind={setCustomKind}
            onCustomValue={setCustomValue}
            onApplyCustom={() => setPromoId('custom')}
          />
        </div>
      </div>
    </div>
  )
}

function OrderSummaryPanel({
  lines,
  subtotal,
  discount,
  total,
  promoLabel,
  methodLabel,
  promoId,
  onSelectPromo,
  customKind,
  customValue,
  onCustomKind,
  onCustomValue,
  onApplyCustom,
}: {
  lines: OrderLine[]
  subtotal: number
  discount: number
  total: number
  promoLabel: string
  methodLabel: string
  promoId: string
  onSelectPromo: (id: string) => void
  customKind: 'percent' | 'amount'
  customValue: string
  onCustomKind: (k: 'percent' | 'amount') => void
  onCustomValue: (v: string) => void
  onApplyCustom: () => void
}) {
  return (
    <aside className="flex h-fit flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-5 py-4">
        <div className="text-lg font-bold text-ink-900">Order summary</div>
        <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
          <span>
            {lines.length} item{lines.length === 1 ? '' : 's'} ·{' '}
            {lines.reduce((s, l) => s + l.qty, 0)} qty
          </span>
          <span>Method · {methodLabel}</span>
        </div>
      </div>

      <div className="pos-scroll max-h-[320px] space-y-2 overflow-y-auto px-5 py-4">
        {lines.map((l) => (
          <div
            key={l.productId}
            className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/40 p-2"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
              <img src={l.image} alt={l.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">{l.name}</div>
              <div className="text-[11px] text-ink-500">
                {currency(l.price)} × {l.qty}
              </div>
            </div>
            <div className="shrink-0 text-sm font-bold text-ink-900">
              {currency(l.price * l.qty)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-ink-100 px-5 py-4">
        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-ink-500">
            <span>Promo</span>
            <span className="font-semibold text-ink-700">{promoLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROMO_OPTIONS.map((opt) => {
              const active = promoId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectPromo(opt.id)}
                  className={`rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? 'border-brand-500 bg-brand-500 text-ink-900'
                      : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {opt.promo.value > 0 ? `-${opt.promo.value}%` : 'No discount'}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-white">
              <button
                onClick={() => onCustomKind('percent')}
                className={`grid h-7 w-7 place-items-center transition-colors ${
                  customKind === 'percent' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="Percent"
                title="Percentage"
              >
                %
              </button>
              <button
                onClick={() => onCustomKind('amount')}
                className={`grid h-7 w-7 place-items-center transition-colors ${
                  customKind === 'amount' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="Cash"
                title="Cash amount"
              >
                $
              </button>
            </div>
            <input
              type="number"
              min={0}
              value={customValue}
              onChange={(e) => onCustomValue(e.target.value)}
              placeholder="0"
              className="input h-7 w-full px-2 text-xs"
            />
            <button
              onClick={onApplyCustom}
              className="btn-primary h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="space-y-1.5 px-1 text-sm">
          <div className="flex items-center justify-between text-ink-600">
            <span>Subtotal</span>
            <span className="font-semibold text-ink-900">{currency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-ink-600">
              <span>Discount</span>
              <span className="font-semibold text-ink-900">-{currency(discount)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink-200 pt-2 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function CashPanel({
  total,
  onPay,
}: {
  total: number
  onPay: (extra: Partial<Transaction>) => void
}) {
  const [tendered, setTendered] = useState<string>(String(Math.ceil(total)))
  const value = Math.max(0, Math.round(Number(tendered) || 0))
  const change = Math.max(0, value - total)
  const quickAmounts = useMemo(() => {
    const base = [
      Math.ceil(total),
      Math.ceil(total / 5) * 5,
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 20) * 20,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
    ]
    return Array.from(new Set(base.filter((v) => v > 0))).slice(0, 6)
  }, [total])

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
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

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50/60 p-3 text-sm">
        <span className="text-ink-600">Change due</span>
        <span className="text-lg font-bold text-ink-900">{currency(change)}</span>
      </div>

      <button
        disabled={value < total}
        onClick={() =>
          onPay({
            method: 'cash',
            amountTendered: value,
            change,
          })
        }
        className="btn-primary mt-4 w-full rounded-pill py-3 disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Confirm & Complete Payment
      </button>
    </div>
  )
}

function CardPanel({
  total,
  onPay,
}: {
  total: number
  onPay: (extra: Partial<Transaction>) => void
}) {
  const [ref, setRef] = useState('')

  function pay() {
    playCue('tap')
    onPay({
      method: 'card',
      reference: ref || `AUTH-${Date.now().toString().slice(-6)}`,
    })
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
      <div className="text-sm font-bold text-ink-900">Card payment</div>
      <p className="mt-1 text-xs text-ink-500">
        Insert, swipe, or tap the customer's card on the terminal.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,200px]">
        <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 text-center">
          <div>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-700 shadow-soft">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="mt-2 text-sm font-semibold text-ink-900">Ready for card</div>
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

      <button onClick={pay} className="btn-primary mt-4 w-full rounded-pill py-3">
        <ShieldCheck className="h-4 w-4" /> Charge Card
      </button>
    </div>
  )
}

function BankPanel({
  total,
  onPay,
}: {
  total: number
  onPay: (extra: Partial<Transaction>) => void
}) {
  const [ref, setRef] = useState('')
  const business = getBusiness()

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
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
          <div className="mt-0.5 text-sm font-bold text-ink-900">
            EZ-{Date.now().toString().slice(-6)}
          </div>
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
        onClick={() => onPay({ method: 'bank', reference: ref.trim() })}
        className="btn-primary mt-4 w-full rounded-pill py-3 disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Mark as Received
      </button>
    </div>
  )
}

function WalletPanel({
  total,
  onPay,
}: {
  total: number
  onPay: (extra: Partial<Transaction>) => void
}) {
  function pay() {
    playCue('tap')
    onPay({ method: 'wallet', reference: `WAL-${Date.now().toString().slice(-6)}` })
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
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
              <span className="font-semibold text-ink-900">Ready</span>
            </div>
          </div>
          <button onClick={pay} className="btn-primary rounded-pill py-3">
            <Wallet className="h-4 w-4" /> Confirm Payment
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
  member: Member | null
}

function MembershipPanel({
  total,
  onPay,
}: {
  total: number
  onPay: (extra: Partial<Transaction>) => void
}) {
  const [cardInput, setCardInput] = useState('')
  const [lookup, setLookup] = useState<CardLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

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
    if (!result.member) {
      setError('This card is not assigned to a member and cannot be used for payment.')
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
    if (!lookup || !lookup.member) return
    playCue('tap')
    onPay({
      method: 'membership',
      memberId: lookup.member.id,
      cardId: lookup.card.id,
      cardNumber: lookup.card.cardNumber,
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
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
              Clear
            </button>
          ) : (
            <button onClick={scan} className="btn-primary rounded-pill">
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

      {lookup && lookup.member && (
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
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

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Daily limit" value={currency(lookup.card.dailyLimit)} />
            <Stat label="Monthly limit" value={currency(lookup.card.monthlyLimit)} />
            <Stat
              label="Issued"
              value={new Date(lookup.card.issuedAt).toLocaleDateString()}
            />
            <Stat label="Limits" value="Active" />
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
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Balance after</div>
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
                  Available {currency(lookup.card.balance)} but order total is {currency(total)}.
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
                <button
                  onClick={() => setConfirming(true)}
                  className="btn-primary rounded-pill py-3"
                >
                  <Check className="h-4 w-4" /> Confirm Charge
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={charge}
                    className="btn-primary rounded-pill py-3"
                  >
                    Charge Card
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
    lost: { label: 'Lost', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    replaced: { label: 'Replaced', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
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
