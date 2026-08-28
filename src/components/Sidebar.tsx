import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Logo } from './Primitives'
import { NavIcon } from './NavIcon'
import { NAV_LINKS } from '../store'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_LINKS.filter((l) => l.to !== '/app/pos').map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
          >
            <NavIcon name={l.icon} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-600">
        <div className="font-semibold text-ink-900">Need help?</div>
        <p className="mt-1 leading-relaxed">Browse the setup guide or contact our 24/7 support team.</p>
      </div>
    </aside>
  )
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const location = useLocation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-pop">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-2">
          {NAV_LINKS.filter((l) => l.to !== '/app/pos').map((l) => {
            const active = location.pathname.startsWith(l.to)
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={onClose}
                className={active ? 'nav-item-active' : 'nav-item'}
              >
                <NavIcon name={l.icon} />
                <span>{l.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
