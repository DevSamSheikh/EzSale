import { useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileSidebar } from './Sidebar'
import { Topbar, MobileBottomNav } from './Topbar'

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const isPos = location.pathname.startsWith('/app/pos')

  if (isPos) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl">{children}</div>
}
