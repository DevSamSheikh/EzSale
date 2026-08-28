import { PageHeader } from '../../components/Primitives'
import { Plus, Filter, Download } from 'lucide-react'

const ORDERS = [
  { id: '#EZ-1042', items: 3, total: 12.5, method: 'Cash', status: 'Completed', when: '2m ago' },
  { id: '#EZ-1041', items: 7, total: 84.0, method: 'NFC Card', status: 'Completed', when: '8m ago' },
  { id: '#EZ-1040', items: 2, total: 6.75, method: 'Card', status: 'Completed', when: '14m ago' },
  { id: '#EZ-1039', items: 4, total: 22.0, method: 'NFC Card', status: 'Refunded', when: '22m ago' },
  { id: '#EZ-1038', items: 5, total: 38.4, method: 'Cash', status: 'Completed', when: '34m ago' },
  { id: '#EZ-1037', items: 1, total: 5.0, method: 'Card', status: 'Pending', when: '52m ago' },
]

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-brand-100 text-ink-900',
  Refunded: 'bg-red-50 text-red-700',
  Pending: 'bg-amber-50 text-amber-700',
}

export default function OrdersPage() {
  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="All sales across terminals and channels."
        actions={
          <>
            <button className="btn-secondary"><Filter className="h-4 w-4" /> Filter</button>
            <button className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> New order</button>
          </>
        }
      />

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Items</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ORDERS.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-semibold text-ink-900">{o.id}</td>
                  <td className="px-5 py-3 text-ink-700">{o.items}</td>
                  <td className="px-5 py-3 text-ink-700">{o.method}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-ink-900">${o.total.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-ink-500">{o.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
