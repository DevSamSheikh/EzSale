import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Filter,
  Inbox,
  ListChecks,
  MapPin,
  Receipt,
  RotateCcw,
  Search,
  Settings as Cog,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  Wallet,
} from 'lucide-react'
import {
  PageHeader,
  StatCard,
  EmptyState,
} from '../../components/Primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useToast, ToastViewport } from '../../components/Toast'
import {
  clearAllAdmin,
  deleteNotification,
  getActivity,
  getAdminNotifications,
  markAllAdminRead,
  markNotificationRead,
  useNotificationsTick,
} from '../../notifications-store'
import { runCardHealthChecks } from '../../card-store'
import { getMember } from '../../card-store'
import { playCue } from '../../audio'
import { useNavigate } from 'react-router-dom'
import type {
  ActivityEntry,
  ActivitySeverity,
  Notification,
  NotificationCategory,
  NotificationSeverity,
} from '../../types'

type TabKey = 'notifications' | 'activity'
type SeverityFilter = 'all' | NotificationSeverity
type CategoryFilter = 'all' | NotificationCategory

const TAB_DEFS: { id: TabKey; label: string; icon: typeof Bell }[] = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'activity', label: 'Activity timeline', icon: ActivityIcon },
]

const SEVERITY_OPTIONS: { id: SeverityFilter; label: string; tone: string }[] = [
  { id: 'all', label: 'All severities', tone: 'bg-ink-100 text-ink-700 border-ink-200' },
  { id: 'info', label: 'Info', tone: 'bg-ink-100 text-ink-700 border-ink-200' },
  { id: 'success', label: 'Success', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'warning', label: 'Warning', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'critical', label: 'Critical', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All categories' },
  { id: 'deposit_request', label: 'Deposit requests' },
  { id: 'deposit_status', label: 'Deposit status' },
  { id: 'low_balance', label: 'Low balance' },
  { id: 'card_expiry', label: 'Card expiry' },
  { id: 'card_status', label: 'Card status' },
  { id: 'transaction', label: 'Transactions' },
  { id: 'refund', label: 'Refunds' },
  { id: 'membership', label: 'Membership' },
  { id: 'user', label: 'New users' },
  { id: 'system', label: 'System' },
]

const NOTIF_ICON: Record<NotificationCategory, typeof Bell> = {
  deposit_request: Sparkles,
  deposit_status: CheckCircle2,
  low_balance: Wallet,
  card_expiry: CalendarClock,
  card_status: CreditCard,
  transaction: Receipt,
  refund: CircleAlert,
  membership: CreditCard,
  system: Cog,
  user: UserIcon,
}

const ACTIVITY_ICON: Record<string, typeof ActivityIcon> = {
  card: CreditCard,
  member: UserIcon,
  operator: UserIcon,
  transaction: Receipt,
  refund: CircleAlert,
  role: Shield,
  location: MapPin,
  settings: Cog,
  system: ActivityIcon,
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

const SEVERITY_BADGE: Record<NotificationSeverity, string> = {
  info: 'bg-ink-100 text-ink-700 border-ink-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SEVERITY_RING: Record<NotificationSeverity, string> = {
  info: 'border-ink-200',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  critical: 'border-rose-300',
}

export default function NotificationsPage() {
  useNotificationsTick()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('notifications')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [activitySeverity, setActivitySeverity] = useState<'all' | ActivitySeverity>('all')
  const toast = useToast()
  const [confirmMarkAll, setConfirmMarkAll] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Notification | null>(null)

  // Run card health checks on mount so the page always reflects fresh data
  // (idempotent — re-notification is suppressed by localStorage flags).
  useEffect(() => {
    runCardHealthChecks({ force: false })
  }, [])

  const notifList = getAdminNotifications()
  const activityList = getActivity()

  const filteredNotifs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notifList.filter((n) => {
      if (severity !== 'all' && n.severity !== severity) return false
      if (category !== 'all' && n.category !== category) return false
      if (readFilter === 'unread' && n.read) return false
      if (readFilter === 'read' && !n.read) return false
      if (q) {
        const hay = [n.title, n.body, n.category, n.severity, n.memberId ?? '']
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [notifList, severity, category, readFilter, search])

  const filteredActivity = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activityList.filter((a) => {
      if (activitySeverity !== 'all' && a.severity !== activitySeverity) return false
      if (q) {
        const hay = [a.title, a.body ?? '', a.category, a.by ?? '']
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [activityList, activitySeverity, search])

  const summary = useMemo(() => {
    const unread = notifList.filter((n) => !n.read).length
    const critical = notifList.filter((n) => n.severity === 'critical' && !n.read).length
    const today = notifList.filter((n) => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return new Date(n.createdAt).getTime() >= start.getTime()
    }).length
    return { unread, critical, today, totalNotifs: notifList.length, totalActivity: activityList.length }
  }, [notifList, activityList])

  function flash(msg: string) {
    toast.success(msg)
    playCue('success')
  }

  return (
    <div>
      <PageHeader
        title="Notifications & activity"
        subtitle="Stay on top of deposits, refunds, card changes, and other important events."
        actions={
          <>
            <button
              type="button"
              onClick={() => setConfirmMarkAll(true)}
              className="btn-secondary"
              disabled={summary.unread === 0}
            >
              <ListChecks className="h-4 w-4" /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="btn-secondary"
            >
              <Trash2 className="h-4 w-4" /> Clear all
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Unread"
          value={String(summary.unread)}
          sub={summary.unread === 0 ? 'All caught up' : 'Need attention'}
          icon={Bell}
          tone={summary.unread > 0 ? 'amber' : 'emerald'}
          variant="top"
        />
        <StatCard
          label="Critical"
          value={String(summary.critical)}
          sub={summary.critical === 0 ? 'No critical alerts' : 'Immediate review'}
          icon={AlertTriangle}
          tone={summary.critical > 0 ? 'rose' : 'neutral'}
          variant="top"
        />
        <StatCard
          label="New today"
          value={String(summary.today)}
          sub="Notifications"
          icon={Sparkles}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Activity events"
          value={String(summary.totalActivity)}
          sub="Recent admin actions"
          icon={ActivityIcon}
          tone="indigo"
          variant="top"
        />
      </div>

      <div className="mb-4 inline-flex h-10 items-center rounded-full border border-ink-200 bg-white p-0.5">
        {TAB_DEFS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                playCue('tap')
              }}
              className={
                tab === t.id
                  ? 'inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3 text-xs font-bold text-white'
                  : 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-ink-700 hover:bg-ink-50'
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="card mb-4 p-4 sm:p-3">
        <div className="scroll-soft -mx-1 flex flex-wrap items-center gap-2 overflow-x-auto px-1">
          <div className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              className="input h-9 rounded-pill pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications or activity…"
            />
          </div>
          {tab === 'notifications' && (
            <>
              <SeverityPill
                value={severity}
                onChange={setSeverity}
              />
              <CategoryPill
                value={category}
                onChange={setCategory}
              />
              <ReadPill
                value={readFilter}
                onChange={setReadFilter}
              />
            </>
          )}
          {tab === 'activity' && (
            <ActivitySeverityPill
              value={activitySeverity}
              onChange={setActivitySeverity}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setSeverity('all')
              setCategory('all')
              setReadFilter('all')
              setActivitySeverity('all')
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {tab === 'notifications' && (
        <NotificationsList
          items={filteredNotifs}
          onOpen={(n) => {
            markNotificationRead(n.id, true)
            if (n.href) {
              navigate(n.href)
            }
          }}
          onDelete={(n) => setPendingDelete(n)}
        />
      )}

      {tab === 'activity' && (
        <ActivityList items={filteredActivity} />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />

      <ConfirmDialog
        open={confirmMarkAll}
        title="Mark all notifications as read?"
        description={`This clears the unread state on ${summary.unread} notification${summary.unread === 1 ? '' : 's'}. You can still see them in the activity log.`}
        confirmLabel="Mark all read"
        tone="info"
        onConfirm={() => {
          markAllAdminRead()
          flash('All notifications marked read.')
          setConfirmMarkAll(false)
        }}
        onClose={() => setConfirmMarkAll(false)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear all admin notifications?"
        description={`This permanently deletes ${notifList.length} notification${notifList.length === 1 ? '' : 's'}. This cannot be undone.`}
        confirmLabel="Clear all"
        tone="danger"
        onConfirm={() => {
          clearAllAdmin()
          flash('All notifications cleared.')
          setConfirmClear(false)
        }}
        onClose={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this notification?"
        description={pendingDelete?.title}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDelete) {
            deleteNotification(pendingDelete.id)
            toast.success('Notification deleted.')
          }
          setPendingDelete(null)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

// ---- Notifications list ------------------------------------------------

function NotificationsList({
  items,
  onOpen,
  onDelete,
}: {
  items: Notification[]
  onOpen: (n: Notification) => void
  onDelete: (n: Notification) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-7 w-7" />}
        title="No notifications match your filters"
        description="Try clearing the search or severity filter."
      />
    )
  }
  return (
    <ul className="space-y-2">
      {items.map((n) => (
        <NotificationCard
          key={n.id}
          notif={n}
          onOpen={() => onOpen(n)}
          onDelete={() => onDelete(n)}
        />
      ))}
    </ul>
  )
}

function NotificationCard({
  notif,
  onOpen,
  onDelete,
}: {
  notif: Notification
  onOpen: () => void
  onDelete: () => void
}) {
  const Icon = NOTIF_ICON[notif.category] ?? Bell
  const member = notif.memberId ? getMember(notif.memberId) : null
  const isUnread = !notif.read
  return (
    <li
      className={`card flex items-start gap-3 p-4 transition-colors ${
        isUnread ? 'border-brand-200 bg-brand-50/40' : ''
      }`}
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border bg-white ${SEVERITY_RING[notif.severity]}`}
      >
        <Icon className="h-4 w-4 text-ink-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {isUnread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
          )}
          <span className="truncate text-sm font-bold text-ink-900">
            {notif.title}
          </span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_BADGE[notif.severity]}`}
          >
            {notif.severity}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-700">{notif.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
          <span className="font-semibold uppercase tracking-wider text-ink-400">
            {notif.category.replace(/_/g, ' ')}
          </span>
          <span>·</span>
          <span>{relTime(notif.createdAt)}</span>
          {member && (
            <>
              <span>·</span>
              <span>Member · {member.name}</span>
            </>
          )}
          {notif.href && (
            <>
              <span>·</span>
              <span className="font-mono text-[10px] text-ink-400">{notif.href}</span>
            </>
          )}
          {notif.readAt && (
            <>
              <span>·</span>
              <span>Read {relTime(notif.readAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-pill bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-ink-800"
        >
          View
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-500 hover:bg-rose-50 hover:text-rose-600"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

// ---- Activity list ------------------------------------------------------

function ActivityList({ items }: { items: ActivityEntry[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-7 w-7" />}
        title="No activity events match your filters"
        description="Admin actions will appear here as you make changes."
      />
    )
  }
  return (
    <ol className="relative ml-3 space-y-0 border-l-2 border-ink-100 pl-5">
      {items.map((a) => (
        <li key={a.id} className="relative pb-4">
          <span
            className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border bg-white ${SEVERITY_RING[a.severity]}`}
          >
            <ActivityIconBubble entry={a} />
          </span>
          <ActivityCard entry={a} />
        </li>
      ))}
    </ol>
  )
}

function ActivityIconBubble({ entry }: { entry: ActivityEntry }) {
  const Icon = ACTIVITY_ICON[entry.category] ?? ActivityIcon
  const tone =
    entry.severity === 'critical' || entry.severity === 'warning'
      ? 'text-rose-600'
      : entry.severity === 'success'
      ? 'text-emerald-600'
      : 'text-ink-700'
  return <Icon className={`h-3 w-3 ${tone}`} />
}

function ActivityCard({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-bold text-ink-900">{entry.title}</span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_BADGE[entry.severity]}`}
        >
          {entry.severity}
        </span>
      </div>
      {entry.body && <p className="mt-1 text-xs text-ink-700">{entry.body}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
        <span className="font-semibold uppercase tracking-wider text-ink-400">
          {entry.category}
        </span>
        <span>·</span>
        <span>{relTime(entry.createdAt)}</span>
        {entry.by && (
          <>
            <span>·</span>
            <span>by {entry.by}</span>
          </>
        )}
        {entry.transactionId && (
          <>
            <span>·</span>
            <span className="font-mono text-[10px]">{entry.transactionId}</span>
          </>
        )}
        {entry.cardId && (
          <>
            <span>·</span>
            <span className="font-mono text-[10px]">card {entry.cardId.slice(-4)}</span>
          </>
        )}
        {entry.memberId && (
          <>
            <span>·</span>
            <span>member {entry.memberId.slice(-4)}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Pill-style filter pickers ----------------------------------------

function SeverityPill({
  value,
  onChange,
}: {
  value: SeverityFilter
  onChange: (v: SeverityFilter) => void
}) {
  const current = SEVERITY_OPTIONS.find((o) => o.id === value) ?? SEVERITY_OPTIONS[0]
  const [open, setOpen] = useState(false)
  return (
    <PillDropdown
      label={current.label}
      tone={current.tone}
      open={open}
      onOpenChange={setOpen}
      options={SEVERITY_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        tone: o.tone,
      }))}
      onChange={(v) => {
        onChange(v as SeverityFilter)
        setOpen(false)
      }}
    />
  )
}

function CategoryPill({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (v: CategoryFilter) => void
}) {
  const current = CATEGORY_OPTIONS.find((o) => o.id === value) ?? CATEGORY_OPTIONS[0]
  const [open, setOpen] = useState(false)
  return (
    <PillDropdown
      label={current.label}
      open={open}
      onOpenChange={setOpen}
      options={CATEGORY_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
      onChange={(v) => {
        onChange(v as CategoryFilter)
        setOpen(false)
      }}
    />
  )
}

function ReadPill({
  value,
  onChange,
}: {
  value: 'all' | 'unread' | 'read'
  onChange: (v: 'all' | 'unread' | 'read') => void
}) {
  const labels: Record<typeof value, string> = {
    all: 'All statuses',
    unread: 'Unread only',
    read: 'Read only',
  }
  const [open, setOpen] = useState(false)
  return (
    <PillDropdown
      label={labels[value]}
      open={open}
      onOpenChange={setOpen}
      options={[
        { id: 'all', label: labels.all },
        { id: 'unread', label: labels.unread },
        { id: 'read', label: labels.read },
      ]}
      onChange={(v) => {
        onChange(v as typeof value)
        setOpen(false)
      }}
    />
  )
}

function ActivitySeverityPill({
  value,
  onChange,
}: {
  value: 'all' | ActivitySeverity
  onChange: (v: 'all' | ActivitySeverity) => void
}) {
  const current = SEVERITY_OPTIONS.find((o) => o.id === value) ?? SEVERITY_OPTIONS[0]
  const [open, setOpen] = useState(false)
  return (
    <PillDropdown
      label={`Activity · ${current.label}`}
      tone={current.tone}
      open={open}
      onOpenChange={setOpen}
      options={SEVERITY_OPTIONS.map((o) => ({ id: o.id, label: o.label, tone: o.tone }))}
      onChange={(v) => {
        onChange(v as 'all' | ActivitySeverity)
        setOpen(false)
      }}
    />
  )
}

function PillDropdown({
  label,
  tone,
  open,
  onOpenChange,
  options,
  onChange,
}: {
  label: string
  tone?: string
  open: boolean
  onOpenChange: (v: boolean) => void
  options: { id: string; label: string; tone?: string }[]
  onChange: (v: string) => void
}) {
  return (
    <PillPopover
      label={
        <>
          <Filter className="h-3 w-3" /> {label}
        </>
      }
      tone={tone}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ul className="max-h-72 overflow-y-auto py-1">
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onChange(o.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-ink-50"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${
                o.tone
                  ? o.tone.replace('bg-', 'bg-').split(' ')[0]
                  : 'bg-ink-300'
              }`} />
              <span className="flex-1 truncate text-ink-800">{o.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </PillPopover>
  )
}

function PillPopover({
  label,
  tone,
  open,
  onOpenChange,
  children,
}: {
  label: React.ReactNode
  tone?: string
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <PillPopoverImpl
      label={label}
      tone={tone}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </PillPopoverImpl>
  )
}

function PillPopoverImpl({
  label,
  tone,
  open,
  onOpenChange,
  children,
}: {
  label: React.ReactNode
  tone?: string
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onOpenChange])
  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={
          tone
            ? `inline-flex h-9 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold ${tone}`
            : 'inline-flex h-9 items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50'
        }
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          {children}
        </div>
      )}
    </div>
  )
}
