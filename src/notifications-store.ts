import { useEffect, useState } from 'react'
import type {
  ActivityCategory,
  ActivityEntry,
  ActivitySeverity,
  Notification,
  NotificationAudience,
  NotificationCategory,
  NotificationSeverity,
} from './types'
import { getBusiness } from './store'
import { getCurrentOperator } from './operators-store'
import { getMember } from './card-store'

const KEY_NOTIFICATIONS = 'ezsale:notifications'
const KEY_NOTIFICATIONS_READ = 'ezsale:notifications:read' // member-id -> read set
const KEY_ACTIVITY = 'ezsale:activity'
const SEED_FLAG = 'ezsale:notifications-activity:seeded:v1'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const MIN_MS = 60 * 1000

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function nowMs() {
  return Date.now()
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

function persistAll(list: Notification[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('ezsale:notifications-updated'))
}

function persistActivity(list: ActivityEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_ACTIVITY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('ezsale:activity-updated'))
}

// ---- Seeds --------------------------------------------------------------

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEED_FLAG)) return
  const business = getBusiness()
  const businessId = business?.id ?? 'preview'
  const now = nowMs()
  const seed: Notification[] = [
    {
      id: 'notif-seed-1',
      businessId,
      audience: 'admin',
      category: 'deposit_request',
      severity: 'info',
      title: 'New deposit request',
      body: 'Adil Raza requested a $50.00 top-up via Bank Transfer.',
      href: '/app/deposit-requests',
      read: false,
      createdAt: new Date(now - 12 * MIN_MS).toISOString(),
    },
    {
      id: 'notif-seed-2',
      businessId,
      audience: 'admin',
      category: 'low_balance',
      severity: 'warning',
      title: 'Low card balance',
      body: 'EZ-1000-7820 (Adil Raza) is below the $10 low-balance threshold.',
      href: '/app/cards',
      read: false,
      createdAt: new Date(now - 2 * HOUR_MS).toISOString(),
    },
    {
      id: 'notif-seed-3',
      businessId,
      audience: 'admin',
      category: 'card_expiry',
      severity: 'warning',
      title: 'Card expiring soon',
      body: 'EZ-1000-9100 expires in 30 days. Reach out to the member to renew.',
      href: '/app/cards',
      read: true,
      readAt: new Date(now - 3 * HOUR_MS).toISOString(),
      createdAt: new Date(now - 5 * HOUR_MS).toISOString(),
    },
    {
      id: 'notif-seed-4',
      businessId,
      audience: 'admin',
      category: 'refund',
      severity: 'info',
      title: 'Refund processed',
      body: 'Refund of $52.00 issued on order EZ-1001039 (Customer left before eating).',
      href: '/app/orders',
      read: true,
      readAt: new Date(now - 1 * DAY_MS).toISOString(),
      createdAt: new Date(now - 1 * DAY_MS - 5 * MIN_MS).toISOString(),
    },
    {
      id: 'notif-seed-5',
      businessId,
      audience: 'admin',
      category: 'user',
      severity: 'info',
      title: 'New member enrolled',
      body: 'Fatima Hussain joined with a corporate account and Gold card.',
      href: '/app/users',
      read: false,
      createdAt: new Date(now - 14 * MIN_MS).toISOString(),
    },
    {
      id: 'notif-seed-6',
      businessId,
      audience: 'admin',
      category: 'transaction',
      severity: 'critical',
      title: 'Failed transaction',
      body: 'Card charge on EZ-1001031 failed at the gateway. The member has been notified.',
      href: '/app/transactions',
      read: true,
      readAt: new Date(now - 6 * HOUR_MS).toISOString(),
      createdAt: new Date(now - 6 * HOUR_MS - 5 * MIN_MS).toISOString(),
    },
    {
      id: 'notif-seed-7',
      businessId,
      audience: 'admin',
      category: 'system',
      severity: 'info',
      title: 'Daily summary ready',
      body: 'Yesterday\u2019s sales report is ready to view.',
      href: '/app/analytics',
      read: true,
      readAt: new Date(now - 9 * HOUR_MS).toISOString(),
      createdAt: new Date(now - 9 * HOUR_MS - 5 * MIN_MS).toISOString(),
    },
  ]

  const seedActivity: ActivityEntry[] = [
    {
      id: 'act-seed-1',
      businessId,
      category: 'card',
      severity: 'success',
      title: 'Issued membership card',
      body: 'Card EZ-1000-4521 issued and assigned to Sara Khan.',
      by: 'admin@ezsale.app',
      createdAt: new Date(now - 90 * DAY_MS).toISOString(),
    },
    {
      id: 'act-seed-2',
      businessId,
      category: 'refund',
      severity: 'warning',
      title: 'Issued full refund',
      body: 'Order EZ-1001039 refunded $52.00 — customer left before eating.',
      transactionId: 'EZ-1001039',
      by: 'mira.hassan@ezsale.app',
      createdAt: new Date(now - 2 * HOUR_MS).toISOString(),
    },
    {
      id: 'act-seed-3',
      businessId,
      category: 'operator',
      severity: 'info',
      title: 'Operator invited',
      body: 'Tariq Mehmood invited as Read-Only User.',
      by: 'admin@ezsale.app',
      createdAt: new Date(now - 3 * DAY_MS).toISOString(),
    },
    {
      id: 'act-seed-4',
      businessId,
      category: 'transaction',
      severity: 'info',
      title: 'Manual adjustment recorded',
      body: 'Adjustment of −$15.00 applied to order EZ-1001032 (volume discount).',
      transactionId: 'EZ-1001032',
      by: 'admin@ezsale.app',
      createdAt: new Date(now - 3 * DAY_MS).toISOString(),
    },
    {
      id: 'act-seed-5',
      businessId,
      category: 'settings',
      severity: 'info',
      title: 'Business configuration updated',
      body: 'Tax rate and inclusive flag updated in Settings.',
      by: 'admin@ezsale.app',
      createdAt: new Date(now - 12 * DAY_MS).toISOString(),
    },
  ]
  persistAll(seed)
  persistActivity(seedActivity)
  localStorage.setItem(SEED_FLAG, '1')
}

