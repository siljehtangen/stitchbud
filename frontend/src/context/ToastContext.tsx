import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle } from 'react-icons/hi2'
import { FiTrash2 } from 'react-icons/fi'

type ToastVariant = 'success' | 'info' | 'error' | 'removal'

type ToastMessage = string | { title: string; detail?: string }

type ToastAction = { label: string; onClick: () => void }

type ToastItem = {
  id: number
  title: string
  detail?: string
  variant: ToastVariant
  action?: ToastAction
}

type ToastContextValue = {
  showToast: (message: ToastMessage, variant?: ToastVariant, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_MS = 3800

const VARIANT_CHIP: Record<ToastVariant, string> = {
  success: 'bg-sand-green/25 text-sand-green',
  info: 'bg-sand-blue/30 text-sand-blue',
  error: 'bg-[#b86a55]/30 text-[#e0a98f]',
  removal: 'bg-[#b86a55]/30 text-[#e0a98f]',
}

const VARIANT_BAR: Record<ToastVariant, string> = {
  success: 'bg-sand-green',
  info: 'bg-sand-blue',
  error: 'bg-[#c98a72]',
  removal: 'bg-[#c98a72]',
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'removal') return <FiTrash2 className="h-4 w-4" />
  if (variant === 'error') return <HiExclamationCircle className="h-[18px] w-[18px]" />
  if (variant === 'info') return <HiInformationCircle className="h-[18px] w-[18px]" />
  return <HiCheckCircle className="h-[18px] w-[18px]" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  const showToast = useCallback((message: ToastMessage, variant: ToastVariant = 'success', action?: ToastAction) => {
    const id = ++idRef.current
    const title = typeof message === 'string' ? message : message.title
    const detail = typeof message === 'string' ? undefined : message.detail
    setToasts(prev => [...prev, { id, title, detail, variant, action }])
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_MS)
    timeoutsRef.current.add(timeoutId)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-stretch gap-2.5 px-3 pb-3 pointer-events-none sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:items-center sm:px-0 sm:pb-0"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className="animate-toast-in pointer-events-auto relative w-full overflow-hidden rounded-2xl bg-ink px-4 py-3 shadow-[0_16px_44px_-12px_rgba(42,33,28,0.55),0_4px_14px_-4px_rgba(42,33,28,0.35)] sm:w-auto sm:min-w-[17rem] sm:max-w-md"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${VARIANT_CHIP[toast.variant]}`}
                aria-hidden
              >
                <VariantIcon variant={toast.variant} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-snug text-[#fbf6ee]">{toast.title}</p>
                {toast.detail && (
                  <p className="mt-0.5 truncate text-xs leading-snug text-[#fbf6ee]/60">{toast.detail}</p>
                )}
              </div>
              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.onClick}
                  className="-mr-1 flex-shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#e0a98f] transition-colors hover:text-[#f0c4b0]"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <span
              className={`animate-toast-timer absolute bottom-0 left-0 h-[3px] w-full ${VARIANT_BAR[toast.variant]}`}
              style={{ animationDuration: `${TOAST_MS}ms` }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
