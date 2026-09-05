import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Building2,
  Check,
  Clock,
  CreditCard,
  Edit3,
  Filter,
  Mail,
  MapPin,
  Pause,
  Play,
  Phone,
  Plus,
  Power,
  Shield,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  PageHeader,
  StatCard,
  EmptyState,
} from '../../components/Primitives'
import { DrawerShell } from '../../components/Drawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ToastViewport, useToast } from '../../components/Toast'
import {
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import { Tooltip } from '../../components/Tooltip'
import {
  addTerminal,
  assignManager,
  createLocation,
  deleteLocation,
  getActiveLocations,
  getDefaultLocationId,
  getLocations,
  removeTerminal,
  setLocationStatus,
  unassignManager,
  updateLocation,
  updateTerminal,
} from '../../orders-store'
import { getOperators } from '../../operators-store'
import { getTransactions, paymentMethodLabel } from '../../payment-store'
import { getBusiness } from '../../store'
import { useIsMultiLocation } from '../../hooks/useIsMultiLocation'
import { playCue } from '../../audio'
import type {
  Location,
  LocationStatus,
  LocationType,
  OperatingHours,
  POSTerminal,
  Transaction,
} from '../../types'
import {
  DAY_LABELS,
  defaultLocationHours,
  formatLocationAddress,
  formatOperatingHours,
  isLocationOpenNow,
  LOCATION_STATUSES,
  LOCATION_TYPES,
  locationStatusLabel,
  locationStatusPillClass,
  locationTypeLabel,
  terminalStatusLabel,
  terminalStatusPill,
} from '../../location-utils'

type StatusFilter = 'all' | LocationStatus
type TypeFilter = 'all' | LocationType

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...LOCATION_STATUSES.map((s) => ({ value: s.value as StatusFilter, label: s.label })),
]

