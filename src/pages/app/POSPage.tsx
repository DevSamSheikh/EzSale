import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Minus,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  CheckCircle2,
  DollarSign,
  ArrowUp,
} from 'lucide-react'
import {
  addToCart,
  clearCart,
  getCart,
  getCategories,
  getProducts,
  PRODUCTS_UPDATED_EVENT,
  removeFromCart,
  setCartQty,
  type POSProduct,
} from '../../pos-store'
import { POSNavbar } from '../../components/POSNavbar'
import { playCue } from '../../audio'

type PromoId = 'none' | 'default' | 'first5' | 'weekend' | 'custom'
type DiscountKind = 'percent' | 'amount'

interface Promo {
  label: string
  kind: DiscountKind
  value: number
}

const PROMOS: Record<PromoId, Promo> = {
  none: { label: 'No discount', kind: 'percent', value: 0 },
  default: { label: 'Promo Every User (10%)', kind: 'percent', value: 10 },
  first5: { label: 'First 5% Off', kind: 'percent', value: 5 },
  weekend: { label: 'Weekend 15% Off', kind: 'percent', value: 15 },
  custom: { label: 'Custom discount', kind: 'percent', value: 0 },
}

function computeDiscount(subtotal: number, promo: Promo): number {
  if (promo.value <= 0) return 0
  if (promo.kind === 'percent') {
    return Math.min(subtotal, Math.round((subtotal * promo.value) / 100))
  }
  return Math.min(subtotal, Math.round(promo.value))
}

type CategoryFilter = string

function currency(n: number) {
  return `$${n.toFixed(0)}`
}

function badgeClass(b: POSProduct['badge']) {
  switch (b) {
    case 'best':
      return 'bg-blue-500'
    case 'top':
      return 'bg-emerald-500'
    case 'new':
      return 'bg-pink-500'
    case 'offer':
      return 'bg-rose-500'
    default:
      return ''
  }
}

function badgeText(b: POSProduct['badge']) {
  if (b === 'best') return 'Best\nSALE'
  if (b === 'top') return 'TOP\nSALE'
  return ''
}

