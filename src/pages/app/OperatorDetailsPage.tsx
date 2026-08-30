import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock as ClockIcon,
  CreditCard,
  KeyRound,
  Mail,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Shield,
  UserCheck,
  UserMinus,
  Wallet,
} from 'lucide-react'
import { PageHeader, StatCard, EmptyState } from '../../components/Primitives'
import { Tooltip } from '../../components/Tooltip'
import {
  getCurrentOperator,
  getOperator,
  getOperatorActivity,
  getRoles,
  operatorHas,
  operatorPermissions,
  setOperatorStatus,
  statusLabel,
  statusPillClass,
  summarizeRole,
} from '../../operators-store'
import { getLocations } from '../../orders-store'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { playCue } from '../../audio'
import type { OperatorActivity, OperatorActivityType } from '../../types'

export default function OperatorDetailsPage() {
  const { operatorId } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    if (!operatorId) return null
    const op = getOperator(operatorId)
    if (!op) return null
    const role = getRoles().find((r) => r.id === op.roleId) ?? null
    const locations = getLocations()
    const txns = getTransactions().filter((t) => t.operatorEmail === op.email)
    return { op, role, locations, txns }
    // tick is intentional
  }, [operatorId, tick])

  const me = getCurrentOperator()
  const canManage = operatorHas(me, 'staff.manage')

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
    setTick((t) => t + 1)
  }

  if (!data) {
    return (
      <div>
        <PageHeader
          title="Operator not found"
          subtitle="They may have been removed."
          actions={
            <Link to="/app/staff" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to staff
            </Link>
          }
        />
        <EmptyState
          icon={<UserMinus className="h-7 w-7" />}
          title="No operator with this id"
          description="It may have been deleted or your access was revoked."
          action={
            <Link to="/app/staff" className="btn-primary">
              Back to staff
            </Link>
          }
        />
      </div>
    )
  }

  const { op, role, locations, txns } = data
  const activity = getOperatorActivity(op.id)
  const granted = role ? operatorPermissions(op) : []
  const sum = role ? summarizeRole(role) : { total: 0, granted: 0 }
  const opLocations = op.locationIds
    .map((id) => locations.find((l) => l.id === id))
    .filter(Boolean) as { id: string; name: string; code: string }[]

  const totalRevenue = txns
    .filter((t) => t.status === 'completed' && t.total > 0)
    .reduce((s, t) => s + t.total, 0)
  const totalRefunds = txns
    .filter((t) => t.total < 0 || t.status === 'refunded' || t.status === 'partially_refunded')
    .reduce((s, t) => s + Math.abs(t.total), 0)

  return (
    <div>
      <PageHeader
        title={op.name}
        subtitle={op.email}
        actions={
          <>
            <Link to="/app/staff" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to staff
            </Link>
            {canManage && op.status === 'active' && (
              <button
                type="button"
                onClick={() => {
                  setOperatorStatus(op.id, 'suspended')
                  flash(`${op.name} suspended.`)
                  playCue('warning')
                }}
                className="btn-secondary"
              >
                <Pause className="h-4 w-4" /> Suspend
              </button>
            )}
            {canManage && op.status !== 'active' && (
              <button
                type="button"
                onClick={() => {
                  setOperatorStatus(op.id, 'active')
                  flash(`${op.name} reactivated.`)
                  playCue('success')
                }}
                className="btn-primary"
              >
                <Play className="h-4 w-4" /> Activate
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        {/* LEFT — identity card */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="relative h-24 bg-ink-900">
              <div
                className="absolute -bottom-6 left-5 grid h-14 w-14 place-items-center rounded-2xl text-base font-extrabold text-ink-900 ring-4 ring-white"
                style={{ background: op.avatarColor ?? '#84eb0a' }}
              >
                {op.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p.charAt(0).toUpperCase())
                  .join('')}
              </div>
            </div>
            <div className="px-5 pb-5 pt-8">
              <div className="text-base font-bold text-ink-900">{op.name}</div>
              <div className="text-xs text-ink-500">{op.email}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
                    op.status,
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel(op.status)}
                </span>
                {role && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-ink-900">
                    <Shield className="h-3 w-3" /> {role.name}
                  </span>
                )}
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <Row icon={Mail} label="Email" value={op.email} mono />
                {op.phone && <Row icon={KeyRound} label="Phone" value={op.phone} />}
                <Row
                  icon={ClockIcon}
                  label="Joined"
                  value={new Date(op.joinedAt).toLocaleDateString()}
                />
                <Row
                  icon={ClockIcon}
                  label="Last login"
                  value={op.lastLoginAt ? relTime(op.lastLoginAt) : 'Never'}
                />
                <Row
                  icon={ClockIcon}
                  label="Last active"
                  value={op.lastActiveAt ? relTime(op.lastActiveAt) : '—'}
                />
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-ink-900">Assigned locations</div>
              <MapPin className="h-4 w-4 text-ink-500" />
            </div>
            {opLocations.length === 0 ? (
              <p className="mt-2 text-xs text-ink-500">
                All locations — this operator can sign in anywhere.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {opLocations.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2 text-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 text-ink-500" />
                    <span className="font-semibold text-ink-900">{l.name}</span>
                    <span className="text-[11px] text-ink-500">· {l.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT — main */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Permissions"
              value={`${sum.granted}`}
              sub={`of ${sum.total} granted`}
              icon={Shield}
              tone="brand"
              variant="top"
            />
            <StatCard
              label="Sales rung"
              value={String(txns.length)}
              sub={txns.length > 0 ? `${formatMoney(totalRevenue)}` : 'No sales yet'}
              icon={Wallet}
              tone="indigo"
              variant="top"
            />
            <StatCard
              label="Refunds"
              value={String(
                txns.filter((t) => t.total < 0 || t.status === 'refunded' || t.status === 'partially_refunded').length,
              )}
              sub={totalRefunds > 0 ? `−${formatMoney(totalRefunds)}` : 'No refunds'}
              icon={RotateCcw}
              tone="rose"
              variant="top"
            />
            <StatCard
              label="Locations"
              value={String(opLocations.length || locations.length)}
              sub={opLocations.length === 0 ? 'All access' : 'Restricted'}
              icon={MapPin}
              tone={opLocations.length === 0 ? 'emerald' : 'amber'}
              variant="top"
            />
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-ink-900">Role permissions</div>
              <Link to="/app/roles" className="text-[11px] font-semibold text-ink-700 hover:text-ink-900">
                Manage roles →
              </Link>
            </div>
            {role ? (
              <>
                <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <Shield className="h-4 w-4" />
                    {role.name}
                    {role.system && (
                      <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-700">
                        Built-in
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-700">{role.description}</p>
                </div>
                <PermissionGrid granted={granted} />
              </>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No role assigned.</p>
            )}
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <div className="text-sm font-bold text-ink-900">Activity</div>
              <span className="text-[11px] text-ink-500">{activity.length} events</span>
            </div>
            {activity.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-ink-500">
                No activity recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {activity.slice(0, 20).map((a) => (
                  <ActivityRow key={a.id} activity={a} />
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <div className="text-sm font-bold text-ink-900">Recent sales</div>
              <span className="text-[11px] text-ink-500">{txns.length} transactions</span>
            </div>
            {txns.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-ink-500">
                This operator hasn't run any sales yet.
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {txns.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                      <CreditCard className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs font-semibold text-ink-900">
                        {t.id}
                      </div>
                      <div className="truncate text-[11px] text-ink-500">
                        {paymentMethodLabel(t.method)} ·{' '}
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`text-right text-sm font-bold tabular-nums ${
                        t.total < 0 ? 'text-rose-600' : 'text-ink-900'
                      }`}
                    >
                      {t.total < 0 ? '−' : ''}${Math.abs(t.total).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
            <UserCheck className="h-4 w-4 text-brand-400" />
            {toast}
          </div>
        </div>
      )}

      {/* unused navigation ref to satisfy bundlers */}
      {false && <button onClick={() => navigate('/app/staff')} />}
    </div>
  )
}

// ---- Subcomponents ------------------------------------------------------

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Mail
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
        <div className={`truncate text-sm font-semibold text-ink-900 ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  )
}

function PermissionGrid({ granted }: { granted: string[] }) {
  // Group granted permissions by their module prefix for a compact view.
  const groups = new Map<string, string[]>()
  granted.forEach((p) => {
    const [module] = p.split('.')
    if (!groups.has(module)) groups.set(module, [])
    groups.get(module)!.push(p)
  })
  if (groups.size === 0) {
    return (
      <p className="mt-3 text-xs text-ink-500">
        This role doesn't grant any permissions yet.
      </p>
    )
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from(groups.entries()).map(([module, keys]) => (
        <div
          key={module}
          className="rounded-xl border border-ink-100 bg-ink-50/30 p-2.5"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
            {module}
          </div>
          <ul className="mt-1 space-y-0.5">
            {keys.map((k) => (
              <li
                key={k}
                className="font-mono text-[11px] text-ink-700"
              >
                {k.replace(`${module}.`, '')}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ActivityRow({ activity }: { activity: OperatorActivity }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink-200 bg-white text-ink-700">
        {iconForActivity(activity.type)}
      </div>
      <div className="min-w-0 flex-1">
        <Tooltip
          content={
            <span>
              {new Date(activity.at).toLocaleString()} {activity.by ? `· ${activity.by}` : ''}
            </span>
          }
        >
          <div className="truncate text-sm font-semibold text-ink-900">
            {activity.description}
          </div>
        </Tooltip>
        <div className="text-[11px] text-ink-500">{relTime(activity.at)}</div>
      </div>
    </li>
  )
}

function iconForActivity(t: OperatorActivityType) {
  switch (t) {
    case 'login':
      return <Play className="h-3.5 w-3.5 text-emerald-600" />
    case 'logout':
      return <Pause className="h-3.5 w-3.5 text-ink-500" />
    case 'role_assigned':
      return <Shield className="h-3.5 w-3.5 text-indigo-600" />
    case 'status_changed':
      return <UserCheck className="h-3.5 w-3.5 text-amber-600" />
    case 'location_assigned':
      return <MapPin className="h-3.5 w-3.5 text-sky-600" />
    case 'invited':
      return <Mail className="h-3.5 w-3.5 text-amber-600" />
    case 'created':
      return <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
    case 'password_reset':
      return <KeyRound className="h-3.5 w-3.5 text-ink-500" />
    default:
      return <ClockIcon className="h-3.5 w-3.5 text-ink-500" />
  }
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

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`
}