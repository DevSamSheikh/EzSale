import type {
  FinancialEvent,
  FinancialEventType,
  Location,
  LocationContact,
  LocationStatus,
  LocationType,
  OperatingHours,
  OperatorPermissions,
  POSTerminal,
  ReturnLine,
  ReturnRecord,
  ReturnScope,
  Transaction,
  TransactionStatus,
} from './types'
import { DEFAULT_OPERATOR_PERMISSIONS } from './types'
import {
  createTransaction as createTxn,
  getTransactions,
  setTransactionStatus as setTxnStatus,
} from './payment-store'
import { getCards, getCard, getMember, updateCard } from './card-store'
import {
  getProducts,
  PRODUCTS_UPDATED_EVENT,
} from './pos-store'
import { logActivity as recordActivity, notify as fireNotification } from './notifications-store'

const KEY_LOCATIONS = 'ezsale:locations'
const KEY_FIN_EVENTS = 'ezsale:financial-events'
const KEY_PERMS = 'ezsale:operator-permissions'

const LOCATION_SEED_KEY = 'ezsale:locations:seeded:v2'

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

const DEFAULT_HOURS: OperatingHours[] = [
  { day: 1, open: '08:00', close: '22:00' },
  { day: 2, open: '08:00', close: '22:00' },
  { day: 3, open: '08:00', close: '22:00' },
  { day: 4, open: '08:00', close: '23:00' },
  { day: 5, open: '08:00', close: '23:00' },
  { day: 6, open: '09:00', close: '23:00' },
  { day: 0, open: '09:00', close: '21:00' },
]

const SHORT_HOURS: OperatingHours[] = [
  { day: 1, open: '10:00', close: '20:00' },
  { day: 2, open: '10:00', close: '20:00' },
  { day: 3, open: '10:00', close: '20:00' },
  { day: 4, open: '10:00', close: '22:00' },
  { day: 5, open: '10:00', close: '22:00' },
  { day: 6, open: '10:00', close: '22:00' },
  { day: 0, closed: true, open: '', close: '' },
]

