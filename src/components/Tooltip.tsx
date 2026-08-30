import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  /** Side to render the tooltip relative to the trigger. Default: 'top' */
  side?: 'top' | 'bottom'
  /** Tailwind classes appended to the tooltip surface */
  className?: string
}

/**
 * Lightweight CSS-only tooltip. Hover/focus on the wrapped element reveals
 * the `content` panel. Renders as a `<span>` so it works inside table cells.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className = '',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  // Close on outside click (mainly for touch devices that fire `click`)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pos =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
      : 'top-full left-1/2 -translate-x-1/2 mt-1.5'

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-40 max-w-xs whitespace-nowrap rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-800 shadow-pop ${pos} ${className}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}