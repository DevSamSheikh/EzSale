import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  body?: string
  /** Optional accent icon (defaults to a tone-matched lucide icon). */
  icon?: React.ReactNode
  /** Milliseconds before auto-dismiss. 0 means "sticky" — user must close. */
  durationMs?: number
}

export interface ToastApi {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
  clear: () => void
  /** Convenience helpers. */
  success: (title: string, body?: string) => string
  info: (title: string, body?: string) => string
  warning: (title: string, body?: string) => string
  error: (title: string, body?: string) => string
}

let counter = 0
function nextId(): string {
  counter += 1
  return `t-${Date.now().toString(36)}-${counter.toString(36)}`
}

/**
 * Lightweight, page-scoped toast queue. No global provider required.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Saved')
 *
 * Renders a fixed stack in the bottom-centre with auto-dismiss.
 */
export function useToast(): ToastApi {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
    const handle = timersRef.current.get(id)
    if (handle) {
      clearTimeout(handle)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (input: Omit<Toast, 'id'> & { id?: string }) => {
      const id = input.id ?? nextId()
      const toast: Toast = { durationMs: 3500, ...input, id }
      setToasts((cur) => {
        const next = [...cur.filter((t) => t.id !== id), toast]
        return next.slice(-5)
      })
      const dur = toast.durationMs ?? 3500
      if (dur > 0) {
        const handle = setTimeout(() => dismiss(id), dur)
        timersRef.current.set(id, handle)
      }
      return id
    },
    [dismiss],
  )

  const clear = useCallback(() => {
    timersRef.current.forEach((h) => clearTimeout(h))
    timersRef.current.clear()
    setToasts([])
  }, [])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((h) => clearTimeout(h))
      timersRef.current.clear()
    }
  }, [])

  return {
    toasts,
    push,
    dismiss,
    clear,
    success: (title, body) => push({ tone: 'success', title, body }),
    info: (title, body) => push({ tone: 'info', title, body }),
    warning: (title, body) => push({ tone: 'warning', title, body }),
    error: (title, body) => push({ tone: 'error', title, body }),
  }
}

const TONE: Record<ToastTone, { bg: string; text: string; border: string; ring: string; Icon: typeof CheckCircle2 }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-200/60',
    Icon: CheckCircle2,
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    ring: 'ring-sky-200/60',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-200/60',
    Icon: TriangleAlert,
  },
  error: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-200/60',
    Icon: ShieldAlert,
  },
}

/**
 * Drop-in replacement for the dozens of inline "fixed bottom centred
 * rounded-pill bg-ink-900" toast markup scattered across pages.
 */
export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-3 sm:bottom-6">
      {toasts.map((t) => {
        const tone = TONE[t.tone]
        const Icon = tone.Icon
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-pop ring-1 ${tone.bg} ${tone.border} ${tone.ring}`}
          >
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white ${tone.text}`}>
              {t.icon ?? <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900">{t.title}</div>
              {t.body && <div className="mt-0.5 text-xs text-ink-600">{t.body}</div>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-white/80 hover:text-ink-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}