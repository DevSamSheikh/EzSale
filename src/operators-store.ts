import type {
  Operator,
  OperatorActivity,
  OperatorActivityType,
  PermissionKey,
  Role,
  StaffStatus,
} from './types'
import { ALL_PERMISSION_KEYS, DEFAULT_ROLES } from './permissions'
import { getLocations } from './orders-store'

const KEY_ROLES = 'ezsale:roles'
const KEY_OPERATORS = 'ezsale:operators'
const KEY_OP_ACTIVITY = 'ezsale:operator-activity'
const KEY_CURRENT_OPERATOR = 'ezsale:auth:operator-id'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

const now = Date.now()
const day = 1000 * 60 * 60 * 24
const hour = 1000 * 60 * 60
const minute = 1000 * 60

// ---- Default seed operators ----------------------------------------------

const SAMPLE_OPERATORS: Operator[] = [
  {
    id: 'op-admin',
    businessId: 'preview',
    name: 'Hassan Ali',
    email: 'admin@ezsale.app',
    avatarColor: '#84eb0a',
    roleId: 'role-super-admin',
    locationIds: [],
    status: 'active',
    joinedAt: new Date(now - day * 120).toISOString(),
    lastLoginAt: new Date(now - 8 * minute).toISOString(),
    lastActiveAt: new Date(now - 2 * minute).toISOString(),
  },
  {
    id: 'op-mira',
    businessId: 'preview',
    name: 'Mira Hassan',
    email: 'mira.hassan@ezsale.app',
    avatarColor: '#6cc800',
    roleId: 'role-manager',
    locationIds: ['loc-main', 'loc-kiosk'],
    status: 'active',
    joinedAt: new Date(now - day * 95).toISOString(),
    lastLoginAt: new Date(now - 32 * minute).toISOString(),
    lastActiveAt: new Date(now - 18 * minute).toISOString(),
  },
  {
    id: 'op-omar',
    businessId: 'preview',
    name: 'Omar Faruk',
    email: 'omar.f@ezsale.app',
    avatarColor: '#559c00',
    roleId: 'role-pos-operator',
    locationIds: ['loc-express'],
    status: 'active',
    joinedAt: new Date(now - day * 60).toISOString(),
    lastLoginAt: new Date(now - 50 * minute).toISOString(),
    lastActiveAt: new Date(now - 8 * minute).toISOString(),
  },
  {
    id: 'op-junaid',
    businessId: 'preview',
    name: 'Junaid Khan',
    email: 'junaid.k@example.com',
    avatarColor: '#437800',
    roleId: 'role-accountant',
    locationIds: [],
    status: 'active',
    joinedAt: new Date(now - day * 180).toISOString(),
    lastLoginAt: new Date(now - day - 3 * hour).toISOString(),
    lastActiveAt: new Date(now - day - 3 * hour).toISOString(),
  },
  {
    id: 'op-amelia',
    businessId: 'preview',
    name: 'Amelia Park',
    email: 'amelia.p@example.com',
    avatarColor: '#84eb0a',
    roleId: 'role-pos-operator',
    locationIds: ['loc-main', 'loc-kiosk'],
    status: 'active',
    joinedAt: new Date(now - day * 22).toISOString(),
    lastLoginAt: new Date(now - day - hour).toISOString(),
    lastActiveAt: new Date(now - day - hour).toISOString(),
  },
  {
    id: 'op-tariq',
    businessId: 'preview',
    name: 'Tariq Mehmood',
    email: 'tariq.m@example.com',
    avatarColor: '#6cc800',
    roleId: 'role-read-only',
    locationIds: [],
    status: 'invited',
    joinedAt: new Date(now - day * 3).toISOString(),
  },
  {
    id: 'op-rosa',
    businessId: 'preview',
    name: 'Rosa Diaz',
    email: 'rosa.d@example.com',
    avatarColor: '#84eb0a',
    roleId: 'role-pos-operator',
    locationIds: ['loc-pop'],
    status: 'suspended',
    joinedAt: new Date(now - day * 240).toISOString(),
    lastLoginAt: new Date(now - day * 6).toISOString(),
    lastActiveAt: new Date(now - day * 6).toISOString(),
  },
]

