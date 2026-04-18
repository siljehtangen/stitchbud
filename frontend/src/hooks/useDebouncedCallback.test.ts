import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedCallback } from './useDebouncedCallback'

describe('useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('does not call the callback immediately', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => result.current('hello'))

    expect(fn).not.toHaveBeenCalled()
  })

  it('calls the callback after the specified delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => result.current('hello'))
    act(() => vi.advanceTimersByTime(300))

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('hello')
  })

  it('resets the timer when called again before the delay elapses', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => result.current('first'))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current('second'))
    act(() => vi.advanceTimersByTime(299))

    expect(fn).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('does not call the callback after unmount', () => {
    const fn = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => result.current('hello'))
    unmount()
    act(() => vi.advanceTimersByTime(300))

    expect(fn).not.toHaveBeenCalled()
  })

  it('always invokes the latest version of the callback', () => {
    let captured = ''
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useDebouncedCallback(() => { captured = value }, 300),
      { initialProps: { value: 'initial' } },
    )

    act(() => result.current())
    rerender({ value: 'updated' })
    act(() => vi.advanceTimersByTime(300))

    expect(captured).toBe('updated')
  })
})