const SAMPLE_LOCATIONS: Location[] = [
  {
    id: 'loc-main',
    businessId: 'preview',
    name: 'Aurora Downtown',
    code: 'MAIN',
    type: 'store',
    address: '12 Aurora Ave',
    city: 'Brooklyn',
    region: 'NY',
    country: 'USA',
    timezone: 'America/New_York',
    managerIds: ['op-mira'],
    terminals: [
      { id: 'term-main-1', locationId: 'loc-main', name: 'Front Counter', code: 'T-01', status: 'active', lastSeenAt: new Date(now - 30 * 60 * 1000).toISOString() },
      { id: 'term-main-2', locationId: 'loc-main', name: 'Bar POS', code: 'T-02', status: 'active', lastSeenAt: new Date(now - 90 * 60 * 1000).toISOString() },
    ],
    hours: DEFAULT_HOURS,
    contact: { phone: '+1 555 0123', email: 'downtown@bistroaurora.com' },
    acceptsSharedCards: true,
    isPrimary: true,
    status: 'active',
    notes: 'Flagship store — full dine-in menu, bar, and takeaway.',
    createdAt: new Date(now - day * 240).toISOString(),
    updatedAt: new Date(now - day * 12).toISOString(),
  },
  {
    id: 'loc-kiosk',
    businessId: 'preview',
    name: 'Lobby Kiosk',
    code: 'KIOSK-01',
    type: 'kiosk',
    address: '12 Aurora Ave, Lobby',
    city: 'Brooklyn',
    region: 'NY',
    country: 'USA',
    timezone: 'America/New_York',
    managerIds: ['op-amelia'],
    terminals: [
      { id: 'term-kiosk-1', locationId: 'loc-kiosk', name: 'Self-Service', code: 'K-01', status: 'active', lastSeenAt: new Date(now - 15 * 60 * 1000).toISOString() },
    ],
    hours: SHORT_HOURS,
    contact: { phone: '+1 555 0124' },
    acceptsSharedCards: true,
    status: 'active',
    notes: 'Self-service kiosk in the building lobby.',
    createdAt: new Date(now - day * 180).toISOString(),
    updatedAt: new Date(now - day * 30).toISOString(),
  },
  {
    id: 'loc-express',
    businessId: 'preview',
    name: 'Express Window',
    code: 'EXP',
    type: 'counter',
    address: '12 Aurora Ave, Side',
    city: 'Brooklyn',
    region: 'NY',
    country: 'USA',
    timezone: 'America/New_York',
    managerIds: ['op-omar'],
    terminals: [
      { id: 'term-exp-1', locationId: 'loc-express', name: 'Express Counter', code: 'E-01', status: 'active', lastSeenAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
    ],
    hours: [
      { day: 1, open: '07:00', close: '11:00' },
      { day: 2, open: '07:00', close: '11:00' },
      { day: 3, open: '07:00', close: '11:00' },
      { day: 4, open: '07:00', close: '11:00' },
      { day: 5, open: '07:00', close: '11:00' },
      { day: 6, closed: true, open: '', close: '' },
      { day: 0, closed: true, open: '', close: '' },
    ],
    contact: { phone: '+1 555 0125' },
    acceptsSharedCards: true,
    status: 'active',
    notes: 'Morning coffee / pastry pickup window, weekdays only.',
    createdAt: new Date(now - day * 120).toISOString(),
    updatedAt: new Date(now - day * 18).toISOString(),
  },
  {
    id: 'loc-pop',
    businessId: 'preview',
    name: 'Westfield Mall Pop-up',
    code: 'POP-MALL',
    type: 'popup',
    address: 'Westfield Plaza, Level 2',
    city: 'Jersey City',
    region: 'NJ',
    country: 'USA',
    timezone: 'America/New_York',
    managerIds: ['op-rosa'],
    terminals: [
      { id: 'term-pop-1', locationId: 'loc-pop', name: 'Pop-up Counter', code: 'P-01', status: 'maintenance', lastSeenAt: new Date(now - day * 6).toISOString() },
    ],
    hours: SHORT_HOURS,
    contact: { email: 'popup@bistroaurora.com' },
    acceptsSharedCards: false,
    status: 'inactive',
    notes: 'Seasonal kiosk at Westfield Plaza — closed for refurb.',
    createdAt: new Date(now - day * 90).toISOString(),
    updatedAt: new Date(now - day * 5).toISOString(),
  },
]

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

function formatRefundAmount(n: number) {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(LOCATION_SEED_KEY)) {
    localStorage.setItem(KEY_LOCATIONS, JSON.stringify(SAMPLE_LOCATIONS))
    localStorage.setItem(LOCATION_SEED_KEY, '1')
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

export function getActiveLocations(): Location[] {
  return getLocations().filter((l) => l.status === 'active')
}

export function getDefaultLocationId(): string {
  const list = getLocations()
  return (
    list.find((l) => l.isPrimary && l.status === 'active') ??
    list.find((l) => l.status === 'active') ??
    list[0]
  )?.id ?? 'loc-main'
}

function persistLocations(list: Location[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_LOCATIONS, JSON.stringify(list))
}

export interface NewLocationInput {
  name: string
  code: string
  type?: LocationType
  address?: string
  city?: string
  region?: string
  country?: string
  timezone?: string
  managerIds?: string[]
  acceptsSharedCards?: boolean
  isPrimary?: boolean
  status?: LocationStatus
  contact?: LocationContact
  hours?: OperatingHours[]
  notes?: string
}

export function createLocation(input: NewLocationInput): Location {
  const all = getLocations()
  const nowIso = new Date().toISOString()
  const baseHours = input.hours ?? DEFAULT_HOURS
  const location: Location = {
    id: uid('loc'),
    businessId: 'preview',
    name: input.name.trim() || 'New location',
    code: (input.code || `LOC-${all.length + 1}`).toUpperCase().slice(0, 12),
    type: input.type ?? 'store',
    address: input.address?.trim() || undefined,
    city: input.city?.trim() || undefined,
    region: input.region?.trim() || undefined,
    country: input.country?.trim() || undefined,
    timezone: input.timezone?.trim() || undefined,
    managerIds: input.managerIds ?? [],
    terminals: [],
    hours: baseHours,
    contact: input.contact ?? {},
    acceptsSharedCards: input.acceptsSharedCards ?? true,
    isPrimary: input.isPrimary ?? false,
    status: input.status ?? 'active',
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  all.unshift(location)
  if (location.isPrimary) {
    all.forEach((l) => {
      if (l.id !== location.id && l.isPrimary) l.isPrimary = false
    })
  }
  persistLocations(all)
  return location
}

export function updateLocation(
  locationId: string,
  patch: Partial<Omit<Location, 'id' | 'businessId' | 'createdAt' | 'terminals'>>,
  options?: { setTerminals?: POSTerminal[] },
): Location | null {
  const all = getLocations()
  const idx = all.findIndex((l) => l.id === locationId)
  if (idx < 0) return null
  const next: Location = {
    ...all[idx],
    ...patch,
    terminals: options?.setTerminals ?? all[idx].terminals,
    id: all[idx].id,
    businessId: all[idx].businessId,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  }
  if (patch.code) next.code = patch.code.toUpperCase().slice(0, 12)
  if (patch.isPrimary) {
    all.forEach((l, i) => {
      if (i !== idx && l.isPrimary) l.isPrimary = false
    })
  }
  all[idx] = next
  persistLocations(all)
  return next
}

export function deleteLocation(locationId: string): boolean {
  const all = getLocations()
  const next = all.filter((l) => l.id !== locationId)
  if (next.length === all.length) return false
  persistLocations(next)
  return true
}

export function setLocationStatus(locationId: string, status: LocationStatus): Location | null {
  return updateLocation(locationId, { status })
}

// ---- Terminals ----------------------------------------------------------

export function addTerminal(
  locationId: string,
  input: { name: string; code: string },
): Location | null {
  const loc = getLocation(locationId)
  if (!loc) return null
  const terminal: POSTerminal = {
    id: uid('term'),
    locationId,
    name: input.name.trim() || 'Terminal',
    code: (input.code || `T-${loc.terminals.length + 1}`).toUpperCase().slice(0, 12),
    status: 'active',
    lastSeenAt: new Date().toISOString(),
  }
  const terminals = [...loc.terminals, terminal]
  return updateLocation(locationId, {}, { setTerminals: terminals })
}

export function updateTerminal(
  locationId: string,
  terminalId: string,
  patch: Partial<Omit<POSTerminal, 'id' | 'locationId'>>,
): Location | null {
  const loc = getLocation(locationId)
  if (!loc) return null
  const terminals = loc.terminals.map((t) =>
    t.id === terminalId
      ? { ...t, ...patch, code: (patch.code ?? t.code).toUpperCase().slice(0, 12) }
      : t,
  )
  return updateLocation(locationId, {}, { setTerminals: terminals })
}

export function removeTerminal(locationId: string, terminalId: string): Location | null {
  const loc = getLocation(locationId)
  if (!loc) return null
  const terminals = loc.terminals.filter((t) => t.id !== terminalId)
  return updateLocation(locationId, {}, { setTerminals: terminals })
}

export function getTerminal(terminalId: string | null | undefined): {
  terminal: POSTerminal | null
  location: Location | null
} {
  if (!terminalId) return { terminal: null, location: null }
  for (const loc of getLocations()) {
    const t = loc.terminals.find((x) => x.id === terminalId)
    if (t) return { terminal: t, location: loc }
  }
  return { terminal: null, location: null }
}

// ---- Managers -----------------------------------------------------------

export function assignManager(locationId: string, operatorId: string): Location | null {
  const loc = getLocation(locationId)
  if (!loc) return null
  if (loc.managerIds.includes(operatorId)) return loc
  return updateLocation(locationId, {
    managerIds: [...loc.managerIds, operatorId],
  })
}

export function unassignManager(locationId: string, operatorId: string): Location | null {
  const loc = getLocation(locationId)
  if (!loc) return null
  return updateLocation(locationId, {
    managerIds: loc.managerIds.filter((id) => id !== operatorId),
  })
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

  // Notify admins + member (if attached)
  try {
    const member = parent.memberId ? getMember(parent.memberId) : null
    fireNotification({
      audience: 'admin',
      category: 'refund',
      severity: isFull ? 'info' : 'warning',
      title: isFull ? 'Refund processed' : 'Partial refund processed',
      body: `${member?.name ?? 'Order'} ${parent.id} · ${formatRefundAmount(amount)}${input.reason ? ` — ${input.reason}` : ''}`,
      href: '/app/orders',
      transactionId: parent.id,
      memberId: parent.memberId,
    })
    if (parent.memberId) {
      fireNotification({
        audience: 'member',
        memberId: parent.memberId,
        category: 'transaction',
        severity: 'info',
        title: isFull ? 'Refund issued' : 'Partial refund issued',
        body: `${formatRefundAmount(amount)} was refunded on order ${parent.id}.${input.reason ? ` Reason: ${input.reason}` : ''}`,
        transactionId: parent.id,
      })
    }
    recordActivity({
      category: 'refund',
      severity: isFull ? 'warning' : 'info',
      title: isFull ? 'Issued full refund' : 'Issued partial refund',
      body: `Order ${parent.id} · ${formatRefundAmount(amount)}${input.reason ? ` — ${input.reason}` : ''}`,
      transactionId: parent.id,
      memberId: parent.memberId,
    })
  } catch {
    /* best-effort */
  }

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

  try {
    const member = parent.memberId ? getMember(parent.memberId) : null
    fireNotification({
      audience: 'admin',
      category: 'transaction',
      severity: 'info',
      title: 'Manual adjustment recorded',
      body: `Order ${parent.id} · ${member?.name ?? 'Walk-in'} · ${formatRefundAmount(input.amount)}${input.reason ? ` — ${input.reason}` : ''}`,
      href: '/app/orders',
      transactionId: parent.id,
      memberId: parent.memberId,
    })
    recordActivity({
      category: 'transaction',
      severity: 'info',
      title: 'Manual adjustment recorded',
      body: `Order ${parent.id} · ${formatRefundAmount(input.amount)}${input.reason ? ` — ${input.reason}` : ''}`,
      transactionId: parent.id,
      memberId: parent.memberId,
    })
  } catch {
    /* best-effort */
  }

  return { event, parent: { ...parent, status: 'adjusted' } }
}

/** Returns the remaining refundable amount for a transaction. */
export function remainingRefundable(txnId: string): number {
  const t = getTransactions().find((x) => x.id === txnId)
  if (!t) return 0
  if (t.status === 'refunded') return 0
  const events = getFinancialEvents(txnId)
  const refunded = events
    .filter((e) => e.type === 'refund' || e.type === 'partial_refund' || e.type === 'return')
    .reduce((s, e) => s + Math.abs(e.amount), 0)
  return Math.max(0, t.total - refunded)
}

// ---- Returns / Refunds ---------------------------------------------------
//
// Returns are tracked separately from `FinancialEvent` so we can record
// per-line quantities, restock products/variants, and prevent
// double-refunding the same line. The store is keyed by parent order id.

const KEY_RETURNS = 'ezsale:order-returns'

function loadReturns(): ReturnRecord[] {
  if (typeof window === 'undefined') return []
  return safeParse<ReturnRecord[]>(localStorage.getItem(KEY_RETURNS), [])
}

function persistReturns(list: ReturnRecord[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_RETURNS, JSON.stringify(list))
}

export function getReturns(orderId?: string): ReturnRecord[] {
  const all = loadReturns()
  const filtered = orderId ? all.filter((r) => r.orderId === orderId) : all
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getReturn(id: string): ReturnRecord | null {
  return loadReturns().find((r) => r.id === id) ?? null
}

/**
 * Returns the total quantity already returned for a specific line on a
 * given order. Used by the return wizard to enforce "can't return more
 * than was originally sold minus previous returns".
 */
export function getReturnedQty(
  orderId: string,
  productId: string,
  variantId?: string,
): number {
  return loadReturns()
    .filter((r) => r.orderId === orderId)
    .flatMap((r) => r.lines)
    .filter(
      (l) =>
        l.productId === productId &&
        (l.variantId ?? '') === (variantId ?? ''),
    )
    .reduce((s, l) => s + l.qty, 0)
}

/**
 * Returns the total refund amount already processed for an order. Used
 * to compute the remaining refundable amount and to update the parent
 * transaction status (refunded vs partially_refunded).
 */
export function getReturnedAmount(orderId: string): number {
  return loadReturns()
    .filter((r) => r.orderId === orderId)
    .reduce((s, r) => s + r.amount, 0)
}

export interface CreateReturnInput {
  orderId: string
  scope: ReturnScope
  /** Item-scoped lines; ignored when scope === 'full'. */
  lines?: ReturnLine[]
  reason: string
  /** When true, refund the membership card balance. Default true when
   * the order was paid via the membership method. */
  restoreToCard?: boolean
  by?: string
}

export interface CreateReturnResult {
  returnRecord: ReturnRecord
  childTxn: Transaction
  parent: Transaction
  cardBalanceBefore?: number
  cardBalanceAfter?: number
}

/**
 * Increase stock for a product or a specific variant. Mirrors
 * `pos-store.availableStock` semantics — `undefined` stock is unlimited
 * and is a no-op (we never increment an `undefined` field because there
 * is no numeric bucket to add to).
 */
function restockProduct(
  productId: string,
  qty: number,
  variantId?: string,
) {
  if (qty <= 0) return
  const all = getProducts()
  const idx = all.findIndex((p) => p.id === productId)
  if (idx < 0) return
  const current = all[idx]
  if (variantId) {
    const vIdx = current.variants.findIndex((v) => v.id === variantId)
    if (vIdx < 0) return
    const v = current.variants[vIdx]
    if (v.stock === undefined) return
    const nextVariants = [...current.variants]
    nextVariants[vIdx] = { ...v, stock: v.stock + qty }
    all[idx] = {
      ...current,
      variants: nextVariants,
      updatedAt: new Date().toISOString(),
    }
  } else {
    if (current.stock === undefined) return
    all[idx] = {
      ...current,
      stock: current.stock + qty,
      updatedAt: new Date().toISOString(),
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('ezsale:pos:products', JSON.stringify(all))
    window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT))
  }
}

/**
 * Process a return against an existing order. Validates the order isn't
 * already fully refunded, validates the requested qty per line against
 * the remaining returnable qty, restocks products, refunds the
 * membership card (if applicable), creates a child refund transaction,
 * logs a financial event, persists a `ReturnRecord`, and updates the
 * parent status.
 */
export function createReturn(input: CreateReturnInput): CreateReturnResult | null {
  const allTxns = getTransactions()
  const parent = allTxns.find((t) => t.id === input.orderId)
  if (!parent) return null
  if (parent.status === 'refunded') return null

  const by = input.by ?? 'admin@ezsale.app'
  const reason = input.reason.trim() || 'No reason provided'

  // Build the list of return lines.
  let lines: ReturnLine[]
  if (input.scope === 'full') {
    lines = parent.items.map((it) => {
      const lineGross = it.price * it.qty - (it.lineDiscount ?? 0)
      const unitPrice = it.qty > 0 ? lineGross / it.qty : it.price
      return {
        productId: it.productId,
        variantId: it.variantId,
        productName: it.name,
        variantName: it.variantName,
        qty: it.qty,
        unitPrice: Math.round(unitPrice * 100) / 100,
        amount: Math.round(lineGross * 100) / 100,
      }
    })
  } else {
    if (!input.lines || input.lines.length === 0) return null
    // Validate every line against the original order and the remaining
    // returnable qty. Surface a clear error to the caller.
    for (const rl of input.lines) {
      const original = parent.items.find(
        (it) =>
          it.productId === rl.productId &&
          (it.variantId ?? '') === (rl.variantId ?? ''),
      )
      if (!original) return null
      const already = getReturnedQty(parent.id, rl.productId, rl.variantId)
      if (rl.qty <= 0 || already + rl.qty > original.qty) return null
    }
    lines = input.lines
  }

  const amount = lines.reduce((s, l) => s + l.amount, 0)
  if (amount <= 0) return null

  // Reverse the membership card balance if requested (or implicit when
  // the order was paid via the membership method).
  const wantsCardReverse =
    input.restoreToCard ?? parent.method === 'membership'
  let cardBalanceBefore: number | undefined
  let cardBalanceAfter: number | undefined
  if (parent.cardId && wantsCardReverse) {
    const card = getCard(parent.cardId)
    if (card) {
      cardBalanceBefore = card.balance
      const nextBalance = Math.round((card.balance + amount) * 100) / 100
      updateCard(card.id, { balance: nextBalance })
      cardBalanceAfter = nextBalance
    }
  }

  // Restock returned items. Unlimited-stock items are skipped.
  for (const l of lines) {
    restockProduct(l.productId, l.qty, l.variantId)
  }

  // Create the child refund transaction (negative totals).
  const child = createTxn({
    businessId: parent.businessId,
    operatorEmail: by,
    memberId: parent.memberId,
    cardId: parent.cardId,
    items: lines.map((l) => ({
      productId: l.productId,
      name: l.productName,
      price: l.unitPrice,
      qty: l.qty,
      variantId: l.variantId,
      variantName: l.variantName,
    })),
    subtotal: -amount,
    discount: 0,
    tax: 0,
    total: -amount,
    method: parent.method,
    cardNumber: parent.cardNumber,
    reference: parent.reference,
    status: 'completed',
    locationId: parent.locationId,
    note: reason,
  })

  // Financial event for the audit trail.
  const event = logFinancialEvent(parent.id, 'return', -amount, {
    reason,
    balanceBefore: cardBalanceBefore,
    balanceAfter: cardBalanceAfter,
    by,
  })

  // Persist the return record.
  const record: ReturnRecord = {
    id: uid('ret'),
    businessId: parent.businessId,
    orderId: parent.id,
    scope: input.scope,
    amount,
    reason,
    restoredToCard: cardBalanceAfter !== undefined,
    cardBalanceBefore,
    cardBalanceAfter,
    lines,
    refundTxnId: child.id,
    by,
    createdAt: new Date().toISOString(),
  }
  const all = loadReturns()
  all.unshift(record)
  persistReturns(all)

  // Recompute the parent status.
  const newReturned = getReturnedAmount(parent.id) + amount
  const isFull = newReturned >= parent.total - 0.0001
  const nextStatus: TransactionStatus = isFull ? 'refunded' : 'partially_refunded'
  setTxnStatus(parent.id, nextStatus)

  // Notify admin + member.
  try {
    const member = parent.memberId ? getMember(parent.memberId) : null
    const verb = input.scope === 'full' ? 'Returned' : 'Partial return'
    fireNotification({
      audience: 'admin',
      category: 'refund',
      severity: isFull ? 'info' : 'warning',
      title: isFull ? 'Order fully returned' : 'Items returned',
      body: `${parent.id} · ${member?.name ?? 'Order'} · ${formatRefundAmount(amount)}${reason ? ` — ${reason}` : ''}`,
      href: '/app/orders',
      transactionId: parent.id,
      memberId: parent.memberId,
    })
    if (parent.memberId) {
      fireNotification({
        audience: 'member',
        memberId: parent.memberId,
        category: 'transaction',
        severity: 'info',
        title: isFull ? 'Your order was returned' : 'Items were returned',
        body: `${formatRefundAmount(amount)} was refunded on order ${parent.id}.${reason ? ` Reason: ${reason}` : ''}`,
        transactionId: parent.id,
      })
    }
    recordActivity({
      category: 'refund',
      severity: isFull ? 'warning' : 'info',
      title: verb,
      body: `${parent.id} · ${member?.name ?? 'Order'} · ${formatRefundAmount(amount)}${reason ? ` — ${reason}` : ''}`,
      transactionId: parent.id,
      memberId: parent.memberId,
    })
  } catch {
    /* best-effort */
  }

  return {
    returnRecord: record,
    childTxn: child,
    parent: { ...parent, status: nextStatus },
    cardBalanceBefore,
    cardBalanceAfter,
  }
  // `event` is intentionally retained in the audit log; TypeScript
  // eslint understands the unused-var suppression below.
  void event
}