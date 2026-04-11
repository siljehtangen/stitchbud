import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { HiExclamationTriangle } from 'react-icons/hi2'

export type ConfirmOptions = {
  message: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'neutral'
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmContextValue | null>(null)

type OpenState = ConfirmOptions & { open: true }

function ConfirmDialogModal({
  state,
  onConfirm,
  onDismiss,
}: {
  state: OpenState
  onConfirm: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const cancelLabel = state.cancelLabel ?? t('cancel')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismissRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  const tone = state.tone ?? 'neutral'
  const isDanger = tone === 'danger'

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(2px)' }}
        aria-label={cancelLabel}
        onClick={onDismiss}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-xl border border-neutral-300 bg-white p-5 shadow-lg outline-none"
      >
        <div className="flex gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? 'bg-red-100 text-red-600 ring-1 ring-red-200/80'
                : 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200'
            }`}
            aria-hidden
          >
            <HiExclamationTriangle className="h-6 w-6" />
          </div>
          <p id="confirm-dialog-desc" className="min-w-0 flex-1 pt-0.5 text-[15px] leading-snug text-black">
            {state.message}
          </p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-lg border border-neutral-400 bg-white py-2.5 text-sm font-medium text-black hover:bg-neutral-50 sm:w-auto sm:min-w-[5.5rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full rounded-lg py-2.5 text-sm font-medium sm:min-w-[5.5rem] sm:w-auto ${
              isDanger
                ? 'bg-red-500 text-white hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
                : 'border border-neutral-400 bg-white text-black hover:bg-neutral-50'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenState | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
      setOpen({ ...options, open: true })
    })
  }, [])

  const finish = useCallback((value: boolean) => {
    setOpen(null)
    const r = resolverRef.current
    resolverRef.current = null
    r?.(value)
  }, [])

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <ConfirmDialogModal
          state={open}
          onConfirm={() => finish(true)}
          onDismiss={() => finish(false)}
        />
      )}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog(): ConfirmContextValue {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  return ctx
}
