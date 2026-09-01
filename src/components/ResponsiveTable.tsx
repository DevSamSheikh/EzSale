import type { ReactNode } from 'react'

/**
 * ResponsiveTable renders tabular data as a real <table> on desktop and as
 * stacked "rows-as-cards" on mobile so wide tables never force horizontal
 * page scroll.
 *
 * The `rows` prop is the *already-rendered* list of children for both views.
 * On mobile each row receives a `card` slot (label/value pairs typically
 * rendered with the Cell helpers) while on desktop the same fields are
 * arranged as <td> cells inside a normal <tr>.
 *
 * For tables that don't benefit from a card view (very wide data sets that
 * simply need to scroll), use `mode="scroll"` which keeps the <table> but
 * constrains horizontal overflow with a min-width so it scrolls inside its
 * own container.
 */
export interface ResponsiveTableProps<Row> {
  /** Column header labels (desktop only). */
  columns: { label: ReactNode; className?: string; hideOnMobile?: boolean }[]
  /** Row data; the same array is used to render both views. */
  rows: Row[]
  /** Stable React key per row. */
  rowKey: (row: Row, index: number) => string | number
  /**
   * Desktop render: produces the <tr> children for this row.
   * Receives `row` and `index`.
   */
  renderRow: (row: Row, index: number) => ReactNode
  /**
   * Mobile render: produces the entire card body for this row. Use the
   * <Field> helper to keep label/value alignment consistent across pages.
   */
  renderCard: (row: Row, index: number) => ReactNode
  /**
   * Optional footer (totals row, etc.) — only shown on desktop, inside the
   * table body.
   */
  footer?: ReactNode
  /**
   * 'card' converts to stacked cards on mobile (default).
   * 'scroll' keeps the table but forces a horizontal scroll inside the
   * container — useful when the card view would be lossy.
   */
  mode?: 'card' | 'scroll'
  /** Optional className for the outer wrapper. */
  className?: string
  /** Optional className for the table element. */
  tableClassName?: string
  /** min-width applied to the inner table (scroll mode). */
  minWidth?: string
  /** Optional caption-like row shown above the table on desktop only. */
  theadExtra?: ReactNode
  /** Empty state when rows is empty. */
  empty?: ReactNode
}

export function ResponsiveTable<Row>({
  columns,
  rows,
  rowKey,
  renderRow,
  renderCard,
  footer,
  mode = 'card',
  className = '',
  tableClassName = 'w-full text-sm',
  minWidth,
  theadExtra,
  empty,
}: ResponsiveTableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>
  }

  return (
    <div className={className}>
      {/* Desktop / tablet — real table */}
      {mode === 'scroll' ? (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table
            className={`${tableClassName} ${minWidth ?? 'min-w-[720px]'}`}
            style={minWidth ? { minWidth } : undefined}
          >
            {theadExtra}
            <thead className="bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-4 py-3 ${c.className ?? ''} ${
                      c.hideOnMobile ? 'hidden md:table-cell' : ''
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r, i) => (
                <tr key={rowKey(r, i)} className="text-ink-800">
                  {renderRow(r, i)}
                </tr>
              ))}
              {footer}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-white md:block">
          <table className={tableClassName}>
            <thead className="bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-4 py-3 ${c.className ?? ''} ${
                      c.hideOnMobile ? 'hidden md:table-cell' : ''
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r, i) => (
                <tr key={rowKey(r, i)} className="text-ink-800">
                  {renderRow(r, i)}
                </tr>
              ))}
              {footer}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile — stacked cards (only when mode === 'card') */}
      {mode === 'card' && (
        <div className="space-y-3 md:hidden">
          {rows.map((r, i) => (
            <div
              key={rowKey(r, i)}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
            >
              {renderCard(r, i)}
            </div>
          ))}
          {rows.length === 0 && empty}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field helpers — small primitives for building mobile card bodies so pages
// stay visually consistent. Each Field renders a label/value pair; the Label
// is hidden on viewports >= sm so the same markup looks fine if you ever
// decide to flip the breakpoint.
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  className = '',
  labelClassName = 'text-[11px] font-semibold uppercase tracking-wider text-ink-500',
}: {
  label: ReactNode
  children: ReactNode
  className?: string
  labelClassName?: string
}) {
  return (
    <div className={`flex min-w-0 items-start justify-between gap-3 ${className}`}>
      <div className={labelClassName}>{label}</div>
      <div className="min-w-0 text-right text-sm text-ink-900">{children}</div>
    </div>
  )
}

export function FieldRow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`space-y-1.5 ${className}`}>{children}</div>
}

export function FieldDivider() {
  return <div className="my-2 h-px bg-ink-100" />
}
