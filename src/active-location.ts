import { useEffect, useState } from 'react'
import { getActiveLocations, getDefaultLocationId, getLocation } from './orders-store'

const KEY_ACTIVE_LOCATION = 'ezsale:active-location'

function readActive(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY_ACTIVE_LOCATION)
}

/**
 * Tracks the user's currently-selected location (used by the Topbar chip
 * and the POS to tag transactions).
 */
export function useActiveLocation() {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === 'undefined') return getDefaultLocationId()
    const stored = readActive()
    if (stored) return stored
    return getDefaultLocationId()
  })

  useEffect(() => {
    function onStorage() {
      setActiveId(readActive() ?? getDefaultLocationId())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const location = getLocation(activeId)

  return {
    location,
    activeId,
    setActiveId: (id: string) => {
      localStorage.setItem(KEY_ACTIVE_LOCATION, id)
      setActiveId(id)
      window.dispatchEvent(new Event('storage'))
    },
  }
}

/** Returns the active location id synchronously. */
export function getActiveLocationIdSync(): string {
  if (typeof window === 'undefined') return getDefaultLocationId()
  const stored = readActive()
  if (stored && getActiveLocations().some((l) => l.id === stored)) return stored
  return getDefaultLocationId()
}

export function getActiveLocationSync() {
  return getLocation(getActiveLocationIdSync())
}

/**
 * Pub-sub hook so any component can re-render when the active location
 * changes (used by KPI tiles / dashboard).
 */
export function useActiveLocationTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    function bump() {
      setTick((t) => t + 1)
    }
    window.addEventListener('storage', bump)
    return () => window.removeEventListener('storage', bump)
  }, [])
  return tick
}