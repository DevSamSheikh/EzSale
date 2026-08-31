import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '../../components/Primitives'
import {
  FilterSearchInput,
  FilterSelect,
} from '../../components/FilterBar'
import { playCue } from '../../audio'
import { getBusiness } from '../../store'
import { getLocations } from '../../orders-store'
import { getOperators } from '../../operators-store'
import { getMembers, getCards } from '../../card-store'
import { getProducts } from '../../pos-store'
import {
  activeFilterCount,
  downloadCSV,
  EMPTY_FILTERS,
  findReport,
  printReportAsPdf,
  REPORT_CATEGORIES,
  REPORTS,
  runReport,
  type ReportCategory,
  type ReportDefinition,
  type ReportFilters,
  type ReportResult,
} from '../../reports-engine'
import type { PaymentMethod } from '../../types'

const CATEGORY_ICON: Record<ReportCategory, typeof FileText> = {
  sales: BarChart3,
  orders: Receipt,
  products: Package,
  users: Users,
  cards: Wallet,
  deposits: Wallet,
  transactions: Receipt,
  refunds: RotateCcw,
  operators: Users,
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'wallet', label: 'Digital Wallet' },
  { id: 'membership', label: 'Membership Card' },
]

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const reportId = params.get('report') ?? ''
  const activeReport = reportId ? findReport(reportId) : null

  return (
    <div>
      {!activeReport ? (
        <ReportsCatalog
          initialQuery={params.get('q') ?? ''}
          onPick={(id) => setParams({ report: id })}
        />
      ) : (
        <ReportRunner
          report={activeReport}
          onBack={() => setParams({})}
        />
      )}
    </div>
  )
}

// ---- Catalog ------------------------------------------------------------

function ReportsCatalog({
  initialQuery,
  onPick,
}: {
  initialQuery: string
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState<'all' | ReportCategory>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return REPORTS.filter((r) => {
      if (category !== 'all' && r.category !== category) return false
      if (!q) return true
      const hay = [r.name, r.description, r.tags.join(' '), r.category].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [query, category])

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Pre-built reports across sales, orders, products, members, cards, deposits, transactions, refunds, and operators."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => playCue('tap')}
            title="Custom report builder"
          >
            <Plus className="h-4 w-4" /> Custom report
          </button>
        }
      />

      <div className="card mb-4 p-4 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search reports…"
          />
          <FilterSelect
            label="Category"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={[
              { value: 'all', label: 'All categories' },
              ...REPORT_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
            ]}
            selected={category === 'all' ? [] : [category]}
            onChange={(v) => setCategory((v[0] as ReportCategory | undefined) ?? 'all')}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="No reports match your filters"
          description="Try clearing the search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const Icon = CATEGORY_ICON[r.category] ?? FileText
            const cat = REPORT_CATEGORIES.find((c) => c.id === r.category)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  playCue('tap')
                  onPick(r.id)
                }}
                className="card group flex flex-col items-start gap-3 p-5 text-left transition-shadow hover:shadow-card"
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      cat?.tone ?? 'bg-ink-50 text-ink-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-ink-900">{r.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-ink-500">
                    {r.description}
                  </div>
                </div>
                <div className="mt-auto flex w-full items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    {cat?.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-700 group-hover:text-ink-900">
                    Run report →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Report runner ------------------------------------------------------

