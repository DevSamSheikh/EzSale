import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react'
import {
  addToCart,
  clearCart,
  getCart,
  getCategories,
  getProducts,
  removeFromCart,
  setCartQty,
  type POSProduct,
} from '../../pos-store'
import { POSNavbar } from '../../components/POSNavbar'
import { playCue } from '../../audio'

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
    <div className="flex h-[120px] items-stretch gap-3 overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="relative m-1 grid h-[111px] w-[111px] shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-50">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full rounded-xl object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-2.5 pr-3">
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
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-ink-500">
            Total <span className="font-bold text-ink-900">{currency(product.price * qty)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDec}
              className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50"
              aria-label="Decrease"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-5 text-center text-sm font-bold text-ink-900">{qty}</span>
            <button
              onClick={onInc}
              className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-800"
              aria-label="Increase"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutSummary({
  lines,
  onClear,
  onCheckout,
}: {
  lines: { p: POSProduct; qty: number }[]
  onClear: () => void
  onCheckout: () => void
}) {
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const discount = Math.round(subtotal * 0.1)
  const total = subtotal - discount

  return (
    <div className="space-y-3 border-t border-ink-100 px-5 py-4">
      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-ink-700">
            <Tag className="h-3.5 w-3.5" />
          </div>
          <div className="truncate text-sm font-semibold text-ink-900">Promo Every User (10%)</div>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 rounded-pill border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50"
        >
          Change Promo
        </button>
      </div>

      <div className="space-y-1.5 px-1 text-sm">
        <div className="flex items-center justify-between text-ink-600">
          <span>Total Product Price</span>
          <span className="font-semibold text-ink-900">{currency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-ink-600">
          <span>Discount</span>
          <span className="font-semibold text-ink-900">-{currency(discount)}</span>
        </div>
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
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
        <CheckoutSummary lines={lines} onClear={onClear} onCheckout={onCheckout} />
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

  useEffect(() => {
    setProducts(getProducts())
    setCart(getCart())
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

          {/* Cart panel (desktop) */}
          <aside className="hidden min-h-0 lg:flex">
            <CartPanel
              products={products}
              cart={cart}
              onInc={handleInc}
              onDec={handleDec}
              onRemove={handleRemove}
              onClear={handleClear}
              onCheckout={handleCheckout}
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
                onClose={() => setDrawerOpen(false)}
                variant="mobile"
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
