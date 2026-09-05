import { useEffect, useState } from 'react'
import { Check, Image as ImageIcon, X } from 'lucide-react'
import type { POSProduct } from '../pos-store'

/**
 * Centered modal that asks the cashier to confirm or override the selling
 * price before a `allowPriceEdit` product is added to the POS cart.
 *
 * The modal never mutates the product — it returns the validated price to
 * the caller via `onConfirm`, and the caller is responsible for writing
 * that price onto the cart line (and eventually onto the order line) so
 * historical orders keep the actual price that was charged.
 */
export function PriceEditModal({
  product,
  onConfirm,
  onCancel,
}: {
  product: POSProduct
  onConfirm: (price: number) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Re-init when product changes (e.g. consecutive price edits).
  useEffect(() => {
    setText('')
    setError(null)
  }, [product.id])

  // Esc closes the modal without adding to cart.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function press(key: string) {
    setError(null)
    setText((cur) => {
      // Disallow more than one decimal separator.
      if (key === '.' && cur.includes('.')) return cur
      // Cap at 2 decimal places.
      if (cur.includes('.')) {
        const [, frac] = cur.split('.')
        if (frac && frac.length >= 2 && /^[0-9]$/.test(key)) return cur
      }
      // Strip a leading 0 when adding a digit immediately after
      // (e.g. "0" + "1" -> "1", "0." + "1" stays "0.1").
      if (cur === '0' && /^[0-9]$/.test(key)) return key
      return (cur + key).slice(0, 12)
    })
  }

  function backspace() {
    setError(null)
    setText((cur) => cur.slice(0, -1))
  }

  function clearAll() {
    setError(null)
    setText('')
  }

  function resetToList() {
    setError(null)
    setText(product.price.toFixed(2))
  }

  function validate(): number | null {
    const raw = text.trim()
    if (!raw) {
      setError('Enter a price before adding to cart.')
      return null
    }
    if (!/^\d+(\.\d{0,2})?$/.test(raw)) {
      setError('Price must be a positive number with up to 2 decimal places.')
      return null
    }
    const n = Number(raw)
    if (!isFinite(n) || n <= 0) {
      setError('Price must be greater than zero.')
      return null
    }
    if (n > 999999) {
      setError('Price is too large.')
      return null
    }
    return Math.round(n * 100) / 100
  }

  function confirm() {
    const n = validate()
    if (n === null) return
    onConfirm(n)
  }

  const preview = text.trim() === '' ? '0.00' : text

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/60" onClick={onCancel} aria-hidden />
      <div className="absolute inset-0 grid place-items-center p-3 sm:p-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-pop">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
              {product.image ? (
                <img src={product.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-5 w-5 text-ink-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-ink-900">{product.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500">
                {product.productCode && (
                  <span className="font-mono">{product.productCode}</span>
                )}
                {product.productCode && product.sku && (
                  <span className="text-ink-300">·</span>
                )}
                {product.sku && <span className="font-mono">SKU {product.sku}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/40 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  List price
                </div>
                <div className="text-sm font-bold text-ink-900">${product.price.toFixed(2)}</div>
              </div>
              {typeof product.cost === 'number' && (
                <div className="rounded-2xl border border-ink-100 bg-ink-50/40 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                    Cost
                  </div>
                  <div className="text-sm font-bold text-ink-900">${product.cost.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div>
              <label className="label">Selling price</label>
              <div
                className={`flex h-14 items-center justify-between rounded-2xl border bg-white px-4 ${
                  error ? 'border-rose-300 ring-1 ring-rose-200' : 'border-ink-200'
                }`}
              >
                <span className="text-lg font-semibold text-ink-500">$</span>
                <span className="flex-1 text-right text-2xl font-extrabold tabular-nums text-ink-900">
                  {preview}
                </span>
              </div>
              {error ? (
                <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
              ) : (
                <p className="mt-1 text-[11px] text-ink-500">
                  Enter the price actually being charged. The product's configured
                  price stays the same.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className="touch-target grid h-12 place-items-center rounded-xl border border-ink-200 bg-white text-lg font-bold text-ink-900 transition-colors hover:bg-ink-50"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => press('.')}
                className="touch-target grid h-12 place-items-center rounded-xl border border-ink-200 bg-white text-lg font-bold text-ink-900 transition-colors hover:bg-ink-50"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => press('0')}
                className="touch-target grid h-12 place-items-center rounded-xl border border-ink-200 bg-white text-lg font-bold text-ink-900 transition-colors hover:bg-ink-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                className="touch-target grid h-12 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50"
                aria-label="Backspace"
              >
                <span className="text-base font-bold">⌫</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={resetToList}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Use list price
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-ink-100 px-5 py-4">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="button" onClick={confirm} className="btn-primary flex-1">
              <Check className="h-4 w-4" /> Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}