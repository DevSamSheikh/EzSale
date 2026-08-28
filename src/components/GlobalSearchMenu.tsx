import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpRight,
  CreditCard,
  CornerDownLeft,
  Package,
  Receipt,
  Search,
  Sparkles,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react'
import { globalSearch, type SearchHit, type SearchResults } from '../lib/global-search'

const BADGE_TONE: Record<NonNullable<SearchHit['badgeTone']>, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  ink: 'bg-ink-100 text-ink-700 border-ink-200',
  brand: 'bg-brand-50 text-brand-800 border-brand-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function HitIcon({ kind }: { kind?: SearchHit['iconKind'] }) {
  const cls = 'h-4 w-4'
  switch (kind) {
    case 'product':
      return <Package className={cls} />
    case 'order':
      return <Receipt className={cls} />
    case 'user':
      return <UserIcon className={cls} />
    case 'card':
      return <CreditCard className={cls} />
    case 'deposit':
      return <ArrowDownToLine className={cls} />
    case 'txn':
      return <Wallet className={cls} />
    default:
      return <Sparkles className={cls} />
  }
}

const GROUP_META: Record<
  SearchResults['groups'][number]['id'],
  { label: string; tone: string; icon: typeof Package }
> = {
  products: {
    label: 'Products',
    tone: 'bg-brand-50 text-brand-800 border-brand-200',
    icon: Package,
  },
  orders: {
    label: 'Orders',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Receipt,
  },
  users: {
    label: 'Members',
    tone: 'bg-ink-100 text-ink-800 border-ink-200',
    icon: UserIcon,
  },
  cards: {
    label: 'Cards',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: CreditCard,
  },
  deposits: {
    label: 'Deposits',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ArrowDownToLine,
  },
  transactions: {
    label: 'Withdraws',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Wallet,
  },
}

interface GlobalSearchMenuProps {
  open: boolean
  query: string
  onQueryChange: (q: string) => void
  onClose: () => void
}

