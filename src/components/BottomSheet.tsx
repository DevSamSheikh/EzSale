import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * BottomSheet is a mobile-first slide-up panel. On desktop (`md+`) it
 * renders as a centered modal (max-w-md) so the same code path can be used
 * for "drawer on mobile, dialog on desktop" without juggling two layouts.
 *
 * It traps the page (body scroll lock) while open, closes on backdrop click
 * and on `Escape`, and supports a drag-to-dismiss handle on mobile.
 */
export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Max height on mobile (e.g. '90vh'). Defaults to 92dvh. */
  maxHeight?: string
  /** Extra className for the panel surface. */
  className?: string
  /** When true, do not render the drag handle on mobile. */
  hideHandle?: boolean
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxHeight = '92dvh',
  className = '',
  hideHandle = false,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const dragStartY = useRef<number | null>(null)
  const dragOffset = useRef(0)
  const sheetEl = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    dragStartY.current = e.touches[0].clientY
    dragOffset.current = 0
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (dragStartY.current == null) return
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy < 0) return
    dragOffset.current = dy
    if (sheetEl.current) {
      sheetEl.current.style.transform = `translateY(${dy}px)`
      sheetEl.current.style.transition = 'none'
    }
  }
  function onTouchEnd() {
    if (dragStartY.current == null) return
    if (sheetEl.current) {
      sheetEl.current.style.transition = ''
      sheetEl.current.style.transform = ''
    }
    if (dragOffset.current > 120) {
      onClose()
    }
    dragStartY.current = null
    dragOffset.current = 0
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Mobile: bottom sheet */}
      <div
        ref={(el) => {
          sheetRef.current = el
          sheetEl.current = el
        }}
        style={{ maxHeight }}
        className={`absolute inset-x-0 bottom-0 flex animate-[sheetUp_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop md:hidden ${className}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!hideHandle && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-12 rounded-full bg-ink-200" aria-hidden />
          </div>
        )}
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-3">
            <div className="min-w-0 flex-1">
              {title && (
                <div className="truncate text-base font-bold text-ink-900">{title}</div>
              )}
              {description && (
                <p className="mt-0.5 truncate text-xs text-ink-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="border-t border-ink-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>

      {/* Desktop: centered modal */}
      <div
        className={`absolute inset-0 hidden md:flex md:items-center md:justify-center md:p-4`}
      >
        <div
          className={`relative flex max-h-[85vh] w-full max-w-md animate-[sheetUp_0.2s_ease-out] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop ${className}`}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <div className="truncate text-base font-bold text-ink-900">{title}</div>
                )}
                {description && (
                  <p className="mt-0.5 truncate text-xs text-ink-500">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && (
            <div className="border-t border-ink-100 bg-white px-5 py-4">{footer}</div>
          )}
        </div>
      </div>

      <style>{`@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
