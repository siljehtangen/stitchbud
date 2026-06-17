import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface DateFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
  min?: string
  max?: string
  disabled?: boolean
  className?: string
}

function parseIsoDate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBefore(a: Date, b: Date) {
  return toIsoDate(a) < toIsoDate(b)
}

function isAfter(a: Date, b: Date) {
  return toIsoDate(a) > toIsoDate(b)
}

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  const days: { date: Date; inMonth: boolean }[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), inMonth: false })
  }
  for (let d = 1; d <= lastDay; d++) {
    days.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (days.length % 7 !== 0) {
    const next = days.length - startPad - lastDay + 1
    days.push({ date: new Date(year, month + 1, next), inMonth: false })
  }
  while (days.length < 42) {
    const next = days.length - startPad - lastDay + 1
    days.push({ date: new Date(year, month + 1, next), inMonth: false })
  }

  return days
}

function DatePickerModal({
  value,
  min,
  max,
  onSelect,
  onClose,
}: {
  value: string
  min?: string
  max?: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = parseIsoDate(value)
  const minDate = parseIsoDate(min ?? '')
  const maxDate = parseIsoDate(max ?? '')
  const today = new Date()

  const initial = selected ?? today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const locale = i18n.language === 'no' ? 'nb-NO' : 'en-GB'

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1)),
    [locale, viewYear, viewMonth]
  )

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)))
  }, [locale])

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  function isDisabled(date: Date) {
    if (minDate && isBefore(date, minDate)) return true
    if (maxDate && isAfter(date, maxDate)) return true
    return false
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function pick(date: Date) {
    if (isDisabled(date)) return
    onSelect(toIsoDate(date))
    onClose()
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(2px)' }}
        aria-label={t('cancel')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative w-full max-w-[320px] rounded-2xl border border-[rgb(var(--border-light))] bg-white shadow-warm-lg overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border-light))]">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-gray hover:text-ink hover:bg-soft-brown/20 transition-colors"
            aria-label={t('date_prev_month')}
          >
            <FiChevronLeft className="text-lg" />
          </button>
          <p className="text-sm font-semibold text-ink capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-gray hover:text-ink hover:bg-soft-brown/20 transition-colors"
            aria-label={t('date_next_month')}
          >
            <FiChevronRight className="text-lg" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdayLabels.map(label => (
              <div key={label} className="text-center text-[11px] font-medium text-warm-gray uppercase">
                {label.replace('.', '')}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, inMonth }) => {
              const selectedDay = selected && isSameDay(date, selected)
              const todayDay = isSameDay(date, today)
              const disabled = isDisabled(date)
              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={`
                    h-9 rounded-lg text-sm font-medium transition-colors
                    ${!inMonth ? 'text-warm-gray/40' : 'text-ink'}
                    ${selectedDay ? 'bg-sand-green-dark text-white' : ''}
                    ${!selectedDay && todayDay ? 'ring-2 ring-sand-green-dark/50' : ''}
                    ${!selectedDay && !disabled ? 'hover:bg-sand-green/30' : ''}
                    ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgb(var(--border-light))]">
          <button
            type="button"
            onClick={() => {
              onSelect('')
              onClose()
            }}
            className="text-sm font-medium text-warm-gray hover:text-ink transition-colors"
          >
            {t('date_clear')}
          </button>
          <button
            type="button"
            onClick={() => pick(today)}
            className="text-sm font-medium text-sand-green-dark hover:text-ink transition-colors"
          >
            {t('date_today')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function DateField({ value, onChange, id, min, max, disabled, className }: DateFieldProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const locale = i18n.language === 'no' ? 'nb-NO' : 'en-GB'
  const selected = parseIsoDate(value)

  const displayText = selected
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(selected)
    : t('date_placeholder')

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`date-field text-left ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className ?? ''}`}
      >
        <span className={`flex-1 min-w-0 text-sm ${selected ? 'text-ink' : 'text-warm-gray'}`}>{displayText}</span>
        <FiCalendar className="date-field-icon" aria-hidden="true" />
      </button>

      {open && <DatePickerModal value={value} min={min} max={max} onSelect={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}
