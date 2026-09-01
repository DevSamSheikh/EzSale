import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { playCue } from '../audio'

export interface CopyButtonProps {
  /** The value to copy to clipboard. */
  value: string
  /** Optional visual label (defaults to nothing — icon-only). */
  label?: string
  /** Aria-label override (defaults to "Copy to clipboard"). */
  ariaLabel?: string
  /** Optional size variant — 'sm' (default), 'md', 'lg'. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Self-contained "copy to clipboard" button with a 2-second "Copied!"
 * confirmation. Falls back to a textarea-based copy if `navigator.clipboard`
 * is unavailable (older browsers, insecure contexts).
 */
export function CopyButton({
  value,
  label,
  ariaLabel = 'Copy to clipboard',
  size = 'sm',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const sizeCls =
    size === 'lg'
      ? 'h-10 px-3 text-sm'
      : size === 'md'
      ? 'h-9 px-3 text-xs'
      : 'h-8 px-2.5 text-xs'

  async function handleClick() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        // Fallback for browsers without clipboard API
        const ta = document.createElement('textarea')
        ta.value = value
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      playCue('success')
    } catch {
      playCue('error')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-ink-900 disabled:opacity-50 ${sizeCls} ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          {label ? 'Copied' : <span className="sr-only">Copied</span>}
          {label && <span>{label}</span>}
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  )
}