import { Plus, Search, Package } from 'lucide-react'
import { PageHeader, EmptyState } from '../../components/Primitives'

const FILTERS = ['All', 'Active', 'Low stock', 'Drafts']
const SAMPLE = [
  { name: 'Margherita Pizza', sku: 'PIZ-001', stock: 42, price: 12.5, cat: 'Mains' },
  { name: 'Cheeseburger', sku: 'BUR-014', stock: 3, price: 9.0, cat: 'Mains' },
  { name: 'Iced Latte', sku: 'DRK-002', stock: 120, price: 4.5, cat: 'Drinks' },
  { name: 'Family Combo', sku: 'CMB-007', stock: 16, price: 28.0, cat: 'Combos' },
]

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalog, prices, and stock levels."
        actions={
          <>
            <button className="btn-secondary"><Search className="h-4 w-4" /> Search</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> Add product</button>
          </>
        }
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f, i) => (
            <button key={f} className={i === 0 ? 'pill-active' : 'pill'}>{f}</button>
          ))}
          <input placeholder="Filter by name or SKU…" className="input ml-auto max-w-xs" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SAMPLE.map((p) => (
            <div key={p.sku} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <div className="grid aspect-[4/3] place-items-center bg-ink-50 text-ink-300">
                <Package className="h-12 w-12" strokeWidth={1.4} />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{p.name}</div>
                    <div className="text-xs text-ink-500">{p.sku} · {p.cat}</div>
                  </div>
                  <div className="text-sm font-bold text-ink-900">${p.price.toFixed(2)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={`rounded-pill px-2 py-0.5 font-semibold ${
                    p.stock < 10 ? 'bg-red-50 text-red-700' : 'bg-ink-100 text-ink-700'
                  }`}>
                    {p.stock} in stock
                  </span>
                  <button className="font-semibold text-ink-700 hover:text-ink-900">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
