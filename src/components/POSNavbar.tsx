import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Package,
  Settings as Cog,
  ShoppingCart,
} from 'lucide-react'
import { Logo } from './Primitives'
import { getAuth } from '../store'

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
          <button
            onClick={() => navigate('/app/dashboard')}
            className="hidden h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50 sm:grid"
            aria-label="Back to admin dashboard"
            title="Admin"
          >
            <LayoutDashboard className="h-4 w-4" />
          </button>
          <button
            className="relative grid h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 inline-block h-2 w-2 rounded-full bg-brand-500" />
          </button>
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
