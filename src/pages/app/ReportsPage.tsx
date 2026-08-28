import { PageHeader, EmptyState } from '../../components/Primitives'
import { FileText, Plus } from 'lucide-react'

const REPORTS = [
  { name: 'Daily sales', desc: 'End-of-day summary with tax breakdown.', tag: 'Daily' },
  { name: 'Inventory snapshot', desc: 'Current stock levels and reorder alerts.', tag: 'Inventory' },
  { name: 'Member activity', desc: 'Top-ups, purchases, and tier movement.', tag: 'Members' },
  { name: 'Staff performance', desc: 'Sales by cashier, terminal, and shift.', tag: 'Staff' },
  { name: 'Tax filing', desc: 'Pre-formatted totals for the current period.', tag: 'Finance' },
  { name: 'Refunds & voids', desc: 'All adjustments with reason codes.', tag: 'Finance' },
]

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Pre-built reports to run your business."
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New report</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.name} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-ink-900">
                <FileText className="h-5 w-5" />
              </div>
              <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{r.tag}</span>
            </div>
            <div className="mt-3 text-sm font-semibold text-ink-900">{r.name}</div>
            <div className="mt-1 text-xs text-ink-500">{r.desc}</div>
            <button className="btn-secondary mt-4 w-full">Run report</button>
          </div>
        ))}
      </div>
    </div>
  )
}
