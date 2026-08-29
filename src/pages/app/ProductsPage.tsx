import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Grid3x3,
  ImageIcon,
  List,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { PageHeader, StatCard } from '../../components/Primitives'
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  duplicateProduct,
  getCategories,
  getProducts,
  type ProductDiscount,
  type ProductStatus,
  type ProductVariant,
  setProductStatus,
  updateProduct,
  type POSProduct,
  type ProductBadge,
} from '../../pos-store'
import { getBusiness } from '../../store'
import { playCue } from '../../audio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockFilter = 'all' | 'in_stock' | 'low' | 'out' | 'untracked'
type StatusFilter = 'all' | ProductStatus
type AvailabilityFilter = 'all' | 'available' | 'hidden'
type SortKey = 'name' | 'price' | 'stock' | 'updated' | 'category'
type SortDir = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'
type PageSize = 10 | 20 | 50

type EditorMode = 'create' | 'edit'

interface EditorState {
  open: boolean
  mode: EditorMode
  /** id of the product being edited (undefined when creating) */
  id?: string
}

interface FormState {
  name: string
  description: string
  image: string
  sku: string
  category: string
  price: string
  cost: string
  taxRate: string
  discountEnabled: boolean
  discountKind: 'percent' | 'amount'
  discountValue: string
  discountLabel: string
  variants: ProductVariant[]
  available: boolean
  status: ProductStatus
  featured: boolean
  badge: ProductBadge | ''
  badgeLabel: string
  stock: string
  lowStockAt: string
  trackStock: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  image: '',
  sku: '',
  category: '',
  price: '',
  cost: '',
  taxRate: '',
  discountEnabled: false,
  discountKind: 'percent',
  discountValue: '',
  discountLabel: '',
  variants: [],
  available: true,
  status: 'active',
  featured: false,
  badge: '',
  badgeLabel: '',
  stock: '',
  lowStockAt: '5',
  trackStock: true,
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
]

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'updated', label: 'Last updated' },
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'stock', label: 'Stock' },
  { id: 'category', label: 'Category' },
]

