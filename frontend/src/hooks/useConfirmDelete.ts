import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
import { useToast } from '../context/ToastContext'

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
