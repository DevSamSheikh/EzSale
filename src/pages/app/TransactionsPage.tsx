import { PageHeader } from '../../components/Primitives'
import { Download, Filter, ArrowLeftRight } from 'lucide-react'

const TX = [
  { id: 'TX-9821', type: 'Sale', method: 'Card', amount: 12.5, status: 'Settled', when: '2m ago' },
  { id: 'TX-9820', type: 'Sale', method: 'NFC Card', amount: 84.0, status: 'Settled', when: '8m ago' },
  { id: 'TX-9819', type: 'Refund', method: 'Card', amount: -22.0, status: 'Settled', when: '22m ago' },
  { id: 'TX-9818', type: 'Deposit', method: 'NFC Card', amount: 50.0, status: 'Settled', when: '1h ago' },
  { id: 'TX-9817', type: 'Sale', method: 'Cash', amount: 38.4, status: 'Pending', when: '34m ago' },
]

const STATUS_STYLES: Record<string, string> = {
  Settled: 'bg-brand-100 text-ink-900',
  Pending: 'bg-amber-50 text-amber-700',
  Failed: 'bg-red-50 text-red-700',
}

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Every payment, refund, and top-up in one place."
        actions={
          <>
            <button className="btn-secondary"><Filter className="h-4 w-4" /> Filter</button>
            <button className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
            <button className="btn-primary"><ArrowLeftRight className="h-4 w-4" /> Reconcile</button>
          </>
        }
      />

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {TX.map((t) => (
                <tr key={t.id} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-semibold text-ink-900">{t.id}</td>
                  <td className="px-5 py-3 text-ink-700">{t.type}</td>
                  <td className="px-5 py-3 text-ink-700">{t.method}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-ink-900'}`}>
                    {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-ink-500">{t.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
