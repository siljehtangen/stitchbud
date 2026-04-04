import { useEffect, useRef, useState } from 'react'

export function useAsyncData<T>(fetchFn: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const fn = useRef(fetchFn)

  useEffect(() => {
    fn.current().then(setData).finally(() => setLoading(false))
  }, [])

  return { data, setData, loading }
}
