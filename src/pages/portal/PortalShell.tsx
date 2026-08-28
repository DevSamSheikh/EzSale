import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Nfc } from 'lucide-react'
import { getBusiness } from '../../store'

interface PortalShellProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  backTo?: string
  backLabel?: string
}

export function PortalShell({
  children,
  title,
  showBack = false,
  backTo = '/u/identify',
  backLabel = 'Switch account',
}: PortalShellProps) {
  const navigate = useNavigate()
  const business = getBusiness()
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50 via-white to-ink-50 text-ink-800 antialiased">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          {showBack ? (
            <button
              onClick={() => navigate(backTo)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/u/identify"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
              aria-label="Home"
            >
              <Nfc className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink-900">
              {title ?? business?.name ?? 'Member portal'}
            </div>
            {title && (
              <div className="truncate text-[10px] uppercase tracking-wider text-ink-500">
                {business?.name ?? 'EzSale'}
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Customer portal
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 sm:px-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-6 text-center text-[11px] text-ink-400">
        Powered by EzSale · Customer experience
      </footer>
    </div>
  )
}
