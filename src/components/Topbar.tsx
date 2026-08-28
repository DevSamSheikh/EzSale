import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings as Cog, User } from 'lucide-react'
import { Logo } from './Primitives'
import { NavIcon } from './NavIcon'
import { BusinessTypeIcon } from '../icons'
import { BUSINESS_TYPES, getBusiness, getAuth, clearAuth, NAV_LINKS } from '../store'

const DEMO_BUSINESSES = [
  { id: 'b1', name: 'Bistro Aurora', type: 'restaurant' as const },
  { id: 'b2', name: 'Greenfield Mall', type: 'mall' as const },
  { id: 'b3', name: 'PixelPlay Arcade', type: 'gaming' as const },
]

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate()
  const business = getBusiness()
  const auth = getAuth()
  const [bizOpen, setBizOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [query, setQuery] = useState('')

  const bizRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) setBizOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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

      <div className="lg:hidden">
        <Logo size={26} />
      </div>

      {/* Business selector */}
      <div ref={bizRef} className="relative">
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

      {/* Search */}
      <div className="ml-auto hidden flex-1 max-w-md md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, orders, members…"
            className="input pl-9"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-2">
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
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-xs font-bold text-white">
              {(auth?.email?.[0] ?? 'D').toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-semibold text-ink-900">
                {auth?.email?.split('@')[0] ?? 'demo'}
              </div>
              <div className="text-[11px] text-ink-500">Owner</div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Account
              </div>
              <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-ink-50">
                <User className="h-4 w-4 text-ink-500" /> Profile
              </button>
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
