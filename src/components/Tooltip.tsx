import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
 * the `content` panel.
 *
 * Renders the tooltip into `document.body` via a portal so it can escape
 * ancestor `overflow: hidden` containers (e.g. table cards). The panel is
 * positioned with fixed coordinates measured from the trigger element and
 * sits on the topmost layer (`z-[60]`) so it always paints above table
 * rows, cards, and overflow wrappers.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className = '',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
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

  // Re-measure whenever the tooltip opens or the page scrolls / resizes,
  // so the panel stays anchored to the trigger.
  useEffect(() => {
    if (!open) return
    function measure() {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const top =
        side === 'top' ? rect.top - 6 : rect.bottom + 6
      const left = rect.left + rect.width / 2
      setPos({ top, left })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, side])

  const transform =
    side === 'top'
      ? 'translate(-50%, -100%)'
      : 'translate(-50%, 0)'

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
      {open && pos
        ? createPortal(
            <span
              role="tooltip"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                transform,
                zIndex: 60,
              }}
              className={`pointer-events-none max-w-xs whitespace-nowrap rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-800 shadow-pop ${className}`}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}