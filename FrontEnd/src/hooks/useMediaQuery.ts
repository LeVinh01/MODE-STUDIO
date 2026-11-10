import { useSyncExternalStore, useCallback } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') {
        return () => {}
      }
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', callback)
      return () => {
        mediaQueryList.removeEventListener('change', callback)
      }
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
