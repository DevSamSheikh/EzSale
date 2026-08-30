import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (next: { page: number; pageSize: number }) => void
}

const PAGE_SIZES = [10, 25, 50, 100]

/**
 * Compact page navigator with a page-size select. Emits `onChange` whenever
 * the user moves pages or changes how many rows are visible.
 */
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(total, safePage * pageSize)

  // Build a compact page list: first, …, current±1, …, last.
  const pages = pageList(safePage, totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs text-ink-500">
        <span className="tabular-nums">
          {total === 0
            ? '0 results'
            : `${from}–${to} of ${total}`}
        </span>
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-500">
            Per page
          </span>
          <select
            value={pageSize}
            onChange={(e) =>
              onChange({ page: 1, pageSize: Number(e.target.value) })
            }
            className="h-7 rounded-full border border-ink-200 bg-white px-2 text-[11px] font-semibold text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <nav className="inline-flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onChange({ page: safePage - 1, pageSize })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`g-${i}`}
              className="inline-flex h-8 w-8 items-center justify-center text-xs text-ink-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ page: p, pageSize })}
              aria-current={p === safePage ? 'page' : undefined}
              className={
                p === safePage
                  ? 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-full bg-ink-900 px-2 text-xs font-bold text-white'
                  : 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-full border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50'
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onChange({ page: safePage + 1, pageSize })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  )
}

function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}