import { useEffect, useRef, type ReactNode } from 'react'
import { AlertTriangle, ShieldAlert, ShieldCheck, X } from 'lucide-react'

export type ConfirmTone = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  /** A short label explaining what is being affected (e.g. "Refund $24.50"). */
  impact?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  loading?: boolean
  /** Disable native browser confirm() fallback; instead the dialog must always be confirmed. */
  requireConfirm?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Modal confirmation dialog. Replaces every window.confirm / inline
 * "ConfirmShell" copy across the app. Implements:
 *   - focus trap (Tab cycles between confirm + cancel buttons)
 *   - focus restoration (returns focus to the previously focused element)
 *   - ESC closes
 *   - body scroll lock while open
 *   - aria-modal + role="alertdialog"
 */
export function ConfirmDialog({
  open,
  title,
  description,
  impact,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const order = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLButtonElement[]
        if (order.length === 0) return
        const idx = order.findIndex((el) => el === document.activeElement)
        if (e.shiftKey && idx <= 0) {
          e.preventDefault()
          order[order.length - 1]?.focus()
        } else if (!e.shiftKey && idx === order.length - 1) {
          e.preventDefault()
          order[0]?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)

    // Focus the safer default (cancel) so accidental Enter doesn't trigger confirm
    const t = setTimeout(() => cancelRef.current?.focus(), 30)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      clearTimeout(t)
      previouslyFocusedRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const Icon =
    tone === 'danger' ? ShieldAlert : tone === 'warning' ? AlertTriangle : ShieldCheck
  const swatch =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-600'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-sky-50 text-sky-600'
  const confirmCls =
    tone === 'danger'
      ? 'btn-danger'
      : tone === 'warning'
      ? 'btn-primary'
      : 'btn-primary'

  return (
    <div className="fixed inset-0 z-[55]" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[1px]" onClick={loading ? undefined : onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-2xl overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
          <div className="flex items-start gap-3 p-5">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${swatch}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div id="confirm-title" className="text-base font-bold text-ink-900">
                {title}
              </div>
              {description && (
                <div className="mt-1 text-sm text-ink-600">{description}</div>
              )}
              {impact && (
                <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm text-ink-700">
                  {impact}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 bg-ink-50/40 p-4 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary w-full sm:w-auto"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`${confirmCls} w-full sm:w-auto`}
            >
              {loading ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}