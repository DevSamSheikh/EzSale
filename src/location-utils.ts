import type { Location, LocationStatus, LocationType, OperatingHours, POSTerminal } from './types'

export const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export const DAY_SHORT: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'store', label: 'Store' },
  { value: 'kiosk', label: 'Kiosk' },
  { value: 'counter', label: 'Counter' },
  { value: 'popup', label: 'Pop-up' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'office', label: 'Office' },
  { value: 'venue', label: 'Venue' },
]

export const LOCATION_STATUSES: { value: LocationStatus; label: string; tone: string }[] = [
  { value: 'active', label: 'Active', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'inactive', label: 'Inactive', tone: 'bg-ink-100 text-ink-700 border-ink-200' },
  { value: 'maintenance', label: 'Maintenance', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'archived', label: 'Archived', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
]

export function locationStatusLabel(s: LocationStatus) {
  return LOCATION_STATUSES.find((x) => x.value === s)?.label ?? s
}

export function locationStatusPillClass(s: LocationStatus) {
  return (
    LOCATION_STATUSES.find((x) => x.value === s)?.tone ??
    'bg-ink-100 text-ink-700 border-ink-200'
  )
}

export function locationTypeLabel(t: LocationType) {
  return LOCATION_TYPES.find((x) => x.value === t)?.label ?? t
}

/** Returns "Main · MAIN · 12 Aurora Ave" */
export function formatLocationAddress(l: Location) {
  const parts: string[] = []
  if (l.address) parts.push(l.address)
  if (l.city) parts.push(l.city)
  if (l.region) parts.push(l.region)
  if (l.country && (!l.region || l.country !== l.region)) parts.push(l.country)
  return parts.join(', ')
}

/**
 * Render operating hours in a compact, consistent form:
 *   "Mon-Fri 08:00-22:00 · Sat-Sun 09:00-21:00"
 *   "Closed Mon · Tue-Fri 10:00-20:00 · Sat-Sun Closed"
 */
export function formatOperatingHours(hours: OperatingHours[]): string {
  if (!hours || hours.length === 0) return 'No hours configured'
  // Group consecutive days with identical hours
  const groups: { days: number[]; h: OperatingHours }[] = []
  hours.forEach((h) => {
    const last = groups[groups.length - 1]
    const same = last && sameHours(last.h, h)
    if (same) {
      last.days.push(h.day)
    } else {
      groups.push({ days: [h.day], h })
    }
  })
  return groups
    .map((g) => {
      const dayLabel = formatDayRange(g.days)
      const timeLabel = g.h.closed || !g.h.open || !g.h.close ? 'Closed' : `${g.h.open}–${g.h.close}`
      return `${dayLabel} ${timeLabel}`
    })
    .join(' · ')
}

function sameHours(a: OperatingHours, b: OperatingHours) {
  return (
    Boolean(a.closed) === Boolean(b.closed) &&
    a.open === b.open &&
    a.close === b.close
  )
}

function formatDayRange(days: number[]): string {
  if (days.length === 0) return ''
  if (days.length === 1) return DAY_SHORT[days[0]]
  if (days.length === 7) return 'Every day'
  const sorted = [...days].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  if (sorted.length === max - min + 1) {
    return `${DAY_SHORT[min]}–${DAY_SHORT[max]}`
  }
  return sorted.map((d) => DAY_SHORT[d]).join(', ')
}

export function isLocationOpenNow(l: Location, now: Date = new Date()): boolean {
  if (l.status !== 'active') return false
  const day = now.getDay()
  const hours = l.hours.find((h) => h.day === day)
  if (!hours || hours.closed || !hours.open || !hours.close) return false
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const open = parseTime(hours.open)
  const close = parseTime(hours.close)
  if (open === null || close === null) return false
  return minutesNow >= open && minutesNow <= close
}

function parseTime(t: string): number | null {
  const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim())
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  return hh * 60 + mm
}

export function defaultLocationHours(): OperatingHours[] {
  return [
    { day: 1, open: '09:00', close: '21:00' },
    { day: 2, open: '09:00', close: '21:00' },
    { day: 3, open: '09:00', close: '21:00' },
    { day: 4, open: '09:00', close: '21:00' },
    { day: 5, open: '09:00', close: '22:00' },
    { day: 6, open: '10:00', close: '22:00' },
    { day: 0, open: '10:00', close: '20:00' },
  ]
}

export function terminalStatusPill(s: POSTerminal['status']) {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'maintenance':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-ink-100 text-ink-700 border-ink-200'
  }
}

export function terminalStatusLabel(s: POSTerminal['status']) {
  switch (s) {
    case 'active':
      return 'Online'
    case 'maintenance':
      return 'Maintenance'
    default:
      return 'Offline'
  }
}

/**
 * Decide if a card can be used at this location, given the
 * business.cardsUsableAcrossLocations toggle and the location-level
 * `acceptsSharedCards` flag.
 */
export function canUseCardsAcrossLocations(l: Location, globalToggle: boolean): boolean {
  if (!globalToggle) return true // card bound to its home location only — the location itself is fine
  return l.acceptsSharedCards
}