import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Heart,
  LayoutGrid,
  ListOrdered,
  MapPin,
  Package,
  Settings as Cog,
  ShoppingCart,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Logo } from './Primitives'
import { TopbarNotifications } from './NotificationDropdown'
import { getAuth } from '../store'
import { getLocations } from '../orders-store'
import { useActiveLocation } from '../active-location'
import { isLocationOpenNow } from '../location-utils'
import { useIsMultiLocation } from '../hooks/useIsMultiLocation'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/orders', label: 'My Orders', icon: ListOrdered },
  { to: '/app/dashboard', label: 'Wishlist', icon: Heart },
  { to: '/app/pos', label: 'Cart', icon: ShoppingCart },
  { to: '/app/settings', label: 'Settings', icon: Cog },
]

export function POSNavbar() {
  const navigate = useNavigate()
  const auth = getAuth()
  const initial = (auth?.email?.[0] ?? 'D').toUpperCase()
  const activeLocation = useActiveLocation()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const multi = useIsMultiLocation()

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 px-3 py-2.5 sm:gap-6 sm:px-5 sm:py-3">
        <Link to="/app/pos" className="flex items-center" aria-label="Home">
          <Logo />
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon
            return (
              <NavLink
                key={n.label}
                to={n.to}
                end
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-ink-100 text-ink-900'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{n.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {multi ? (
            <div ref={wrapRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                aria-label="Switch active location"
              >
                <MapPin className="h-3.5 w-3.5 text-ink-500" />
                <span className="max-w-[180px] truncate">
                  {activeLocation.location?.name ?? 'Select location'}
                </span>
                {activeLocation.location && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
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
              {open && (
                <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-pop">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                    Sell from location
                  </div>
                  <ul className="max-h-64 overflow-y-auto">
                    {getLocations().map((l) => {
                      const on = l.id === activeLocation.activeId
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => {
                              activeLocation.setActiveId(l.id)
                              setOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-ink-50 ${
                              on ? 'bg-brand-50' : ''
                            }`}
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-100 text-ink-700">
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-ink-900">
                                {l.name}
                              </span>
                              <span className="block truncate text-[10px] text-ink-500">
                                {l.code} · {l.status === 'active' ? 'Active' : l.status}
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
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      <MapPin className="h-4 w-4" /> Manage locations
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : activeLocation.location ? (
            // Single-location mode: show the active location as a static
            // chip so the operator still has visual confirmation, but no
            // dropdown — there's nowhere else to switch to.
            <span
              className="inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700"
              title="Single-location mode"
            >
              <MapPin className="h-3.5 w-3.5 text-ink-500" />
              <span className="max-w-[180px] truncate">
                {activeLocation.location.name}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLocationOpenNow(activeLocation.location)
                    ? 'bg-emerald-500'
                    : activeLocation.location.status === 'active'
                    ? 'bg-amber-500'
                    : 'bg-ink-300'
                }`}
                aria-hidden
              />
            </span>
          ) : null}

          <TopbarNotifications
            open={notifOpen}
            onOpenChange={setNotifOpen}
            onOpenAll={() => navigate('/app/notifications')}
          />
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
          </button>
          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-ink-900 text-xs font-bold text-white ring-1 ring-ink-100">
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}
