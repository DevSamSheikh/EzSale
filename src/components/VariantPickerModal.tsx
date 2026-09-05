import { useEffect, useMemo, useState } from 'react'
import { Minus, Package, Plus, X } from 'lucide-react'
import type { POSProduct, ProductVariant } from '../pos-store'
import { availableStock } from '../pos-store'
import { formatCurrency, formatCurrencyPlain } from '../order-utils'

interface VariantPickerModalProps {
  /**
   * Whether the modal is visible. When omitted, the modal is assumed to
   * be controlled by the parent via the conditional render
   * (`{open && <VariantPickerModal />}`). Either way works — the modal
   * guards its own render so it's safe to always mount.
   */
  open?: boolean
  onClose: () => void
  product: POSProduct
  /**
   * Called after a variant is picked. The parent is responsible for
   * stock validation and the actual cart write. The modal will never call
   * `onAdd` with `qty > availableStock` because the +/- steppers and the
   * Add button are clamped to the current available count.
   */
  onAdd: (variantId: string, qty: number) => void
}

/**
 * POS variant selection modal. Opened automatically when a product with
 * variants is added to the cart. Uses the standard slide-up / slide-in
 * shell (matching `ProductEditorModal` and `ReviewDrawer`).
 *
 * Each row in the table represents one variant. Stock semantics:
 * - `undefined` → unlimited ("Unlimited" pill, no + cap)
 * - `> 0`        → tracked (shows count, + capped at available)
 * - `<= 0`       → out of stock (row dimmed, Add disabled)
 */
export function VariantPickerModal({
  open = true,
  onClose,
  product,
  onAdd,
}: VariantPickerModalProps) {
  const variants = product.variants
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  // Reset local qty state whenever the modal opens for a different product.
  useEffect(() => {
    if (open) {
      const init: Record<string, number> = {}
      variants.forEach((v) => {
        init[v.id] = 1
      })
      setQtys(init)
      setError(null)
    }
  }, [open, product.id, variants])

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const variantRows = useMemo(
    () =>
      variants.map((v) => ({
        variant: v,
        available: availableStock(product, v.id),
        outOfStock:
          v.stock !== undefined && v.stock <= 0,
      })),
    [variants, product],
  )

  function setQty(variantId: string, next: number) {
    const row = variantRows.find((r) => r.variant.id === variantId)
    if (!row) return
    const min = 1
    let max = Number.POSITIVE_INFINITY
    if (row.available !== undefined) max = Math.max(1, row.available)
    const clamped = Math.max(min, Math.min(max, next))
    setQtys((q) => ({ ...q, [variantId]: clamped }))
    setError(null)
  }

  function handleAdd(v: ProductVariant) {
    const qty = qtys[v.id] ?? 1
    const avail = availableStock(product, v.id)
    if (avail !== undefined && qty > avail) {
      setError(
        `Only ${avail} of “${v.name}” left in stock. Reduce the quantity or pick a different variant.`,
      )
      return
    }
    onAdd(v.id, qty)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Choose a variant">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-[slideUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:inset-y-0 md:right-0 md:left-auto md:max-h-full md:w-full md:max-w-lg md:animate-[slideIn_0.25s_ease-out] md:rounded-none">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-ink-100 px-5 py-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-6 w-6 text-ink-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-base font-bold text-ink-900">{product.name}</div>
            <p className="mt-0.5 text-xs text-ink-500">
              {variants.length} variant
              {variants.length === 1 ? '' : 's'} available · pick one to add to
              the cart.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
              <span>
                Base price{' '}
                <span className="font-bold text-ink-800">
                  {formatCurrency(product.price)}
                </span>
              </span>
              {product.cost !== undefined && (
                <span>
                  · cost{' '}
                  <span className="font-bold text-ink-700">
                    {formatCurrencyPlain(product.cost)}
                  </span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {variants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-8 text-center">
              <div className="text-sm font-bold text-ink-900">
                No variants configured
              </div>
              <p className="mt-1 text-xs text-ink-500">
                This product doesn&apos;t have any variants yet. Add some in
                the product editor, or add the product directly to the cart.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/60 text-left text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-3 py-2.5">Variant</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                      Cost
                    </th>
                    <th className="px-3 py-2.5 text-right">Stock</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {variantRows.map(({ variant: v, available, outOfStock }) => {
                    const qty = qtys[v.id] ?? 1
                    const stockLabel =
                      v.stock === undefined
                        ? 'Unlimited'
                        : outOfStock
                        ? 'Out of stock'
                        : `${v.stock} in stock`
                    const stockTone =
                      v.stock === undefined
                        ? 'bg-ink-100 text-ink-700 border-ink-200'
                        : outOfStock
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    const rowClass = outOfStock ? 'opacity-50' : ''
                    return (
                      <tr key={v.id} className={rowClass}>
                        <td className="px-3 py-3 align-top">
                          <div className="truncate text-sm font-semibold text-ink-900">
                            {v.name}
                          </div>
                          {v.sku && (
                            <div className="truncate font-mono text-[10px] text-ink-500">
                              {v.sku}
                            </div>
                          )}
                          {outOfStock && (
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                              Out of stock
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right align-top font-extrabold tabular-nums text-ink-900">
                          {formatCurrency(v.price)}
                        </td>
                        <td className="hidden px-3 py-3 text-right align-top tabular-nums text-ink-600 sm:table-cell">
                          {v.cost !== undefined ? formatCurrencyPlain(v.cost) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${stockTone}`}
                          >
                            {v.stock !== undefined && !outOfStock && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                            {stockLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="mx-auto flex w-fit items-center gap-1 rounded-xl border border-ink-200 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => setQty(v.id, qty - 1)}
                              disabled={outOfStock || qty <= 1}
                              className="grid h-7 w-7 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Decrease ${v.name} quantity`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-ink-900">
                              {qty}
                            </div>
                            <button
                              type="button"
                              onClick={() => setQty(v.id, qty + 1)}
                              disabled={
                                outOfStock ||
                                (available !== undefined && qty >= available)
                              }
                              className="grid h-7 w-7 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Increase ${v.name} quantity`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {available !== undefined && !outOfStock && (
                            <div className="mt-1 text-center text-[10px] text-ink-500">
                              of {available}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => handleAdd(v)}
                            disabled={outOfStock}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-ink-900 shadow-soft transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-30"
                            style={{ color: 'rgb(var(--text-on-brand-rgb))' }}
                            aria-label={`Add ${v.name} to cart`}
                            title={outOfStock ? 'Out of stock' : `Add ${v.name} to cart`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] text-ink-500">
            “-” means unlimited stock. Adding to the cart will reserve the
            selected quantity against the available count.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
