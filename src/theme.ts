// ---------------------------------------------------------------------------
// Theme system
// ---------------------------------------------------------------------------
//
// The app's accent palette (brand) and neutral palette (ink) are derived from
// a single primary and secondary color picked by the user. Tailwind classes
// such as `bg-brand-500` or `text-ink-900` read CSS variables that are set
// on :root by this module. The values are persisted to localStorage so they
// survive reloads, and a small bootstrap script in index.html applies the
// saved theme before React mounts to avoid a flash of unstyled colors.

export interface ThemePreset {
  id: string
  name: string
  /** The single hue the user picks. A 9-shade scale is derived from this. */
  primary: string
  /** Neutral/text color. A 9-shade scale is derived from this. */
  secondary: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'lime-charcoal', name: 'Lime / Charcoal', primary: '#84eb0a', secondary: '#13171c' },
  { id: 'blue-navy', name: 'Blue / Navy', primary: '#3a82f6', secondary: '#0b1d3a' },
  { id: 'pink-charcoal', name: 'Pink / Charcoal', primary: '#FF788D', secondary: '#13171c' },
  { id: 'sky-charcoal', name: 'Sky / Charcoal', primary: '#30AFFF', secondary: '#13171c' },
  { id: 'violet-charcoal', name: 'Violet / Charcoal', primary: '#8b5cf6', secondary: '#13171c' },
  { id: 'amber-charcoal', name: 'Amber / Charcoal', primary: '#f59e0b', secondary: '#13171c' },
  { id: 'teal-charcoal', name: 'Teal / Charcoal', primary: '#14b8a6', secondary: '#13171c' },
  { id: 'rose-charcoal', name: 'Rose / Charcoal', primary: '#f43f5e', secondary: '#13171c' },
  { id: 'emerald-charcoal', name: 'Emerald / Charcoal', primary: '#10b981', secondary: '#13171c' },
  { id: 'lime-black', name: 'Lime / Black', primary: '#84eb0a', secondary: '#000000' },
  { id: 'blue-black', name: 'Blue / Black', primary: '#3a82f6', secondary: '#000000' },
  { id: 'pink-black', name: 'Pink / Black', primary: '#FF788D', secondary: '#000000' },
  { id: 'sky-black', name: 'Sky / Black', primary: '#30AFFF', secondary: '#000000' },
  { id: 'violet-black', name: 'Violet / Black', primary: '#8b5cf6', secondary: '#000000' },
  { id: 'amber-black', name: 'Amber / Black', primary: '#f59e0b', secondary: '#000000' },
  { id: 'teal-black', name: 'Teal / Black', primary: '#14b8a6', secondary: '#000000' },
]

export const SECONDARY_PRESETS: { id: string; name: string; value: string }[] = [
  { id: 'charcoal', name: 'Charcoal', value: '#13171c' },
  { id: 'black', name: 'Black', value: '#000000' },
  { id: 'slate', name: 'Slate', value: '#1e293b' },
  { id: 'stone', name: 'Stone', value: '#292524' },
  { id: 'navy', name: 'Navy', value: '#0b1d3a' },
  { id: 'ink-700', name: 'Ink 700', value: '#2a3038' },
]

export interface Theme {
  primary: string
  secondary: string
}

export const DEFAULT_THEME: Theme = {
  primary: '#84eb0a',
  secondary: '#13171c',
}

const STORAGE_KEY = 'ezsale:theme'

function safeRead(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    const parsed = JSON.parse(raw) as Partial<Theme>
    if (typeof parsed.primary !== 'string' || typeof parsed.secondary !== 'string') {
      return DEFAULT_THEME
    }
    return { primary: parsed.primary, secondary: parsed.secondary }
  } catch {
    return DEFAULT_THEME
  }
}

export function getTheme(): Theme {
  return safeRead()
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  } catch {
    /* ignore */
  }
  applyTheme(theme)
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const brand = buildScale(theme.primary)
  const ink = buildScale(theme.secondary)
  // Tailwind needs the raw "R G B" components (no rgb() wrapper) so it can
  // apply alpha modifiers like `bg-brand-500/60`.
  brand.forEach((hex, i) => {
    const { r, g, b } = hexToRgb(hex)
    root.style.setProperty(`--brand-${i * 100 + 50}-rgb`, `${r} ${g} ${b}`)
  })
  ink.forEach((hex, i) => {
    const { r, g, b } = hexToRgb(hex)
    root.style.setProperty(`--ink-${i * 100 + 50}-rgb`, `${r} ${g} ${b}`)
  })
  root.style.setProperty('--theme-secondary', theme.secondary)
  root.style.setProperty('--theme-primary', theme.primary)
}

// ---- Palette derivation ---------------------------------------------------
//
// A 9-stop scale (50…900) is derived from a single hex color. We pick
// well-spaced lightness stops (97 → 6) and adjust the hue slightly to keep
// mid-shades from looking muddy. This is intentionally simple — good enough
// for the whole app to pick "the same brand color" across light and dark UI.

function buildScale(hex: string): string[] {
  const { r, g, b } = hexToRgb(hex)
  // Nine targets: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 → 9 stops.
  // We'll produce 9 values that cover the full range from very light to very dark.
  const lightTargets = [0.97, 0.92, 0.85, 0.74, 0.6, 0.5, 0.42, 0.32, 0.18]
  return lightTargets.map((target) => mixToLightness(r, g, b, target))
}

function mixToLightness(r: number, g: number, b: number, target: number): string {
  // Mix the color toward white (if target > current lightness) or black
  // (if target < current lightness) to hit the requested lightness.
  const currentL = relativeLuminance(r, g, b)
  if (Math.abs(currentL - target) < 0.01) return rgbToHex(r, g, b)
  if (currentL > target) {
    // mix toward black
    const t = (currentL - target) / currentL
    return rgbToHex(
      Math.round(r * (1 - t)),
      Math.round(g * (1 - t)),
      Math.round(b * (1 - t)),
    )
  }
  // mix toward white
  const t = (target - currentL) / (1 - currentL)
  return rgbToHex(
    Math.round(r + (255 - r) * t),
    Math.round(g + (255 - g) * t),
    Math.round(b + (255 - b) * t),
  )
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim()
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Subscribers — used so React can re-render components that show the active
// theme colors (e.g. the swatch selection state).
type Listener = (theme: Theme) => void
const listeners = new Set<Listener>()

export function subscribeTheme(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function notify(theme: Theme) {
  listeners.forEach((l) => l(theme))
}

export function setPrimary(primary: string): void {
  const next: Theme = { ...getTheme(), primary }
  setTheme(next)
  notify(next)
}

export function setSecondary(secondary: string): void {
  const next: Theme = { ...getTheme(), secondary }
  setTheme(next)
  notify(next)
}

export function setBoth(primary: string, secondary: string): void {
  const next: Theme = { primary, secondary }
  setTheme(next)
  notify(next)
}
