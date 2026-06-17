import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsyncData<T>(fetchFn: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const fn = useRef(fetchFn)
  fn.current = fetchFn

  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fn.current()
      .then(result => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          console.error('[useAsyncData] fetch error:', err)
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [tick])

  return { data, setData, loading, error, refetch }
}
