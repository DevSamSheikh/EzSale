import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CreditCard,
  Inbox,
  Receipt,
  Settings as Cog,
  Sparkles,
  Wallet,
} from 'lucide-react'
import {
  getAdminNotifications,
  getUnreadAdminCount,
  markAllAdminRead,
  markNotificationRead,
  useNotificationsTick,
} from '../notifications-store'
import { playCue } from '../audio'
import type { Notification, NotificationCategory, NotificationSeverity } from '../types'

const ICON_FOR: Record<NotificationCategory, typeof Bell> = {
  deposit_request: Sparkles,
  deposit_status: CheckCheck,
  low_balance: Wallet,
  card_expiry: CalendarClock,
  card_status: CreditCard,
  transaction: Receipt,
  refund: ArrowDownRight,
  membership: CreditCard,
  system: Cog,
  user: Inbox,
}

const SEVERITY_RING: Record<NotificationSeverity, string> = {
  info: 'border-ink-100',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  critical: 'border-rose-300',
}

const SEVERITY_BADGE: Record<NotificationSeverity, string> = {
  info: 'bg-ink-100 text-ink-700 border-ink-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  deposit_request: 'Deposit request',
  deposit_status: 'Deposit status',
  low_balance: 'Low balance',
  card_expiry: 'Card expiry',
  card_status: 'Card status',
  transaction: 'Transaction',
  refund: 'Refund',
  membership: 'Membership',
  system: 'System',
  user: 'User',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

interface NotificationDropdownProps {
  open: boolean
  onClose: () => void
  onOpenAll?: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function NotificationDropdown({
  open,
  onClose,
  onOpenAll,
  triggerRef,
}: NotificationDropdownProps) {
  useNotificationsTick()
  const ref = useRef<HTMLDivElement | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current && ref.current.contains(target)) return
      if (triggerRef?.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose, triggerRef])

  const list = useMemo(() => {
    const all = getAdminNotifications()
    return filter === 'unread' ? all.filter((n) => !n.read) : all
  }, [filter, open])

  if (!open) return null

  const unread = getUnreadAdminCount()

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-2 w-[380px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-3 py-2.5">
        <div>
          <div className="text-sm font-bold text-ink-900">Notifications</div>
          <div className="text-[11px] text-ink-500">
            {unread > 0
              ? `${unread} unread of ${list.length} shown`
              : `${list.length} notifications`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FilterToggle filter={filter} onChange={setFilter} />
          <button
            type="button"
            onClick={() => {
              markAllAdminRead()
              playCue('success')
            }}
            disabled={unread === 0}
            className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        </div>
      </div>

      <ul className="max-h-[60vh] divide-y divide-ink-100 overflow-y-auto">
        {list.length === 0 ? (
          <li className="px-3 py-10 text-center text-xs text-ink-500">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-ink-50 text-ink-500">
              <Bell className="h-4 w-4" />
            </div>
            No notifications match the current filter.
          </li>
        ) : (
          list.map((n) => (
            <NotificationRow
              key={n.id}
              notif={n}
              onClose={onClose}
            />
          ))
        )}
      </ul>

      <div className="border-t border-ink-100 bg-ink-50/60 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            onOpenAll?.()
            onClose()
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-ink-800"
        >
          <ArrowUpRight className="h-3 w-3" />
          Open notification center
        </button>
      </div>
    </div>
  )
}

function FilterToggle({
  filter,
  onChange,
}: {
  filter: 'all' | 'unread'
  onChange: (v: 'all' | 'unread') => void
}) {
  return (
    <div className="inline-flex h-7 items-center rounded-full border border-ink-200 bg-white p-0.5">
      {(['all', 'unread'] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={
            filter === f
              ? 'inline-flex h-6 items-center rounded-full bg-ink-900 px-2 text-[10px] font-bold text-white'
              : 'inline-flex h-6 items-center rounded-full px-2 text-[10px] font-bold text-ink-700 hover:bg-ink-50'
          }
        >
          {f === 'all' ? 'All' : 'Unread'}
        </button>
      ))}
    </div>
  )
}

function NotificationRow({
  notif,
  onClose,
}: {
  notif: Notification
  onClose: () => void
}) {
  const Icon = ICON_FOR[notif.category] ?? Bell
  const isUnread = !notif.read
  const SeverityIcon =
    notif.severity === 'critical' || notif.severity === 'warning'
      ? CircleAlert
      : null

  function handleClick() {
    if (!notif.read) {
      markNotificationRead(notif.id, true)
      playCue('tap')
    }
  }

  const body = (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
        isUnread ? 'bg-brand-50/30' : ''
      } hover:bg-ink-50`}
    >
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white ${SEVERITY_RING[notif.severity]}`}
      >
        <Icon className="h-4 w-4 text-ink-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isUnread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
          )}
          <div className="truncate text-sm font-semibold text-ink-900">
            {notif.title}
          </div>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{notif.body}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-400">
          <span>{CATEGORY_LABEL[notif.category]}</span>
          <span>·</span>
          <span>{relTime(notif.createdAt)}</span>
          {SeverityIcon && (
            <>
              <span>·</span>
              <span className={`font-bold ${notif.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                {SEVERITY_LABEL[notif.severity]}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (notif.href) {
    return (
      <li>
        <Link to={notif.href} onClick={() => { handleClick(); onClose() }} className="block">
          {body}
        </Link>
      </li>
    )
  }
  return (
    <li>
      <button type="button" onClick={() => { handleClick(); onClose() }} className="block w-full text-left">
        {body}
      </button>
    </li>
  )
}

// ---- Topbar bell wrapper ------------------------------------------------

export interface TopbarNotificationsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenAll?: () => void
}

export function TopbarNotifications({
  open,
  onOpenChange,
  onOpenAll,
}: TopbarNotificationsProps) {
  useNotificationsTick()
  const ref = useRef<HTMLButtonElement | null>(null)
  const unread = getUnreadAdminCount()
  return (
    <div className="relative">
      <button
        ref={ref}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-soft">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <NotificationDropdown
        open={open}
        onClose={() => onOpenChange(false)}
        onOpenAll={onOpenAll}
        triggerRef={ref}
      />
    </div>
  )
}

// ---- Helpers re-exported so topbar can read the count ------------------

export function formatRecipient(n: Notification) {
  return n.audience === 'admin'
    ? 'Admin team'
    : n.memberId
    ? n.memberId
    : 'Member'
}
