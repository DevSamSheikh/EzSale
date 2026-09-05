import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Shield,
  UserCog,
} from 'lucide-react'
import { BusinessTypeIcon } from '../icons'
import { BUSINESS_TYPES, getBusiness, getAuth } from '../store'
import { getLocations } from '../orders-store'
import {
  getCurrentOperator,
  getOperators,
  getRoles,
  setCurrentOperatorId,
} from '../operators-store'
import { useActiveLocation } from '../active-location'
import { isLocationOpenNow } from '../location-utils'
import { playCue } from '../audio'
import type { Location, Operator } from '../types'
import { useIsMultiLocation } from '../hooks/useIsMultiLocation'

const DEMO_BUSINESSES = [
  { id: 'b1', name: 'Bistro Aurora', type: 'restaurant' as const },
  { id: 'b2', name: 'Greenfield Mall', type: 'mall' as const },
  { id: 'b3', name: 'PixelPlay Arcade', type: 'gaming' as const },
]

type Section = 'business' | 'location' | 'operator'

/**
 * Single mega dropdown that combines Business, Location, and Operator
 * switchers in one panel. Replaces the three separate topbar popovers
 * to keep the topbar compact and the context switches visually
 * grouped.
 */
export function ContextSwitcher() {
  const navigate = useNavigate()
  const business = getBusiness()
  const auth = getAuth()
  const activeLocation = useActiveLocation()
  const me = getCurrentOperator()
  const multi = useIsMultiLocation()

  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) {
      setActiveSection(null)
      setQuery('')
      return
    }
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (wrapRef.current && wrapRef.current.contains(target)) return
      if (buttonRef.current && buttonRef.current.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const businessName = business?.name ?? 'Bistro Aurora'
  const operatorName = me?.name ?? auth?.email?.split('@')[0] ?? 'demo'
  const role = me ? getRoles().find((r) => r.id === me.roleId) : null
  const locationName = activeLocation.location?.name ?? 'No location'

  function pickBusiness(id: string) {
    playCue('tap')
    setOpen(false)
    // Demo: just log + close. A real implementation would swap business
    // and reset location / operator context.
    console.info('[ContextSwitcher] switch business', id)
  }

  function pickLocation(loc: Location) {
    activeLocation.setActiveId(loc.id)
    playCue('success')
    setOpen(false)
  }

  function pickOperator(op: Operator) {
    setCurrentOperatorId(op.id)
    setOpen(false)
    playCue('tap')
    // Soft refresh so guards re-evaluate.
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          playCue('tap')
        }}
        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900 hover:bg-ink-50"
        aria-label="Workspace context"
        aria-expanded={open}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-100 text-ink-900">
          <BusinessTypeIcon
            type={business?.type ?? 'restaurant'}
            className="h-4 w-4"
          />
        </span>
        <span className="max-w-[200px] truncate">{businessName}</span>
        <span className="hidden text-ink-300 sm:inline">·</span>
        <span className="hidden truncate text-ink-700 sm:max-w-[140px] sm:truncate">
          {locationName}
        </span>
        <ChevronDown className="h-4 w-4 text-ink-500" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-2 flex w-[680px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-ink-100 bg-white shadow-pop"
          role="dialog"
          aria-label="Workspace context"
          onMouseLeave={(e) => {
            // Only close when the cursor leaves the *entire* dialog. We use
            // a small timeout + relatedTarget check so the dropdown stays
            // open while moving between the trigger button and the panel.
            const next = e.relatedTarget as Node | null
            if (wrapRef.current && next && wrapRef.current.contains(next)) return
            if (buttonRef.current && next && buttonRef.current.contains(next)) return
            setOpen(false)
            setActiveSection(null)
          }}
        >
          <ContextSidebar
            active={activeSection}
            onHover={setActiveSection}
            businessLabel={businessName}
            locationLabel={locationName}
            operatorLabel={operatorName}
            roleLabel={role?.name ?? 'Operator'}
            multi={multi}
          />
          <div
            className="w-[420px] max-w-full overflow-hidden rounded-r-2xl border-l border-ink-100"
            onMouseEnter={() => {
              // If the user moves directly into the right panel without
              // hovering a sidebar item first, keep the last active section
              // so the panel doesn't collapse.
              if (!activeSection) setActiveSection('business')
            }}
          >
            {activeSection === 'business' && (
              <BusinessSection
                currentName={businessName}
                onPick={pickBusiness}
              />
            )}
            {activeSection === 'location' && (
              <LocationSection
                activeId={activeLocation.activeId}
                onPick={pickLocation}
                onManage={() => {
                  setOpen(false)
                  navigate('/app/locations')
                }}
              />
            )}
            {activeSection === 'operator' && (
              <OperatorSection
                currentId={me?.id ?? null}
                onPick={pickOperator}
                onManage={() => {
                  setOpen(false)
                  navigate('/app/staff')
                }}
              />
            )}
            {!activeSection && (
              <DefaultPanel
                businessName={businessName}
                locationName={locationName}
                operatorName={operatorName}
                roleName={role?.name ?? 'Operator'}
                locationStatus={
                  activeLocation.location
                    ? isLocationOpenNow(activeLocation.location)
                      ? 'Open'
                      : activeLocation.location.status === 'active'
                      ? 'Closed'
                      : activeLocation.location.status === 'maintenance'
                      ? 'Maintenance'
                      : 'Inactive'
                    : '—'
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Sidebar nav --------------------------------------------------------

function ContextSidebar({
  active,
  onHover,
  businessLabel,
  locationLabel,
  operatorLabel,
  roleLabel,
}: {
  active: Section | null
  onHover: (s: Section | null) => void
  businessLabel: string
  locationLabel: string
  operatorLabel: string
  roleLabel: string
  multi: boolean
}) {
  return (
    <nav
      className="w-[260px] shrink-0 rounded-l-2xl bg-ink-50/60 p-2"
      aria-label="Context switcher"
    >
      <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
        Workspace context
      </div>

      <ContextItem
        id="business"
        icon={Building2}
        label="Business"
        value={businessLabel}
        active={active === 'business'}
        onHover={onHover}
      />
      {multi && (
        <ContextItem
          id="location"
          icon={MapPin}
          label="Location"
          value={locationLabel}
          active={active === 'location'}
          onHover={onHover}
        />
      )}
      <ContextItem
        id="operator"
        icon={UserCog}
        label="User role"
        value={`${operatorLabel} · ${roleLabel}`}
        active={active === 'operator'}
        onHover={onHover}
      />

      <div className="mt-2 border-t border-ink-100 pt-2">
        <Link
          to="/app/settings"
          onClick={() => onHover(null)}
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-white"
        >
          <Shield className="h-4 w-4" /> Workspace settings
        </Link>
      </div>
    </nav>
  )
}

function ContextItem({
  id,
  icon: Icon,
  label,
  value,
  active,
  onHover,
}: {
  id: Section
  icon: typeof Building2
  label: string
  value: string
  active: boolean
  onHover: (s: Section) => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(id)}
      onFocus={() => onHover(id)}
      onClick={() => onHover(id)}
      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
        active ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-800 hover:bg-white/70'
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
          active ? 'bg-ink-900 text-brand-400' : 'bg-ink-100 text-ink-700'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-500">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold text-ink-900">
          {value}
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
    </button>
  )
}

function DefaultPanel({
  businessName,
  locationName,
  operatorName,
  roleName,
  locationStatus,
}: {
  businessName: string
  locationName: string
  operatorName: string
  roleName: string
  locationStatus: string
}) {
  return (
    <div className="p-4">
      <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
          Quick summary
        </div>
        <dl className="mt-3 space-y-2 text-xs text-ink-700">
          <Row label="Business" value={businessName} />
          <Row label="Location" value={`${locationName} · ${locationStatus}`} />
          <Row label="Operator" value={operatorName} />
          <Row label="Role" value={roleName} />
        </dl>
      </div>
      <p className="mt-3 text-[11px] text-ink-500">
        Hover a section on the left to switch business, location, or operator.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </dt>
      <dd className="truncate text-right text-xs font-semibold text-ink-900">
        {value}
      </dd>
    </div>
  )
}

// ---- Section panels -----------------------------------------------------

function BusinessSection({
  currentName,
  onPick,
}: {
  currentName: string
  onPick: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title="Switch business"
        subtitle="All your workspaces, one click away."
      />
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {DEMO_BUSINESSES.map((b) => {
            const t = BUSINESS_TYPES.find((x) => x.value === b.type)
            const active = b.name === currentName
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onPick(b.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                    active ? 'bg-brand-50' : ''
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                      active ? 'bg-brand-100 text-ink-900' : 'bg-ink-100 text-ink-700'
                    }`}
                  >
                    {t ? <BusinessTypeIcon type={t.value} className="h-4 w-4" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink-900">
                      {b.name}
                    </div>
                    <div className="text-[10px] text-ink-500">{t?.label}</div>
                  </div>
                  {active && (
                    <span className="rounded-pill bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                      Active
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="border-t border-ink-100 p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
        >
          <Plus className="h-4 w-4" /> New business
        </button>
      </div>
    </div>
  )
}

function LocationSection({
  activeId,
  onPick,
  onManage,
}: {
  activeId: string
  onPick: (loc: Location) => void
  onManage: () => void
}) {
  const locations = getLocations()
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () =>
      locations.filter((l) =>
        q.trim() === '' ? true : l.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [locations, q],
  )
  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title="Switch location"
        subtitle="Pick which store, kiosk, or counter you're selling from."
      />
      <div className="border-b border-ink-100 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search locations…"
            className="input h-8 rounded-pill pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filtered.map((l) => {
            const on = l.id === activeId
            const open = isLocationOpenNow(l)
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onPick(l)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                    on ? 'bg-brand-50' : ''
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                      on ? 'bg-ink-900 text-brand-400' : 'bg-ink-100 text-ink-700'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-ink-900">
                        {l.name}
                      </span>
                      {l.isPrimary && (
                        <span className="rounded-full bg-brand-500 px-1 py-px text-[9px] font-bold text-ink-900">
                          Primary
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[10px] text-ink-500">
                      {l.code} ·{' '}
                      {l.status === 'active'
                        ? open
                          ? 'Open'
                          : 'Closed'
                        : l.status === 'maintenance'
                        ? 'Maintenance'
                        : 'Inactive'}
                    </span>
                  </span>
                  {on && (
                    <span className="rounded-pill bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                      Active
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="border-t border-ink-100 p-2">
        <button
          type="button"
          onClick={onManage}
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
        >
          <Building2 className="h-4 w-4" /> Manage locations
        </button>
      </div>
    </div>
  )
}

function OperatorSection({
  currentId,
  onPick,
  onManage,
}: {
  currentId: string | null
  onPick: (op: Operator) => void
  onManage: () => void
}) {
  const operators = getOperators()
  const roles = getRoles()
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () =>
      operators.filter((o) => {
        if (q.trim() === '') return true
        const r = roles.find((rr) => rr.id === o.roleId)?.name ?? ''
        return (o.name + o.email + r).toLowerCase().includes(q.trim().toLowerCase())
      }),
    [operators, q, roles],
  )
  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title="Switch user role"
        subtitle="Demo: pick the operator you're signed in as. Refreshing re-evaluates permissions."
      />
      <div className="border-b border-ink-100 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search operators…"
            className="input h-8 rounded-pill pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filtered.map((op) => {
            const role = roles.find((r) => r.id === op.roleId)
            const active = op.id === currentId
            return (
              <li key={op.id}>
                <button
                  type="button"
                  onClick={() => onPick(op)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                    active ? 'bg-brand-50' : ''
                  }`}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-ink-900"
                    style={{ background: op.avatarColor ?? '#84eb0a' }}
                  >
                    {op.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink-900">{op.name}</span>
                    <span className="block truncate text-[10px] text-ink-500">
                      {role?.name ?? op.roleId} · {op.email}
                    </span>
                  </span>
                  {active && (
                    <span className="rounded-pill bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                      Active
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="border-t border-ink-100 p-2">
        <button
          type="button"
          onClick={onManage}
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
        >
          <UserCog className="h-4 w-4" /> Manage staff
        </button>
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="border-b border-ink-100 px-4 py-3">
      <div className="text-sm font-bold text-ink-900">{title}</div>
      <div className="mt-0.5 text-[11px] text-ink-500">{subtitle}</div>
    </div>
  )
}