function ProductCard({
  product,
  qtyInCart,
  onAdd,
  onInc,
  onDec,
  onToggleFav,
}: {
  product: POSProduct
  qtyInCart: number
  onAdd: () => void
  onInc: () => void
  onDec: () => void
  onToggleFav: () => void
}) {
  const inCart = qtyInCart > 0
  return (
    <div className="pos-card group flex h-full flex-col">
      <div className="pos-card-image relative">
        {product.badge && product.badgeLabel && (
          <span className={`pos-badge ${badgeClass(product.badge)}`}>
            {badgeText(product.badge) || product.badgeLabel}
          </span>
        )}
        <button
          onClick={onToggleFav}
          className={
            product.favorite
              ? 'pos-fav-btn-on absolute right-2 top-2 z-10'
              : 'pos-fav-btn absolute right-2 top-2 z-10'
          }
          aria-label="Toggle favorite"
        >
          <Heart className={`h-4 w-4 ${product.favorite ? 'fill-current' : ''}`} />
        </button>

        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Add button — white ring container with inner lime button, attached to image bottom-right corner */}
        <div className="absolute bottom-2 right-2 z-20">
          {inCart ? (
            <div className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-100">
              <button
                onClick={onDec}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-5 px-1 text-center text-xs font-bold text-ink-900">
                {qtyInCart}
              </span>
              <button
                onClick={onInc}
                className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-ink-900 transition-colors hover:bg-brand-400"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="grid h-8 w-8 place-items-center rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-100 transition-colors"
              aria-label={`Add ${product.name} to cart`}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-brand-500 text-ink-900">
                <Plus className="h-3.5 w-3.5" />
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 pr-1">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink-900">{product.name}</div>
          <div className="mt-0.5 truncate text-xs text-ink-500">{product.description}</div>
        </div>
        <div className="shrink-0 text-sm font-bold text-ink-900">{currency(product.price)}</div>
      </div>
    </div>
  )
}

function CartItemRow({
  product,
  qty,
  onInc,
  onDec,
  onRemove,
}: {
  product: POSProduct
  qty: number
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex h-[96px] items-stretch gap-3 overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="relative m-1 grid h-[88px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-50">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full rounded-xl object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-2 pr-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink-900">{product.name}</div>
            <div className="truncate text-[11px] text-ink-500">{product.description}</div>
          </div>
          <button
            onClick={onRemove}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-ink-500">
            Total <span className="font-bold text-ink-900">{currency(product.price * qty)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDec}
              className="grid h-6 w-6 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50"
              aria-label="Decrease"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-4 text-center text-sm font-bold text-ink-900">{qty}</span>
            <button
              onClick={onInc}
              className="grid h-6 w-6 place-items-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-800"
              aria-label="Increase"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutSummary({
  lines,
  promoLabel,
  subtotal,
  discount,
  total,
  onCheckout,
  onSelectPromo,
  customKind,
  customValue,
  onCustomKind,
  onCustomValue,
  onApplyCustom,
}: {
  lines: { p: POSProduct; qty: number }[]
  promoLabel: string
  subtotal: number
  discount: number
  total: number
  onCheckout: () => void
  onSelectPromo: (id: PromoId) => void
  customKind: DiscountKind
  customValue: string
  onCustomKind: (k: DiscountKind) => void
  onCustomValue: (v: string) => void
  onApplyCustom: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const hasDiscount = discount > 0

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleSelect(id: PromoId) {
    onSelectPromo(id)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleApply() {
    onApplyCustom()
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyToggle(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen((o) => !o)
    }
  }

  return (
    <div className="space-y-3 border-t border-ink-100 px-5 py-4">
      <div ref={ref} className="relative">
        <div className="flex w-full items-center justify-between rounded-2xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-ink-700">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-900">{promoLabel}</div>
              <div className="text-[10px] text-ink-500">Tap to change promo</div>
            </div>
          </div>
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            onKeyDown={handleKeyToggle}
            className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50 focus:bg-ink-50"
            aria-label="Change promo"
            title="Change promo"
          >
            <ArrowUp
              className={`h-4 w-4 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {open && (
          <div
            role="listbox"
            aria-label="Promo options"
            className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Predefined discounts
            </div>
            <div className="space-y-1">
              {(['none', 'default', 'first5', 'weekend'] as PromoId[]).map((id) => {
                const p = PROMOS[id]
                return (
                  <button
                    key={id}
                    role="option"
                    aria-selected={promoLabel === p.label}
                    onClick={() => handleSelect(id)}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 focus:bg-ink-50 focus:outline-none"
                  >
                    <span className="font-semibold text-ink-900">{p.label}</span>
                    <span className="text-xs text-ink-500">
                      {p.value > 0 ? `-${p.value}%` : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 border-t border-ink-100 pt-2">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Custom discount
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-white">
                  <button
                    onClick={() => onCustomKind('percent')}
                    aria-pressed={customKind === 'percent'}
                    className={`grid h-8 w-8 place-items-center transition-colors focus:outline-none ${
                      customKind === 'percent' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                    }`}
                    aria-label="Percent"
                    title="Percentage"
                  >
                    <Percent className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onCustomKind('amount')}
                    aria-pressed={customKind === 'amount'}
                    className={`grid h-8 w-8 place-items-center transition-colors focus:outline-none ${
                      customKind === 'amount' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                    }`}
                    aria-label="Cash"
                    title="Cash amount"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={customValue}
                  onChange={(e) => onCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApply()
                  }}
                  placeholder="0"
                  aria-label="Custom discount value"
                  className="input h-8 w-full"
                />
                <button onClick={handleApply} className="btn-primary h-8 shrink-0 rounded-xl px-3 text-xs">
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5 px-1 text-sm">
        <div className="flex items-center justify-between text-ink-600">
          <span>Total Product Price</span>
          <span className="font-semibold text-ink-900">{currency(subtotal)}</span>
        </div>
        {hasDiscount && (
          <div className="flex items-center justify-between text-ink-600">
            <span>Discount</span>
            <span className="font-semibold text-ink-900">-{currency(discount)}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink-200 pt-2 text-base font-bold text-ink-900">
          <span>Total Payment</span>
          <span>{currency(total)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        disabled={lines.length === 0}
        className="btn-primary w-full rounded-pill py-3 text-sm font-bold disabled:opacity-50"
      >
        Proceed to Payment
      </button>
    </div>
  )
}

function CartPanel({
  products,
  cart,
  onInc,
  onDec,
  onRemove,
  onClear,
  onCheckout,
  onClose,
  promoLabel,
  subtotal,
  discount,
  total,
  onSelectPromo,
  customKind,
  customValue,
  onCustomKind,
  onCustomValue,
  onApplyCustom,
  variant = 'desktop',
}: {
  products: POSProduct[]
  cart: { productId: string; qty: number }[]
  onInc: (id: string) => void
  onDec: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  onCheckout: () => void
  onClose?: () => void
  promoLabel: string
  subtotal: number
  discount: number
  total: number
  onSelectPromo: (id: PromoId) => void
  customKind: DiscountKind
  customValue: string
  onCustomKind: (k: DiscountKind) => void
  onCustomValue: (v: string) => void
  onApplyCustom: () => void
  variant?: 'desktop' | 'mobile'
}) {
  const lines = useMemo(
    () =>
      cart
        .map((c) => {
          const p = products.find((x) => x.id === c.productId)
          return p ? { p, qty: c.qty } : null
        })
        .filter((x): x is { p: POSProduct; qty: number } => x !== null),
    [cart, products],
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold tracking-tight text-ink-900">Products</div>
          {lines.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink-100 px-1.5 text-[11px] font-semibold text-ink-700">
              {lines.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lines.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600"
            >
              Delete All
            </button>
          )}
          {variant === 'mobile' && onClose && (
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700 lg:hidden"
              aria-label="Close cart"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="pos-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-300">
                <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="mt-3 text-sm font-semibold text-ink-900">No products selected</div>
              <p className="mt-1 text-xs text-ink-500">Select products to start an order.</p>
            </div>
          </div>
        ) : (
          lines.map((l) => (
            <CartItemRow
              key={l.p.id}
              product={l.p}
              qty={l.qty}
              onInc={() => onInc(l.p.id)}
              onDec={() => onDec(l.p.id)}
              onRemove={() => onRemove(l.p.id)}
            />
          ))
        )}
      </div>

      <div className="shrink-0">
        <CheckoutSummary
          lines={lines}
          promoLabel={promoLabel}
          subtotal={subtotal}
          discount={discount}
          total={total}
          onCheckout={onCheckout}
          onSelectPromo={onSelectPromo}
          customKind={customKind}
          customValue={customValue}
          onCustomKind={onCustomKind}
          onCustomValue={onCustomValue}
          onApplyCustom={onApplyCustom}
        />
      </div>
    </div>
  )
}

export default function POSPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<POSProduct[]>([])
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([])
  const [activeCat, setActiveCat] = useState<CategoryFilter>('All')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [promoId, setPromoId] = useState<PromoId>(() => {
    if (typeof window === 'undefined') return 'default'
    return (localStorage.getItem('ezsale:pos:promo') as PromoId) || 'default'
  })
  const [customKind, setCustomKind] = useState<DiscountKind>(() => {
    if (typeof window === 'undefined') return 'percent'
    return (localStorage.getItem('ezsale:pos:promoKind') as DiscountKind) || 'percent'
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
    function refresh() {
      // Only sell products that are explicitly active + available. Drafts,
      // inactive, and archived items still live in the products module but
      // should never reach the POS till an admin re-enables them.
      setProducts(
        getProducts().filter(
          (p) => p.status === 'active' && p.available !== false,
        ),
      )
      setCart(getCart())
    }
    refresh()
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1500)
    return () => clearTimeout(t)
  }, [toast])

  const categories = useMemo(() => {
    const list = getCategories(products)
    return ['All', ...list]
  }, [products])

  useEffect(() => {
    if (activeCat !== 'All' && !categories.includes(activeCat)) {
      setActiveCat('All')
    }
  }, [categories, activeCat])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCat !== 'All' && p.category !== activeCat) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [products, activeCat, query])

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const qtyMap = useMemo(() => {
    const m: Record<string, number> = {}
    cart.forEach((c) => (m[c.productId] = c.qty))
    return m
  }, [cart])

  const promo: Promo =
    promoId === 'custom'
      ? {
          label:
            customKind === 'percent'
              ? `Custom (${customValue || 0}%)`
              : `Custom ($${customValue || 0})`,
          kind: customKind,
          value: Math.max(0, Number(customValue) || 0),
        }
      : PROMOS[promoId]
  const subtotal = cart.reduce((s, c) => {
    const p = products.find((x) => x.id === c.productId)
    return p ? s + p.price * c.qty : s
  }, 0)
  const discount = computeDiscount(subtotal, promo)
  const total = Math.max(0, subtotal - discount)

  function refreshCart() {
    setCart(getCart())
  }
  function handleAdd(id: string, name: string) {
    addToCart(id, 1)
    refreshCart()
    setToast(`Added ${name}`)
    playCue('success')
  }
  function handleInc(id: string) {
    const cur = cart.find((c) => c.productId === id)?.qty ?? 0
    setCartQty(id, cur + 1)
    refreshCart()
    playCue('tap')
  }
  function handleDec(id: string) {
    const cur = cart.find((c) => c.productId === id)?.qty ?? 0
    setCartQty(id, Math.max(1, cur - 1))
    refreshCart()
    playCue('tap')
  }
  function handleRemove(id: string) {
    removeFromCart(id)
    refreshCart()
    playCue('warning')
  }
  function handleClear() {
    clearCart()
    refreshCart()
    playCue('danger')
  }
  function handleCheckout() {
    if (cart.length === 0) return
    navigate('/app/pos/payment')
  }
  function handleSelectPromo(id: PromoId) {
    setPromoId(id)
    if (id === 'custom') {
      setToast('Enter a custom discount')
    } else {
      setToast(`Promo: ${PROMOS[id].label}`)
    }
    playCue('tap')
  }
  function handleApplyCustom() {
    setPromoId('custom')
    setToast('Custom discount applied')
    playCue('success')
  }
  function toggleFav(id: string) {
    const next = products.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p))
    setProducts(next)
    localStorage.setItem('ezsale:pos:products', JSON.stringify(next))
    playCue('tap')
  }

  return (
    <div className="min-h-screen bg-ink-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex h-[calc(100dvh-1.5rem)] max-w-[1400px] flex-col gap-4">
        <POSNavbar />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Products panel */}
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center">
              <div className="text-xl font-bold tracking-tight text-ink-900">Products</div>
              <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                <div className="relative min-w-0 flex-1 sm:max-w-[200px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="input h-10 rounded-pill pl-9"
                  />
                </div>
                <button
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  aria-label="Filter"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button className="btn-primary shrink-0 rounded-pill">
                  <Plus className="h-4 w-4" /> Create Order
                </button>
              </div>
            </div>

            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-ink-100 px-5 py-3">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={c === activeCat ? 'pos-pill-active shrink-0' : 'pos-pill shrink-0'}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="pos-scroll min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qtyInCart={qtyMap[p.id] ?? 0}
                    onAdd={() => handleAdd(p.id, p.name)}
                    onInc={() => handleInc(p.id)}
                    onDec={() => handleDec(p.id)}
                    onToggleFav={() => toggleFav(p.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-ink-200 p-10 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-50 text-ink-300">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-ink-900">No products found</div>
                    <p className="mt-1 text-xs text-ink-500">Try a different search or category.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right cart panel (desktop) */}
          <aside className="hidden h-full min-h-0 w-full lg:flex">
            <CartPanel
              products={products}
              cart={cart}
              onInc={handleInc}
              onDec={handleDec}
              onRemove={handleRemove}
              onClear={handleClear}
              onCheckout={handleCheckout}
              promoLabel={promo.label}
              subtotal={subtotal}
              discount={discount}
              total={total}
              onSelectPromo={handleSelectPromo}
              customKind={customKind}
              customValue={customValue}
              onCustomKind={setCustomKind}
              onCustomValue={setCustomValue}
              onApplyCustom={handleApplyCustom}
              variant="desktop"
            />
          </aside>
        </div>
      </div>

      {/* Mobile floating cart button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-pill bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-pop hover:bg-ink-800 lg:hidden"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-4 w-4" />
        Cart
        {cartCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-ink-900">
            {cartCount}
          </span>
        )}
      </button>

      {/* Mobile cart drawer (slide-over) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] animate-[slideUp_0.25s_ease-out] overflow-hidden rounded-t-3xl bg-ink-50 p-3 shadow-pop">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink-200" />
            <div className="h-[80vh]">
              <CartPanel
                products={products}
                cart={cart}
                onInc={handleInc}
                onDec={handleDec}
                onRemove={handleRemove}
                onClear={handleClear}
                onCheckout={handleCheckout}
                promoLabel={promo.label}
                subtotal={subtotal}
                discount={discount}
                total={total}
                onSelectPromo={handleSelectPromo}
                customKind={customKind}
                customValue={customValue}
                onCustomKind={setCustomKind}
                onCustomValue={setCustomValue}
                onApplyCustom={handleApplyCustom}
                variant="mobile"
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-pill bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
            <CheckCircle2 className="h-4 w-4 text-brand-400" />
            {toast}
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
