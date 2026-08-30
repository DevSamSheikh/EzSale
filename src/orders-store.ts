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