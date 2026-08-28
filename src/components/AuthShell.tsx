import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Primitives'

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Form */}
        <div className="flex flex-col p-6 sm:p-10">
          <div className="mb-10">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="my-auto w-full max-w-sm justify-self-center">
            <div className="mx-auto w-full max-w-sm">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
              <div className="mt-8">{children}</div>
            </div>
          </div>
          <p className="mt-10 text-xs text-ink-400">© {new Date().getFullYear()} EzSale Inc.</p>
        </div>

        {/* Visual panel */}
        <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-900" />
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-400" />
              POS & NFC Membership
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight">
                Run sales, manage members, and accept NFC cards — all in one place.
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/70">
                Designed for restaurants, schools, malls, gaming zones, and retail shops.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { k: 'Active terminals', v: '12,400+' },
                  { k: 'Transactions / day', v: '180K' },
                  { k: 'Uptime', v: '99.98%' },
                  { k: 'Countries', v: '24' },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-2xl font-bold text-white">{s.v}</div>
                    <div className="text-xs text-white/60">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
