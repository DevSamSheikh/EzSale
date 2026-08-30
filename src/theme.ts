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
  { id: 'lime', name: 'Lime', primary: '#84eb0a', secondary: '#13171c' },
  { id: 'blue', name: 'Blue', primary: '#3a82f6', secondary: '#13171c' },
  { id: 'pink', name: 'Pink', primary: '#FF788D', secondary: '#13171c' },
  { id: 'sky', name: 'Sky', primary: '#30AFFF', secondary: '#13171c' },
  { id: 'violet', name: 'Violet', primary: '#8b5cf6', secondary: '#13171c' },
  { id: 'amber', name: 'Amber', primary: '#f59e0b', secondary: '#13171c' },
  { id: 'teal', name: 'Teal', primary: '#14b8a6', secondary: '#13171c' },
  { id: 'rose', name: 'Rose', primary: '#f43f5e', secondary: '#13171c' },
  { id: 'emerald', name: 'Emerald', primary: '#10b981', secondary: '#13171c' },
]

/**
 * A second set of accent colors for users who want a brighter, more saturated
 * palette. These are rendered in their own row in the Appearance picker.
 */
export const VIBRANT_PRESETS: ThemePreset[] = [
  { id: 'vibrant-teal', name: 'Teal', primary: '#24b1b1', secondary: '#13171c' },
  { id: 'vibrant-orange', name: 'Orange', primary: '#ff6a1c', secondary: '#13171c' },
  { id: 'vibrant-sea', name: 'Sea Green', primary: '#34a99d', secondary: '#13171c' },
  { id: 'vibrant-deep-orange', name: 'Deep Orange', primary: '#fb6c00', secondary: '#13171c' },
  { id: 'vibrant-material-blue', name: 'Material Blue', primary: '#2196f3', secondary: '#13171c' },
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
  SCALE_STOPS.forEach((stop, i) => {
    const brandRgb = hexToRgb(brand[i])
    const inkRgb = hexToRgb(ink[i])
    root.style.setProperty(
      `--brand-${stop}-rgb`,
      `${brandRgb.r} ${brandRgb.g} ${brandRgb.b}`,
    )
    root.style.setProperty(
      `--ink-${stop}-rgb`,
      `${inkRgb.r} ${inkRgb.g} ${inkRgb.b}`,
    )
  })
  // Compute the readable text color for each scale. The 500 stop is the
  // accent / "true" color, so we decide text contrast off that. Using sRGB
  // luminance (gamma-corrected) instead of raw 0-255 average gives a much
  // more accurate threshold for color brightness.
  const brandRgb = hexToRgb(brand[5]) // brand-500
  const inkRgb = hexToRgb(ink[5]) // ink-500
  const brandTextRgb = readableOn(brandRgb) ? WHITE_RGB : CHARCOAL_RGB
  const inkTextRgb = readableOn(inkRgb) ? WHITE_RGB : CHARCOAL_RGB
  root.style.setProperty(
    '--text-on-brand-rgb',
    `${brandTextRgb.r} ${brandTextRgb.g} ${brandTextRgb.b}`,
  )
  root.style.setProperty(
    '--text-on-ink-rgb',
    `${inkTextRgb.r} ${inkTextRgb.g} ${inkTextRgb.b}`,
  )
  root.style.setProperty('--theme-secondary', theme.secondary)
  root.style.setProperty('--theme-primary', theme.primary)
}

// ---- Readable-text decision ----------------------------------------------

const WHITE_RGB = { r: 255, g: 255, b: 255 }
const CHARCOAL_RGB = { r: 19, g: 23, b: 28 } // matches ink-900

// sRGB relative luminance (gamma-corrected, per WCAG). Returns 0..1.
function srgbLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

// Returns true if the given background is dark enough that white text reads
// better. Threshold ~0.55 sits between mid-saturated (lime) and dark
// (charcoal, navy), so the choice always matches the live preview.
function readableOn(rgb: { r: number; g: number; b: number }): boolean {
  return srgbLuminance(rgb.r, rgb.g, rgb.b) < 0.55
}

// ---- Palette derivation ---------------------------------------------------
//
// A 10-stop scale (50/100/200/300/400/500/600/700/800/900) is derived from a
// single hex color. **The picked color always becomes stop 500** (so buttons
// and pills that use `bg-brand-500` match the preset the user clicked), and
// the other stops are tinted/darkened versions of the same hue.
//
// Algorithm: convert the hex to HSL, then for each stop map to a target
// lightness while keeping hue and chroma constant. Lightness 0.5 (mid-tone)
// is reserved for the 500 stop so that, for example, picking #84eb0a yields
// the exact lime at brand-500, with tints up to brand-50 and shades down to
// brand-900. This matches the "preset stays the preset" expectation.

export const SCALE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const

// Target lightness for each stop. The 500 stop uses the actual lightness
// of the picked color; the others are well-spaced tints (50-400) and
// shades (600-900). The 0.97 / 0.55 extremes are calibrated so a vivid
// brand color (e.g. lime at L≈0.85) doesn't produce a brand-50 that's
// indistinguishable from white, or a brand-900 that's pure black.
const LIGHTNESS_BY_STOP: Record<number, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.86,
  300: 0.77,
  400: 0.66,
  500: NaN, // computed from the picked color
  600: 0.42,
  700: 0.34,
  800: 0.26,
  900: 0.18,
}

function buildScale(hex: string): string[] {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  // Slightly reduce chroma at the very light / very dark stops to keep the
  // tints/shades looking clean instead of muddy.
  return SCALE_STOPS.map((stop) => {
    const target =
      stop === 500
        ? l
        : (LIGHTNESS_BY_STOP[stop] as number)
    const chromaScale =
      stop <= 100 || stop >= 800
        ? 0.6 // tone down tints/shades
        : stop === 500
        ? 1
        : 0.9
    const sAdj = Math.max(0, Math.min(1, s * chromaScale))
    return hslToHex(h, sAdj, target)
  })
}

// ---- Color math ----------------------------------------------------------

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h *= 60
  }
  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  )
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
