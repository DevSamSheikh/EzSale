import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader, StatCard } from '../../components/Primitives'
import {
  CATEGORY_ICONS,
  CATEGORIES_UPDATED_EVENT,
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryIcon,
  getCategoriesForBusiness,
  reorderCategories,
  setCategoryStatus,
  shiftCategory,
  updateCategory,
  type Category,
  type CategoryStatus,
} from '../../categories-store'
import { getBusiness } from '../../store'
import { getProducts } from '../../pos-store'
import { playCue } from '../../audio'
import type { BusinessType } from '../../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | CategoryStatus
type ScopeFilter = 'all' | BusinessType
type ViewMode = 'list' | 'grid'

interface EditorState {
  open: boolean
  /** id of the category being edited, or undefined when creating */
  id?: string
}

interface FormState {
  name: string
  iconKey: string
  image: string
  status: CategoryStatus
  color: string
  businessTypes: BusinessType[]
}

const DEFAULT_FORM: FormState = {
  name: '',
  iconKey: 'package',
  image: '',
  status: 'active',
  color: '',
  businessTypes: [],
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'archived', label: 'Archived' },
]

const SCOPE_FILTERS: { id: ScopeFilter; label: string }[] = [
  { id: 'all', label: 'All scopes' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'school', label: 'School' },
  { id: 'mall', label: 'Mall' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'retail', label: 'Retail' },
  { id: 'custom', label: 'Custom' },
]

const STATUS_PILL: Record<CategoryStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hidden: 'bg-ink-100 text-ink-700 border-ink-200',
  archived: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SWATCHES = ['#84eb0a', '#3a82f6', '#FF788D', '#30AFFF', '#8b5cf6', '#f59e0b', '#14b8a6', '#f43f5e', '#0ea5e9', '#10b981']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryToForm(c: Category): FormState {
  return {
    name: c.name,
    iconKey: c.iconKey ?? 'package',
    image: c.image ?? '',
    status: c.status,
    color: c.color ?? '',
    businessTypes: c.businessTypes ? [...c.businessTypes] : [],
  }
}

function resolveIcon(key: string): LucideIcon {
  return getCategoryIcon(key).icon
}

