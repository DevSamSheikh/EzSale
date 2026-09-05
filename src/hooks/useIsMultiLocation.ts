import { useEffect, useState } from 'react'
import { getBusiness } from '../store'

/**
 * Returns the current `business.locations.multiLocation` flag.
 *
 * Multi-location is an opt-in capability — when it is disabled the
 * application behaves as a single-location business and the UI should
 * hide all the multi-location-only chrome (location pickers, "Sales by
 * location" breakdowns, per-operator location assignment, etc.).
 *
 * We re-read the flag whenever the page regains focus or any
 * `storage` event fires, so a Settings change reflects everywhere
 * without a manual reload.
 */
export function useIsMultiLocation(): boolean {
  const [multi, setMulti] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!getBusiness()?.locations?.multiLocation
  })

  useEffect(() => {
    function refresh() {
      setMulti(!!getBusiness()?.locations?.multiLocation)
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return multi
}