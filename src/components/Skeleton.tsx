import type { ReactNode } from 'react'

export function Skeleton({
  className = '',
  rounded = 'rounded-xl',
}: {
  className?: string
  rounded?: string
}) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden bg-ink-100/80 ${rounded} ${className}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ transform: 'translateX(-100%)' }}
      />
    </div>
  )
}

export function SkeletonText({
  lines = 1,
  lastWidth = 'w-3/4',
}: {
  lines?: number
  lastWidth?: string
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? lastWidth : 'w-full'}`}
          rounded="rounded-md"
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ children }: { children?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10" rounded="rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-2.5 w-1/3" rounded="rounded-md" />
          <Skeleton className="mt-2 h-5 w-1/2" rounded="rounded-md" />
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" rounded="rounded-md" />
        ))}
      </div>
      <div className="divide-y divide-ink-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 px-5 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-3 flex-1 ${c === 0 ? 'max-w-[40%]' : ''}`}
                rounded="rounded-md"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}