export default function LocationsPage() {
  const [tick, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [editing, setEditing] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null)
  const [viewing, setViewing] = useState<Location | null>(null)
  const toast = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [removeTermConfirm, setRemoveTermConfirm] = useState<POSTerminal | null>(null)

  useEffect(() => {
    function onFocus() {
      setTick((t) => t + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const data = useMemo(() => {
    const locations = getLocations()
    const operators = getOperators()
    const transactions = getTransactions()
    return { locations, operators, transactions }
    // tick is intentional
  }, [tick])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.locations.filter((l) => {
      if (q) {
        const hay = [l.name, l.code, l.address ?? '', l.city ?? '', l.region ?? '', l.country ?? '']
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter.length && !statusFilter.includes(l.status)) return false
      if (typeFilter.length && !typeFilter.includes(l.type)) return false
      return true
    })
  }, [data.locations, search, statusFilter, typeFilter])

  const typeOptions = useMemo(
    () => LOCATION_TYPES.map((t) => ({ value: t.value, label: t.label })),
    [],
  )

  const summary = useMemo(() => {
    const active = data.locations.filter((l) => l.status === 'active').length
    const terminals = data.locations.reduce((s, l) => s + l.terminals.length, 0)
    const activeTerminals = data.locations.reduce(
      (s, l) => s + l.terminals.filter((t) => t.status === 'active').length,
      0,
    )
    const managers = new Set(data.locations.flatMap((l) => l.managerIds)).size
    return { active, terminals, activeTerminals, managers }
  }, [data.locations])

  function flash(msg: string) {
    toast.success(msg)
    setTick((t) => t + 1)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter([])
    setTypeFilter([])
  }

  function handleStatus(id: string, status: LocationStatus) {
    setLocationStatus(id, status)
    flash(`Status changed to ${locationStatusLabel(status).toLowerCase()}.`)
    playCue('success')
  }

  function handleDelete(id: string, name: string) {
    setDeleteConfirm({ id, name })
  }

  function confirmDelete() {
    if (!deleteConfirm) return
    deleteLocation(deleteConfirm.id)
    flash('Location removed.')
    playCue('warning')
    setDeleteConfirm(null)
  }

  // In single-location mode the locations management screen is intentionally
  // hidden — render a clear notice explaining why so the operator can
  // either go back or flip the multi-location toggle on in Settings.
  const multi = useIsMultiLocation()
  if (!multi) {
    return (
      <div>
        <PageHeader
          title="Locations"
          subtitle="Multi-location management is currently disabled."
        />
        <div className="card grid place-items-center px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-50 text-ink-500">
            <MapPin className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-bold text-ink-900">Multi-location is off</h3>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            This business is running in single-location mode, so the locations
            management screen is hidden. Open Settings → Locations and enable
            multi-location to add or update stores, kiosks, and terminals.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link to="/app/settings" className="btn-primary">
              Open Settings
            </Link>
            <Link to="/app/dashboard" className="btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Manage every store, kiosk, counter, or venue your team operates from."
        actions={
          <>
            <button
              type="button"
              onClick={() => clearFilters()}
              className="btn-secondary"
            >
              <Filter className="h-4 w-4" /> Reset filters
            </button>
            <button
              type="button"
              onClick={() => setEditing({ mode: 'create' })}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New location
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Locations"
          value={String(data.locations.length)}
          sub={`${summary.active} active`}
          icon={Building2}
          tone="brand"
          variant="top"
        />
        <StatCard
          label="POS terminals"
          value={String(summary.terminals)}
          sub={`${summary.activeTerminals} online`}
          icon={Activity}
          tone="indigo"
          variant="top"
        />
        <StatCard
          label="Managers assigned"
          value={String(summary.managers)}
          sub="Across all locations"
          icon={Shield}
          tone="emerald"
          variant="top"
        />
        <StatCard
          label="Cross-location cards"
          value={String(
            data.locations.filter((l) => l.acceptsSharedCards).length,
          )}
          sub="Accept shared membership"
          icon={CreditCard}
          tone="sky"
          variant="top"
        />
      </div>

      <div className="card mb-4 p-4 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search location name, code, city…"
          />
          <FilterSelect
            label="Status"
            icon={<Power className="h-3.5 w-3.5" />}
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterSelect
            label="Type"
            icon={<Store className="h-3.5 w-3.5" />}
            options={[{ value: 'all', label: 'All types' }, ...typeOptions]}
            selected={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7" />}
          title="No locations match your filters"
          description="Try clearing the search, or create a new location."
          action={
            <button
              type="button"
              onClick={() => setEditing({ mode: 'create' })}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New location
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              onView={() => {
                setViewing(loc)
                playCue('tap')
              }}
              onEdit={() => {
                setEditing({ mode: 'edit', id: loc.id })
                playCue('tap')
              }}
              onStatus={(s) => handleStatus(loc.id, s)}
              onDelete={() => handleDelete(loc.id, loc.name)}
            />
          ))}
        </div>
      )}

      {editing && (
        <LocationEditor
          mode={editing.mode}
          id={editing.mode === 'edit' ? editing.id : undefined}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            flash(msg)
            playCue('success')
          }}
        />
      )}

      {viewing && (
        <LocationDetailsDrawer
          location={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ mode: 'edit', id: viewing.id })
            setViewing(null)
          }}
          onStatus={(s) => {
            handleStatus(viewing.id, s)
            setViewing(getLocations().find((l) => l.id === viewing.id) ?? null)
          }}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}

// ---- Location card -------------------------------------------------------

