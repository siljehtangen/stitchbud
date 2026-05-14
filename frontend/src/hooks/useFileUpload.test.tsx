import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from './useFileUpload'
import { ToastProvider } from '../context/ToastContext'
import type { ReactNode } from 'react'
import { createRef } from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const wrapper = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>

describe('useFileUpload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts with uploading false', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    expect(result.current.uploading).toBe(false)
  })

  it('exposes a ref for the file input', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    expect(result.current.ref).toBeDefined()
  })

  it('sets uploading to true during the upload and false after', async () => {
    let resolveUpload!: () => void
    const uploadPromise = new Promise<void>(r => {
      resolveUpload = r
    })

    const { result } = renderHook(() => useFileUpload(), { wrapper })
    const inputRef = createRef<HTMLInputElement | null>()

    act(() => {
      result.current.execute(() => uploadPromise, vi.fn(), inputRef)
    })

    expect(result.current.uploading).toBe(true)

    await act(async () => {
      resolveUpload()
    })

    expect(result.current.uploading).toBe(false)
  })

  it('calls onSuccess with the upload result', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    const inputRef = createRef<HTMLInputElement | null>()

    await act(async () => {
      await result.current.execute(() => Promise.resolve('uploaded-url'), onSuccess, inputRef)
    })

    expect(onSuccess).toHaveBeenCalledWith('uploaded-url')
  })

  it('does not call onSuccess when upload throws', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    const inputRef = createRef<HTMLInputElement | null>()

    await act(async () => {
      await result.current.execute(() => Promise.reject(new Error('network error')), onSuccess, inputRef)
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls cleanup after a failed upload', async () => {
    const cleanup = vi.fn()
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    const inputRef = createRef<HTMLInputElement | null>()

    await act(async () => {
      await result.current.execute(() => Promise.reject(new Error('oops')), vi.fn(), inputRef, cleanup)
    })

    expect(cleanup).toHaveBeenCalled()
  })

  it('calls cleanup after a successful upload', async () => {
    const cleanup = vi.fn()
    const { result } = renderHook(() => useFileUpload(), { wrapper })
    const inputRef = createRef<HTMLInputElement | null>()

    await act(async () => {
      await result.current.execute(() => Promise.resolve('ok'), vi.fn(), inputRef, cleanup)
    })

    expect(cleanup).toHaveBeenCalled()
  })

  it('resets the input ref value after upload', async () => {
    const input = document.createElement('input')
    input.value = 'somefile.jpg'
    const inputRef = { current: input }

    const { result } = renderHook(() => useFileUpload(), { wrapper })

    await act(async () => {
      await result.current.execute(() => Promise.resolve(null), vi.fn(), inputRef)
    })

    expect(input.value).toBe('')
  })
})