const SAMPLE_ACTIVITY: OperatorActivity[] = [
  {
    id: 'oa1',
    operatorId: 'op-admin',
    type: 'login',
    description: 'Signed in from Chrome on macOS.',
    at: new Date(now - 8 * minute).toISOString(),
  },
  {
    id: 'oa2',
    operatorId: 'op-admin',
    type: 'role_assigned',
    description: 'Assigned role: Super Admin.',
    by: 'system',
    at: new Date(now - day * 120).toISOString(),
  },
  {
    id: 'oa3',
    operatorId: 'op-mira',
    type: 'login',
    description: 'Signed in from Safari on iPhone.',
    at: new Date(now - 32 * minute).toISOString(),
  },
  {
    id: 'oa4',
    operatorId: 'op-mira',
    type: 'role_assigned',
    description: 'Changed role: POS Operator → Manager.',
    by: 'Hassan Ali',
    at: new Date(now - day * 30).toISOString(),
  },
  {
    id: 'oa5',
    operatorId: 'op-mira',
    type: 'location_assigned',
    description: 'Granted access to: Main Counter, Self-Service Kiosk.',
    by: 'Hassan Ali',
    at: new Date(now - day * 30).toISOString(),
  },
  {
    id: 'oa6',
    operatorId: 'op-omar',
    type: 'login',
    description: 'Signed in from POS terminal.',
    at: new Date(now - 50 * minute).toISOString(),
  },
  {
    id: 'oa7',
    operatorId: 'op-rosa',
    type: 'status_changed',
    description: 'Account suspended — pending review.',
    by: 'Hassan Ali',
    at: new Date(now - day * 5).toISOString(),
  },
  {
    id: 'oa8',
    operatorId: 'op-tariq',
    type: 'invited',
    description: 'Invitation email sent to tariq.m@example.com.',
    by: 'Hassan Ali',
    at: new Date(now - day * 3).toISOString(),
  },
  {
    id: 'oa9',
    operatorId: 'op-amelia',
    type: 'role_assigned',
    description: 'Assigned role: POS Operator / Cashier.',
    by: 'Hassan Ali',
    at: new Date(now - day * 22).toISOString(),
  },
  {
    id: 'oa10',
    operatorId: 'op-junaid',
    type: 'login',
    description: 'Signed in from Chrome on Windows.',
    at: new Date(now - day - 3 * hour).toISOString(),
  },
]

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(KEY_ROLES)) {
    localStorage.setItem(KEY_ROLES, JSON.stringify(DEFAULT_ROLES))
  }
  if (!localStorage.getItem(KEY_OPERATORS)) {
    localStorage.setItem(KEY_OPERATORS, JSON.stringify(SAMPLE_OPERATORS))
  }
  if (!localStorage.getItem(KEY_OP_ACTIVITY)) {
    localStorage.setItem(KEY_OP_ACTIVITY, JSON.stringify(SAMPLE_ACTIVITY))
  }
}

// ---- Roles --------------------------------------------------------------

export function getRoles(): Role[] {
  if (typeof window === 'undefined') return DEFAULT_ROLES
  ensureSeeded()
  return safeParse<Role[]>(localStorage.getItem(KEY_ROLES), DEFAULT_ROLES)
}

export function getRole(roleId: string): Role | null {
  return getRoles().find((r) => r.id === roleId) ?? null
}

export function saveRoles(roles: Role[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_ROLES, JSON.stringify(roles))
}

export function createRole(input: {
  name: string
  description: string
  permissions: PermissionKey[]
}): Role {
  const role: Role = {
    id: uid('role'),
    name: input.name.trim() || 'New role',
    description: input.description.trim(),
    system: false,
    permissions: input.permissions,
  }
  const roles = getRoles()
  roles.unshift(role)
  saveRoles(roles)
  return role
}

export function updateRole(
  roleId: string,
  patch: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>,
): Role | null {
  const roles = getRoles()
  const idx = roles.findIndex((r) => r.id === roleId)
  if (idx < 0) return null
  const next = { ...roles[idx], ...patch }
  roles[idx] = next
  saveRoles(roles)
  return next
}

