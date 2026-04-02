import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { HiCheckCircle, HiInformationCircle } from 'react-icons/hi2'

type ToastVariant = 'success' | 'info'

type ToastItem = { id: number; message: string; variant: ToastVariant }

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_MS = 3800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-4 z-[100] flex flex-col gap-3 pointer-events-none items-end"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`animate-toast-in pointer-events-auto inline-flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(60,50,40,0.18),0_4px_14px_-4px_rgba(60,50,40,0.1)] backdrop-blur-md ${
              toast.variant === 'success'
                ? 'border-sand-green/35 bg-gradient-to-br from-white/95 via-cream/95 to-sand-green/15 text-gray-800 ring-1 ring-sand-green/20'
                : 'border-sand-blue/40 bg-gradient-to-br from-white/95 via-cream/95 to-sand-blue/20 text-gray-800 ring-1 ring-sand-blue/15'
            }`}
          >
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                toast.variant === 'success'
                  ? 'bg-sand-green/50 text-sand-green-dark'
                  : 'bg-sand-blue/60 text-sand-blue-deep'
              }`}
              aria-hidden
            >
              {toast.variant === 'success' ? (
                <HiCheckCircle className="h-5 w-5" />
              ) : (
                <HiInformationCircle className="h-5 w-5" />
              )}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug tracking-tight text-gray-800">
              {toast.message}
            </p>
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
