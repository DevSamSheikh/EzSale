import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  KeyRound,
  Lock,
  PencilLine,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '../../components/Primitives'
import { DrawerShell } from '../../components/Drawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ToastViewport, useToast } from '../../components/Toast'
import {
  FilterSearchInput,
} from '../../components/FilterBar'
import {
  createRole,
  deleteRole,
  getCurrentOperator,
  getOperators,
  getRoles,
  operatorHas,
  summarizeRole,
  updateRole,
} from '../../operators-store'
import { ALL_PERMISSION_KEYS, PERMISSION_GROUPS } from '../../permissions'
import type { PermissionGroup, PermissionKey, Role } from '../../types'
import { playCue } from '../../audio'

export default function RolesPage() {
  const [tick, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const toast = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null)

  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    const roles = getRoles()
    const operators = getOperators()
    return { roles, operators }
    // tick is intentional
  }, [tick])

  const me = getCurrentOperator()
  const canManage = operatorHas(me, 'roles.manage')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.roles.filter((r) => {
      if (q) {
        const hay = [r.name, r.description].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data.roles, search])

  const usageByRole = useMemo(() => {
    const m = new Map<string, number>()
    data.operators.forEach((op) => m.set(op.roleId, (m.get(op.roleId) ?? 0) + 1))
    return m
  }, [data.operators])

  function flash(msg: string) {
    toast.success(msg)
    setTick((t) => t + 1)
  }

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        subtitle="Define what each member of your team can do inside EzSale."
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => {
                setCreating(true)
                playCue('tap')
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New role
            </button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Roles"
          value={String(data.roles.length)}
          sub={`${data.roles.filter((r) => r.system).length} built-in`}
          icon={Shield}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="Custom roles"
          value={String(data.roles.filter((r) => !r.system).length)}
          sub="Created by your team"
          icon={PencilLine}
          tone="indigo"
          variant="top"
        />
        <StatCard
          label="Operators assigned"
          value={String(data.operators.length)}
          sub="Across all roles"
          icon={Users}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Total permissions"
          value={String(ALL_PERMISSION_KEYS.length)}
          sub="Granular controls"
          icon={KeyRound}
          tone="amber"
          variant="top"
        />
      </div>

      <div className="card mb-4 p-4 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search roles…"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-7 w-7" />}
          title="No roles match"
          description="Try clearing the search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((role) => {
            const sum = summarizeRole(role)
            const usage = usageByRole.get(role.id) ?? 0
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setEditing(role)
                  playCue('tap')
                }}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-soft transition-shadow hover:shadow-card"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-ink-900">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink-900">
                        {role.name}
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {role.system ? 'Built-in' : 'Custom'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="line-clamp-2 text-xs text-ink-600">{role.description}</p>
                <div className="flex w-full items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.round((sum.granted / Math.max(1, sum.total)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-[11px] font-bold text-ink-700">
                    {sum.granted}/{sum.total}
                  </span>
                </div>
                <div className="flex w-full items-center justify-between text-[11px] text-ink-500">
                  <span>
                    {usage} {usage === 1 ? 'operator' : 'operators'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-ink-700">
                    <Lock className="h-3 w-3" /> {role.permissions.length} keys
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <RoleDrawer
          role={editing}
          title={editing.system ? `${editing.name} (built-in)` : `Edit ${editing.name}`}
          description={editing.description}
          canEdit={canManage && !editing.system}
          canDelete={canManage && !editing.system}
          onClose={() => setEditing(null)}
          onSave={(next, msg) => {
              updateRole(next.id, {
                name: next.name,
                description: next.description,
                permissions: next.permissions,
              })
              flash(msg)
              setEditing(null)
            }}
          onDelete={() => {
              if (editing) setDeleteConfirm(editing)
            }}
        />
      )}

      {creating && (
        <RoleDrawer
          role={null}
          title="Create a new role"
          description="Pick a name, describe what this role is for, then choose what it can do."
          canEdit={canManage}
          canDelete={false}
          onClose={() => setCreating(false)}
          onSave={(next, msg) => {
              const created = createRole({
                name: next.name,
                description: next.description,
                permissions: next.permissions,
              })
              flash(`${created.name} created. ${msg}`)
              setCreating(false)
            }}
          onDelete={() => setCreating(false)}
        />
      )}

      {toast.toasts.length > 0 && (
        <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteConfirm ? `Delete "${deleteConfirm.name}"?` : ''}
        description="This role will be removed and any operator using it will need a new assignment."
        confirmLabel="Delete role"
        tone="danger"
        onConfirm={() => {
          if (deleteConfirm && deleteRole(deleteConfirm.id)) {
            flash(`${deleteConfirm.name} deleted.`)
            setEditing(null)
          }
          setDeleteConfirm(null)
        }}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  )
}

