import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  hint?: string | undefined
}

interface FilterBarInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

/**
 * Outlined-pill search input matching the rest of the filter row.
 * Visually consistent with `FilterSelect` / `FilterDateRange`.
 */
export function FilterSearchInput({
  value,
  onChange,
  placeholder,
}: FilterBarInputProps) {
  return (
    <div className="relative flex h-9 min-w-[200px] flex-1 items-center rounded-full border border-ink-200 bg-white pl-3 pr-3 transition-colors hover:border-ink-300 focus-within:border-ink-300 sm:max-w-[300px]">
      <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="h-7 w-full bg-transparent text-xs text-ink-700 placeholder:text-ink-400 focus:outline-none"
      />
    </div>
  )
}

interface FilterDateRangeProps {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
}

export function FilterDateRange({ from, to, onChange }: FilterDateRangeProps) {
  const active = !!from || !!to
  return (
    <div
      className={`inline-flex h-9 items-center gap-2 rounded-full border bg-white px-3 text-xs transition-colors ${
        active
          ? 'border-brand-500 bg-brand-50 text-ink-900'
          : 'border-ink-200 text-ink-700 hover:border-ink-300'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        From
      </span>
      <input
        type="date"
        className="h-6 w-[105px] bg-transparent text-[11px] font-semibold text-ink-800 focus:outline-none"
        value={from}
        onChange={(e) => onChange({ from: e.target.value, to })}
      />
      <span className="text-ink-400">→</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        To
      </span>
      <input
        type="date"
        className="h-6 w-[105px] bg-transparent text-[11px] font-semibold text-ink-800 focus:outline-none"
        value={to}
        onChange={(e) => onChange({ from, to: e.target.value })}
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          className="grid h-5 w-5 place-items-center rounded-full bg-ink-900/10 text-ink-700 hover:bg-ink-900/20"
          aria-label="Clear date range"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

interface FilterSelectProps {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
  icon?: ReactNode
}

/**
 * Pill-shaped outlined dropdown trigger with an inline icon. Matches the
 * visual style of the date range and search inputs.
 */
export function FilterSelect({
  label,
  options,
  selected,
  onChange,
  icon,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const count = selected.length
  const triggerLabel =
    count === 0
      ? label
      : count === 1
      ? options.find((o) => o.value === selected[0])?.label ?? label
      : `${label} · ${count}`

  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
    else onChange([...selected, v])
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-9 items-center gap-2 rounded-full border bg-white px-3 text-xs transition-colors ${
          count
            ? 'border-brand-500 bg-brand-50 text-ink-900 hover:bg-brand-100'
            : 'border-ink-200 text-ink-700 hover:border-ink-300'
        }`}
      >
        {icon && <span className="text-ink-500">{icon}</span>}
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 ${open ? 'rotate-180' : ''} text-ink-400 transition-transform`} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-64 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
              {label}
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-semibold text-ink-700 hover:text-ink-900"
              >
                Reset
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {options.map((o) => {
              const on = selected.includes(o.value)
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-ink-50"
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                        on
                          ? 'border-brand-500 bg-brand-500 text-ink-900'
                          : 'border-ink-300 bg-white'
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-800">
                      {o.label}
                    </span>
                    {o.hint && (
                      <span className="shrink-0 text-[10px] text-ink-500">{o.hint}</span>
                    )}
                  </button>
                </li>
              )
            })}
            {options.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-ink-500">
                No options available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Pill-shaped outlined tab toggle for switching between two states (e.g. Type).
 * Pure visual — parent owns the selected value.
 */
interface FilterTabsProps<T extends string> {
  options: { value: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div className="inline-flex h-10 items-center rounded-full border border-ink-200 bg-white p-0.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
              on
                ? 'bg-ink-900 text-white shadow-soft'
                : 'text-ink-700 hover:bg-ink-50'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}