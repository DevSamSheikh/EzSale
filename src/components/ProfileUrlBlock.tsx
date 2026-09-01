import { useMemo } from 'react'
import { ExternalLink, Link as LinkIcon } from 'lucide-react'
import { CopyButton } from './CopyButton'

export interface ProfileUrlBlockProps {
  /** Path-only slug, e.g. "amelia-park" — full URL is built from window.location.origin. */
  slug?: string | null
  /** Route prefix — defaults to `/u/` (member portal). */
  routePrefix?: string
  /** Optional label override (e.g. "Member portal" / "Operator profile"). */
  label?: string
  /** Optional hint below the URL (e.g. "Default password: 1234"). */
  hint?: string
  /** Hide the "Open" link (when the user can't open it from this context). */
  hideOpen?: boolean
  className?: string
}

/**
 * Reusable "your unique profile URL" block. Reads the origin from
 * `window.location` so the link works in every environment (preview,
 * deployed, preview-tunnel). Used on member / operator / card detail
 * pages and the portal dashboard header.
 */
export function ProfileUrlBlock({
  slug,
  routePrefix = '/u/',
  label = 'Portal link',
  hint,
  hideOpen = false,
  className = '',
}: ProfileUrlBlockProps) {
  const fullUrl = useMemo(() => {
    if (!slug) return null
    if (typeof window === 'undefined') return `${routePrefix}${slug}`
    return `${window.location.origin}${routePrefix}${slug}`
  }, [slug, routePrefix])

  if (!slug) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-3 text-[11px] text-ink-500 ${className}`}
      >
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-ink-400">
          <LinkIcon className="h-3 w-3" /> {label}
        </div>
        <p className="mt-1">No unique slug set yet — ask an admin to publish this profile.</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border border-ink-100 bg-white p-3 shadow-soft ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          <LinkIcon className="h-3 w-3" /> {label}
        </div>
        {!hideOpen && fullUrl && (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-700 hover:text-ink-900"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-ink-100 bg-ink-50/60 px-2.5 py-1.5 font-mono text-xs text-ink-700">
          {fullUrl}
        </code>
        <CopyButton value={fullUrl ?? ''} ariaLabel={`Copy ${label}`} />
      </div>
      {hint && <p className="mt-2 text-[11px] text-ink-500">{hint}</p>}
    </div>
  )
}