// ---- Role editor drawer -------------------------------------------------

interface RoleEditorState {
  id: string
  name: string
  description: string
  permissions: PermissionKey[]
}

function RoleDrawer({
  role,
  title,
  description,
  canEdit,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  role: Role | null
  title: string
  description: string
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onSave: (next: RoleEditorState, msg: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(role?.name ?? '')
  const [desc, setDesc] = useState(role?.description ?? '')
  const [perms, setPerms] = useState<PermissionKey[]>(role?.permissions ?? [])

  function toggle(key: PermissionKey, on: boolean) {
    setPerms((cur) =>
      on ? Array.from(new Set([...cur, key])) : cur.filter((k) => k !== key),
    )
  }

  function setGroup(group: PermissionGroup, on: boolean) {
    const keys = group.permissions.map((p) => p.key)
    setPerms((cur) =>
      on
        ? Array.from(new Set([...cur, ...keys]))
        : cur.filter((k) => !keys.includes(k)),
    )
  }

  function preset(p: PermissionKey[]) {
    setPerms(p)
  }

  function submit() {
    if (!name.trim()) return
    onSave(
      {
        id: role?.id ?? '',
        name: name.trim(),
        description: desc.trim(),
        permissions: perms,
      },
      role ? 'Permissions updated.' : '',
    )
  }

  const all = ALL_PERMISSION_KEYS.length
  const granted = perms.length
  const percent = Math.round((granted / all) * 100)

  return (
    <DrawerShell
      size="full"
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="btn-danger"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete role
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canEdit || !name.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {role ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr,320px]">
        <div className="space-y-4">
          {!canEdit && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Built-in roles are read-only. Duplicate this role if to you need to
              customise it.
            </div>
          )}

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Role name</label>
                <input
                  className="input"
                  value={name}
                  disabled={!canEdit}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shift Supervisor"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input"
                  value={desc}
                  disabled={!canEdit}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="When to use this role"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {PERMISSION_GROUPS.map((g) => {
              const groupKeys = g.permissions.map((p) => p.key)
              const allOn = groupKeys.every((k) => perms.includes(k))
              const someOn = groupKeys.some((k) => perms.includes(k))
              return (
                <div
                  key={g.id}
                  className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/30 px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-ink-700" />
                        <span className="text-sm font-bold text-ink-900">{g.label}</span>
                        <span className="text-[11px] text-ink-500">
                          {someOn ? `${groupKeys.filter((k) => perms.includes(k)).length}/${groupKeys.length}` : 'no access'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-500">{g.description}</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setGroup(g, !allOn)}
                        className={
                          allOn
                            ? 'inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-[11px] font-bold text-ink-900 hover:bg-brand-100'
                            : someOn
                            ? 'inline-flex items-center gap-1 rounded-full border border-ink-300 bg-white px-3 py-1 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
                            : 'inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
                        }
                      >
                        {allOn ? 'Granted' : someOn ? 'Partial' : 'None'}
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {g.permissions.map((p) => {
                      const on = perms.includes(p.key)
                      return (
                          <li
                            key={p.key}
                            className="flex items-start gap-3 px-5 py-3"
                          >
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => toggle(p.key, !on)}
                              className={`mt-0.5 grid h-5 w-9 shrink-0 place-items-center rounded-full transition-colors ${
                                on ? 'bg-brand-500' : 'bg-ink-200'
                              } ${!canEdit ? 'opacity-50' : ''}`}
                              aria-pressed={on}
                              aria-label={on ? 'Disable' : 'Enable'}
                            >
                              <span
                                className={`block h-4 w-4 rounded-full bg-white shadow-soft transition-transform ${
                                  on ? 'translate-x-2' : '-translate-x-2'
                                }`}
                              />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-ink-900">
                                {p.label}
                              </div>
                              {p.description && (
                                <div className="text-[11px] text-ink-500">
                                  {p.description}
                                </div>
                              )}
                              <div className="mt-0.5 font-mono text-[10px] text-ink-400">
                                {p.key}
                              </div>
                            </div>
                          </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT — summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="text-sm font-bold text-ink-900">Coverage</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-ink-900 tabular-nums">
                {granted}
              </span>
              <span className="text-sm text-ink-500">/ {all} permissions</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-ink-500">
              {percent}% of available capabilities granted.
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="text-sm font-bold text-ink-900">Quick presets</div>
            <p className="mt-1 text-[11px] text-ink-500">
              Replace the current selection with one of these common bundles.
            </p>
            <div className="mt-3 space-y-2">
              <PresetButton
                label="POS operator only"
                description="Dashboard + POS use and refund"
                disabled={!canEdit}
                onClick={() => preset(['dashboard.view', 'pos.use', 'pos.refund'])}
              />
              <PresetButton
                label="Manager"
                description="Everything except roles & settings"
                disabled={!canEdit}
                onClick={() =>
                  preset(
                    ALL_PERMISSION_KEYS.filter(
                      (k) => !k.startsWith('roles.') && !k.startsWith('settings.manage'),
                    ),
                  )
                }
              />
              <PresetButton
                label="Read-only"
                description="View-only access across the app"
                disabled={!canEdit}
                onClick={() =>
                  preset([
                    'dashboard.view',
                    'products.view',
                    'categories.view',
                    'orders.view',
                    'users.view',
                    'cards.view',
                    'deposits.view',
                    'transactions.view',
                    'reports.view',
                    'analytics.view',
                    'staff.view',
                    'roles.view',
                    'settings.view',
                  ])
                }
              />
              <PresetButton
                label="Reset to none"
                description="Clear all permissions"
                disabled={!canEdit}
                onClick={() => preset([])}
                tone="rose"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="text-sm font-bold text-ink-900">Operators using this role</div>
            <RoleUsage roleId={role?.id ?? ''} />
          </div>
        </div>
      </div>
    </DrawerShell>
  )
}

function PresetButton({
  label,
  description,
  onClick,
  disabled,
  tone,
}: {
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
  tone?: 'rose'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        tone === 'rose'
          ? 'w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-left transition-colors hover:bg-rose-100 disabled:opacity-50'
          : 'w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-left transition-colors hover:bg-ink-50 disabled:opacity-50'
      }
    >
      <div className="text-xs font-semibold text-ink-900">{label}</div>
      <div className="text-[11px] text-ink-500">{description}</div>
    </button>
  )
}

function RoleUsage({ roleId }: { roleId: string }) {
  const list = useMemo(() => getOperators().filter((o) => o.roleId === roleId), [roleId])
  if (!roleId) return <p className="mt-2 text-xs text-ink-500">Not yet saved.</p>
  if (list.length === 0) {
    return (
      <p className="mt-2 text-xs text-ink-500">No operators are using this role.</p>
    )
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {list.slice(0, 6).map((op) => (
        <li key={op.id} className="flex items-center gap-2 text-xs">
          <Link
            to={`/app/staff/${op.id}`}
            className="flex items-center gap-2 truncate text-ink-900 hover:text-brand-700"
          >
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-ink-900"
              style={{ background: op.avatarColor ?? '#84eb0a' }}
            >
              {op.name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate font-semibold">{op.name}</span>
          </Link>
        </li>
      ))}
      {list.length > 6 && (
        <li className="text-[11px] text-ink-500">+{list.length - 6} more</li>
      )}
    </ul>
  )
}