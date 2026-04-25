import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './ToastContext'

afterEach(() => vi.useRealTimers())

function ShowToastButton({ message = 'Hello toast!' }: { message?: string }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(message)}>Show toast</button>
}

describe('ToastContext', () => {
  it('displays a toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <ShowToastButton />
      </ToastProvider>
    )
    await userEvent.click(screen.getByText('Show toast'))
    expect(screen.getByText('Hello toast!')).toBeInTheDocument()
  })

  it('removes the toast after the timeout elapses', () => {
    vi.useFakeTimers()

    render(
      <ToastProvider>
        <ShowToastButton />
      </ToastProvider>
    )

    act(() => fireEvent.click(screen.getByText('Show toast')))
    expect(screen.getByText('Hello toast!')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Hello toast!')).not.toBeInTheDocument()
  })

  it('can show multiple toasts at once', async () => {
    render(
      <ToastProvider>
        <ShowToastButton message="First" />
        <ShowToastButton message="Second" />
      </ToastProvider>
    )
    await userEvent.click(screen.getAllByText('Show toast')[0])
    await userEvent.click(screen.getAllByText('Show toast')[1])
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('throws when useToast is called outside ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ShowToastButton />)).toThrow('useToast must be used within ToastProvider')
    consoleError.mockRestore()
  })
})
