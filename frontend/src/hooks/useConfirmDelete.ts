import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
import { useToast } from '../context/ToastContext'

/**
 * Returns a helper that shows a danger confirmation dialog, runs the action,
 * shows a success toast, and falls back to an error toast on failure.
 *
 * Usage:
 *   const confirmDelete = useConfirmDelete()
 *   await confirmDelete(t('delete_foo_confirm', { name }), async () => {
 *     await api.deleteFoo(id)
 *     onUpdate(...)
 *   }, 'foo_deleted_toast')
 */
export function useConfirmDelete() {
  const { confirm } = useConfirmDialog()
  const { showToast } = useToast()
  const { t } = useTranslation()

  return useCallback(
    async (message: string, action: () => Promise<void>, successToastKey?: string): Promise<boolean> => {
      const ok = await confirm({ message, confirmLabel: t('dialog_btn_remove'), tone: 'danger' })
      if (!ok) return false
      try {
        await action()
        if (successToastKey) showToast(t(successToastKey as Parameters<typeof t>[0]))
        return true
      } catch {
        showToast(t('action_failed'), 'info')
        return false
      }
    },
    [confirm, showToast, t]
  )
}
