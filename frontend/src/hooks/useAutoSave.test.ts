import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from './useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('does not call the callback immediately', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[0]('value'))

    expect(fn).not.toHaveBeenCalled()
  })

  it('calls the callback with the saved args after the delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[0]('hello'))
    act(() => vi.advanceTimersByTime(500))

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('hello')
  })

  it('resets the timer and uses latest args when called again before the delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[0]('first'))
    act(() => vi.advanceTimersByTime(300))
    act(() => result.current[0]('second'))
    act(() => vi.advanceTimersByTime(499))

    expect(fn).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('flush fires the callback immediately, cancelling the timer', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[0]('pending'))
    act(() => result.current[1]())

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('pending')

    // Timer was cleared — no second call when it would have fired
    act(() => vi.advanceTimersByTime(500))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('flush does nothing when there is no pending call', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[1]())

    expect(fn).not.toHaveBeenCalled()
  })

  it('flushes a pending call on unmount', () => {
    const fn = vi.fn()
    const { result, unmount } = renderHook(() => useAutoSave(fn, 500))

    act(() => result.current[0]('pending'))
    unmount()

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('pending')
  })

  it('does not call after unmount when there is nothing pending', () => {
    const fn = vi.fn()
    const { unmount } = renderHook(() => useAutoSave(fn, 500))

    unmount()
    act(() => vi.advanceTimersByTime(500))

    expect(fn).not.toHaveBeenCalled()
  })

  it('always invokes the latest version of the callback', () => {
    let captured = ''
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave(() => { captured = value }, 500),
      { initialProps: { value: 'initial' } },
    )

    act(() => result.current[0]())
    rerender({ value: 'updated' })
    act(() => vi.advanceTimersByTime(500))

    expect(captured).toBe('updated')
  })
})
