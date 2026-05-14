import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConfirmDelete } from './useConfirmDelete'
import { ToastProvider } from '../context/ToastContext'
import { ConfirmDialogProvider } from '../context/ConfirmDialogContext'
import type { ReactNode } from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
  </ToastProvider>
)

// The confirm button shows confirmLabel = t('dialog_btn_remove') = 'dialog_btn_remove'
// The cancel button shows cancelLabel = t('cancel') = 'cancel'

describe('useConfirmDelete', () => {
  it('returns a function', () => {
    const { result } = renderHook(() => useConfirmDelete(), { wrapper })
    expect(typeof result.current).toBe('function')
  })

  it('returns false when the user cancels', async () => {
    const { result } = renderHook(() => useConfirmDelete(), { wrapper })
    const action = vi.fn()

    let returnValue: boolean | undefined
    act(() => {
      result.current('Delete this item?', action).then(v => {
        returnValue = v
      })
    })

    await userEvent.click(screen.getByText('cancel'))
    await act(async () => {})

    expect(returnValue).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })

  it('calls the action and returns true when confirmed', async () => {
    const { result } = renderHook(() => useConfirmDelete(), { wrapper })
    const action = vi.fn().mockResolvedValue(undefined)

    let returnValue: boolean | undefined
    act(() => {
      result.current('Really delete?', action).then(v => {
        returnValue = v
      })
    })

    await userEvent.click(screen.getByText('dialog_btn_remove'))
    await act(async () => {})

    expect(action).toHaveBeenCalled()
    expect(returnValue).toBe(true)
  })

  it('returns false and does not throw when the action rejects', async () => {
    const { result } = renderHook(() => useConfirmDelete(), { wrapper })
    const action = vi.fn().mockRejectedValue(new Error('delete failed'))

    let returnValue: boolean | undefined
    act(() => {
      result.current('Delete?', action).then(v => {
        returnValue = v
      })
    })

    await userEvent.click(screen.getByText('dialog_btn_remove'))
    await act(async () => {})

    expect(returnValue).toBe(false)
  })

  it('opens the dialog with the provided message', async () => {
    const { result } = renderHook(() => useConfirmDelete(), { wrapper })

    act(() => {
      result.current('Are you sure you want to delete this?', vi.fn().mockResolvedValue(undefined))
    })

    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument()
  })
})
