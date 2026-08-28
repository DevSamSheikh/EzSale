import { PageHeader } from '../../components/Primitives'
import { ArrowDownToLine, Filter } from 'lucide-react'

const DEPOSITS = [
  { who: 'Sara Khan', card: '**** 4421', amount: 50.0, when: 'Today, 9:12' },
  { who: 'Adil Raza', card: '**** 9012', amount: 25.0, when: 'Today, 11:30' },
  { who: 'Hassan Tariq', card: '**** 7733', amount: 100.0, when: 'Yesterday' },
  { who: 'Mehak Ali', card: '**** 2244', amount: 15.0, when: '2 days ago' },
]

export default function DepositsPage() {
  return (
    <div>
      <PageHeader
        title="Deposits"
        subtitle="Top-ups and reloads from member cards."
        actions={
          <>
            <button className="btn-secondary"><Filter className="h-4 w-4" /> This month</button>
            <button className="btn-primary"><ArrowDownToLine className="h-4 w-4" /> Record deposit</button>
          </>
        }
      />

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Card</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {DEPOSITS.map((d, i) => (
                <tr key={i} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-semibold text-ink-900">{d.who}</td>
                  <td className="px-5 py-3 text-ink-700">{d.card}</td>
                  <td className="px-5 py-3 text-right font-semibold text-ink-900">+${d.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-ink-500">{d.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
