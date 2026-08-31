import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Inbox,
  Receipt,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import {
  getAdminNotifications,
  markAllAdminRead,
  markNotificationRead,
  useNotificationsTick,
} from '../notifications-store'
import { playCue } from '../audio'
import { useNavigate } from 'react-router-dom'
import type {
  Notification,
  NotificationCategory,
  NotificationSeverity,
} from '../types'

const ICON_FOR: Record<NotificationCategory, typeof Sparkles> = {
  deposit_request: Sparkles,
  deposit_status: CheckCircle2,
  low_balance: Wallet,
  card_expiry: CalendarClock,
  card_status: CreditCard,
  transaction: Receipt,
  refund: CircleAlert,
  membership: CreditCard,
  system: Bell,
  user: Inbox,
}

const SEVERITY_BAR: Record<NotificationSeverity, string> = {
  info: 'bg-sky-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
}

const SEVERITY_BG: Record<NotificationSeverity, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  critical: 'bg-rose-50 border-rose-300 text-rose-900',
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
}

/** Categories that matter while ringing up a sale. */
const POS_RELEVANT_CATEGORIES: NotificationCategory[] = [
  'deposit_request',
  'deposit_status',
  'low_balance',
  'card_expiry',
  'card_status',
  'transaction',
  'refund',
  'membership',
]

export interface POSAlertStripProps {
  /** Limit how many alerts are surfaced at once. Defaults to 3. */
  max?: number
  /** When true, the strip is hidden even if alerts exist. */
  hidden?: boolean
}

/**
 * Persistent, dismissable alert strip pinned to the top of the POS
 * screen. It surfaces the highest-priority unread notifications that are
 * relevant to a POS operator (deposit requests, low balance, refunds,
 * card status, etc.). Tapping a card marks it read; the bell icon
 * moves it back into the dropdown only.
 */
export function POSAlertStrip({ max = 3, hidden }: POSAlertStripProps) {
  useNotificationsTick()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [localTick, setLocalTick] = useState(0)

  // Reset dismissed items when the underlying notification is marked read.
  useEffect(() => {
    setDismissed((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => {
        if (getAdminNotifications().some((n) => n.id === id && !n.read)) {
          next.add(id)
        }
      })
      return next
    })
  }, [localTick])

  const items = useMemo(() => {
    const all = getAdminNotifications()
    return all
      .filter((n) => !n.read)
      .filter((n) => POS_RELEVANT_CATEGORIES.includes(n.category))
      .filter((n) => !dismissed.has(n.id))
      .sort((a, b) => {
        const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
        if (r !== 0) return r
        return a.createdAt < b.createdAt ? 1 : -1
      })
      .slice(0, max)
  }, [dismissed, max, localTick])

  if (hidden) return null
  if (items.length === 0) return null

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id))
  }

  function open(n: Notification) {
    markNotificationRead(n.id, true)
    setLocalTick((t) => t + 1)
    if (n.href) {
      // POS operator can't navigate away while at the till — go to admin
      // dashboard only if the link is critical. Otherwise just mark read.
      if (n.severity === 'critical' || n.category === 'refund') {
        navigate(n.href)
      }
    }
    playCue('tap')
  }

  function markAllAndOpenAll() {
    markAllAdminRead()
    setLocalTick((t) => t + 1)
    navigate('/app/notifications')
  }

  return (
    <div
      className="flex items-stretch gap-2 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-2 shadow-soft"
      role="region"
      aria-label="POS alerts"
    >
      <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2 text-white">
        <Bell className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {items.length} alert{items.length === 1 ? '' : 's'}
        </span>
      </div>
      {items.map((n) => {
        const Icon = ICON_FOR[n.category] ?? AlertTriangle
        return (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => open(n)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                open(n)
              }
            }}
            className={`group relative flex min-w-[260px] max-w-md flex-1 cursor-pointer items-start gap-2.5 overflow-hidden rounded-xl border px-3 py-2 transition-shadow hover:shadow-soft ${SEVERITY_BG[n.severity]}`}
          >
            <span
              className={`absolute left-0 top-0 h-full w-1 ${SEVERITY_BAR[n.severity]}`}
              aria-hidden
            />
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/80 text-current">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pl-1">
              <div className="truncate text-xs font-bold">{n.title}</div>
              <div className="line-clamp-1 text-[11px] opacity-80">{n.body}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                dismiss(n.id)
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-current opacity-50 hover:bg-white/40 hover:opacity-100"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={markAllAndOpenAll}
        className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[11px] font-bold text-ink-700 hover:bg-ink-50"
      >
        View all
      </button>
    </div>
  )
}

/** Exported helper for the POS-side toast: returns a friendly one-liner. */
export function posToastForNotification(n: Notification): string {
  if (n.category === 'deposit_request') {
    return `New deposit request: ${n.title.replace(/^New deposit request/i, '').trim() || n.body}`
  }
  if (n.category === 'low_balance') {
    return `Low balance: ${n.body}`
  }
  if (n.category === 'refund') {
    return `Refund processed: ${n.body}`
  }
  return `${n.title} — ${n.body}`
}
