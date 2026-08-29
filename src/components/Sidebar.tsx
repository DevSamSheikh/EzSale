import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, HelpCircle, X } from 'lucide-react'
import { Logo } from './Primitives'
import { NavIcon } from './NavIcon'
import { NAV_LINKS, memberTermPlural } from '../store'

const SIDEBAR_FULL = 'w-64'
const SIDEBAR_COLLAPSED = 'w-[68px]'

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const term = memberTermPlural()
  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL
  return (
    <aside
      className={`hidden h-full shrink-0 flex-col border-r border-ink-100 bg-white transition-[width] duration-200 lg:flex ${w}`}
    >
      <div
        className={`flex h-16 items-center border-b border-ink-100 ${
          collapsed ? 'justify-center px-2' : 'gap-2 px-4'
        }`}
      >
        {collapsed ? (
          <Logo size={32} showName={false} />
        ) : (
          <>
            <Logo />
            {onToggleCollapsed && (
              <button
                onClick={onToggleCollapsed}
                className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-ink-900"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      <nav
        className={`flex-1 space-y-1 overflow-y-auto py-2 ${
          collapsed ? 'px-2' : 'px-3'
        }`}
      >
        {NAV_LINKS.filter((l) => l.to !== '/app/pos').map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            title={collapsed ? (l.to === '/app/users' ? term : l.label) : undefined}
            className={({ isActive }) =>
              collapsed
                ? `${isActive ? 'nav-item-active' : 'nav-item'} !justify-center !px-0`
                : isActive
                ? 'nav-item-active'
                : 'nav-item'
            }
          >
            <NavIcon name={l.icon} />
            {!collapsed && <span>{l.to === '/app/users' ? term : l.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div
        className={`mt-2 ${
          collapsed ? 'flex justify-center px-2 pb-3' : 'm-3 p-3'
        }`}
      >
        {collapsed ? null : (
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-600">
            <div className="flex items-center gap-1.5 font-semibold text-ink-900">
              <HelpCircle className="h-3.5 w-3.5" /> Need help?
            </div>
            <p className="mt-1 leading-relaxed">
              Browse the setup guide or contact our 24/7 support team.
            </p>
          </div>
        )}
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
  const term = memberTermPlural()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-pop">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
            aria-label="Close menu"
          >
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
                <span>{l.to === '/app/users' ? term : l.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

// Re-export constants so AppShell can use them if needed.
export { SIDEBAR_FULL, SIDEBAR_COLLAPSED }
