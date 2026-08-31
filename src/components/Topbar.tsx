import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  LogOut,
  Menu,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings as Cog,
  User,
} from 'lucide-react'
import { Logo } from './Primitives'
import { NavIcon } from './NavIcon'
import { GlobalSearchMenu } from './GlobalSearchMenu'
import { TopbarNotifications } from './NotificationDropdown'
import { ContextSwitcher } from './ContextSwitcher'
import { getAuth, clearAuth, NAV_LINKS } from '../store'
import { getCurrentOperator, getRoles } from '../operators-store'

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
  const auth = getAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const userRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
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

  const currentName = 'Bistro Aurora' // legacy — see ContextSwitcher for the live context

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

      {/* Mega context switcher (Business + Location + User role) */}
      <ContextSwitcher />

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
        {/* Notifications */}
        <TopbarNotifications
          open={notifOpen}
          onOpenChange={setNotifOpen}
          onOpenAll={() => navigate('/app/notifications')}
        />

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
            <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {getCurrentOperator()?.name ?? auth?.email?.split('@')[0] ?? 'demo'}
              </div>
              <div className="px-2 pb-1 text-[10px] text-ink-500">
                {getRoles().find((r) => r.id === getCurrentOperator()?.roleId)?.name ?? 'Operator'}
              </div>
              <div className="my-1 border-t border-ink-100" />
              <Link
                to="/app/pos"
                onClick={() => setUserOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-50"
              >
                <MonitorPlay className="h-4 w-4 text-brand-600" /> Open POS
              </Link>
              <Link
                to="/app/staff"
                onClick={() => setUserOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-ink-50"
              >
                <User className="h-4 w-4 text-ink-500" /> My profile
              </Link>
              <Link
                to="/app/settings"
                onClick={() => setUserOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-ink-50"
              >
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
