import { PageHeader } from '../../components/Primitives'
import { TrendingUp, Calendar } from 'lucide-react'

const BARS = [22, 28, 34, 30, 40, 48, 36, 52, 60, 55, 68, 72]

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Trends, comparisons, and forecasts across your business."
        actions={
          <>
            <button className="pill"><Calendar className="h-3.5 w-3.5" /> Last 30 days</button>
            <button className="pill-active">Compare</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">Revenue trend</div>
              <div className="text-xs text-ink-500">Monthly · USD</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-pill bg-brand-100 px-2 py-0.5 text-xs font-semibold text-ink-900">
              <TrendingUp className="h-3 w-3" /> +18.2%
            </span>
          </div>
          <div className="mt-6 flex h-52 items-end gap-2">
            {BARS.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-brand-400/80" style={{ height: `${h * 2}px` }} />
                <div className="text-[10px] text-ink-400">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold text-ink-900">Top categories</div>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Mains', pct: 48 },
              { name: 'Drinks', pct: 24 },
              { name: 'Combos', pct: 18 },
              { name: 'Desserts', pct: 10 },
            ].map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink-700">{c.name}</span>
                  <span className="text-ink-500">{c.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full bg-brand-500" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