const BADGE_OPTIONS: { id: ProductBadge; label: string; defaultLabel: string; tone: string }[] = [
  { id: 'best', label: 'Best seller', defaultLabel: 'BEST SALE', tone: 'bg-blue-500' },
  { id: 'top', label: 'Top sale', defaultLabel: 'TOP SALE', tone: 'bg-emerald-500' },
  { id: 'new', label: 'New item', defaultLabel: 'NEW', tone: 'bg-pink-500' },
  { id: 'offer', label: 'On offer', defaultLabel: 'OFFER', tone: 'bg-rose-500' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currency(n: number) {
  return `$${n.toFixed(2)}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function formatRelative(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(iso)
}

function stockState(p: POSProduct): { tone: string; label: string } {
  if (p.stock === undefined) {
    return { tone: 'bg-ink-100 text-ink-600', label: 'Not tracked' }
  }
  if (p.stock <= 0) {
    return { tone: 'bg-rose-50 text-rose-700', label: 'Out of stock' }
  }
  const threshold = p.lowStockAt ?? 5
  if (p.stock <= threshold) {
    return { tone: 'bg-amber-50 text-amber-700', label: `${p.stock} low` }
  }
  return { tone: 'bg-emerald-50 text-emerald-700', label: `${p.stock} in stock` }
}

function statusPillClass(s: ProductStatus) {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive':
      return 'bg-ink-100 text-ink-700 border-ink-200'
    case 'draft':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'archived':
      return 'bg-rose-50 text-rose-700 border-rose-200'
  }
}

function productToForm(p: POSProduct): FormState {
  return {
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    category: p.category,
    price: String(p.price ?? ''),
    cost: p.cost !== undefined ? String(p.cost) : '',
    taxRate: p.taxRate !== undefined ? String(p.taxRate) : '',
    discountEnabled: !!p.discount,
    discountKind: p.discount?.kind ?? 'percent',
    discountValue: p.discount ? String(p.discount.value) : '',
    discountLabel: p.discount?.label ?? '',
    variants: p.variants.map((v) => ({ ...v })),
    available: p.available,
    status: p.status,
    featured: p.featured,
    badge: p.badge ?? '',
    badgeLabel: p.badgeLabel ?? '',
    stock: p.stock !== undefined ? String(p.stock) : '',
    lowStockAt: p.lowStockAt !== undefined ? String(p.lowStockAt) : '5',
    trackStock: p.stock !== undefined,
  }
}

function formToPayload(f: FormState) {
  const price = Number(f.price) || 0
  const cost = f.cost.trim() === '' ? undefined : Number(f.cost) || 0
  const taxRate = f.taxRate.trim() === '' ? undefined : Number(f.taxRate) || 0
  const stock = f.trackStock ? (f.stock.trim() === '' ? 0 : Number(f.stock) || 0) : undefined
  const lowStockAt = f.trackStock ? (f.lowStockAt.trim() === '' ? 5 : Number(f.lowStockAt) || 5) : undefined
  const discount: ProductDiscount | undefined = f.discountEnabled
    ? {
        kind: f.discountKind,
        value: Number(f.discountValue) || 0,
        label: f.discountLabel.trim() || undefined,
      }
    : undefined
  return {
    name: f.name.trim() || 'New product',
    description: f.description.trim(),
    image: f.image.trim(),
    price,
    cost,
    taxRate,
    stock,
    lowStockAt,
    discount,
    variants: f.variants.filter((v) => v.name.trim()),
    available: f.available,
    status: f.status,
    featured: f.featured,
    badge: (f.badge || undefined) as ProductBadge | undefined,
    badgeLabel: f.badge ? f.badgeLabel.trim() || undefined : undefined,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const business = getBusiness()
  const [products, setProducts] = useState<POSProduct[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [view, setView] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'create' })
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<POSProduct | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function refresh() {
    setProducts(getProducts())
  }

  useEffect(() => {
    refresh()
    function onUpdate() {
      refresh()
    }
    window.addEventListener('storage', onUpdate)
    return () => window.removeEventListener('storage', onUpdate)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const categories = useMemo(() => {
    const fromProducts = getCategories(products)
    const fromBusiness = business?.categories ?? []
    return Array.from(new Set([...fromBusiness, ...fromProducts])).sort()
  }, [products, business])

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.status === 'active').length
    const drafts = products.filter((p) => p.status === 'draft').length
    const lowStock = products.filter((p) => {
      if (p.stock === undefined) return false
      const t = p.lowStockAt ?? 5
      return p.stock > 0 && p.stock <= t
    }).length
    const outOfStock = products.filter((p) => p.stock !== undefined && p.stock <= 0).length
    return { total, active, drafts, lowStock, outOfStock }
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (availabilityFilter === 'available' && !p.available) return false
      if (availabilityFilter === 'hidden' && p.available) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (stockFilter !== 'all') {
        if (stockFilter === 'untracked' && p.stock !== undefined) return false
        if (stockFilter === 'in_stock' && (p.stock === undefined || p.stock <= 0)) return false
        if (stockFilter === 'out' && (p.stock === undefined || p.stock > 0)) return false
        if (stockFilter === 'low') {
          if (p.stock === undefined) return false
          const t = p.lowStockAt ?? 5
          if (p.stock <= 0 || p.stock > t) return false
        }
      }
      return true
    })
  }, [products, statusFilter, availabilityFilter, stockFilter, categoryFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      if (sortKey === 'name') {
        av = a.name.toLowerCase()
        bv = b.name.toLowerCase()
      } else if (sortKey === 'price') {
        av = a.price
        bv = b.price
      } else if (sortKey === 'stock') {
        av = a.stock ?? -1
        bv = b.stock ?? -1
      } else if (sortKey === 'category') {
        av = a.category.toLowerCase()
        bv = b.category.toLowerCase()
      } else {
        av = new Date(a.updatedAt).getTime()
        bv = new Date(b.updatedAt).getTime()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, availabilityFilter, stockFilter, categoryFilter, pageSize])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'price' || key === 'stock' || key === 'updated' ? 'desc' : 'asc')
    }
    playCue('tap')
  }

  function openCreate() {
    setEditor({ open: true, mode: 'create' })
    playCue('tap')
  }

  function openEdit(p: POSProduct) {
    setEditor({ open: true, mode: 'edit', id: p.id })
    setOpenMenu(null)
    playCue('tap')
  }

  function closeEditor() {
    setEditor({ open: false, mode: 'create' })
  }

  function handleSave(form: FormState) {
    const payload = formToPayload(form)
    if (editor.mode === 'create') {
      const created = createProduct({
        ...payload,
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || 'Uncategorized',
      })
      setToast(`Created "${created.name}"`)
      playCue('success')
    } else if (editor.id) {
      const updated = updateProduct(editor.id, {
        ...payload,
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || 'Uncategorized',
      })
      setToast(`Saved "${updated?.name ?? 'product'}"`)
      playCue('success')
    }
    refresh()
    closeEditor()
  }

  function handleDuplicate(p: POSProduct) {
    const copy = duplicateProduct(p.id)
    setOpenMenu(null)
    if (copy) {
      setToast(`Duplicated as "${copy.name}"`)
      playCue('tap')
    }
    refresh()
  }

  function handleToggleActive(p: POSProduct) {
    const next: ProductStatus = p.status === 'active' ? 'inactive' : 'active'
    setProductStatus(p.id, next)
    setOpenMenu(null)
    setToast(next === 'active' ? `Activated "${p.name}"` : `Deactivated "${p.name}"`)
    playCue('tap')
    refresh()
  }

  function handleArchive(p: POSProduct) {
    archiveProduct(p.id)
    setOpenMenu(null)
    setToast(`Archived "${p.name}"`)
    playCue('tap')
    refresh()
  }

  function handleDelete(p: POSProduct) {
    setConfirmDelete(p)
    setOpenMenu(null)
  }

  function confirmDeleteNow() {
    if (!confirmDelete) return
    deleteProduct(confirmDelete.id)
    setToast(`Deleted "${confirmDelete.name}"`)
    playCue('warning')
    setConfirmDelete(null)
    refresh()
  }

  const hasFilters =
    statusFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    stockFilter !== 'all' ||
    categoryFilter !== 'all'

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalog, variants, prices, and stock levels."
        actions={
          <>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Create product
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          variant="top"
          label="Total products"
          value={String(stats.total)}
          icon={Package}
          tone="brand"
        />
        <StatCard
          variant="top"
          label="Active"
          value={String(stats.active)}
          icon={Check}
          tone="emerald"
        />
        <StatCard
          variant="top"
          label="Drafts"
          value={String(stats.drafts)}
          icon={Pencil}
          tone="amber"
        />
        <StatCard
          variant="top"
          label="Low stock"
          value={String(stats.lowStock)}
          icon={TrendingUp}
          tone={stats.lowStock > 0 ? 'amber' : 'neutral'}
        />
        <StatCard
          variant="top"
          label="Out of stock"
          value={String(stats.outOfStock)}
          icon={Archive}
          tone={stats.outOfStock > 0 ? 'rose' : 'neutral'}
        />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-pill border border-ink-200 bg-white p-1">
              <Filter className="ml-2 h-3.5 w-3.5 text-ink-400" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={
                    statusFilter === f.id
                      ? 'rounded-pill bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-white'
                      : 'rounded-pill px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50'
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              className="h-10 !w-40 shrink-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-10 !w-36 shrink-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="all">All stock</option>
              <option value="in_stock">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="untracked">Not tracked</option>
            </select>
            <select
              className="h-10 !w-40 shrink-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
            >
              <option value="all">All availability</option>
              <option value="available">Available in POS</option>
              <option value="hidden">Hidden in POS</option>
            </select>
            <div
              role="tablist"
              aria-label="View mode"
              className="inline-flex items-center rounded-pill border border-ink-200 bg-white p-0.5"
            >
              <button
                role="tab"
                aria-selected={view === 'list'}
                onClick={() => setView('list')}
                className={
                  view === 'list'
                    ? 'inline-flex h-7 w-8 items-center justify-center rounded-pill bg-ink-900 text-white'
                    : 'inline-flex h-7 w-8 items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50'
                }
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                role="tab"
                aria-selected={view === 'grid'}
                onClick={() => setView('grid')}
                className={
                  view === 'grid'
                    ? 'inline-flex h-7 w-8 items-center justify-center rounded-pill bg-ink-900 text-white'
                    : 'inline-flex h-7 w-8 items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50'
                }
                title="Grid view"
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-ink-700">{sorted.length}</span> of{' '}
            <span className="font-semibold text-ink-700">{products.length}</span> products
            {hasFilters ? ' · filtered' : ''}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setAvailabilityFilter('all')
                  setStockFilter('all')
                  setCategoryFilter('all')
                  playCue('tap')
                }}
                className="text-xs font-semibold text-ink-700 hover:underline"
              >
                Reset filters
              </button>
            )}
            <div className="flex items-center gap-1.5 text-ink-600">
              <ArrowDownUp className="h-3.5 w-3.5" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-pill border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="rounded-pill border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                title={`Sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            onCreate={openCreate}
            hasFilters={hasFilters}
            onReset={() => {
              setStatusFilter('all')
              setAvailabilityFilter('all')
              setStockFilter('all')
              setCategoryFilter('all')
            }}
          />
        ) : view === 'list' ? (
          <ProductsTable
            products={paged}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onEdit={openEdit}
            onDuplicate={handleDuplicate}
            onToggleActive={handleToggleActive}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        ) : (
          <ProductsGrid
            products={paged}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onEdit={openEdit}
            onDuplicate={handleDuplicate}
            onToggleActive={handleToggleActive}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        )}

        {sorted.length > 0 && (
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => setPageSize(s)}
            totalItems={sorted.length}
            startIndex={(safePage - 1) * pageSize}
            endIndex={Math.min(safePage * pageSize, sorted.length)}
          />
        )}
      </div>

      {editor.open && (
        <ProductEditorModal
          mode={editor.mode}
          initialForm={
            editor.id
              ? productToForm(products.find((p) => p.id === editor.id) ?? products[0])
              : DEFAULT_FORM
          }
          onClose={closeEditor}
          onSave={handleSave}
          categories={categories}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          description="This removes the product from your catalog. Past transactions will still reference the product name."
          confirmLabel="Delete product"
          onConfirm={confirmDeleteNow}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-pop">
          {toast}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function ProductsTable({
  products,
  sortKey,
  sortDir,
  onSort,
  openMenu,
  setOpenMenu,
  onEdit,
  onDuplicate,
  onToggleActive,
  onArchive,
  onDelete,
}: {
  products: POSProduct[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onEdit: (p: POSProduct) => void
  onDuplicate: (p: POSProduct) => void
  onToggleActive: (p: POSProduct) => void
  onArchive: (p: POSProduct) => void
  onDelete: (p: POSProduct) => void
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-100">
      <table className="w-full text-sm">
        <thead className="bg-ink-50/50 text-left text-[11px] uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Product</th>
            <SortableTh label="SKU" id="name" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableTh label="Category" id="category" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableTh label="Price" id="price" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
            <th className="px-3 py-2.5 text-right font-semibold">Cost</th>
            <SortableTh label="Stock" id="stock" current={sortKey} dir={sortDir} onSort={onSort} />
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Discount</th>
            <SortableTh label="Updated" id="updated" current={sortKey} dir={sortDir} onSort={onSort} />
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {products.map((p) => {
            const stock = stockState(p)
            const finalPrice = p.discount
              ? p.discount.kind === 'percent'
                ? p.price * (1 - p.discount.value / 100)
                : Math.max(0, p.price - p.discount.value)
              : p.price
            return (
              <tr key={p.id} className="hover:bg-ink-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-50 text-ink-300">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-ink-900">{p.name}</span>
                        {p.featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
                      </div>
                      <div className="truncate text-[11px] text-ink-500">
                        {p.description || 'No description'}
                        {p.variants.length > 0 && (
                          <span className="ml-1 text-ink-400">
                            · {p.variants.length} variant{p.variants.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-ink-700">{p.sku}</td>
                <td className="px-3 py-2.5 text-ink-700">
                  <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                    {p.category}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-ink-900">
                  {p.discount ? (
                    <div className="flex flex-col items-end">
                      <span>{currency(finalPrice)}</span>
                      <span className="text-[10px] font-medium text-ink-400 line-through">
                        {currency(p.price)}
                      </span>
                    </div>
                  ) : (
                    currency(p.price)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-ink-600">
                  {p.cost !== undefined ? currency(p.cost) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${stock.tone}`}
                  >
                    {stock.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
                        p.status,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {p.status[0].toUpperCase() + p.status.slice(1)}
                    </span>
                    {p.available ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-ink-500">
                        <Eye className="h-3 w-3" /> In POS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-ink-400">
                        <EyeOff className="h-3 w-3" /> Hidden
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-ink-700">
                  {p.discount ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      <TrendingUp className="h-3 w-3" />
                      {p.discount.kind === 'percent' ? `${p.discount.value}%` : currency(p.discount.value)}
                      {p.discount.label ? ` · ${p.discount.label}` : ''}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-ink-500">{formatRelative(p.updatedAt)}</td>
                <td className="px-3 py-2.5">
                  <RowMenu
                    product={p}
                    open={openMenu === p.id}
                    setOpen={(o) => setOpenMenu(o ? p.id : null)}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onToggleActive={onToggleActive}
                    onArchive={onArchive}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SortableTh({
  label,
  id,
  current,
  dir,
  onSort,
  align,
}: {
  label: string
  id: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'right'
}) {
  const active = current === id
  return (
    <th
      className={`${align === 'right' ? 'text-right' : ''} px-3 py-2.5 font-semibold`}
    >
      <button
        onClick={() => onSort(id)}
        className={`inline-flex items-center gap-1 ${
          active ? 'text-ink-900' : 'text-ink-500'
        } hover:text-ink-900`}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  )
}

// ---------------------------------------------------------------------------
// Grid view
// ---------------------------------------------------------------------------

function ProductsGrid({
  products,
  openMenu,
  setOpenMenu,
  onEdit,
  onDuplicate,
  onToggleActive,
  onArchive,
  onDelete,
}: {
  products: POSProduct[]
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onEdit: (p: POSProduct) => void
  onDuplicate: (p: POSProduct) => void
  onToggleActive: (p: POSProduct) => void
  onArchive: (p: POSProduct) => void
  onDelete: (p: POSProduct) => void
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => {
        const stock = stockState(p)
        return (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="relative aspect-[4/3] bg-ink-50">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-ink-300">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              {p.featured && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-soft">
                  <Star className="h-3 w-3 fill-current" /> FEATURED
                </span>
              )}
              <span
                className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(
                  p.status,
                )}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {p.status[0].toUpperCase() + p.status.slice(1)}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink-900">{p.name}</div>
                  <div className="truncate text-[11px] text-ink-500">
                    {p.sku} · {p.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink-900">{currency(p.price)}</div>
                  {p.cost !== undefined && (
                    <div className="text-[10px] text-ink-400">cost {currency(p.cost)}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={`rounded-pill px-2 py-0.5 font-semibold ${stock.tone}`}>
                  {stock.label}
                </span>
                {p.variants.length > 0 && (
                  <span className="rounded-pill bg-ink-100 px-2 py-0.5 font-semibold text-ink-700">
                    {p.variants.length} variant{p.variants.length === 1 ? '' : 's'}
                  </span>
                )}
                {p.discount && (
                  <span className="rounded-pill bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                    {p.discount.kind === 'percent'
                      ? `${p.discount.value}% off`
                      : `${currency(p.discount.value)} off`}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-ink-500">{formatRelative(p.updatedAt)}</span>
                <RowMenu
                  product={p}
                  open={openMenu === p.id}
                  setOpen={(o) => setOpenMenu(o ? p.id : null)}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onToggleActive={onToggleActive}
                  onArchive={onArchive}
                  onDelete={onDelete}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row menu
// ---------------------------------------------------------------------------

function RowMenu({
  product: p,
  open,
  setOpen,
  onEdit,
  onDuplicate,
  onToggleActive,
  onArchive,
  onDelete,
}: {
  product: POSProduct
  open: boolean
  setOpen: (o: boolean) => void
  onEdit: (p: POSProduct) => void
  onDuplicate: (p: POSProduct) => void
  onToggleActive: (p: POSProduct) => void
  onArchive: (p: POSProduct) => void
  onDelete: (p: POSProduct) => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  // Recompute the menu's anchor point when opened or on scroll/resize so the
  // menu always stays glued to the trigger button. Using position: fixed
  // escapes the table's overflow-x-auto clipping context.
  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    function place() {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const menuH = menuRef.current?.offsetHeight ?? 220
      const menuW = 192 // w-48
      const top = Math.min(window.innerHeight - menuH - 8, r.bottom + 6)
      const right = Math.max(8, window.innerWidth - r.right)
      setPos({ top, right })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // Click outside / Escape closes
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (btnRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-[60] w-48 overflow-hidden rounded-2xl border border-ink-200 bg-white py-1 shadow-pop"
        >
          <MenuItem
            icon={Pencil}
            label="Edit"
            onClick={() => {
              setOpen(false)
              onEdit(p)
            }}
          />
          <MenuItem
            icon={Copy}
            label="Duplicate"
            onClick={() => {
              setOpen(false)
              onDuplicate(p)
            }}
          />
          <MenuItem
            icon={p.status === 'active' ? EyeOff : Eye}
            label={p.status === 'active' ? 'Deactivate' : 'Activate'}
            onClick={() => {
              setOpen(false)
              onToggleActive(p)
            }}
          />
          <MenuItem
            icon={Archive}
            label={p.status === 'archived' ? 'Restore (set to draft)' : 'Archive'}
            onClick={() => {
              setOpen(false)
              onArchive(p)
            }}
            disabled={p.status === 'archived'}
          />
          <div className="my-1 h-px bg-ink-100" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            onClick={() => {
              setOpen(false)
              onDelete(p)
            }}
            tone="danger"
          />
        </div>
      )}
    </>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone,
  disabled,
}: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  tone?: 'danger'
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold ${
        tone === 'danger' ? 'text-rose-700 hover:bg-rose-50' : 'text-ink-700 hover:bg-ink-50'
      } ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  onCreate,
  hasFilters,
  onReset,
}: {
  onCreate: () => void
  hasFilters: boolean
  onReset: () => void
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft">
        <Package className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-bold text-ink-900">
        {hasFilters ? 'No products match your filters' : 'No products yet'}
      </div>
      <div className="mt-1 text-xs text-ink-500">
        {hasFilters
          ? 'Try clearing your search or filters to see the full catalog.'
          : 'Create your first product to start selling from the POS.'}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {hasFilters ? (
          <button onClick={onReset} className="btn-secondary">
            Reset filters
          </button>
        ) : null}
        <button onClick={onCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Create product
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagination bar
// ---------------------------------------------------------------------------

function PaginationBar({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalItems,
  startIndex,
  endIndex,
}: {
  page: number
  totalPages: number
  pageSize: PageSize
  onPageChange: (p: number) => void
  onPageSizeChange: (s: PageSize) => void
  totalItems: number
  startIndex: number
  endIndex: number
}) {
  const btn =
    'grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
  const btnActive = 'grid h-8 min-w-[2rem] place-items-center rounded-lg bg-ink-900 px-2 text-xs font-bold text-white'
  // Show a sliding window of up to 5 page numbers.
  const range = useMemo(() => {
    const max = totalPages
    if (max <= 5) return Array.from({ length: max }, (_, i) => i + 1)
    const out: (number | '…')[] = []
    const start = Math.max(2, page - 1)
    const end = Math.min(max - 1, page + 1)
    out.push(1)
    if (start > 2) out.push('…')
    for (let i = start; i <= end; i++) out.push(i)
    if (end < max - 1) out.push('…')
    out.push(max)
    return out
  }, [page, totalPages])

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-ink-100 pt-3 sm:flex-row">
      <div className="text-xs text-ink-500">
        Showing{' '}
        <span className="font-semibold text-ink-700">
          {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
        </span>{' '}
        of <span className="font-semibold text-ink-700">{totalItems}</span> products
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-ink-600">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="h-8 rounded-pill border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-800"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            className={btn}
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            className={btn}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {range.map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="px-1 text-xs text-ink-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={p === page ? btnActive : 'grid h-8 min-w-[2rem] place-items-center rounded-lg px-2 text-xs font-semibold text-ink-700 hover:bg-ink-100'}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}
          <button
            className={btn}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            className={btn}
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product editor modal
// ---------------------------------------------------------------------------

function ProductEditorModal({
  mode,
  initialForm,
  onClose,
  onSave,
  categories,
}: {
  mode: EditorMode
  initialForm: FormState
  onClose: () => void
  onSave: (f: FormState) => void
  categories: string[]
}) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  // Esc closes the modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addVariant() {
    set('variants', [
      ...form.variants,
      {
        id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)
          .toString(36)
          .padStart(2, '0')}`,
        name: '',
        price: form.price ? Number(form.price) || 0 : 0,
        cost: form.cost ? Number(form.cost) || 0 : undefined,
        stock: 0,
      },
    ])
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    set(
      'variants',
      form.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    )
  }

  function removeVariant(id: string) {
    set(
      'variants',
      form.variants.filter((v) => v.id !== id),
    )
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError('Product name is required.')
      firstFieldRef.current?.focus()
      return
    }
    if (form.price === '' || isNaN(Number(form.price))) {
      setError('Price must be a valid number.')
      return
    }
    setError(null)
    onSave(form)
  }

  const defaultBadge = BADGE_OPTIONS.find((b) => b.id === form.badge)?.defaultLabel

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">
              {mode === 'create' ? 'Create product' : 'Edit product'}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              {mode === 'create'
                ? 'Add a new item to your POS catalog.'
                : `Editing "${initialForm.name || 'product'}"`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* Basics */}
          <Section title="Basics" icon={Package}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Product name</label>
                <input
                  ref={firstFieldRef}
                  className="input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. BBQ Chicken Pizza"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[64px] resize-none"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="A short blurb shown in the POS card"
                />
              </div>
              <div>
                <label className="label">SKU</label>
                <input
                  className="input font-mono"
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value.toUpperCase())}
                  placeholder="Auto-generated if left blank"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <CategoryInput
                  value={form.category}
                  onChange={(v) => set('category', v)}
                  options={categories}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Image URL</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={form.image}
                    onChange={(e) => set('image', e.target.value)}
                    placeholder="https://…"
                  />
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 text-ink-300">
                    {form.image ? (
                      <img src={form.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  Use a square image for the best POS card layout. Leave blank to use a placeholder.
                </p>
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing & tax" icon={TrendingUp}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Price</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input pl-6"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="label">Cost (optional)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input pl-6"
                    value={form.cost}
                    onChange={(e) => set('cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="label">Tax rate % (optional)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.taxRate}
                  onChange={(e) => set('taxRate', e.target.value)}
                  placeholder="Inherits business default"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/40 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
                <input
                  type="checkbox"
                  checked={form.discountEnabled}
                  onChange={(e) => set('discountEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                />
                Apply catalog discount
              </label>
              {form.discountEnabled && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label text-xs">Type</label>
                    <div className="inline-flex w-full overflow-hidden rounded-xl border border-ink-200 bg-white">
                      <button
                        type="button"
                        onClick={() => set('discountKind', 'percent')}
                        className={
                          form.discountKind === 'percent'
                            ? 'flex-1 bg-ink-900 px-3 py-2 text-xs font-semibold text-white'
                            : 'flex-1 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                        }
                      >
                        % off
                      </button>
                      <button
                        type="button"
                        onClick={() => set('discountKind', 'amount')}
                        className={
                          form.discountKind === 'amount'
                            ? 'flex-1 bg-ink-900 px-3 py-2 text-xs font-semibold text-white'
                            : 'flex-1 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                        }
                      >
                        $ off
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Value</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input"
                      value={form.discountValue}
                      onChange={(e) => set('discountValue', e.target.value)}
                      placeholder={form.discountKind === 'percent' ? '10' : '2.00'}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Label (optional)</label>
                    <input
                      className="input"
                      value={form.discountLabel}
                      onChange={(e) => set('discountLabel', e.target.value)}
                      placeholder="e.g. Summer Sale"
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Variants */}
          <Section
            title="Variants"
            icon={Sparkles}
            action={
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
              >
                <Plus className="h-3 w-3" /> Add variant
              </button>
            }
          >
            {form.variants.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-3 text-xs text-ink-500">
                No variants yet. Add size, package, or flavor options for this product.
              </p>
            ) : (
              <ul className="space-y-2">
                {form.variants.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-2xl border border-ink-100 bg-white p-3"
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <label className="label text-[11px]">Name</label>
                        <input
                          className="input"
                          value={v.name}
                          onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                          placeholder="e.g. Large"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label text-[11px]">Price</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input"
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(v.id, { price: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label text-[11px]">Cost</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input"
                          value={v.cost ?? ''}
                          onChange={(e) =>
                            updateVariant(v.id, {
                              cost: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label text-[11px]">Stock</label>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={v.stock ?? ''}
                          onChange={(e) =>
                            updateVariant(v.id, {
                              stock: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-end justify-end sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeVariant(v.id)}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          title="Remove variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Inventory */}
          <Section title="Inventory" icon={Package}>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
              <input
                type="checkbox"
                checked={form.trackStock}
                onChange={(e) => set('trackStock', e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
              />
              Track stock for this product
            </label>
            {form.trackStock && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Stock on hand</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Low-stock threshold</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.lowStockAt}
                    onChange={(e) => set('lowStockAt', e.target.value)}
                    placeholder="5"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    You'll see a warning below this number.
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* Availability */}
          <Section title="Availability & visibility" icon={Eye}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['active', 'inactive', 'draft', 'archived'] as ProductStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('status', s)}
                      className={
                        form.status === s
                          ? 'rounded-xl border border-brand-500 bg-brand-50 px-2 py-2 text-xs font-semibold text-ink-900 ring-1 ring-brand-500/40'
                          : 'rounded-xl border border-ink-200 bg-white px-2 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                      }
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  Only <em>active</em> products appear in the POS catalog.
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(e) => set('available', e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                  />
                  Show in POS catalog
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => set('featured', e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                  />
                  Featured product
                </label>
              </div>
            </div>
          </Section>

          {/* Badge */}
          <Section title="Featured badge" icon={Star}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BADGE_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => set('badge', form.badge === b.id ? '' : b.id)}
                  className={
                    form.badge === b.id
                      ? `relative flex h-16 items-center justify-center rounded-2xl border border-brand-500 ring-1 ring-brand-500/40 ${b.tone} text-white text-[11px] font-extrabold uppercase tracking-wide`
                      : `relative flex h-16 items-center justify-center rounded-2xl border border-ink-200 bg-white text-xs font-semibold text-ink-700 hover:bg-ink-50`
                  }
                >
                  {form.badge === b.id && (
                    <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                  )}
                  {b.label}
                </button>
              ))}
            </div>
            {form.badge && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Badge label</label>
                  <input
                    className="input"
                    value={form.badgeLabel}
                    onChange={(e) => set('badgeLabel', e.target.value)}
                    placeholder={defaultBadge}
                  />
                </div>
              </div>
            )}
          </Section>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {mode === 'create' ? (
                <>
                  <Plus className="h-4 w-4" /> Create product
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small section helper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: typeof Package
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Category input with "create new" support
// ---------------------------------------------------------------------------

function CategoryInput({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const isKnown = options.includes(value)
  return (
    <div className="relative">
      <input
        className="input pr-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="e.g. Pizza"
        list="product-category-options"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      {open && options.length > 0 && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-auto rounded-2xl border border-ink-200 bg-white py-1 shadow-pop">
          {options.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(c)
                setOpen(false)
              }}
              className={
                c === value
                  ? 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-ink-900 bg-brand-50'
                  : 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50'
              }
            >
              {c}
            </button>
          ))}
          {value && !isKnown && (
            <div className="border-t border-ink-100 px-3 py-1.5 text-[11px] text-ink-500">
              New category "{value}" will be created on save.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-pop">
        <div className="text-base font-bold text-ink-900">{title}</div>
        <p className="mt-1 text-sm text-ink-500">{description}</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger flex-1">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Re-export for the editor so it can grab the running productId if needed