export function deleteRole(roleId: string): boolean {
  const roles = getRoles()
  const target = roles.find((r) => r.id === roleId)
  if (!target || target.system) return false
  const remaining = roles.filter((r) => r.id !== roleId)
  saveRoles(remaining)
  // Reassign any operators still pointing at the deleted role to Read-Only
  const operators = getOperators()
  const fallback = remaining.find((r) => r.id === 'role-read-only')?.id ?? remaining[0]?.id
  let mutated = false
  operators.forEach((op) => {
    if (op.roleId === roleId && fallback) {
      op.roleId = fallback
      mutated = true
    }
  })
  if (mutated) saveOperators(operators)
  return true
}

// ---- Operators ----------------------------------------------------------

export function getOperators(): Operator[] {
  if (typeof window === 'undefined') return SAMPLE_OPERATORS
  ensureSeeded()
  return safeParse<Operator[]>(localStorage.getItem(KEY_OPERATORS), SAMPLE_OPERATORS)
}

export function getOperator(operatorId: string): Operator | null {
  return getOperators().find((o) => o.id === operatorId) ?? null
}

export function getOperatorByEmail(email: string): Operator | null {
  const e = email.trim().toLowerCase()
  return getOperators().find((o) => o.email.toLowerCase() === e) ?? null
}

export function saveOperators(list: Operator[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_OPERATORS, JSON.stringify(list))
}

export interface NewOperatorInput {
  name: string
  email: string
  roleId: string
  locationIds: string[]
  status?: StaffStatus
  phone?: string
}

export function createOperator(
  input: NewOperatorInput,
  by: string = 'admin@ezsale.app',
): Operator {
  const op: Operator = {
    id: uid('op'),
    businessId: 'preview',
    name: input.name.trim() || 'New operator',
    email: input.email.trim().toLowerCase(),
    roleId: input.roleId,
    locationIds: input.locationIds,
    status: input.status ?? 'invited',
    phone: input.phone?.trim() || undefined,
    joinedAt: new Date().toISOString(),
  }
  const list = getOperators()
  list.unshift(op)
  saveOperators(list)
  logOperatorActivity(op.id, 'created', `Operator ${op.name} added.`, { by })
  logOperatorActivity(
    op.id,
    'invited',
    `Invitation email sent to ${op.email}.`,
    { by },
  )
  logOperatorActivity(op.id, 'role_assigned', `Assigned role: ${getRole(op.roleId)?.name ?? op.roleId}.`, { by })
  return op
}

