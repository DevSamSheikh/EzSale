import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface DrawerShellProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Size preset — xl is the default for the order/transaction drawers. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Sub-header slot (e.g. status pills, quick actions) */
  headerExtra?: ReactNode
}

const SIZE: Record<NonNullable<DrawerShellProps['size']>, string> = {
  sm: 'w-full sm:max-w-md sm:w-[75%]',
  md: 'w-full sm:max-w-lg sm:w-[75%]',
  lg: 'w-full sm:max-w-2xl sm:w-[75%]',
  xl: 'w-full sm:max-w-[1100px] sm:w-[75%]',
  full: 'w-full sm:w-[75%]',
}

export function DrawerShell({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'xl',
  headerExtra,
}: DrawerShellProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`absolute inset-y-0 right-0 flex w-full ${SIZE[size]} animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-white/95 px-6 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-ink-900 sm:text-lg">
              {title}
            </div>
            {description && (
              <p className="mt-0.5 truncate text-xs text-ink-500">{description}</p>
            )}
            {headerExtra && <div className="mt-3 flex flex-wrap items-center gap-2">{headerExtra}</div>}
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-ink-50/30 px-6 py-5 sm:px-7">
          {children}
        </div>
        {footer && (
          <div className="border-t border-ink-100 bg-white px-6 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}