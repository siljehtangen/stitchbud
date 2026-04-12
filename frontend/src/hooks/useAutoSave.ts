import { useCallback, useEffect, useRef } from 'react'

export function useAutoSave<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
): [save: (...args: T) => void, flush: () => void] {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingArgsRef = useRef<T | null>(null)

  useEffect(() => { callbackRef.current = callback })

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingArgsRef.current) {
      callbackRef.current(...pendingArgsRef.current)
      pendingArgsRef.current = null
    }
  }, [])

  useEffect(() => () => flush(), [flush])

  const save = useCallback((...args: T) => {
    pendingArgsRef.current = args
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingArgsRef.current) {
        callbackRef.current(...pendingArgsRef.current)
        pendingArgsRef.current = null
      }
      timerRef.current = null
    }, delay)
  }, [delay])

  return [save, flush]
}
