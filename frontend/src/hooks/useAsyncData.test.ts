import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsyncData } from './useAsyncData'

describe('useAsyncData', () => {
  it('starts with loading=true and the initial value', () => {
    const fetchFn = vi.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAsyncData(fetchFn, [] as string[]))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets data and clears loading after a successful fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue(['a', 'b'])
    const { result } = renderHook(() => useAsyncData(fetchFn, [] as string[]))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('sets error and clears loading after a failed fetch', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useAsyncData(fetchFn, null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error?.message).toBe('network error')
    expect(result.current.data).toBeNull()
  })

  it('wraps a non-Error rejection in an Error object', async () => {
    const fetchFn = vi.fn().mockRejectedValue('plain string')
    const { result } = renderHook(() => useAsyncData(fetchFn, null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('plain string')
  })

  it('refetch triggers a second fetch call', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data')
    const { result } = renderHook(() => useAsyncData(fetchFn, null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.refetch())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('refetch clears a previous error', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValue('recovered')

    const { result } = renderHook(() => useAsyncData(fetchFn, null))
    await waitFor(() => expect(result.current.error).not.toBeNull())

    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('recovered')
  })

  it('setData updates state directly without triggering a fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue('original')
    const { result } = renderHook(() => useAsyncData<string | null>(fetchFn, null))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => result.current.setData('overridden'))

    expect(result.current.data).toBe('overridden')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not update state after unmount (aborted request)', async () => {
    let resolve!: (v: string) => void
    const fetchFn = vi.fn().mockReturnValue(new Promise<string>(r => { resolve = r }))
    const { result, unmount } = renderHook(() => useAsyncData(fetchFn, 'initial'))

    unmount()

    await act(async () => { resolve('too late') })

    expect(result.current.data).toBe('initial')
    expect(result.current.loading).toBe(true)
  })
})
