import { useEffect, useState } from 'react'
import {
  Download,
  Mail,
  Maximize2,
  Minimize2,
  Printer,
  X,
} from 'lucide-react'
import {
  ReceiptDocument,
  receiptToHtml,
  receiptToText,
  type ReceiptContext,
  type ReceiptLayout,
} from './ReceiptDocument'
import { playCue } from '../audio'

export interface ReceiptPreviewModalProps {
  ctx: ReceiptContext
  open: boolean
  onClose: () => void
  /** When true, "New order" button is rendered. */
  onNewOrder?: () => void
}

export function ReceiptPreviewModal({
  ctx,
  open,
  onClose,
  onNewOrder,
}: ReceiptPreviewModalProps) {
  const [layout, setLayout] = useState<ReceiptLayout>('thermal')
  const [zoomed, setZoomed] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'opening' | 'copied' | 'error'>(
    'idle',
  )
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'html'>('txt')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handlePrint()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, layout])

  if (!open) return null

  const t = ctx.transaction
  const business = ctx.business

  function handlePrint() {
    playCue('tap')
    window.print()
  }

  function handleDownload(format: 'txt' | 'html') {
    playCue('success')
    if (format === 'txt') {
      const text = receiptToText(ctx)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      triggerDownload(blob, `receipt-${t.id}.txt`)
    } else {
      const html = receiptToHtml(ctx)
      const blob = new Blob([`<!doctype html>${html}`], { type: 'text/html;charset=utf-8' })
      triggerDownload(blob, `receipt-${t.id}.html`)
    }
  }

  function handleEmail() {
    playCue('tap')
    const to = ctx.member?.email ?? ''
    const subject = encodeURIComponent(
      `Receipt ${t.id} · ${business.name}`,
    )
    const body = encodeURIComponent(receiptToText(ctx))
    const href = `mailto:${to}?subject=${subject}&body=${body}`
    try {
      window.location.href = href
      setEmailStatus('opening')
      setTimeout(() => setEmailStatus('idle'), 2200)
    } catch {
      setEmailStatus('error')
    }
  }

  function handleCopyText() {
    const text = receiptToText(ctx)
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setEmailStatus('copied')
          playCue('success')
          setTimeout(() => setEmailStatus('idle'), 1800)
        })
        .catch(() => setEmailStatus('error'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Receipt preview"
    >
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-ink-50 sm:inset-4 sm:rounded-3xl sm:border sm:border-ink-100 sm:shadow-pop">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <div className="text-sm font-bold text-ink-900 sm:text-base">Receipt preview</div>
            <div className="mt-0.5 truncate text-[11px] text-ink-500 sm:text-xs">
              <span className="font-mono">{t.id}</span> ·{' '}
              {new Date(t.createdAt).toLocaleString()} · {business.name}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              role="tablist"
              aria-label="Receipt layout"
              className="inline-flex h-9 items-center rounded-full border border-ink-200 bg-white p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={layout === 'thermal'}
                onClick={() => {
                  setLayout('thermal')
                  playCue('tap')
                }}
                className={
                  layout === 'thermal'
                    ? 'inline-flex h-8 items-center rounded-full bg-ink-900 px-3 text-[11px] font-bold text-white'
                    : 'inline-flex h-8 items-center rounded-full px-3 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
                }
              >
                Thermal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={layout === 'standard'}
                onClick={() => {
                  setLayout('standard')
                  playCue('tap')
                }}
                className={
                  layout === 'standard'
                    ? 'inline-flex h-8 items-center rounded-full bg-ink-900 px-3 text-[11px] font-bold text-white'
                    : 'inline-flex h-8 items-center rounded-full px-3 text-[11px] font-bold text-ink-700 hover:bg-ink-50'
                }
              >
                Standard
              </button>
            </div>
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
              title={zoomed ? 'Exit zoom' : 'Zoom in'}
              aria-label={zoomed ? 'Exit zoom' : 'Zoom in'}
            >
              {zoomed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt preview area */}
        <div
          className={`flex-1 overflow-y-auto bg-ink-100/60 p-4 sm:p-6 ${
            zoomed ? 'flex items-center justify-center' : ''
          }`}
        >
          <div
            className={`mx-auto ${
              zoomed ? 'w-full max-w-3xl' : 'w-full max-w-2xl'
            } transition-all`}
            style={{ transform: zoomed ? 'scale(1.05)' : 'none', transformOrigin: 'top center' }}
          >
            <ReceiptDocument ctx={ctx} layout={layout} />
            <div className="mt-4 text-center text-[11px] text-ink-500 print:hidden">
              {layout === 'thermal' ? (
                <>
                  Preview is rendered at 80 mm thermal-printer proportions. The print
                  stylesheet keeps the same width.
                </>
              ) : (
                <>
                  Preview is rendered at A4 / US-letter proportions. Use your
                  browser&apos;s print dialog to choose a paper size.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="border-t border-ink-100 bg-white px-4 py-3 sm:px-6 sm:py-4 print:hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-pill bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800"
              >
                <Printer className="h-3.5 w-3.5" /> Print receipt
              </button>
              <div className="relative">
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as 'txt' | 'html')}
                  className="sr-only"
                  aria-label="Download format"
                  tabIndex={-1}
                >
                  <option value="txt">Text (.txt)</option>
                  <option value="html">HTML (.html)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDownload(downloadFormat)}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
                >
                  <Download className="h-3.5 w-3.5" /> Download · {downloadFormat.toUpperCase()}
                </button>
              </div>
              <button
                type="button"
                onClick={handleEmail}
                className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {emailStatus === 'opening' ? 'Opening email…' : 'Email receipt'}
              </button>
              {!ctx.member?.email && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
                >
                  Copy text
                </button>
              )}
              {emailStatus === 'copied' && (
                <span className="text-[11px] font-semibold text-emerald-700">
                  Copied to clipboard
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {onNewOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onNewOrder()
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-brand-500 px-3 py-2 text-xs font-extrabold text-ink-900 shadow-soft hover:bg-brand-400"
                >
                  New order
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <PrintStyles layout={layout} />
    </div>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function PrintStyles({ layout }: { layout: ReceiptLayout }) {
  if (layout === 'thermal') {
    return (
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { background: #fff !important; }
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute !important; left: 0; top: 0;
            width: 72mm; max-width: 72mm;
            background: #fff !important; color: #000 !important;
            padding: 0 !important; margin: 0 !important;
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
            font-size: 11px !important; line-height: 1.35 !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    )
  }
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 12mm; }
        body { background: #fff !important; }
        body * { visibility: hidden; }
        #receipt-standard, #receipt-standard * { visibility: visible; }
        #receipt-standard {
          position: absolute !important; left: 0; top: 0;
          width: 100%; max-width: 100%;
          background: #fff !important; color: #000 !important;
          padding: 0 !important; margin: 0 !important;
          box-shadow: none !important; border: 0 !important;
        }
        .print\\:hidden { display: none !important; }
      }
    `}</style>
  )
}