// ---- Notifications ------------------------------------------------------

export function getNotifications(): Notification[] {
  if (typeof window === 'undefined') return []
  ensureSeeded()
  return safeParse<Notification[]>(localStorage.getItem(KEY_NOTIFICATIONS), [])
}

export function getAdminNotifications(): Notification[] {
  return getNotifications()
    .filter((n) => n.audience === 'admin')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getMemberNotifications(memberId: string | null | undefined): Notification[] {
  if (!memberId) return []
  return getNotifications()
    .filter((n) => n.audience === 'member' && n.memberId === memberId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getUnreadAdminCount(): number {
  return getAdminNotifications().filter((n) => !n.read).length
}

export function getUnreadMemberCount(memberId: string | null | undefined): number {
  return getMemberNotifications(memberId).filter((n) => !n.read).length
}

export interface NotifyInput {
  audience?: NotificationAudience
  memberId?: string
  cardId?: string
  transactionId?: string
  depositRequestId?: string
  category: NotificationCategory
  severity?: NotificationSeverity
  title: string
  body: string
  href?: string
}

export function notify(input: NotifyInput): Notification {
  const business = getBusiness()
  const notif: Notification = {
    id: uid('notif'),
    businessId: business?.id ?? 'preview',
    audience: input.audience ?? 'admin',
    memberId: input.memberId,
    cardId: input.cardId,
    transactionId: input.transactionId,
    depositRequestId: input.depositRequestId,
    category: input.category,
    severity: input.severity ?? 'info',
    title: input.title,
    body: input.body,
    href: input.href,
    read: false,
    createdAt: new Date().toISOString(),
  }
  const all = getNotifications()
  all.unshift(notif)
  persistAll(all)
  return notif
}

export function markNotificationRead(id: string, read = true) {
  const all = getNotifications()
  const idx = all.findIndex((n) => n.id === id)
  if (idx < 0) return
  all[idx] = {
    ...all[idx],
    read,
    readAt: read ? new Date().toISOString() : undefined,
  }
  persistAll(all)
}

export function markAllAdminRead() {
  const all = getNotifications()
  const now = new Date().toISOString()
  const next = all.map((n) =>
    n.audience === 'admin' && !n.read
      ? { ...n, read: true, readAt: now }
      : n,
  )
  persistAll(next)
}

export function markAllMemberRead(memberId: string) {
  if (!memberId) return
  const all = getNotifications()
  const now = new Date().toISOString()
  const next = all.map((n) =>
    n.audience === 'member' && n.memberId === memberId && !n.read
      ? { ...n, read: true, readAt: now }
      : n,
  )
  persistAll(next)
}

export function clearAllAdmin() {
  const all = getNotifications().filter((n) => n.audience !== 'admin')
  persistAll(all)
}

export function clearAllMember(memberId: string) {
  if (!memberId) return
  const all = getNotifications().filter(
    (n) => !(n.audience === 'member' && n.memberId === memberId),
  )
  persistAll(all)
}

export function deleteNotification(id: string) {
  const all = getNotifications().filter((n) => n.id !== id)
  persistAll(all)
}

// ---- Activity timeline --------------------------------------------------

export function getActivity(limit?: number): ActivityEntry[] {
  if (typeof window === 'undefined') return []
  ensureSeeded()
  const all = safeParse<ActivityEntry[]>(localStorage.getItem(KEY_ACTIVITY), [])
  const sorted = all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

export interface LogActivityInput {
  category: ActivityCategory
  severity?: ActivitySeverity
  title: string
  body?: string
  cardId?: string
  memberId?: string
  transactionId?: string
  operatorId?: string
  locationId?: string
  by?: string
}

export function logActivity(input: LogActivityInput): ActivityEntry {
  const business = getBusiness()
  const op = getCurrentOperator()
  const entry: ActivityEntry = {
    id: uid('act'),
    businessId: business?.id ?? 'preview',
    category: input.category,
    severity: input.severity ?? 'info',
    title: input.title,
    body: input.body,
    cardId: input.cardId,
    memberId: input.memberId,
    transactionId: input.transactionId,
    operatorId: input.operatorId,
    locationId: input.locationId,
    by: input.by ?? op?.email ?? 'system',
    createdAt: new Date().toISOString(),
  }
  const all = safeParse<ActivityEntry[]>(localStorage.getItem(KEY_ACTIVITY), [])
  all.unshift(entry)
  persistActivity(all)
  return entry
}

// ---- Hook: subscribe to changes ----------------------------------------

/** React hook that re-renders whenever notifications or activity change. */
export function useNotificationsTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    function bump() {
      setTick((t) => t + 1)
    }
    window.addEventListener('ezsale:notifications-updated', bump)
    window.addEventListener('ezsale:activity-updated', bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener('ezsale:notifications-updated', bump)
      window.removeEventListener('ezsale:activity-updated', bump)
      window.removeEventListener('storage', bump)
    }
  }, [])
  return tick
}

// ---- Convenience helpers -----------------------------------------------

/**
 * Convert a notification into an admin notification (for cases where
 * an event is generated against a member but admins want to know too).
 */
export function notifyAdmin(
  partial: Omit<NotifyInput, 'audience' | 'memberId'>,
): Notification {
  return notify({ ...partial, audience: 'admin' })
}

export function notifyMember(memberId: string, partial: Omit<NotifyInput, 'audience' | 'memberId'>): Notification {
  return notify({ ...partial, audience: 'member', memberId })
}

/**
 * Returns the human-readable name of the recipient for a notification,
 * so dropdowns can show "Sara Khan — Card charged" without extra lookups.
 */
export function recipientLabel(n: Notification): string {
  if (n.audience === 'admin') return 'Admin team'
  if (n.memberId) {
    const m = getMember(n.memberId)
    return m?.name ?? 'Member'
  }
  return 'Member'
}

// ---- Health checks (low balance, expiry) ------------------------------
//
// These live in card-store to avoid an import cycle. See
// `runCardHealthChecks` in card-store.ts. The topbar / dashboard
// simply calls it on mount.

export function runHealthChecks(_opts?: {
  lowBalanceThreshold?: number
  expiryWindowDays?: number
  force?: boolean
}) {
  // No-op stub; the real implementation lives in card-store to keep
  // notifications-store dependency-free. The two are kept in sync
  // by exporting the same name from both modules.
}
