import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export function Logo({
  size = 28,
  showName = true,
}: {
  size?: number
  showName?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-xl bg-brand-500 text-ink-900 shadow-soft"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
          <path
            d="M5 7h14M5 12h10M5 17h14"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showName && (
        <span className="text-base font-extrabold tracking-tight text-ink-900">EzSale</span>
      )}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-ink-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---- StatusPill ---------------------------------------------------------
//
// Canonical status / method / severity pill. Centralises the repeated
// `inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px]
// font-bold ...` pattern that lives in 8+ files.

export type StatusToneName =
  | 'neutral'
  | 'brand'
  | 'emerald'
  | 'sky'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'violet'

export const STATUS_PILL_TONE: Record<StatusToneName, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  brand: 'bg-brand-50 text-ink-900 border-brand-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
}

export interface StatusPillProps {
  /** Tone controls the swatch colours. Defaults to "neutral". */
  tone?: StatusToneName
  /** Optional leading dot for active/in-progress indicators. */
  dot?: boolean
  /** Optional leading icon. */
  icon?: ReactNode
  /** Small uppercase label inside the pill. */
  children: ReactNode
  /** Render slightly larger (for hero strips / detail headers). */
  size?: 'sm' | 'md'
  className?: string
}

export function StatusPill({
  tone = 'neutral',
  dot = false,
  icon,
  children,
  size = 'sm',
  className = '',
}: StatusPillProps) {
  const sizeCls =
    size === 'md'
      ? 'px-2.5 py-1 text-[11px]'
      : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border font-bold uppercase tracking-wide ${STATUS_PILL_TONE[tone]} ${sizeCls} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  )
}

// ---- StatCard -----------------------------------------------------------
//
// Canonical "metric / KPI" tile. Used on Dashboard, DepositRequests, Users,
// Cards, POSPayment and the Portal. One primitive replaces 7 inline copies.
//
// Reading order is always: icon (optional) → label → value → sub.
// `variant` controls icon placement: 'top' (Dashboard hero), 'left'
// (stat strips), 'inline' (compact pickers).
// `tone` controls the icon swatch; the value keeps its own color so the
// card surface stays neutral.

export type StatTone =
  | 'brand'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'indigo'
  | 'ink'
  | 'neutral'

const STAT_TONE: Record<
  StatTone,
  { bg: string; text: string; border: string; value: string }
> = {
  brand: {
    bg: 'bg-brand-50',
    text: 'text-ink-900',
    border: 'border-brand-200',
    value: 'text-ink-900',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    value: 'text-emerald-700',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    value: 'text-rose-700',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    value: 'text-amber-700',
  },
  sky: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    value: 'text-sky-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    value: 'text-indigo-700',
  },
  ink: {
    bg: 'bg-ink-900',
    text: 'text-brand-400',
    border: 'border-ink-900',
    value: 'text-ink-900',
  },
  neutral: {
    bg: 'bg-ink-100',
    text: 'text-ink-700',
    border: 'border-ink-200',
    value: 'text-ink-900',
  },
}

export interface StatCardProps {
  label: string
  value: string | number
  sub?: ReactNode
  icon?: LucideIcon
  tone?: StatTone
  /** 'top' (icon above the label) | 'left' (icon left of the stack) | 'inline' (no icon, compact) */
  variant?: 'top' | 'left' | 'inline'
  /** Optional trend chip rendered next to the value (e.g. "+12.4%") */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  /** Render with the dark "featured" surface (icon becomes lime on ink-900) */
  featured?: boolean
  /** Optional right-aligned slot (e.g. a CTA link) */
  action?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
  variant = 'left',
  trend,
  featured = false,
  action,
  className = '',
}: StatCardProps) {
  const t = STAT_TONE[tone]
  const dark = featured || tone === 'ink'

  const labelCls =
    'text-[11px] font-semibold uppercase tracking-wider text-ink-500'
  const valueCls =
    'text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl'
  const subCls = 'mt-0.5 truncate text-[11px] text-ink-500'

  if (variant === 'inline') {
    return (
      <div className={`rounded-xl border border-ink-100 bg-white px-3 py-2 text-center shadow-soft ${className}`}>
        <div className={labelCls}>{label}</div>
        <div className="mt-0.5 text-xs font-bold text-ink-900">{value}</div>
        {sub && <div className="mt-0.5 truncate text-[10px] text-ink-500">{sub}</div>}
      </div>
    )
  }

  if (variant === 'top') {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-start justify-between">
          {Icon ? (
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl ${dark ? 'bg-ink-900 text-brand-400 shadow-soft' : `${t.bg} ${t.text}`}`}
            >
              <Icon className="h-4 w-4" />
            </div>
          ) : (
            <div />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <div className={valueCls}>{value}</div>
          {trend && <TrendChip trend={trend} />}
        </div>
        {sub && <div className={subCls}>{sub}</div>}
      </div>
    )
  }

  // variant === 'left' — same canonical shape as 'top' (icon above the
  // label), so all stat cards in the app look identical. The 'left' alias is
  // kept for backwards-compatible call sites; new code should prefer 'top'.
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-start justify-between">
        {Icon ? (
          <div
            className={`grid h-9 w-9 place-items-center rounded-xl ${dark ? 'bg-ink-900 text-brand-400 shadow-soft' : `${t.bg} ${t.text}`}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div />
        )}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <div className={valueCls}>{value}</div>
        {trend && <TrendChip trend={trend} />}
      </div>
      {sub && <div className={subCls}>{sub}</div>}
    </div>
  )
}

