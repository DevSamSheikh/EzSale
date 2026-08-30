import type {
  FinancialEvent,
  FinancialEventType,
  Location,
  OperatorPermissions,
  Transaction,
  TransactionStatus,
} from './types'
import { DEFAULT_OPERATOR_PERMISSIONS } from './types'
import {
  createTransaction as createTxn,
  getTransactions,
  setTransactionStatus as setTxnStatus,
} from './payment-store'
import { getCards, getCard } from './card-store'

const KEY_LOCATIONS = 'ezsale:locations'
const KEY_FIN_EVENTS = 'ezsale:financial-events'
const KEY_PERMS = 'ezsale:operator-permissions'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const now = Date.now()
const day = 1000 * 60 * 60 * 24

const SAMPLE_LOCATIONS: Location[] = [
  {
    id: 'loc-main',
    businessId: 'preview',
    name: 'Main Counter',
    code: 'MAIN',
    address: '12 Aurora Ave, Downtown',
    timezone: 'UTC',
    active: true,
  },
  {
    id: 'loc-kiosk',
    businessId: 'preview',
    name: 'Self-Service Kiosk',
    code: 'KIOSK-01',
    address: '12 Aurora Ave, Downtown · Lobby',
    active: true,
  },
  {
    id: 'loc-express',
    businessId: 'preview',
    name: 'Express Window',
    code: 'EXP',
    address: '12 Aurora Ave, Downtown · Side',
    active: true,
  },
  {
    id: 'loc-pop',
    businessId: 'preview',
    name: 'Pop-up Stand (Mall)',
    code: 'POP-MALL',
    address: 'Westfield Plaza, Level 2',
    active: false,
  },
]

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(KEY_LOCATIONS)) {
    localStorage.setItem(KEY_LOCATIONS, JSON.stringify(SAMPLE_LOCATIONS))
  }
}

// ---- Locations -----------------------------------------------------------

export function getLocations(): Location[] {
  if (typeof window === 'undefined') return SAMPLE_LOCATIONS
  ensureSeeded()
  return safeParse<Location[]>(localStorage.getItem(KEY_LOCATIONS), SAMPLE_LOCATIONS)
}

export function getLocation(locationId: string | null | undefined): Location | null {
  if (!locationId) return null
  return getLocations().find((l) => l.id === locationId) ?? null
}

export function getDefaultLocationId(): string {
  const list = getLocations()
  return (list.find((l) => l.active) ?? list[0])?.id ?? 'loc-main'
}

// ---- Operator permissions ------------------------------------------------

export function getOperatorPermissions(): OperatorPermissions {
  if (typeof window === 'undefined') return DEFAULT_OPERATOR_PERMISSIONS
  return safeParse<OperatorPermissions>(
    localStorage.getItem(KEY_PERMS),
    DEFAULT_OPERATOR_PERMISSIONS,
  )
}

export function setOperatorPermissions(p: Partial<OperatorPermissions>) {
  if (typeof window === 'undefined') return
  const next = { ...getOperatorPermissions(), ...p }
  localStorage.setItem(KEY_PERMS, JSON.stringify(next))
}

// ---- Financial events (audit trail) --------------------------------------

function persistEvent(ev: FinancialEvent) {
  if (typeof window === 'undefined') return
  const all = safeParse<FinancialEvent[]>(localStorage.getItem(KEY_FIN_EVENTS), [])
  all.unshift(ev)
  localStorage.setItem(KEY_FIN_EVENTS, JSON.stringify(all))
}

export function getFinancialEvents(txnId?: string): FinancialEvent[] {
  const all = safeParse<FinancialEvent[]>(localStorage.getItem(KEY_FIN_EVENTS), [])
  const filtered = txnId ? all.filter((e) => e.parentTxnId === txnId) : all
  return filtered.sort((a, b) => (a.at < b.at ? 1 : -1))
}

function logFinancialEvent(
  parentTxnId: string,
  type: FinancialEventType,
  amount: number,
  extra: Partial<FinancialEvent> = {},
): FinancialEvent {
  const ev: FinancialEvent = {
    id: uid('fev'),
    parentTxnId,
    type,
    amount,
    by: 'admin@ezsale.app',
    at: new Date().toISOString(),
    ...extra,
  }
  persistEvent(ev)
  return ev
}

// ---- Refund + Adjustment actions ----------------------------------------

export interface RefundInput {
  /** Amount to refund. Defaults to the full remaining refundable amount. */
  amount?: number
  reason: string
  by?: string
  /** When true, also reverses any membership card balance that was charged. */
  reverseCardBalance?: boolean
}