function CategoryIcon({ iconKey, image, className = 'h-5 w-5' }: { iconKey?: string; image?: string; className?: string }) {
  if (image) {
    return <img src={image} alt="" className={`${className} rounded-md object-cover`} />
  }
  const I = resolveIcon(iconKey ?? 'package')
  return <I className={className} strokeWidth={1.8} />
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CategoriesPage() {
  const business = getBusiness()
  const [categories, setCategories] = useState<Category[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(business?.type ?? 'all')
  const [view, setView] = useState<ViewMode>('list')
  const [editor, setEditor] = useState<EditorState>({ open: false })
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function refresh() {
    setCategories(getCategories().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
  }

  useEffect(() => {
    refresh()
    function onUpdate() {
      refresh()
    }
    window.addEventListener('storage', onUpdate)
    window.addEventListener(CATEGORIES_UPDATED_EVENT, onUpdate)
    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, onUpdate)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  // Counts per category (for the "products" column)
  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()
    getProducts().forEach((p) => {
      if (!p.category) return
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    })
    return counts
  }, [categories])

  const stats = useMemo(() => {
    const total = categories.length
    const active = categories.filter((c) => c.status === 'active').length
    const hidden = categories.filter((c) => c.status === 'hidden').length
    const archived = categories.filter((c) => c.status === 'archived').length
    const scoped = categories.filter((c) => c.businessTypes && c.businessTypes.length > 0).length
    return { total, active, hidden, archived, scoped }
  }, [categories])

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (scopeFilter !== 'all') {
        if (!c.businessTypes || c.businessTypes.length === 0) return false
        if (!c.businessTypes.includes(scopeFilter)) return false
      }
      return true
    })
  }, [categories, statusFilter, scopeFilter])

  // ---- Drag and drop ----------------------------------------------------

  const dragSourceIndex = useRef<number | null>(null)

  function onDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id)
    dragSourceIndex.current = filtered.findIndex((c) => c.id === id)
    e.dataTransfer.effectAllowed = 'move'
    // Set data so the browser allows the drop in some browsers.
    try {
      e.dataTransfer.setData('text/plain', id)
    } catch {
      /* ignore */
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOverId) setDragOverId(id)
  }

  function onDragLeave(id: string) {
    if (dragOverId === id) setDragOverId(null)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault()
    const sourceId = draggingId
    setDraggingId(null)
    setDragOverId(null)
    dragSourceIndex.current = null
    if (!sourceId || sourceId === targetId) return
    // Build the new ordered list.
    const ids = filtered.map((c) => c.id)
    const sourceIdx = ids.indexOf(sourceId)
    const targetIdx = ids.indexOf(targetId)
    if (sourceIdx < 0 || targetIdx < 0) return
    const next = [...ids]
    next.splice(sourceIdx, 1)
    next.splice(targetIdx, 0, sourceId)
    reorderCategories(next)
    setToast('Order updated')
    playCue('success')
  }

  function onDragEnd() {
    setDraggingId(null)
    setDragOverId(null)
    dragSourceIndex.current = null
  }

  // ---- Actions -----------------------------------------------------------

  function openCreate() {
    setEditor({ open: true })
    setOpenMenu(null)
    playCue('tap')
  }

  function openEdit(c: Category) {
    setEditor({ open: true, id: c.id })
    setOpenMenu(null)
    playCue('tap')
  }

  function closeEditor() {
    setEditor({ open: false })
  }

  function handleSave(form: FormState) {
    if (editor.id) {
      const updated = updateCategory(editor.id, {
        name: form.name.trim() || 'Category',
        iconKey: form.iconKey,
        image: form.image.trim() || undefined,
        status: form.status,
        color: form.color || undefined,
        businessTypes: form.businessTypes.length > 0 ? form.businessTypes : undefined,
      })
      setToast(`Saved "${updated?.name ?? 'category'}"`)
    } else {
      const created = createCategory({
        name: form.name.trim() || 'New category',
        iconKey: form.iconKey,
        image: form.image.trim() || undefined,
        status: form.status,
        color: form.color || undefined,
        businessTypes: form.businessTypes.length > 0 ? form.businessTypes : undefined,
      })
      setToast(`Created "${created.name}"`)
    }
    playCue('success')
    closeEditor()
  }

  function handleToggleStatus(c: Category) {
    const next: CategoryStatus = c.status === 'active' ? 'hidden' : 'active'
    setCategoryStatus(c.id, next)
    setOpenMenu(null)
    setToast(next === 'active' ? `Shown "${c.name}"` : `Hidden "${c.name}"`)
    playCue('tap')
  }

  function handleArchive(c: Category) {
    setCategoryStatus(c.id, 'archived')
    setOpenMenu(null)
    setToast(`Archived "${c.name}"`)
    playCue('tap')
  }

  function handleShift(c: Category, dir: -1 | 1) {
    shiftCategory(c.id, dir)
    playCue('tap')
  }

  function handleDelete(c: Category) {
    setConfirmDelete(c)
    setOpenMenu(null)
  }

  function confirmDeleteNow() {
    if (!confirmDelete) return
    deleteCategory(confirmDelete.id)
    setToast(`Deleted "${confirmDelete.name}"`)
    playCue('warning')
    setConfirmDelete(null)
  }

  const hasFilters = statusFilter !== 'all' || scopeFilter !== 'all'

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize the catalog, control the POS menu, and tailor the catalog to your business type."
        actions={
          <>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> New category
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard variant="top" label="Total categories" value={String(stats.total)} icon={Layers} tone="brand" />
        <StatCard variant="top" label="Active" value={String(stats.active)} icon={Check} tone="emerald" />
        <StatCard variant="top" label="Hidden" value={String(stats.hidden)} icon={EyeOff} tone="amber" />
        <StatCard variant="top" label="Archived" value={String(stats.archived)} icon={Trash2} tone="rose" />
        <StatCard
          variant="top"
          label="Type-scoped"
          value={String(stats.scoped)}
          icon={Building2}
          tone={stats.scoped > 0 ? 'indigo' : 'neutral'}
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
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            >
              {SCOPE_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
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
                <Filter className="h-3.5 w-3.5 rotate-90" />
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
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <div>
            Showing <span className="font-semibold text-ink-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-ink-700">{categories.length}</span> categories
            {hasFilters ? ' · filtered' : ''} · drag rows to reorder
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setScopeFilter('all')
                playCue('tap')
              }}
              className="text-xs font-semibold text-ink-700 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState onCreate={openCreate} hasFilters={hasFilters} />
        ) : view === 'list' ? (
          <CategoriesList
            items={filtered}
            productCounts={productCounts}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onEdit={openEdit}
            onToggleStatus={handleToggleStatus}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onShift={handleShift}
            draggingId={draggingId}
            dragOverId={dragOverId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        ) : (
          <CategoriesGrid
            items={filtered}
            productCounts={productCounts}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onEdit={openEdit}
            onToggleStatus={handleToggleStatus}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onShift={handleShift}
          />
        )}
      </div>

      {editor.open && (
        <CategoryEditorModal
          id={editor.id}
          initialForm={
            editor.id
              ? categoryToForm(categories.find((c) => c.id === editor.id) ?? categories[0])
              : DEFAULT_FORM
          }
          onClose={closeEditor}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          description="Products using this category will keep the name as plain text but it will no longer appear in the category list or POS menu."
          confirmLabel="Delete category"
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
// List view with drag-and-drop
// ---------------------------------------------------------------------------

function CategoriesList({
  items,
  productCounts,
  openMenu,
  setOpenMenu,
  onEdit,
  onToggleStatus,
  onArchive,
  onDelete,
  onShift,
  draggingId,
  dragOverId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  items: Category[]
  productCounts: Map<string, number>
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onEdit: (c: Category) => void
  onToggleStatus: (c: Category) => void
  onArchive: (c: Category) => void
  onDelete: (c: Category) => void
  onShift: (c: Category, dir: -1 | 1) => void
  draggingId: string | null
  dragOverId: string | null
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDragLeave: (id: string) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDragEnd: () => void
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-100">
      <table className="w-full text-sm">
        <thead className="bg-ink-50/50 text-left text-[11px] uppercase tracking-wide text-ink-500">
          <tr>
            <th className="w-10 px-3 py-2.5" />
            <th className="px-3 py-2.5 font-semibold">Category</th>
            <th className="px-3 py-2.5 font-semibold">Scope</th>
            <th className="px-3 py-2.5 text-right font-semibold">Products</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="w-32 px-3 py-2.5 font-semibold">Order</th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((c, i) => {
            const productCount = productCounts.get(c.name) ?? 0
            const isFirst = i === 0
            const isLast = i === items.length - 1
            const isDragging = draggingId === c.id
            const isDragOver = dragOverId === c.id && draggingId !== null && draggingId !== c.id
            return (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => onDragStart(e, c.id)}
                onDragOver={(e) => onDragOver(e, c.id)}
                onDragLeave={() => onDragLeave(c.id)}
                onDrop={(e) => onDrop(e, c.id)}
                onDragEnd={onDragEnd}
                className={`group transition-colors ${
                  isDragging ? 'opacity-50' : ''
                } ${isDragOver ? 'bg-brand-50/60' : 'hover:bg-ink-50/60'}`}
              >
                <td className="px-3 py-2.5">
                  <span
                    className="grid h-7 w-7 cursor-grab place-items-center rounded-md text-ink-300 hover:bg-ink-100 hover:text-ink-700 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: c.color ? `${c.color}22` : 'var(--brand-50)',
                        color: c.color ?? 'var(--brand-700)',
                      }}
                    >
                      <CategoryIcon iconKey={c.iconKey} image={c.image} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink-900">{c.name}</div>
                      <div className="truncate text-[11px] text-ink-500">
                        {c.iconKey ? getCategoryIcon(c.iconKey).label : 'Custom'} · {c.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {c.businessTypes && c.businessTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.businessTypes.map((t) => (
                        <span
                          key={t}
                          className="rounded-pill bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                        >
                          {labelForType(t)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-500">All types</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${
                      productCount > 0
                        ? 'bg-ink-100 text-ink-700'
                        : 'bg-ink-50 text-ink-400'
                    }`}
                  >
                    {productCount}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[c.status]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {labelForStatus(c.status)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onShift(c, -1)}
                      disabled={isFirst}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-500 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Move up"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onShift(c, 1)}
                      disabled={isLast}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-500 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Move down"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <span className="ml-1 font-mono text-[10px] text-ink-400">#{c.order + 1}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <RowMenu
                    category={c}
                    open={openMenu === c.id}
                    setOpen={(o) => setOpenMenu(o ? c.id : null)}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
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

// ---------------------------------------------------------------------------
// Grid view
// ---------------------------------------------------------------------------

function CategoriesGrid({
  items,
  productCounts,
  openMenu,
  setOpenMenu,
  onEdit,
  onToggleStatus,
  onArchive,
  onDelete,
  onShift,
}: {
  items: Category[]
  productCounts: Map<string, number>
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onEdit: (c: Category) => void
  onToggleStatus: (c: Category) => void
  onArchive: (c: Category) => void
  onDelete: (c: Category) => void
  onShift: (c: Category, dir: -1 | 1) => void
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((c, i) => {
        const productCount = productCounts.get(c.name) ?? 0
        return (
          <div
            key={c.id}
            className="overflow-hidden rounded-2xl border border-ink-100 bg-white"
          >
            <div
              className="flex items-start justify-between gap-2 p-4 pb-2"
              style={{
                background: c.color ? `${c.color}1a` : 'var(--brand-50)',
              }}
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-xl"
                style={{
                  background: c.color ?? 'var(--brand-500)',
                  color: '#fff',
                }}
              >
                <CategoryIcon iconKey={c.iconKey} image={c.image} className="h-6 w-6" />
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[c.status]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {labelForStatus(c.status)}
              </span>
            </div>
            <div className="p-4 pt-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink-900">{c.name}</div>
                  <div className="truncate text-[11px] text-ink-500">
                    {productCount} {productCount === 1 ? 'product' : 'products'}
                    {c.businessTypes && c.businessTypes.length > 0 && (
                      <> · {c.businessTypes.length} scope{c.businessTypes.length === 1 ? '' : 's'}</>
                    )}
                  </div>
                </div>
                <RowMenu
                  category={c}
                  open={openMenu === c.id}
                  setOpen={(o) => setOpenMenu(o ? c.id : null)}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                  onArchive={onArchive}
                  onDelete={onDelete}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onShift(c, -1)}
                    disabled={i === 0}
                    className="grid h-7 w-7 place-items-center rounded-md text-ink-500 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Move up"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onShift(c, 1)}
                    disabled={i === items.length - 1}
                    className="grid h-7 w-7 place-items-center rounded-md text-ink-500 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Move down"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onEdit(c)}
                  className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
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
  category: c,
  open,
  setOpen,
  onEdit,
  onToggleStatus,
  onArchive,
  onDelete,
}: {
  category: Category
  open: boolean
  setOpen: (o: boolean) => void
  onEdit: (c: Category) => void
  onToggleStatus: (c: Category) => void
  onArchive: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    function place() {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const menuH = menuRef.current?.offsetHeight ?? 200
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
            icon={Edit3}
            label="Edit"
            onClick={() => {
              setOpen(false)
              onEdit(c)
            }}
          />
          <MenuItem
            icon={c.status === 'active' ? EyeOff : Eye}
            label={c.status === 'active' ? 'Hide from POS' : 'Show in POS'}
            onClick={() => {
              setOpen(false)
              onToggleStatus(c)
            }}
          />
          <MenuItem
            icon={Trash2}
            label={c.status === 'archived' ? 'Restore (set to active)' : 'Archive'}
            onClick={() => {
              setOpen(false)
              onArchive(c)
            }}
            disabled={c.status === 'archived'}
          />
          <div className="my-1 h-px bg-ink-100" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            onClick={() => {
              setOpen(false)
              onDelete(c)
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
  icon: typeof Edit3
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

function EmptyState({ onCreate, hasFilters }: { onCreate: () => void; hasFilters: boolean }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft">
        <Package className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-bold text-ink-900">
        {hasFilters ? 'No categories match your filters' : 'No categories yet'}
      </div>
      <div className="mt-1 text-xs text-ink-500">
        {hasFilters
          ? 'Try clearing your filters to see the full list.'
          : 'Create your first category to organize the POS catalog.'}
      </div>
      <div className="mt-4 flex justify-center">
        <button onClick={onCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor modal
// ---------------------------------------------------------------------------

function CategoryEditorModal({
  id,
  initialForm,
  onClose,
  onSave,
}: {
  id?: string
  initialForm: FormState
  onClose: () => void
  onSave: (f: FormState) => void
}) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

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

  function toggleBusinessType(t: BusinessType) {
    setForm((f) => {
      const has = f.businessTypes.includes(t)
      return {
        ...f,
        businessTypes: has ? f.businessTypes.filter((x) => x !== t) : [...f.businessTypes, t],
      }
    })
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError('Name is required.')
      firstFieldRef.current?.focus()
      return
    }
    setError(null)
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl animate-[slideIn_0.25s_ease-out] flex-col overflow-hidden bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-900">
              {id ? 'Edit category' : 'Create category'}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              {id
                ? `Editing "${initialForm.name || 'category'}"`
                : 'Add a new category to your POS catalog.'}
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
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <Layers className="h-3.5 w-3.5" /> Basics
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label">Category name</label>
                <input
                  ref={firstFieldRef}
                  className="input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Cold drinks"
                />
              </div>
              <div>
                <label className="label">Image URL (optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={form.image}
                    onChange={(e) => set('image', e.target.value)}
                    placeholder="https://…"
                  />
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-200"
                    style={{
                      background: form.color || 'var(--brand-50)',
                      color: form.color ? '#fff' : 'var(--brand-700)',
                    }}
                  >
                    {form.image ? (
                      <img src={form.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <CategoryIcon iconKey={form.iconKey} className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  Leave blank to use the icon below.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <ImageIcon className="h-3.5 w-3.5" /> Icon
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {CATEGORY_ICONS.map((i) => {
                const active = i.key === form.iconKey
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => set('iconKey', i.key)}
                    title={i.label}
                    className={
                      active
                        ? 'grid h-9 w-9 place-items-center rounded-xl border border-brand-500 bg-brand-50 text-ink-900 ring-1 ring-brand-500/40'
                        : 'grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                    }
                  >
                    <CategoryIcon iconKey={i.key} className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Status
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['active', 'hidden', 'archived'] as CategoryStatus[]).map((s) => (
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
                  {labelForStatus(s)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Hidden categories stay in the catalog but are removed from the POS menu.
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <Building2 className="h-3.5 w-3.5" /> Business type scope
            </div>
            <p className="text-[11px] text-ink-500">
              Leave empty to show in every business type. Pick one or more to limit the
              category to those types only.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  { v: 'restaurant', l: 'Restaurant' },
                  { v: 'school', l: 'School' },
                  { v: 'mall', l: 'Mall' },
                  { v: 'gaming', l: 'Gaming' },
                  { v: 'retail', l: 'Retail' },
                  { v: 'custom', l: 'Custom' },
                ] as { v: BusinessType; l: string }[]
              ).map((t) => {
                const active = form.businessTypes.includes(t.v)
                return (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => toggleBusinessType(t.v)}
                    className={
                      active
                        ? 'rounded-pill border border-brand-500 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-ink-900'
                        : 'rounded-pill border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50'
                    }
                  >
                    {active && <Check className="mr-1 inline h-3 w-3" />}
                    {t.l}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Color
            </div>
            <p className="text-[11px] text-ink-500">
              Optional accent color for the POS chip.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {SWATCHES.map((s) => {
                const active = s === form.color
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('color', active ? '' : s)}
                    title={s}
                    className={`h-7 w-7 rounded-md border ${
                      active ? 'border-ink-900 ring-2 ring-ink-900/20' : 'border-ink-200 hover:border-ink-400'
                    }`}
                    style={{ background: s }}
                  />
                )
              })}
              <button
                type="button"
                onClick={() => set('color', '')}
                className={`ml-1 h-7 rounded-md border border-dashed border-ink-300 px-2 text-[10px] font-semibold ${
                  !form.color ? 'text-ink-900' : 'text-ink-500'
                }`}
              >
                Clear
              </button>
            </div>
          </section>

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
              {id ? (
                <>
                  <Check className="h-4 w-4" /> Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Create category
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

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

function labelForStatus(s: CategoryStatus) {
  return s[0].toUpperCase() + s.slice(1)
}

function labelForType(t: BusinessType) {
  switch (t) {
    case 'restaurant':
      return 'Restaurant'
    case 'school':
      return 'School'
    case 'mall':
      return 'Mall'
    case 'gaming':
      return 'Gaming'
    case 'retail':
      return 'Retail'
    case 'custom':
      return 'Custom'
  }
}

// Suppress the unused import warning for ChevronDown which is kept for future
// filter dropdowns.
void ChevronDown
// `getCategoriesForBusiness` is used by ProductsPage; importing it here keeps
// the module the single source of truth for category types.
void getCategoriesForBusiness
