import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ShoppingBag,
  Wallet,
  ArrowUpRight,
  MonitorPlay,
  Plus,
  Filter,
  Download,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/Primitives'
import { NavIcon } from '../../components/NavIcon'
import { NAV_LINKS, getBusiness } from '../../store'

const KPIS = [
  { k: 'Today’s sales', v: '$4,820.50', d: '+12.4%', up: true, icon: ShoppingBag },
  { k: 'Transactions', v: '184', d: '+5.1%', up: true, icon: TrendingUp },
  { k: 'Active members', v: '1,238', d: '+42', up: true, icon: Users },
  { k: 'Avg. order', v: '$26.20', d: '-1.8%', up: false, icon: Wallet },
]

const RECENT = [
  { id: '#EZ-1042', who: 'Walk-in', amt: 12.5, method: 'Cash', time: '2m ago' },
  { id: '#EZ-1041', who: 'Sara K. (Gold)', amt: 84.0, method: 'NFC Card', time: '8m ago' },
  { id: '#EZ-1040', who: 'Walk-in', amt: 6.75, method: 'Card', time: '14m ago' },
  { id: '#EZ-1039', who: 'Adil R. (Silver)', amt: 22.0, method: 'NFC Card', time: '22m ago' },
  { id: '#EZ-1038', who: 'Walk-in', amt: 38.4, method: 'Cash', time: '34m ago' },
]

const SPARK = [12, 18, 14, 22, 30, 26, 34, 28, 40, 46, 42, 52]

export default function DashboardPage() {
  const business = getBusiness()
  return (
    <div>
      <PageHeader
        title={`Good afternoon, ${business?.name ?? 'there'}`}
        subtitle="Here’s a quick look at how your business is doing today."
        actions={
          <>
            <button className="btn-secondary"><Filter className="h-4 w-4" /> Today</button>
            <button className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
            <Link to="/app/pos" className="btn-primary"><MonitorPlay className="h-4 w-4" /> Open POS</Link>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => {
          const I = k.icon
          return (
            <div key={k.k} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-ink-900">
                  <I className="h-5 w-5" />
                </div>
                <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
                  k.up ? 'bg-brand-100 text-ink-900' : 'bg-red-50 text-red-700'
                }`}>
                  {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {k.d}
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-ink-900">{k.v}</div>
              <div className="text-sm text-ink-500">{k.k}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sales chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">Sales this week</div>
              <div className="text-xs text-ink-500">Hourly breakdown · USD</div>
            </div>
            <div className="hidden gap-1 sm:flex">
              {['7D', '30D', '90D'].map((t, i) => (
                <button key={t} className={i === 0 ? 'pill-active' : 'pill'}>{t}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex h-44 items-end gap-2">
            {SPARK.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-brand-400/80"
                  style={{ height: `${h * 2.4}px` }}
                />
                <div className="text-[10px] text-ink-400">{`${8 + i}h`}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink-900">Quick actions</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {NAV_LINKS.filter((l) => !['/app/dashboard', '/app/reports', '/app/analytics'].includes(l.to)).slice(0, 6).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex flex-col items-start gap-1 rounded-xl border border-ink-100 bg-white p-3 hover:border-brand-300 hover:bg-brand-50"
              >
                <NavIcon name={l.icon} className="h-5 w-5 text-ink-700 group-hover:text-ink-900" />
                <div className="text-sm font-semibold text-ink-900">{l.label}</div>
              </Link>
            ))}
          </div>
          <Link to="/app/pos" className="btn-primary mt-4 w-full">
            <MonitorPlay className="h-4 w-4" /> Start a new sale
          </Link>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card mt-6 p-0">
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <div>
            <div className="text-sm font-semibold text-ink-900">Recent transactions</div>
            <div className="text-xs text-ink-500">Latest activity across all terminals</div>
          </div>
          <Link to="/app/transactions" className="text-sm font-semibold text-ink-700 hover:text-ink-900">
            View all <ArrowUpRight className="inline h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {RECENT.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-semibold text-ink-900">{r.id}</td>
                  <td className="px-5 py-3 text-ink-700">{r.who}</td>
                  <td className="px-5 py-3">
                    <span className={`pill ${r.method === 'NFC Card' ? 'border-brand-200 bg-brand-50 text-ink-900' : ''}`}>
                      {r.method === 'NFC Card' && <CreditCard className="h-3 w-3" />}
                      {r.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-ink-900">${r.amt.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-ink-500">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
