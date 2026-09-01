import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query. Returns true when the query matches.
 *
 * SSR-safe (returns the initial value if window is unavailable) and reactive:
 * the hook re-renders the component whenever the media-query match state
 * changes.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return fallback
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

// Common breakpoints — keep in sync with Tailwind's defaults.
// sm: 640, md: 768, lg: 1024, xl: 1280, 2xl: 1536
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
