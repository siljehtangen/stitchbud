import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { reportError } from '../sentry'

export function useFileUpload(successToastKey: string = 'attachment_added_toast') {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function execute<T>(
    upload: () => Promise<T>,
    onSuccess: (result: T) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
    cleanup?: () => void
  ) {
    setUploading(true)
    try {
      onSuccess(await upload())
      showToast(t(successToastKey as Parameters<typeof t>[0]))
    } catch (err) {
      reportError(err, { context: 'file upload' })
      showToast(t('upload_failed'), 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
      cleanup?.()
    }
  }

  return { uploading, ref, execute }
}