function LocationCard({
  loc,
  onView,
  onEdit,
  onStatus,
  onDelete,
}: {
  loc: Location
  onView: () => void
  onEdit: () => void
  onStatus: (s: LocationStatus) => void
  onDelete: () => void
}) {
  const isOpen = isLocationOpenNow(loc)
  const ops = getOperators()
  const managers = ops.filter((o) => loc.managerIds.includes(o.id))
  const txns = getTransactions()
  const recentTxns = useMemo(
    () => txns.filter((t) => t.locationId === loc.id),
    [txns, loc.id],
  )
  const lastTxn = recentTxns[0]
  const last24h = recentTxns.filter(
    (t) => Date.now() - new Date(t.createdAt).getTime() < 24 * 60 * 60 * 1000,
  )
  const revenue24h = last24h
    .filter((t) => t.status === 'completed' && t.total > 0)
    .reduce((s, t) => s + t.total, 0)

  return (
    <div className="card overflow-hidden p-0">
      <button
        type="button"
        onClick={onView}
        className="block w-full px-5 pb-4 pt-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              loc.status === 'active'
                ? 'bg-brand-50 text-ink-900'
                : loc.status === 'maintenance'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-ink-100 text-ink-700'
            }`}
          >
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold text-ink-900">{loc.name}</span>
              <span className="rounded-full border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-bold text-ink-700">
                {loc.code}
              </span>
              {loc.isPrimary && (
                <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-900">
                  Primary
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-ink-500">
              {formatLocationAddress(loc) || 'No address'}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${locationStatusPillClass(loc.status)}`}
          >
            {locationStatusLabel(loc.status)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <CardStat icon={Activity} label="Terminals" value={String(loc.terminals.length)} />
          <CardStat icon={Shield} label="Managers" value={String(managers.length)} />
          <CardStat
            icon={CreditCard}
            label="Cards"
            value={loc.acceptsSharedCards ? 'Shared' : 'Local'}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-600">
          <span className="inline-flex items-center gap-1">
            <Store className="h-3 w-3 text-ink-400" /> {locationTypeLabel(loc.type)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock
              className={`h-3 w-3 ${isOpen ? 'text-emerald-600' : 'text-ink-400'}`}
            />
            {isOpen ? (
              <span className="font-semibold text-emerald-700">Open now</span>
            ) : (
              <span className="text-ink-500">{loc.status === 'active' ? 'Closed now' : 'Inactive'}</span>
            )}
          </span>
        </div>

        <div className="mt-3 truncate rounded-xl bg-ink-50/60 px-3 py-2 text-[11px] text-ink-700">
          <span className="font-semibold text-ink-500">Hours · </span>
          {formatOperatingHours(loc.hours)}
        </div>

        {lastTxn ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold text-ink-900">
                Last sale {new Date(lastTxn.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="truncate text-[10px] text-ink-500">
                {paymentMethodLabel(lastTxn.method)} ·{' '}
                {lastTxn.operatorEmail.split('@')[0]}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-extrabold text-ink-900">
                ${lastTxn.total.toFixed(2)}
              </div>
              {revenue24h > 0 && (
                <div className="text-[10px] text-ink-500">
                  ${revenue24h.toFixed(0)} · 24h
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-ink-200 bg-white px-3 py-2 text-center text-[11px] text-ink-500">
            No sales recorded yet
          </div>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/40 px-5 py-2.5">
        <div className="flex items-center gap-1.5">
          {loc.status === 'active' ? (
            <Tooltip content="Set to maintenance">
              <button
                type="button"
                onClick={() => onStatus('maintenance')}
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                aria-label="Set maintenance"
              >
                <Pause className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Activate location">
              <button
                type="button"
                onClick={() => onStatus('active')}
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                aria-label="Activate"
              >
                <Play className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Edit location">
            <button
              type="button"
              onClick={onEdit}
              className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-brand-50 hover:text-ink-900"
              aria-label="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Remove location">
            <button
              type="button"
              onClick={onDelete}
              className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
        <button
          type="button"
          onClick={onView}
          className="mt-1 inline-flex min-h-[36px] items-center text-[11px] font-semibold text-ink-700 hover:text-ink-900"
        >
          View details →
        </button>
      </div>
    </div>
  )
}

function CardStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-ink-500" />
      <div className="min-w-0">
        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </div>
        <div className="truncate text-xs font-bold text-ink-900">{value}</div>
      </div>
    </div>
  )
}

// ---- Location editor drawer ----------------------------------------------

function LocationEditor({
  mode,
  id,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  id?: string
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const existing = mode === 'edit' && id ? getLocations().find((l) => l.id === id) : null
  const ops = getOperators()
  const isManager = ops.filter((o) =>
    existing ? existing.managerIds.includes(o.id) : false,
  )

  const [name, setName] = useState(existing?.name ?? '')
  const [code, setCode] = useState(existing?.code ?? '')
  const [type, setType] = useState<LocationType>(existing?.type ?? 'store')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [region, setRegion] = useState(existing?.region ?? '')
  const [country, setCountry] = useState(existing?.country ?? '')
  const [timezone, setTimezone] = useState(existing?.timezone ?? '')
  const [phone, setPhone] = useState(existing?.contact.phone ?? '')
  const [email, setEmail] = useState(existing?.contact.email ?? '')
  const [acceptsSharedCards, setAcceptsSharedCards] = useState(
    existing?.acceptsSharedCards ?? true,
  )
  const [isPrimary, setIsPrimary] = useState(existing?.isPrimary ?? false)
  const [status, setStatus] = useState<LocationStatus>(existing?.status ?? 'active')
  const [hours, setHours] = useState<OperatingHours[]>(
    existing?.hours ?? defaultLocationHours(),
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [managerIds, setManagerIds] = useState<string[]>(existing?.managerIds ?? [])

  function updateHour(day: number, patch: Partial<OperatingHours>) {
    setHours((prev) =>
      prev.map((h) =>
        h.day === day
          ? {
              ...h,
              ...patch,
              open: patch.closed ? '' : patch.open ?? h.open,
              close: patch.closed ? '' : patch.close ?? h.close,
            }
          : h,
      ),
    )
  }

  function toggleManager(id: string) {
    setManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function submit() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      code: code.trim() || `LOC-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      type,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      region: region.trim() || undefined,
      country: country.trim() || undefined,
      timezone: timezone.trim() || undefined,
      managerIds,
      acceptsSharedCards,
      isPrimary,
      status,
      contact: { phone: phone.trim() || undefined, email: email.trim() || undefined },
      hours,
      notes: notes.trim() || undefined,
    }
    if (mode === 'create') {
      createLocation(payload)
      onSaved(`Location "${payload.name}" created.`)
    } else if (existing) {
      updateLocation(existing.id, payload)
      onSaved(`Location "${payload.name}" updated.`)
    }
  }

  return (
    <DrawerShell
      size="lg"
      title={mode === 'create' ? 'New location' : `Edit · ${existing?.name ?? ''}`}
      description="Set up the basic identity, address, hours, and managers. POS terminals can be added from the detail view."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-ink-500">
            Changes are saved when you click <em>Save</em>.
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim()}
              className="btn-primary"
            >
              <Check className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Section title="Identity" icon={Store}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Location name">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aurora Downtown"
              />
            </Field>
            <Field label="Short code" hint="Shown on receipts and order rows (max 12 chars).">
              <input
                className="input uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
                placeholder="MAIN"
              />
            </Field>
            <Field label="Type">
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as LocationType)}
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as LocationStatus)}
              >
                {LOCATION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="font-semibold text-ink-900">Primary location</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptsSharedCards}
                onChange={(e) => setAcceptsSharedCards(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="font-semibold text-ink-900">
                Accept cross-location membership cards
              </span>
            </label>
          </div>
        </Section>

        <Section title="Address & contact" icon={MapPin}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Street address">
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12 Aurora Ave"
              />
            </Field>
            <Field label="City">
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Brooklyn"
              />
            </Field>
            <Field label="State / region">
              <input
                className="input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="NY"
              />
            </Field>
            <Field label="Country">
              <input
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
              />
            </Field>
            <Field label="Timezone">
              <input
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
              />
            </Field>
            <Field label="Phone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  className="input pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0123"
                />
              </div>
            </Field>
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="store@example.com"
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Operating hours" icon={Clock}>
          <div className="space-y-1.5">
            {hours.map((h) => (
              <div
                key={h.day}
                className="grid grid-cols-1 gap-2 rounded-xl border border-ink-100 bg-white p-2.5 sm:grid-cols-[80px,1fr,1fr,auto] sm:items-center sm:gap-2 sm:p-0 sm:px-3 sm:py-2"
              >
                <div className="text-sm font-semibold text-ink-900">
                  {DAY_LABELS[h.day]}
                </div>
                <input
                  type="time"
                  className="input h-9"
                  value={h.open}
                  disabled={h.closed}
                  onChange={(e) => updateHour(h.day, { open: e.target.value })}
                />
                <input
                  type="time"
                  className="input h-9"
                  value={h.close}
                  disabled={h.closed}
                  onChange={(e) => updateHour(h.day, { close: e.target.value })}
                />
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
                  <input
                    type="checkbox"
                    checked={!!h.closed}
                    onChange={(e) => updateHour(h.day, { closed: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Managers" icon={Shield}>
          {ops.length === 0 ? (
            <p className="text-xs text-ink-500">No operators yet — invite staff first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ops.map((o) => {
                const on = managerIds.includes(o.id)
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => toggleManager(o.id)}
                    className={
                      on
                        ? 'flex items-center gap-3 rounded-xl border border-brand-500 bg-brand-50 p-2.5 text-left'
                        : 'flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-2.5 text-left hover:border-ink-200'
                    }
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-ink-900"
                      style={{ background: o.avatarColor ?? '#84eb0a' }}
                    >
                      {o.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900">
                        {o.name}
                      </div>
                      <div className="truncate text-[11px] text-ink-500">{o.email}</div>
                    </div>
                    <span
                      className={
                        on
                          ? 'grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white'
                          : 'grid h-5 w-5 place-items-center rounded-full border border-ink-300 bg-white'
                      }
                    >
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {isManager.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-500">
              {isManager.length} manager{isManager.length === 1 ? '' : 's'} currently assigned.
            </p>
          )}
        </Section>

        <Section title="Notes" icon={Edit3}>
          <textarea
            className="input min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this location (e.g. parking info, special instructions)."
          />
        </Section>
      </div>
    </DrawerShell>
  )
}

// ---- Location details drawer ----------------------------------------------

function LocationDetailsDrawer({
  location,
  onClose,
  onEdit,
  onStatus,
}: {
  location: Location
  onClose: () => void
  onEdit: () => void
  onStatus: (s: LocationStatus) => void
}) {
  const ops = getOperators()
  const txns = getTransactions()
  const business = getBusiness()
  const isOpen = isLocationOpenNow(location)

  const managers = ops.filter((o) => location.managerIds.includes(o.id))
  const recentTxns = useMemo(
    () => txns.filter((t) => t.locationId === location.id).slice(0, 12),
    [txns, location.id],
  )
  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return recentTxns.filter(
      (t) => new Date(t.createdAt).getTime() >= start.getTime(),
    )
  }, [recentTxns])
  const todayRev = today
    .filter((t) => t.status === 'completed' && t.total > 0)
    .reduce((s, t) => s + t.total, 0)

  const [newTermDraft, setNewTermDraft] = useState<{ open: boolean; name: string; code: string }>({
    open: false,
    name: '',
    code: '',
  })
  const [removeTermConfirm, setRemoveTermConfirm] = useState<POSTerminal | null>(null)

  function addTerm() {
    if (typeof window === 'undefined') return
    const defaultCode = `T-${(location.terminals.length + 1).toString().padStart(2, '0')}`
    setNewTermDraft({ open: true, name: 'Counter', code: defaultCode })
  }

  function commitAddTerm() {
    const name = newTermDraft.name.trim()
    const code = newTermDraft.code.trim()
    if (!name) return
    addTerminal(location.id, { name, code: code || `T-${(location.terminals.length + 1).toString().padStart(2, '0')}` })
    setNewTermDraft({ open: false, name: '', code: '' })
    onStatus(location.status)
    onEdit()
  }

  function removeTerm(t: POSTerminal) {
    setRemoveTermConfirm(t)
  }

  function commitRemoveTerm() {
    if (!removeTermConfirm) return
    removeTerminal(location.id, removeTermConfirm.id)
    setRemoveTermConfirm(null)
    onEdit()
  }

  function toggleTerm(t: POSTerminal) {
    const next = t.status === 'active' ? 'inactive' : 'active'
    updateTerminal(location.id, t.id, { status: next })
    onEdit()
  }

  function toggleMgr(operatorId: string) {
    if (location.managerIds.includes(operatorId)) {
      unassignManager(location.id, operatorId)
    } else {
      assignManager(location.id, operatorId)
    }
    onEdit()
  }

  return (
    <DrawerShell
      size="xl"
      title={location.name}
      description={`${location.code} · ${locationTypeLabel(location.type)} · ${formatLocationAddress(location) || 'No address'}`}
      onClose={onClose}
      headerExtra={
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${locationStatusPillClass(location.status)}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {locationStatusLabel(location.status)}
          </span>
          {location.isPrimary && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-ink-900">
              Primary
            </span>
          )}
          <span
            className={
              isOpen
                ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700'
                : 'inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-700'
            }
          >
            <Clock className="h-3 w-3" />
            {isOpen ? 'Open now' : 'Closed'}
          </span>
          <button type="button" onClick={onEdit} className="btn-secondary text-xs">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          {location.status === 'active' ? (
            <button
              type="button"
              onClick={() => onStatus('inactive')}
              className="btn-secondary text-xs"
            >
              <Pause className="h-3.5 w-3.5" /> Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatus('active')}
              className="btn-primary text-xs"
            >
              <Play className="h-3.5 w-3.5" /> Activate
            </button>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Link to="/app/orders" className="text-[11px] font-semibold text-ink-700 hover:text-ink-900">
            View all orders from this location →
          </Link>
          <button type="button" onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Today revenue"
              value={`$${todayRev.toFixed(2)}`}
              sub={`${today.length} sales`}
              icon={Activity}
              tone="brand"
              variant="top"
            />
            <StatCard
              label="Terminals"
              value={String(location.terminals.length)}
              sub={`${location.terminals.filter((t) => t.status === 'active').length} online`}
              icon={Power}
              tone="indigo"
              variant="top"
            />
            <StatCard
              label="Managers"
              value={String(managers.length)}
              sub="Assigned here"
              icon={Shield}
              tone="emerald"
              variant="top"
            />
            <StatCard
              label="Shared cards"
              value={location.acceptsSharedCards ? 'On' : 'Off'}
              sub={location.acceptsSharedCards ? 'Cross-location' : 'Local only'}
              icon={CreditCard}
              tone="sky"
              variant="top"
            />
          </div>

          <DrawerCard title="POS terminals" icon={Power}>
            {location.terminals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-xs text-ink-500">
                No terminals registered yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {location.terminals.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2.5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                      <Power className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink-900">
                          {t.name}
                        </span>
                        <span className="rounded-full border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-700">
                          {t.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {t.lastSeenAt
                          ? `Last seen ${new Date(t.lastSeenAt).toLocaleString()}`
                          : 'No activity yet'}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${terminalStatusPill(t.status)}`}
                    >
                      {terminalStatusLabel(t.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleTerm(t)}
                      className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-brand-50 hover:text-ink-900"
                      aria-label="Toggle terminal status"
                      title="Toggle status"
                    >
                      {t.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTerm(t)}
                      className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Remove terminal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 border-t border-ink-100 pt-3">
              <button type="button" onClick={addTerm} className="btn-secondary text-xs">
                <Plus className="h-3.5 w-3.5" /> Add terminal
              </button>
            </div>
          </DrawerCard>

          <DrawerCard title="Recent transactions" icon={Activity}>
            {recentTxns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-xs text-ink-500">
                No transactions for this location yet.
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentTxns.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900">
                        <span className="font-mono text-xs">{t.id}</span> ·{' '}
                        {paymentMethodLabel(t.method)}
                      </div>
                      <div className="truncate text-[11px] text-ink-500">
                        {new Date(t.createdAt).toLocaleString()} · {t.operatorEmail.split('@')[0]}
                        {t.terminalId
                          ? ` · ${location.terminals.find((x) => x.id === t.terminalId)?.code ?? t.terminalId}`
                          : ''}
                      </div>
                    </div>
                    <div
                      className={`text-right text-sm font-extrabold ${
                        t.total < 0 ? 'text-rose-600' : 'text-ink-900'
                      }`}
                    >
                      ${Math.abs(t.total).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DrawerCard>
        </div>

        <div className="space-y-4">
          <DrawerCard title="Identity" icon={Building2}>
            <dl className="space-y-2 text-sm">
              <Row label="Name" value={location.name} />
              <Row label="Code" value={location.code} mono />
              <Row label="Type" value={locationTypeLabel(location.type)} />
              <Row label="Status" value={locationStatusLabel(location.status)} />
              <Row label="Timezone" value={location.timezone || '—'} />
              <Row label="Created" value={location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '—'} />
              <Row label="Updated" value={location.updatedAt ? new Date(location.updatedAt).toLocaleString() : '—'} />
            </dl>
            {business?.name && (
              <p className="mt-3 text-[11px] text-ink-500">
                Part of <span className="font-semibold text-ink-900">{business.name}</span>.
              </p>
            )}
          </DrawerCard>

          <DrawerCard title="Address & contact" icon={MapPin}>
            <dl className="space-y-2 text-sm">
              <Row label="Address" value={formatLocationAddress(location) || '—'} />
              <Row
                label="Phone"
                value={location.contact.phone || '—'}
                mono
                icon={Phone}
              />
              <Row
                label="Email"
                value={location.contact.email || '—'}
                mono
                icon={Mail}
              />
            </dl>
          </DrawerCard>

          <DrawerCard title="Hours" icon={Clock}>
            <ul className="space-y-1 text-sm">
              {location.hours.map((h) => (
                <li
                  key={h.day}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-1.5"
                >
                  <span className="font-semibold text-ink-900">{DAY_LABELS[h.day]}</span>
                  <span
                    className={
                      h.closed
                        ? 'font-mono text-[11px] text-ink-500'
                        : 'font-mono text-[11px] text-ink-700'
                    }
                  >
                    {h.closed || !h.open || !h.close ? 'Closed' : `${h.open} – ${h.close}`}
                  </span>
                </li>
              ))}
            </ul>
          </DrawerCard>

          <DrawerCard
            title={`Managers (${managers.length})`}
            icon={Users}
            right={
              <span className="text-[11px] text-ink-500">Tap to add / remove</span>
            }
          >
            <ul className="space-y-1.5">
              {ops.map((o) => {
                const on = location.managerIds.includes(o.id)
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => toggleMgr(o.id)}
                      className={
                        on
                          ? 'flex w-full items-center gap-3 rounded-xl border border-brand-500 bg-brand-50 p-2 text-left'
                          : 'flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white p-2 text-left hover:border-ink-200'
                      }
                    >
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-ink-900"
                        style={{ background: o.avatarColor ?? '#84eb0a' }}
                      >
                        {o.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join('')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {o.name}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">{o.email}</div>
                      </div>
                      <span
                        className={
                          on
                            ? 'grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white'
                            : 'grid h-5 w-5 place-items-center rounded-full border border-ink-300 bg-white'
                        }
                      >
                        {on ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </DrawerCard>

          {location.notes && (
            <DrawerCard title="Notes" icon={Edit3}>
              <p className="text-sm text-ink-700">{location.notes}</p>
            </DrawerCard>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeTermConfirm !== null}
        title={`Remove terminal "${removeTermConfirm?.name ?? ''}"?`}
        description="The terminal will no longer be available to operators. Past transactions are kept."
        impact={removeTermConfirm?.code}
        confirmLabel="Remove terminal"
        tone="danger"
        onConfirm={commitRemoveTerm}
        onClose={() => setRemoveTermConfirm(null)}
      />
      <ConfirmDialog
        open={newTermDraft.open}
        title="Add a new terminal"
        description="Give the terminal a friendly name and short code that staff will recognise."
        confirmLabel="Add terminal"
        cancelLabel="Cancel"
        tone="info"
        onConfirm={commitAddTerm}
        onClose={() => setNewTermDraft({ open: false, name: '', code: '' })}
        impact={
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Terminal name
              </span>
              <input
                autoFocus
                className="input"
                value={newTermDraft.name}
                onChange={(e) =>
                  setNewTermDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Counter"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Short code
              </span>
              <input
                className="input font-mono"
                value={newTermDraft.code}
                onChange={(e) =>
                  setNewTermDraft((d) => ({ ...d, code: e.target.value }))
                }
                placeholder="e.g. T-01"
                maxLength={12}
              />
            </label>
          </div>
        }
      />
    </DrawerShell>
  )
}

// ---- Local helpers ------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Building2
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
        <Icon className="h-4 w-4 text-ink-500" />
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-500">{hint}</span>}
    </label>
  )
}

function DrawerCard({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string
  icon: typeof Building2
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon className="h-4 w-4 text-ink-500" />
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: typeof Phone
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
        <div className={`truncate text-sm font-semibold text-ink-900 ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  )
}