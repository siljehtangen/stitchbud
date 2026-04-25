import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialogProvider, useConfirmDialog } from './ConfirmDialogContext'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function ConfirmButton({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm } = useConfirmDialog()
  return (
    <button
      onClick={() =>
        confirm({ message: 'Are you sure?', confirmLabel: 'Yes' }).then(onResult)
      }
    >
      Open dialog
    </button>
  )
}

describe('ConfirmDialogContext', () => {
  it('opens a dialog with the provided message', async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={vi.fn()} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('resolves true when the confirm button is clicked', async () => {
    const onResult = vi.fn()
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={onResult} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    await userEvent.click(screen.getByText('Yes'))
    expect(onResult).toHaveBeenCalledWith(true)
  })

  it('resolves false when the cancel button is clicked', async () => {
    const onResult = vi.fn()
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={onResult} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    // use getByText to target the visible cancel button, not the aria-label backdrop
    await userEvent.click(screen.getByText('cancel'))
    expect(onResult).toHaveBeenCalledWith(false)
  })

  it('resolves false when the backdrop is clicked', async () => {
    const onResult = vi.fn()
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={onResult} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    await userEvent.click(screen.getByLabelText('cancel'))
    expect(onResult).toHaveBeenCalledWith(false)
  })

  it('closes the dialog after confirmation', async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={vi.fn()} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    await userEvent.click(screen.getByText('Yes'))
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('closes the dialog after cancellation', async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmButton onResult={vi.fn()} />
      </ConfirmDialogProvider>
    )
    await userEvent.click(screen.getByText('Open dialog'))
    await userEvent.click(screen.getByText('cancel'))
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('throws when useConfirmDialog is called outside its provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ConfirmButton onResult={vi.fn()} />)).toThrow(
      'useConfirmDialog must be used within ConfirmDialogProvider',
    )
    consoleError.mockRestore()
  })
})