export function GlobalSearchMenu({
  open,
  query,
  onQueryChange,
  onClose,
}: GlobalSearchMenuProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const results: SearchResults = useMemo(() => globalSearch(query), [query])
  const flatHits = useMemo(() => results.groups.flatMap((g) => g.items), [results])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(flatHits.length - 1, i + 1))
        scrollActiveIntoView()
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        scrollActiveIntoView()
        return
      }
      if (e.key === 'Enter') {
        const hit = flatHits[activeIndex]
        if (hit) {
          e.preventDefault()
          navigate(hit.href)
          onClose()
        }
      }
    }
    function scrollActiveIntoView() {
      requestAnimationFrame(() => {
        const el = dialogRef.current?.querySelector<HTMLElement>('[data-active="true"]')
        el?.scrollIntoView({ block: 'nearest' })
      })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, flatHits, activeIndex, navigate, onClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[60] flex items-start justify-center px-3 pb-3 pt-[10vh] sm:pt-[14vh]"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/40 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop animate-[popIn_0.18s_ease-out]"
      >
        <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-3 sm:px-4 sm:py-3.5">
          <Search className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search products, orders, members, cards, deposits…"
            className="flex-1 bg-transparent text-base text-ink-800 placeholder:text-ink-400 focus:outline-none"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-500 sm:inline-block">
            Esc
          </kbd>
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {query.trim() === '' && <EmptyHint />}

          {query.trim() !== '' && results.groups.length === 0 && (
            <NoResults query={query} onClear={() => onQueryChange('')} />
          )}

          {results.groups.map((group) => {
            const meta = GROUP_META[group.id]
            const GroupIcon = meta.icon
            return (
              <div key={group.id} className="border-b border-ink-100 last:border-0">
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-md border ${meta.tone}`}
                    >
                      <GroupIcon className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-700">
                      {meta.label}
                    </span>
                  </div>
                  <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                    {group.count}
                  </span>
                </div>
                <ul>
                  {group.items.map((hit, idx) => {
                    const flatIdx = results.groups
                      .slice(0, results.groups.indexOf(group))
                      .reduce((s, g) => s + g.items.length, 0) + idx
                    const active = flatIdx === activeIndex
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          data-active={active ? 'true' : 'false'}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                          onClick={() => {
                            navigate(hit.href)
                            onClose()
                          }}
                          className={
                            active
                              ? 'flex w-full items-center gap-3 border-l-2 border-brand-500 bg-brand-50/60 px-4 py-2.5 text-left'
                              : 'flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-left hover:bg-ink-50'
                          }
                          role="option"
                          aria-selected={active}
                        >
                          <span
                            className={
                              active
                                ? 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900 text-brand-400'
                                : 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700'
                            }
                          >
                            <HitIcon kind={hit.iconKind} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-ink-900">
                                {hit.title}
                              </span>
                              {hit.badge && (
                                <span
                                  className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    BADGE_TONE[hit.badgeTone ?? 'ink']
                                  }`}
                                >
                                  {hit.badge}
                                </span>
                              )}
                            </span>
                            {(hit.subtitle || hit.meta) && (
                              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-500">
                                {hit.subtitle && (
                                  <span className="truncate">{hit.subtitle}</span>
                                )}
                                {hit.subtitle && hit.meta && <span className="text-ink-300">·</span>}
                                {hit.meta && <span className="truncate">{hit.meta}</span>}
                              </span>
                            )}
                          </span>
                          {active && (
                            <span className="hidden items-center gap-1 rounded-pill bg-ink-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:inline-flex">
                              <CornerDownLeft className="h-3 w-3" /> open
                            </span>
                          )}
                          {!active && (
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {group.count >= 5 && (
                  <div className="px-4 pb-2.5">
                    <button
                      onClick={() => {
                        navigate(group.allHref)
                        onClose()
                      }}
                      className="text-[11px] font-semibold text-ink-700 hover:underline"
                    >
                      View all {meta.label.toLowerCase()} results →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/60 px-3 py-2 text-[10px] text-ink-500 sm:px-4">
          <span className="font-semibold text-ink-700">
            {query.trim() === ''
              ? 'Search anywhere'
              : `${results.total} result${results.total === 1 ? '' : 's'}`}
          </span>
          <span className="flex items-center gap-3">
            <KbdHint k="↑↓" label="navigate" />
            <KbdHint k="↵" label="open" />
            <KbdHint k="esc" label="close" />
          </span>
        </div>
      </div>

      <style>{`@keyframes popIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>,
    document.body,
  )
}

function KbdHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-700 shadow-soft">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  )
}

function EmptyHint() {
  const groups: { id: SearchResults['groups'][number]['id']; hint: string }[] = [
    { id: 'products', hint: 'Try "pizza", "burger", or a category name.' },
    { id: 'orders', hint: 'Try a transaction ID like "EZ-1042".' },
    { id: 'users', hint: 'Try a member name, email, or phone.' },
    { id: 'cards', hint: 'Try a card number (last 4) or NFC UID.' },
    { id: 'deposits', hint: 'Try a reference, method, or amount.' },
    { id: 'transactions', hint: 'Try a member name, card number, or item name.' },
  ]
  return (
    <div className="px-4 py-6">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">
        Search across your business
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {groups.map((g) => {
          const meta = GROUP_META[g.id]
          const Icon = meta.icon
          return (
            <div
              key={g.id}
              className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/40 p-3"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${meta.tone}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink-900">{meta.label}</div>
                <div className="truncate text-[11px] text-ink-500">{g.hint}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-500">
        <Search className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-bold text-ink-900">
        No results for “{query}”
      </div>
      <div className="mt-1 text-xs text-ink-500">
        Try a different keyword — names, IDs, card numbers, or amounts.
      </div>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
      >
        Clear search
      </button>
    </div>
  )
}
