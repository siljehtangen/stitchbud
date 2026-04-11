import { useEffect, useRef, useState } from 'react'

export function useAsyncData<T>(fetchFn: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const fn = useRef(fetchFn)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fn.current()
      .then(result => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return { data, setData, loading, error }
}
