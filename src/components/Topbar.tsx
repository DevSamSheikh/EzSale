import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings as Cog,
  Shield,
  User,
} from 'lucide-react'
import { Logo } from './Primitives'
import { NavIcon } from './NavIcon'
import { BusinessTypeIcon } from '../icons'
import { GlobalSearchMenu } from './GlobalSearchMenu'
import { BUSINESS_TYPES, getBusiness, getAuth, clearAuth, NAV_LINKS } from '../store'
import {
  getCurrentOperator,
  getOperators,
  getRoles,
  setCurrentOperatorId,
} from '../operators-store'
import { getLocations } from '../orders-store'
import { useActiveLocation } from '../active-location'
import { isLocationOpenNow } from '../location-utils'

const DEMO_BUSINESSES = [
  { id: 'b1', name: 'Bistro Aurora', type: 'restaurant' as const },
  { id: 'b2', name: 'Greenfield Mall', type: 'mall' as const },
  { id: 'b3', name: 'PixelPlay Arcade', type: 'gaming' as const },
]

export function Topbar({
  onMenu,
  sidebarCollapsed = false,
  onToggleSidebar,
}: {
  onMenu: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}) {
  const navigate = useNavigate()
  const business = getBusiness()
  const auth = getAuth()
  const [bizOpen, setBizOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [locOpen, setLocOpen] = useState(false)

  const bizRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)
  const operatorRef = useRef<HTMLDivElement | null>(null)
  const locRef = useRef<HTMLDivElement | null>(null)
  const [operatorOpen, setOperatorOpen] = useState(false)

  const activeLocation = useActiveLocation()

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) setBizOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (operatorRef.current && !operatorRef.current.contains(e.target as Node)) setOperatorOpen(false)
      if (locRef.current && !locRef.current.contains(e.target as Node)) setLocOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === '/' && !searchOpen) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const shortcutLabel = (() => {
    if (typeof navigator === 'undefined') return 'Ctrl K'
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'
  })()

  const currentName = business?.name ?? 'Bistro Aurora'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-ink-100 bg-white/80 px-3 backdrop-blur sm:gap-4 sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar expand / collapse (desktop only) */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-ink-900 lg:grid"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      )}

      <div className="lg:hidden">
        <Logo size={26} />
      </div>

      {/* Business selector */}
      <div ref={bizRef} className="relative hidden sm:block">
        <button
          onClick={() => setBizOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 hover:bg-ink-50"
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-100 text-ink-900">
            <BusinessTypeIcon type={business?.type ?? 'restaurant'} className="h-4 w-4" />
          </span>
          <span className="hidden sm:block">{currentName}</span>
          <ChevronDown className="h-4 w-4 text-ink-500" />
        </button>
        {bizOpen && (
          <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Your businesses
            </div>
            <div className="space-y-1">
              {DEMO_BUSINESSES.map((b) => {
                const t = BUSINESS_TYPES.find((x) => x.value === b.type)
                const active = b.name === currentName
                return (
                  <button
                    key={b.id}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                      active ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-100 text-ink-700">
                      {t ? <BusinessTypeIcon type={t.value} className="h-4 w-4" /> : null}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-ink-900">{b.name}</div>
                      <div className="text-xs text-ink-500">{t?.label}</div>
                    </div>
                    {active && (
                      <span className="rounded-pill bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                        Active
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-1 border-t border-ink-100 pt-1">
              <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <Plus className="h-4 w-4" /> New business
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Location selector */}
      <div ref={locRef} className="relative hidden md:block">
        <button
          type="button"
          onClick={() => setLocOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900 hover:bg-ink-50"
          title="Switch active location"
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-ink-900 text-brand-400">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="max-w-[180px] truncate">
            {activeLocation.location?.name ?? 'Select location'}
          </span>
          {activeLocation.location && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isLocationOpenNow(activeLocation.location)
                  ? 'bg-emerald-500'
                  : activeLocation.location.status === 'active'
                  ? 'bg-amber-500'
                  : 'bg-ink-300'
              }`}
              aria-hidden
            />
          )}
          <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
        </button>
        {locOpen && (
          <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-pop">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
              Active location
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {getLocations().map((l) => {
                const on = l.id === activeLocation.activeId
                const open = isLocationOpenNow(l)
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        activeLocation.setActiveId(l.id)
                        setLocOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                        on ? 'bg-brand-50' : ''
                      }`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-100 text-ink-700">
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
            <div className="mt-1 border-t border-ink-100 pt-1">
              <Link
                to="/app/locations"
                onClick={() => setLocOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                <Building2 className="h-4 w-4" /> Manage locations
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-left text-sm text-ink-500 shadow-soft transition-colors hover:border-ink-300 hover:bg-ink-50 md:flex"
        aria-label={`Open search (${shortcutLabel})`}
      >
        <Search className="h-4 w-4 text-ink-400" />
        <span className="flex-1 truncate">Search products, orders, members…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-500">
          {shortcutLabel}
        </kbd>
      </button>

      <GlobalSearchMenu
        open={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => {
          setSearchOpen(false)
          setSearchQuery('')
        }}
      />

      <div className="ml-auto flex items-center gap-1 md:ml-2">
        {/* Operator switcher (demo) */}
        <div ref={operatorRef} className="relative">
          <button
            type="button"
            onClick={() => setOperatorOpen((o) => !o)}
            className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 sm:inline-flex"
            title="Switch operator (demo)"
          >
            <Shield className="h-3.5 w-3.5 text-ink-500" />
            <span className="truncate max-w-[160px]">
              {getCurrentOperator()?.name ?? auth?.email?.split('@')[0] ?? 'demo'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
          </button>
          {operatorOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
              <div className="border-b border-ink-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Switch operator (demo)
              </div>
              <ul className="max-h-72 overflow-y-auto py-1">
                {getOperators().map((op) => {
                  const role = getRoles().find((r) => r.id === op.roleId)
                  const active = op.id === getCurrentOperator()?.id
                  return (
                    <li key={op.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentOperatorId(op.id)
                          setOperatorOpen(false)
                          // Soft refresh so guards re-evaluate
                          window.location.reload()
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                          active ? 'bg-brand-50' : ''
                        }`}
                      >
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-ink-900"
                          style={{ background: op.avatarColor ?? '#84eb0a' }}
                        >
                          {op.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink-900">{op.name}</span>
                          <span className="block truncate text-[10px] text-ink-500">
                            {role?.name ?? op.roleId}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Quick add */}
        <button
          onClick={() => navigate('/app/pos')}
          className="hidden sm:inline-flex btn-primary"
        >
          <Plus className="h-4 w-4" /> New sale
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-xl p-2 text-ink-600 hover:bg-ink-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 inline-block h-2 w-2 rounded-full bg-brand-500" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Notifications
              </div>
              {[
                { t: 'Low stock alert', d: '5 items are below their reorder threshold.', s: '2m' },
                { t: 'New member signed up', d: 'Sara Khan enrolled with the Gold card.', s: '15m' },
                { t: 'Daily summary ready', d: 'Yesterday’s report is available to view.', s: '1h' },
              ].map((n, i) => (
                <div key={i} className="rounded-xl px-2 py-2 hover:bg-ink-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink-900">{n.t}</div>
                    <div className="text-xs text-ink-400">{n.s}</div>
                  </div>
                  <div className="text-xs text-ink-500">{n.d}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-ink-100"
          >
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-ink-900"
              style={{ background: getCurrentOperator()?.avatarColor ?? '#84eb0a' }}
            >
              {(getCurrentOperator()?.name?.[0] ?? auth?.email?.[0] ?? 'D').toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-semibold text-ink-900">
                {getCurrentOperator()?.name ?? auth?.email?.split('@')[0] ?? 'demo'}
              </div>
              <div className="text-[11px] text-ink-500">
                {getRoles().find((r) => r.id === getCurrentOperator()?.roleId)?.name ?? 'Operator'}
              </div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Account
              </div>
              <Link to="/app/staff" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-ink-50">
                <User className="h-4 w-4 text-ink-500" /> My profile
              </Link>
              <Link to="/app/settings" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-ink-50">
                <Cog className="h-4 w-4 text-ink-500" /> Settings
              </Link>
              <div className="my-1 border-t border-ink-100" />
              <button
                onClick={() => {
                  clearAuth()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const location = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-100 bg-white shadow-pop lg:hidden">
      {NAV_LINKS.filter((l) =>
        ['/app/dashboard', '/app/products', '/app/orders', '/app/transactions', '/app/settings'].includes(l.to),
      ).map((l) => {
        const isActive = location.pathname.startsWith(l.to)
        return (
          <Link
            key={l.to}
            to={l.to}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive ? 'text-ink-900' : 'text-ink-500'
            }`}
          >
            <span
              className={`grid h-8 w-12 place-items-center rounded-full ${
                isActive ? 'bg-brand-500/15' : ''
              }`}
            >
              <NavIcon name={l.icon} className={`h-5 w-5 ${isActive ? 'text-brand-600' : ''}`} />
            </span>
            <span>{l.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