function TrendChip({ trend }: { trend: NonNullable<StatCardProps['trend']> }) {
  const tone =
    trend.direction === 'up'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : trend.direction === 'down'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-ink-100 text-ink-700 border-ink-200'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill border px-1.5 py-0.5 text-[10px] font-bold ${tone}`}
    >
      {trend.label}
    </span>
  )
}

// ---- ActionTile ---------------------------------------------------------
//
// Canonical action/shortcut tile. Used on Dashboard, Portal hero, portal
// landing feature grid, pickers (card type, user type, amount), and the
// assign-a-card / request-a-top-up CTAs.
// `variant='stacked'` puts the icon above the label (Dashboard style);
// `variant='inline'` puts the icon left of the label (Portal hero, buttons).
// `primary` paints the whole tile lime (the single highlighted action).
// `active` is the "selected" state for pickers (lime ring + fill).

export interface ActionTileProps {
  icon: LucideIcon
  label: ReactNode
  to?: string
  onClick?: () => void
  primary?: boolean
  active?: boolean
  /** Small right-aligned pill or text (e.g. "Pending · $20") */
  hint?: ReactNode
  tone?: StatTone
  variant?: 'stacked' | 'inline'
  /** Extra classes appended to the tile */
  className?: string
  /** Force full-width tile (e.g. the single "Request top-up" CTA) */
  block?: boolean
}

export function ActionTile({
  icon: Icon,
  label,
  to,
  onClick,
  primary = false,
  active = false,
  hint,
  tone = 'brand',
  variant = 'stacked',
  className = '',
  block = false,
}: ActionTileProps) {
  const t = STAT_TONE[tone]
  const base =
    'group flex items-center gap-2 rounded-2xl border p-3 transition-colors'
  const state = primary
    ? 'border-brand-500 bg-brand-500 text-ink-900 shadow-soft hover:bg-brand-400'
    : active
    ? 'border-brand-500 bg-brand-50 text-ink-900 ring-1 ring-brand-500/40'
    : 'border-ink-100 bg-white text-ink-900 hover:border-brand-300 hover:bg-brand-50'

  // 'stacked' = icon centered, label centered below (Quick actions / pickers).
  // 'inline'  = icon left, label right of it (toolbar / hero buttons).
  const size =
    variant === 'stacked'
      ? 'flex-col items-center justify-center gap-2 text-center'
      : 'justify-center gap-2'

  const iconWrap = primary
    ? 'h-6 w-6 text-ink-900'
    : active
    ? 'h-6 w-6 text-ink-900'
    : `h-6 w-6 ${t.text} group-hover:text-ink-900`

  const labelCls = primary
    ? 'text-sm font-extrabold text-ink-900'
    : 'text-sm font-semibold text-ink-900 leading-tight'

  const widthCls = block ? 'w-full justify-center' : ''

  const body = (
    <>
      <Icon className={iconWrap} />
      {variant === 'stacked' ? (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={labelCls}>{label}</span>
          {hint && <span className="shrink-0">{hint}</span>}
        </div>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
    </>
  )

  const cls = `${base} ${state} ${size} ${widthCls} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}