function ReportRunner({
  report,
  onBack,
}: {
  report: ReportDefinition
  onBack: () => void
}) {
  const [filters, setFilters] = useState<ReportFilters>(report.defaultFilters)
  const [showFilters, setShowFilters] = useState(true)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)
  const business = getBusiness()
  const businessName = business?.name ?? 'EzSale'

  const category = REPORT_CATEGORIES.find((c) => c.id === report.category)

  function run() {
    setRunning(true)
    setRan(true)
    // Simulate a brief running state for UX (real work is sync).
    setTimeout(() => {
      setResult(runReport(report.id, filters))
      setRunning(false)
      playCue('success')
    }, 220)
  }

  function reset() {
    setFilters(report.defaultFilters)
    setRan(false)
    setResult(null)
    playCue('tap')
  }

  const filterCount = activeFilterCount(filters)

  return (
    <div>
      <PageHeader
        title={report.name}
        subtitle={report.description}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setShowFilters((s) => !s)
                playCue('tap')
              }}
              className="btn-secondary"
            >
              <Filter className="h-4 w-4" /> {showFilters ? 'Hide' : 'Show'} filters
            </button>
            <button
              type="button"
              onClick={reset}
              className="btn-secondary"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button type="button" onClick={onBack} className="btn-primary">
              ← Back to catalog
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-pill border px-2 py-0.5 text-[11px] font-semibold ${category?.tone}`}
        >
          {category?.label}
        </span>
        {report.tags.map((t) => (
          <span
            key={t}
            className="rounded-pill border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700"
          >
            {t}
          </span>
        ))}
        {filterCount > 0 && (
          <span className="rounded-pill border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-ink-900">
            {filterCount} filter{filterCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {showFilters && (
        <ReportFiltersPanel
          filters={filters}
          onChange={setFilters}
          onRun={run}
          running={running}
        />
      )}

      {!ran && !result && (
        <div className="card mt-4 flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-ink-500">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-ink-900">Ready to run</div>
            <div className="mt-1 text-xs">
              Adjust the filters above, then press{' '}
              <em>Run report</em> to see the results.
            </div>
          </div>
          <button type="button" onClick={run} className="btn-primary">
            <Check className="h-4 w-4" /> Run report
          </button>
        </div>
      )}

      {running && (
        <div className="card mt-4 flex items-center justify-center gap-3 p-10 text-sm text-ink-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
          Running…
        </div>
      )}

      {result && !running && (
        <ReportResultsPanel
          report={report}
          result={result}
          businessName={businessName}
          onRun={run}
        />
      )}
    </div>
  )
}

// ---- Filters panel -----------------------------------------------------

function ReportFiltersPanel({
  filters,
  onChange,
  onRun,
  running,
}: {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  onRun: () => void
  running: boolean
}) {
  const locations = getLocations()
  const operators = getOperators()
  const members = getMembers()
  const cards = getCards()
  const products = getProducts()
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  )

  function patch<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="card mb-4 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date from" icon={Calendar}>
          <input
            type="date"
            className="input"
            value={filters.dateFrom}
            onChange={(e) => patch('dateFrom', e.target.value)}
            max={filters.dateTo || undefined}
          />
        </Field>
        <Field label="Date to" icon={Calendar}>
          <input
            type="date"
            className="input"
            value={filters.dateTo}
            onChange={(e) => patch('dateTo', e.target.value)}
            min={filters.dateFrom || undefined}
          />
        </Field>
        <Field label="Product category">
          <select
            className="input"
            value={filters.category}
            onChange={(e) => patch('category', e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <FilterSelect
            label="Locations"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={locations.map((l) => ({ value: l.id, label: l.name, hint: l.code }))}
            selected={filters.locationIds}
            onChange={(v) => patch('locationIds', v)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FilterSelect
            label="Payment methods"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={PAYMENT_OPTIONS.map((p) => ({ value: p.id, label: p.label }))}
            selected={filters.paymentMethods}
            onChange={(v) => patch('paymentMethods', v as PaymentMethod[])}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FilterSelect
            label="Operators"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={operators.map((o) => ({ value: o.id, label: o.name, hint: o.email }))}
            selected={filters.operatorIds}
            onChange={(v) => patch('operatorIds', v)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FilterSelect
            label="Members"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={members.map((m) => ({ value: m.id, label: m.name, hint: m.email }))}
            selected={filters.memberIds}
            onChange={(v) => patch('memberIds', v)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FilterSelect
            label="Cards"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={cards.map((c) => ({ value: c.id, label: c.cardNumber, hint: c.tier }))}
            selected={filters.cardIds}
            onChange={(v) => patch('cardIds', v)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
          {filters.dateFrom || filters.dateTo ? (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.dateFrom || '…'} → {filters.dateTo || '…'}
            </span>
          ) : (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              All dates
            </span>
          )}
          {filters.locationIds.length > 0 && (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.locationIds.length} location{filters.locationIds.length === 1 ? '' : 's'}
            </span>
          )}
          {filters.operatorIds.length > 0 && (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.operatorIds.length} operator{filters.operatorIds.length === 1 ? '' : 's'}
            </span>
          )}
          {filters.memberIds.length > 0 && (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.memberIds.length} member{filters.memberIds.length === 1 ? '' : 's'}
            </span>
          )}
          {filters.cardIds.length > 0 && (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.cardIds.length} card{filters.cardIds.length === 1 ? '' : 's'}
            </span>
          )}
          {filters.paymentMethods.length > 0 && (
            <span className="rounded-pill bg-ink-50 px-2 py-0.5 font-semibold">
              {filters.paymentMethods.length} method{filters.paymentMethods.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="btn-primary"
        >
          <Check className="h-4 w-4" /> Run report
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon?: typeof Calendar
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        )}
        {children}
      </div>
    </label>
  )
}

// ---- Results panel ------------------------------------------------------

function ReportResultsPanel({
  report,
  result,
  businessName,
  onRun,
}: {
  report: ReportDefinition
  result: ReportResult
  businessName: string
  onRun: () => void
}) {
  function exportCSV() {
    const safeId = report.id.replace(/[^a-z0-9-]+/gi, '-')
    downloadCSV(result, `${safeId}-${new Date().toISOString().slice(0, 10)}`)
    playCue('success')
  }
  function exportPdf() {
    printReportAsPdf(report, result, businessName)
    playCue('tap')
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-ink-900">
          Results · {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={onRun} className="btn-secondary text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Re-run
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={!report.supportsCsv}
            className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title="Export to CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={!report.supportsPdf}
            className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title="Print as PDF"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {result.summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {result.summary.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              sub={s.hint}
              tone={s.tone ?? 'brand'}
              variant="top"
            />
          ))}
        </div>
      )}

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No rows for the current filters"
          description="Loosen the filters and try again."
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  {result.columns.map((c, i) => (
                    <th
                      key={c + i}
                      className="px-4 py-2.5 font-semibold"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.rows.slice(0, 200).map((r, idx) => (
                  <tr key={idx} className="hover:bg-ink-50/60">
                    {r.cells.map((c, ci) => (
                      <td
                        key={c.label + ci}
                        className={`whitespace-nowrap px-4 py-2 align-top text-ink-700 ${
                          c.align === 'right'
                            ? 'text-right tabular-nums'
                            : c.align === 'center'
                            ? 'text-center'
                            : ''
                        }`}
                      >
                        {c.value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length > 200 && (
              <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-2.5 text-center text-[11px] font-semibold text-ink-500">
                Showing 200 of {result.rows.length} rows · export to CSV to see all.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Re-export the `EMPTY_FILTERS` so existing tests / external callers can use it.
export { EMPTY_FILTERS }
