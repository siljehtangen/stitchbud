import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a debounced version of the callback that fires after `delay` ms of
 * inactivity. The timer is cleared automatically on unmount.
 *
 * The callback ref is kept up-to-date so the latest closure is always called —
 * no need to manually manage refs to avoid stale captures.
 */
export function useDebouncedCallback<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { callbackRef.current = callback })

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return useCallback((...args: T) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])
}