export function updateOperator(
  operatorId: string,
  patch: Partial<Omit<Operator, 'id' | 'businessId' | 'joinedAt'>>,
  by: string = 'admin@ezsale.app',
): Operator | null {
  const list = getOperators()
  const idx = list.findIndex((o) => o.id === operatorId)
  if (idx < 0) return null
  const prev = list[idx]
  const next = { ...prev, ...patch }
  list[idx] = next
  saveOperators(list)

  if (patch.roleId && patch.roleId !== prev.roleId) {
    logOperatorActivity(
      operatorId,
      'role_assigned',
      `Role changed: ${getRole(prev.roleId)?.name ?? prev.roleId} → ${getRole(patch.roleId)?.name ?? patch.roleId}.`,
      { by },
    )
  }
  if (patch.locationIds && patch.locationIds.join('|') !== prev.locationIds.join('|')) {
    const names = patch.locationIds
      .map((id) => getLocations().find((l) => l.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'none'
    logOperatorActivity(
      operatorId,
      'location_assigned',
      `Locations set to: ${names}.`,
      { by },
    )
  }
  if (patch.status && patch.status !== prev.status) {
    logOperatorActivity(
      operatorId,
      'status_changed',
      `Status changed: ${statusLabel(prev.status)} → ${statusLabel(patch.status)}.`,
      { by },
    )
  }
  return next
}

export function setOperatorStatus(
  operatorId: string,
  status: StaffStatus,
  by: string = 'admin@ezsale.app',
): Operator | null {
  return updateOperator(operatorId, { status }, by)
}

export function recordOperatorLogin(operatorId: string): Operator | null {
  const op = getOperator(operatorId)
  if (!op) return null
  const at = new Date().toISOString()
  const next = updateOperator(operatorId, { lastLoginAt: at, lastActiveAt: at })
  logOperatorActivity(operatorId, 'login', 'Signed in.', { by: op.email })
  return next
}

export function touchOperatorActivity(operatorId: string): void {
  const list = getOperators()
  const idx = list.findIndex((o) => o.id === operatorId)
  if (idx < 0) return
  list[idx] = { ...list[idx], lastActiveAt: new Date().toISOString() }
  saveOperators(list)
}

// ---- Operator activity --------------------------------------------------

function persistActivity(entry: OperatorActivity) {
  if (typeof window === 'undefined') return
  const all = safeParse<OperatorActivity[]>(localStorage.getItem(KEY_OP_ACTIVITY), [])
  all.unshift(entry)
  localStorage.setItem(KEY_OP_ACTIVITY, JSON.stringify(all))
}

function logOperatorActivity(
  operatorId: string,
  type: OperatorActivityType,
  description: string,
  extra: Partial<OperatorActivity> = {},
): OperatorActivity {
  const entry: OperatorActivity = {
    id: uid('oa'),
    operatorId,
    type,
    description,
    at: new Date().toISOString(),
    by: 'admin@ezsale.app',
    ...extra,
  }
  persistActivity(entry)
  return entry
}

export function getOperatorActivity(operatorId: string): OperatorActivity[] {
  if (typeof window === 'undefined') return []
  return safeParse<OperatorActivity[]>(localStorage.getItem(KEY_OP_ACTIVITY), [])
    .filter((a) => a.operatorId === operatorId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

// ---- Current operator context -------------------------------------------

/**
 * Returns the id of the currently signed-in operator. The demo build always
 * returns the seeded admin unless the caller explicitly switched (e.g. via
 * the operator switcher in the topbar).
 */
export function getCurrentOperatorId(): string {
  if (typeof window === 'undefined') return 'op-admin'
  const explicit = localStorage.getItem(KEY_CURRENT_OPERATOR)
  if (explicit) return explicit
  return 'op-admin'
}

export function setCurrentOperatorId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_CURRENT_OPERATOR, id)
}

export function getCurrentOperator(): Operator | null {
  return getOperator(getCurrentOperatorId())
}

/**
 * Display name for the operator performing an action. Falls back to the
 * email local-part, then to "System".
 */
export function getCurrentOperatorName(): string {
  const op = getCurrentOperator()
  if (op) return op.name
  return 'System'
}

// ---- Permission helpers -------------------------------------------------

/** Returns the set of permission keys for the given operator. */
export function operatorPermissions(op: Operator): PermissionKey[] {
  const role = getRole(op.roleId)
  if (!role) return []
  if (op.locationIds.length > 0 && role.id !== 'role-super-admin') {
    // Restrict "POS use" if the operator is not assigned to any active location
    const anyActive = op.locationIds.some((id) =>
      getLocations().find((l) => l.id === id && l.status === 'active'),
    )
    if (!anyActive) {
      return role.permissions.filter((k) => k !== 'pos.use' && k !== 'pos.refund')
    }
  }
  return role.permissions
}

export function operatorHas(
  op: Operator | null,
  key: PermissionKey,
): boolean {
  if (!op) return false
  return operatorPermissions(op).includes(key)
}

export function operatorHasAny(
  op: Operator | null,
  keys: PermissionKey[],
): boolean {
  if (!op) return false
  const perms = operatorPermissions(op)
  return keys.some((k) => perms.includes(k))
}

export function operatorHasAll(
  op: Operator | null,
  keys: PermissionKey[],
): boolean {
  if (!op) return false
  const perms = operatorPermissions(op)
  return keys.every((k) => perms.includes(k))
}

/** Returns the per-group summary used by the role editor UI. */
export function summarizeRole(role: Role): { total: number; granted: number } {
  const total = ALL_PERMISSION_KEYS.length
  const granted = role.permissions.length
  return { total, granted }
}

// ---- Status labels ------------------------------------------------------

export function statusLabel(s: StaffStatus): string {
  switch (s) {
    case 'active':
      return 'Active'
    case 'invited':
      return 'Invited'
    case 'suspended':
      return 'Suspended'
    case 'deactivated':
      return 'Deactivated'
  }
}

export function statusPillClass(s: StaffStatus): string {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'invited':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'suspended':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'deactivated':
      return 'bg-ink-100 text-ink-700 border-ink-200'
  }
}