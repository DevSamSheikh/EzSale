import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  KeyRound,
  Mail,
  MapPin,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '../../components/Primitives'
import { DrawerShell } from '../../components/Drawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ToastViewport, useToast } from '../../components/Toast'
import {
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { Tooltip } from '../../components/Tooltip'
import {
  createOperator,
  getOperators,
  getRoles,
  getCurrentOperator,
  getCurrentOperatorName,
  operatorHas,
  setOperatorStatus,
  statusLabel,
  statusPillClass,
  summarizeRole,
  updateOperator,
} from '../../operators-store'
import { getLocations } from '../../orders-store'
import { playCue } from '../../audio'
import type {
  Location,
  Operator,
  Role,
  StaffStatus,
} from '../../types'

const STAFF_STATUSES: { value: StaffStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
]

export default function OperatorsPage() {
  const [tick, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [page, setPage] = useState({ page: 1, pageSize: 10 })
  const [editing, setEditing] = useState<Operator | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const toast = useToast()
  const [statusConfirm, setStatusConfirm] = useState<{ op: Operator; status: StaffStatus } | null>(null)

  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    const operators = getOperators()
    const roles = getRoles()
    const locations = getLocations()
    return { operators, roles, locations }
    // tick is intentional — recompute on focus refresh
  }, [tick])

  const me = getCurrentOperator()
  const canManage = operatorHas(me, 'staff.manage')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.operators.filter((op) => {
      if (q) {
        const hay = [op.name, op.email, op.phone ?? ''].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter.length && !statusFilter.includes(op.status)) return false
      if (roleFilter.length && !roleFilter.includes(op.roleId)) return false
      if (locationFilter.length) {
        if (
          op.locationIds.length > 0 &&
          !op.locationIds.some((id) => locationFilter.includes(id))
        ) {
          return false
        }
      }
      return true
    })
  }, [data.operators, search, statusFilter, roleFilter, locationFilter])

  const summary = useMemo(() => {
    return {
      total: data.operators.length,
      active: data.operators.filter((o) => o.status === 'active').length,
      invited: data.operators.filter((o) => o.status === 'invited').length,
      suspended: data.operators.filter((o) => o.status === 'suspended').length,
    }
  }, [data.operators])

  const statusOptions = useMemo(
    () => STAFF_STATUSES.map((s) => ({ value: s.value, label: s.label, hint: undefined as string | undefined })),
    [],
  )
  const roleOptions = useMemo(
    () =>
      data.roles.map((r) => {
        const sum = summarizeRole(r)
        return {
          value: r.id,
          label: r.name,
          hint: `${sum.granted}/${sum.total}`,
        }
      }),
    [data.roles],
  )
  const locationOptions = useMemo(
    () =>
      data.locations.map((l) => ({ value: l.id, label: l.name, hint: l.code })),
    [data.locations],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / page.pageSize))
  const safePage = Math.min(Math.max(1, page.page), totalPages)
  const start = (safePage - 1) * page.pageSize
  const visible = filtered.slice(start, start + page.pageSize)

  function flash(msg: string) {
    toast.success(msg)
    setTick((t) => t + 1)
  }

  return (
    <div>
      <PageHeader
        title="Staff & operators"
        subtitle="Manage who can sign in, what they can do, and where they work."
        actions={
          <>
            {canManage && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="btn-primary"
              >
                <UserPlus className="h-4 w-4" /> Invite operator
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total operators"
          value={String(summary.total)}
          sub="Across all roles"
          icon={Users}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Active"
          value={String(summary.active)}
          sub="Currently signed in or active today"
          icon={Play}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Invited"
          value={String(summary.invited)}
          sub="Awaiting first sign in"
          icon={Mail}
          tone="amber"
          variant="top"
        />
        <StatCard
          label="Suspended"
          value={String(summary.suspended)}
          sub={summary.suspended > 0 ? 'Needs attention' : 'All clear'}
          icon={Pause}
          tone={summary.suspended > 0 ? 'rose' : 'neutral'}
          variant="top"
        />
      </div>

      <div className="card mb-4 p-4 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, or phone…"
          />
          <FilterSelect
            label="Status"
            icon={<Shield className="h-3.5 w-3.5" />}
            options={statusOptions}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterSelect
            label="Role"
            icon={<KeyRound className="h-3.5 w-3.5" />}
            options={roleOptions}
            selected={roleFilter}
            onChange={setRoleFilter}
          />
          <FilterSelect
            label="Location"
            icon={<MapPin className="h-3.5 w-3.5" />}
            options={locationOptions}
            selected={locationFilter}
            onChange={setLocationFilter}
          />
          {(statusFilter.length > 0 || roleFilter.length > 0 || locationFilter.length > 0 || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter([])
                setRoleFilter([])
                setLocationFilter([])
                playCue('tap')
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <OperatorsTable
        operators={visible}
        roles={data.roles}
        locations={data.locations}
        page={safePage}
        pageSize={page.pageSize}
        onPageChange={setPage}
        total={filtered.length}
        onEdit={(op) => {
          setEditing(op)
          playCue('tap')
        }}
        onStatus={(op, status) => setStatusConfirm({ op, status })}
        canManage={canManage}
      />

      {editing && (
        <EditOperatorDrawer
          operator={editing}
          roles={data.roles}
          locations={data.locations}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            flash(msg)
          }}
        />
      )}

      {addOpen && (
        <AddOperatorDrawer
          roles={data.roles}
          locations={data.locations}
          onClose={() => setAddOpen(false)}
          onCreated={(msg) => {
            setAddOpen(false)
            flash(msg)
          }}
        />
      )}

      {toast.toasts.length > 0 && (
        <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      )}

      <ConfirmDialog
        open={statusConfirm !== null}
        title={
          statusConfirm?.status === 'active'
            ? `Reactivate ${statusConfirm.op.name}?`
            : statusConfirm?.status === 'invited'
            ? `Resend invite to ${statusConfirm?.op.name ?? ''}?`
            : `Suspend ${statusConfirm?.op.name ?? ''}?`
        }
        description={
          statusConfirm?.status === 'active'
            ? 'They\u2019ll be able to sign in again immediately.'
            : statusConfirm?.status === 'invited'
            ? 'This resets their invitation so they can accept it again.'
            : 'They won\u2019t be able to sign in until you reactivate them.'
        }
        confirmLabel={
          statusConfirm?.status === 'active'
            ? 'Reactivate'
            : statusConfirm?.status === 'invited'
            ? 'Resend invite'
            : 'Suspend'
        }
        tone={statusConfirm?.status === 'suspended' ? 'danger' : 'warning'}
        onConfirm={() => {
          if (!statusConfirm) return
          setOperatorStatus(statusConfirm.op.id, statusConfirm.status)
          flash(`${statusConfirm.op.name} marked as ${statusLabel(statusConfirm.status)}.`)
          playCue(statusConfirm.status === 'active' ? 'success' : 'warning')
          setStatusConfirm(null)
        }}
        onClose={() => setStatusConfirm(null)}
      />
    </div>
  )
}

// ---- Table --------------------------------------------------------------

function OperatorsTable({
  operators,
  roles,
  locations,
  page,
  pageSize,
  onPageChange,
  total,
  onEdit,
  onStatus,
  canManage,
}: {
  operators: Operator[]
  roles: Role[]
  locations: Location[]
  page: number
  pageSize: number
  onPageChange: (next: { page: number; pageSize: number }) => void
  total: number
  onEdit: (op: Operator) => void
  onStatus: (op: Operator, status: StaffStatus) => void
  canManage: boolean
}) {
  if (operators.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-7 w-7" />}
        title="No operators match your filters"
        description="Try clearing the search or expanding the role filter."
      />
    )
  }
  return (
    <div className="card overflow-hidden p-0">
      <div className="scroll-soft overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <colgroup>
            <col className="w-[260px]" />
            <col className="w-[170px]" />
            <col className="w-[180px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/40 text-left text-[10px] font-bold uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Locations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {operators.map((op) => {
              const role = roles.find((r) => r.id === op.roleId)
              const opLocations = op.locationIds
                .map((id) => locations.find((l) => l.id === id)?.name)
                .filter(Boolean) as string[]
              return (
                <tr
                  key={op.id}
                  className="cursor-pointer transition-colors hover:bg-ink-50/70"
                  onClick={() => onEdit(op)}
                >
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-ink-900"
                        style={{ background: op.avatarColor ?? '#84eb0a' }}
                      >
                        {op.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p.charAt(0).toUpperCase())
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                          {op.name}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">
                          {op.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {role ? (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold leading-tight text-ink-900">
                          {role.name}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">
                          {role.system ? 'Built-in' : 'Custom'} ·{' '}
                          {role.permissions.length} permissions
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-500">No role</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {opLocations.length === 0 ? (
                      <span className="text-[11px] text-ink-500">All locations</span>
                    ) : (
                      <Tooltip
                        content={
                          <ul className="space-y-0.5 text-left">
                            {opLocations.map((n) => (
                              <li key={n} className="text-xs">
                                • {n}
                              </li>
                            ))}
                          </ul>
                        }
                        className="!whitespace-normal !max-w-[240px]"
                      >
                        <span className="inline-flex h-7 min-w-[28px] cursor-default items-center justify-center rounded-full bg-ink-100 px-2 text-xs font-bold text-ink-700 hover:bg-ink-200">
                          {opLocations.length}
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
                        op.status,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel(op.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    {op.lastLoginAt ? (
                      <div className="text-sm tabular-nums text-ink-700">
                        {relTime(op.lastLoginAt)}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-500">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    <div className="text-sm tabular-nums text-ink-700">
                      {new Date(op.joinedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top text-right">
                    {canManage ? (
                      <div className="inline-flex items-center gap-1">
                        {op.status === 'active' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onStatus(op, 'suspended')
                            }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                            aria-label="Suspend"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onStatus(op, 'active')
                            }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            aria-label="Activate"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStatus(op, 'invited')
                          }}
                          className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                          aria-label="Resend invite"
                          title="Resend invite"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          to={`/app/staff/${op.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                          aria-label="Open profile"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/app/staff/${op.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={onPageChange}
      />
    </div>
  )
}

// ---- Add Operator drawer -----------------------------------------------

function AddOperatorDrawer({
  roles,
  locations,
  onClose,
  onCreated,
}: {
  roles: Role[]
  locations: Location[]
  onClose: () => void
  onCreated: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [locationIds, setLocationIds] = useState<string[]>([])

  function submit() {
    if (!name.trim() || !email.trim() || !roleId) return
    const op = createOperator({
      name,
      email,
      phone,
      roleId,
      locationIds,
      status: 'invited',
    }, getCurrentOperatorName())
    onCreated(`Invitation sent to ${op.email}.`)
  }

  return (
    <DrawerShell
      size="lg"
      title="Invite a new operator"
      description="They'll receive an email with a sign-in link. Pick the role and locations they should have access to."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || !email.trim() || !roleId}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" /> Send invite
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aisha Khan"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aisha@example.com"
              type="email"
            />
          </div>
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 0100"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleId(r.id)}
                className={
                  r.id === roleId
                    ? 'rounded-2xl border border-brand-500 bg-brand-50 p-3 text-left ring-1 ring-brand-500/30'
                    : 'rounded-2xl border border-ink-200 bg-white p-3 text-left hover:bg-ink-50'
                }
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-ink-700" />
                  <span className="text-sm font-semibold text-ink-900">{r.name}</span>
                  {r.system && (
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-700">
                      Built-in
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-ink-500">{r.description}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Locations</label>
          <p className="mb-2 text-[11px] text-ink-500">
            Leave empty to grant access to all locations.
          </p>
          <div className="flex flex-wrap gap-2">
            {locations.map((l) => {
              const on = locationIds.includes(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() =>
                    setLocationIds((cur) =>
                      cur.includes(l.id)
                        ? cur.filter((x) => x !== l.id)
                        : [...cur, l.id],
                    )
                  }
                  className={
                    on
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-ink-900'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  <MapPin className="h-3 w-3" />
                  {l.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </DrawerShell>
  )
}

// ---- Edit Operator drawer ------------------------------------------------

function EditOperatorDrawer({
  operator,
  roles,
  locations,
  onClose,
  onSaved,
}: {
  operator: Operator
  roles: Role[]
  locations: Location[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [name, setName] = useState(operator.name)
  const [email, setEmail] = useState(operator.email)
  const [phone, setPhone] = useState(operator.phone ?? '')
  const [roleId, setRoleId] = useState(operator.roleId)
  const [locationIds, setLocationIds] = useState<string[]>(operator.locationIds)

  function submit() {
    updateOperator(operator.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      roleId,
      locationIds,
    })
    onSaved(`Operator ${name} updated.`)
  }

  return (
    <DrawerShell
      size="lg"
      title={`Edit ${operator.name}`}
      description="Adjust role, locations, and contact information."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={submit} className="btn-primary flex-1">
            Save changes
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleId(r.id)}
                className={
                  r.id === roleId
                    ? 'rounded-2xl border border-brand-500 bg-brand-50 p-3 text-left ring-1 ring-brand-500/30'
                    : 'rounded-2xl border border-ink-200 bg-white p-3 text-left hover:bg-ink-50'
                }
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-ink-700" />
                  <span className="text-sm font-semibold text-ink-900">{r.name}</span>
                  {r.system && (
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-700">
                      Built-in
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-ink-500">{r.description}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Locations</label>
          <p className="mb-2 text-[11px] text-ink-500">
            Leave empty to grant access to all locations.
          </p>
          <div className="flex flex-wrap gap-2">
            {locations.map((l) => {
              const on = locationIds.includes(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() =>
                    setLocationIds((cur) =>
                      cur.includes(l.id)
                        ? cur.filter((x) => x !== l.id)
                        : [...cur, l.id],
                    )
                  }
                  className={
                    on
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-ink-900'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  <MapPin className="h-3 w-3" />
                  {l.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </DrawerShell>
  )
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