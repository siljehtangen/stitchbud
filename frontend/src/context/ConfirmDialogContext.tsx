import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HiExclamationTriangle } from 'react-icons/hi2'
import { FiHelpCircle } from 'react-icons/fi'

export type ConfirmOptions = {
  message: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'neutral'
  /**
   * Opt-in friction for the highest-stakes deletes. When set, the confirm
   * button stays disabled until the user types this exact value. Existing
   * `confirm()` calls that omit it are unaffected.
   */
  requireTyped?: string
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
  const [typed, setTyped] = useState('')

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
  const typedOk = !state.requireTyped || typed === state.requireTyped

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
        aria-label={cancelLabel}
        onClick={onDismiss}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        className="animate-dialog-in relative w-full max-w-sm rounded-3xl border border-[rgb(var(--border-light))] bg-[#fdfbf8] p-6 shadow-warm-lg outline-none"
      >
        {isDanger ? (
          <div className="flex gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600"
              aria-hidden
            >
              <HiExclamationTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-dialog-desc" className="font-serif text-xl leading-tight text-ink">
                {state.message}
              </h2>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div
              className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#fbeae4] text-[#b86a55]"
              aria-hidden
            >
              <FiHelpCircle className="h-7 w-7" />
            </div>
            <h2 id="confirm-dialog-desc" className="mt-3.5 font-serif text-xl leading-tight text-ink">
              {state.message}
            </h2>
          </div>
        )}

        {state.requireTyped && (
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={state.requireTyped}
            aria-label={state.requireTyped}
            autoComplete="off"
            className="input mt-4 max-w-none"
          />
        )}

        <div className={`mt-6 flex gap-2.5 ${isDanger ? 'flex-col-reverse sm:flex-row sm:justify-end' : 'flex-row'}`}>
          <button
            type="button"
            onClick={onDismiss}
            className={`btn-secondary inline-flex min-h-[44px] items-center justify-center ${
              isDanger ? 'sm:min-w-[6rem]' : 'flex-1'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!typedOk}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-[14px] px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 disabled:bg-[#d8b3a6] sm:min-w-[6rem]'
                : 'flex-1 bg-[#b86a55] hover:brightness-105 disabled:bg-[#d8b3a6]'
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
      {open && <ConfirmDialogModal state={open} onConfirm={() => finish(true)} onDismiss={() => finish(false)} />}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog(): ConfirmContextValue {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  return ctx
}
