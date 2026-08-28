import { PageHeader } from '../../components/Primitives'
import { Plus, Search, ShieldCheck, UserCog } from 'lucide-react'

const USERS = [
  { name: 'Jane Cooper', role: 'Owner', email: 'jane@ezsale.app', active: true, last: '2m ago' },
  { name: 'Adil Raza', role: 'Manager', email: 'adil@ezsale.app', active: true, last: '1h ago' },
  { name: 'Sara Khan', role: 'Cashier', email: 'sara@ezsale.app', active: true, last: '3h ago' },
  { name: 'Mark Lee', role: 'Cashier', email: 'mark@ezsale.app', active: false, last: 'Yesterday' },
]

const ROLE_STYLE: Record<string, string> = {
  Owner: 'bg-ink-900 text-white',
  Manager: 'bg-brand-100 text-ink-900',
  Cashier: 'bg-ink-100 text-ink-700',
}

export default function UsersPage() {
  return (
    <div>
      <PageHeader
        title="Users & roles"
        subtitle="Manage staff access, roles, and permissions."
        actions={
          <>
            <button className="btn-secondary"><UserCog className="h-4 w-4" /> Roles</button>
            <button className="btn-secondary"><Search className="h-4 w-4" /> Search</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> Invite user</button>
          </>
        }
      />

      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Last active</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {USERS.map((u) => (
                <tr key={u.email} className="hover:bg-ink-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">
                        {u.name.split(' ').map((p) => p[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-ink-900">{u.name}</div>
                        <div className="text-xs text-ink-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${ROLE_STYLE[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-ink-900' : 'text-ink-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-brand-500' : 'bg-ink-300'}`} />
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-ink-500">{u.last}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Edit">
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