export interface RefundResult {
  event: FinancialEvent
  childTxn: Transaction
  parent: Transaction
  cardBalanceBefore?: number
  cardBalanceAfter?: number
}

/**
 * Issue a refund against an existing transaction.
 *
 * Refunds are recorded as a child `Transaction` (negative total) plus a
 * `FinancialEvent` audit row. The parent status is updated to `refunded` or
 * `partially_refunded` depending on whether the full amount was reversed.
 */
export function refundTransaction(
  txnId: string,
  input: RefundInput,
): RefundResult | null {
  const all = getTransactions()
  const parent = all.find((t) => t.id === txnId)
  if (!parent) return null
  if (parent.status === 'refunded') return null

  const previousEvents = getFinancialEvents(parent.id)
  const alreadyRefunded = previousEvents
    .filter((e) => e.type === 'refund' || e.type === 'partial_refund')
    .reduce((s, e) => s + Math.abs(e.amount), 0)
  const remaining = Math.max(0, parent.total - alreadyRefunded)
  if (remaining <= 0) return null

  const requested = input.amount ?? remaining
  const amount = Math.max(0, Math.min(requested, remaining))
  if (amount <= 0) return null

  const isFull = amount >= remaining - 0.0001
  const by = input.by ?? 'admin@ezsale.app'

  let cardBalanceBefore: number | undefined
  let cardBalanceAfter: number | undefined

  if (parent.cardId && input.reverseCardBalance !== false) {
    const card = getCard(parent.cardId)
    if (card) {
      cardBalanceBefore = card.balance
      const updated = {
        ...card,
        balance: card.balance + amount,
      }
      const all_cards = getCards()
      const idx = all_cards.findIndex((c) => c.id === card.id)
      if (idx >= 0) {
        all_cards[idx] = updated
        if (typeof window !== 'undefined') {
          localStorage.setItem('ezsale:cards', JSON.stringify(all_cards))
        }
      }
      cardBalanceAfter = updated.balance
    }
  }

  const child = createTxn({
    businessId: parent.businessId,
    operatorEmail: by,
    memberId: parent.memberId,
    cardId: parent.cardId,
    items: parent.items.map((i) => ({ ...i })),
    subtotal: -parent.subtotal,
    discount: 0,
    tax: -parent.tax,
    total: -amount,
    method: parent.method,
    cardNumber: parent.cardNumber,
    reference: parent.reference,
    status: 'completed',
    locationId: parent.locationId,
    note: input.reason,
  })

  const event = logFinancialEvent(
    parent.id,
    isFull ? 'refund' : 'partial_refund',
    -amount,
    {
      reason: input.reason,
      balanceBefore: cardBalanceBefore,
      balanceAfter: cardBalanceAfter,
      by,
    },
  )

  const nextStatus: TransactionStatus = isFull ? 'refunded' : 'partially_refunded'
  setTxnStatus(parent.id, nextStatus)

  return {
    event,
    childTxn: child,
    parent: { ...parent, status: nextStatus },
    cardBalanceBefore,
    cardBalanceAfter,
  }
}

export interface AdjustmentInput {
  /** Signed delta to apply to the parent transaction total. */
  amount: number
  reason: string
  by?: string
}

export interface AdjustmentResult {
  event: FinancialEvent
  parent: Transaction
}

/**
 * Apply a manual adjustment (e.g. goodwill discount, fee correction) to an
 * existing transaction. Records an audit event and updates the parent status
 * to `adjusted` if the amount is non-zero.
 */
export function adjustTransaction(
  txnId: string,
  input: AdjustmentInput,
): AdjustmentResult | null {
  const all = getTransactions()
  const parent = all.find((t) => t.id === txnId)
  if (!parent) return null
  if (input.amount === 0) return null

  const by = input.by ?? 'admin@ezsale.app'
  const event = logFinancialEvent(parent.id, 'adjustment', input.amount, {
    reason: input.reason,
    by,
  })
  setTxnStatus(parent.id, 'adjusted')
  return { event, parent: { ...parent, status: 'adjusted' } }
}

/** Returns the remaining refundable amount for a transaction. */
export function remainingRefundable(txnId: string): number {
  const t = getTransactions().find((x) => x.id === txnId)
  if (!t) return 0
  if (t.status === 'refunded') return 0
  const events = getFinancialEvents(txnId)
  const refunded = events
    .filter((e) => e.type === 'refund' || e.type === 'partial_refund')
    .reduce((s, e) => s + Math.abs(e.amount), 0)
  return Math.max(0, t.total - refunded)
}