import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ImageIcon, Search, X } from 'lucide-react'
import { PRESET_IMAGES, searchPresetImages, type PresetImage } from '../lib/preset-images'

interface ImagePickerModalProps {
  open: boolean
  onClose: () => void
  /** Currently-attached image URL (used to highlight + allow clearing). */
  initialValue?: string
  /** Called with the chosen URL (empty string = cleared). */
  onSelect: (url: string) => void
}

/**
 * WordPress-style media library picker. Two-pane layout: a search-and-grid
 * of preset images on the left, plus a large preview + read-only URL on the
 * right. The grid is filterable by label or tag.
 *
 * Visual language follows the rest of the app: `fixed inset-0 z-[60]` +
 * dimmed overlay + centered card with `shadow-pop`, `btn-primary` /
 * `btn-secondary` actions, and the same preset-card active state used in
 * the inline `ImageSelector` (lime border + check chip).
 */
export function ImagePickerModal({
  open,
  onClose,
  initialValue = '',
  onSelect,
}: ImagePickerModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>(initialValue)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // Reset the internal state when the modal opens/closes so re-opening
  // always starts from the caller's current value.
  useEffect(() => {
    if (open) {
      setSelected(initialValue)
      setQuery('')
      // Focus the search field shortly after the modal mounts.
      const t = window.setTimeout(() => searchRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
    return
  }, [open, initialValue])

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => searchPresetImages(query), [query])
  const selectedImage: PresetImage | undefined = useMemo(
    () => PRESET_IMAGES.find((p) => p.url === selected),
    [selected],
  )

  if (!open) return null

  function handleSelect() {
    onSelect(selected)
    onClose()
  }

  function handleClear() {
    setSelected('')
  }

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Select an image"
    >
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex h-[min(720px,92vh)] w-full max-w-3xl animate-2xl flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-ink-500" />
                <div className="text-base font-bold text-ink-900">
                  Select an image
                </div>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                Pick a preset, or keep the URL you have. Square images work
                best for the POS card.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="border-b border-ink-100 bg-ink-50/40 px-5 py-3">
            <div className="relative flex h-9 items-center rounded-full border border-ink-200 bg-white pl-3 pr-3 transition-colors focus-within:border-brand-500">
              <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search images by name or tag (e.g. pizza, drink, retail)…"
                className="h-7 w-full bg-transparent text-xs text-ink-700 placeholder:text-ink-400 focus:outline-none"
                aria-label="Search images"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="grid h-5 w-5 place-items-center rounded-full bg-ink-900/10 text-ink-700 hover:bg-ink-900/20"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Body: results grid + preview pane */}
          <div className="flex-1 overflow-hidden">
            <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr,260px]">
              <div className="overflow-y-auto p-4">
                {results.length === 0 ? (
                  <div className="grid h-full place-items-center px-6 py-10 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-500">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-ink-900">
                      No images match “{query}”
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      Try a different keyword or clear the search.
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="btn-secondary mt-4"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-500">
                      <span>
                        {results.length} image
                        {results.length === 1 ? '' : 's'}
                      </span>
                      {query && <span>matching “{query}”</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                      {results.map((img) => {
                        const active = selected === img.url
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setSelected(img.url)}
                            className={
                              active
                                ? 'group relative aspect-square overflow-hidden rounded-xl border-2 border-brand-500 ring-2 ring-brand-500/30'
                                : 'group relative aspect-square overflow-hidden rounded-xl border border-ink-200 transition-colors hover:border-ink-300'
                            }
                            title={img.label}
                            aria-label={`Use ${img.label} image`}
                            aria-pressed={active}
                          >
                            <img
                              src={img.url}
                              alt={img.label}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                            {active && (
                              <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-ink-900">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-1 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                              {img.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Preview pane (desktop only) */}
              <div className="hidden border-l border-ink-100 bg-ink-50/40 p-4 lg:flex lg:flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Preview
                </div>
                <div className="mt-2 grid flex-1 place-items-center">
                  {selected ? (
                    <div className="aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
                      <img
                        src={selected}
                        alt={selectedImage?.label ?? 'Selected image'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-square w-full max-w-[220px] place-items-center rounded-2xl border border-dashed border-ink-200 bg-white text-ink-400">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-7 w-7" />
                        <div className="mt-2 text-xs font-semibold text-ink-500">
                          No image selected
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                    Selected
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-ink-800">
                    {selectedImage?.label ?? '—'}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-ink-500">
                    {selected || 'No URL attached yet'}
                  </div>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                  >
                    <X className="h-3 w-3" /> Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse items-stretch gap-2 border-t border-ink-100 bg-ink-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-ink-500">
              {selected ? (
                <>
                  Selected:{' '}
                  <span className="font-semibold text-ink-800">
                    {selectedImage?.label ?? 'Custom URL'}
                  </span>
                </>
              ) : (
                'Pick an image to attach, or cancel to keep the existing one.'
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelect}
                className="btn-primary"
                disabled={!selected}
              >
                <Check className="h-4 w-4" />
                {selected ? 'Use this image' : 'Select an image'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
