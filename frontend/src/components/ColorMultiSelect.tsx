import { useState, useCallback, useEffect, useRef, useId } from 'react'
import { resolveColorDisplay } from '../colors'

interface Props {
  availableColors: string[]
  selected: string[]
  onChange: (colors: string[]) => void
  language: string
  placeholder: string
  searchPlaceholder: string
  noResults: string
  clearLabel: string
}

export function ColorMultiSelect({
  availableColors,
  selected,
  onChange,
  language,
  placeholder,
  searchPlaceholder,
  noResults,
  clearLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const toggle = useCallback(
    (name: string) => {
      onChange(selected.includes(name) ? selected.filter(c => c !== name) : [...selected, name])
    },
    [selected, onChange]
  )

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [close])

  const q = query.toLowerCase()
  const filtered = availableColors.filter(name => {
    const { displayName } = resolveColorDisplay(name, language)
    return displayName.toLowerCase().includes(q)
  })

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen(v => !v)}
        className="input text-sm py-1.5 w-full text-left flex items-center gap-1.5 flex-wrap min-h-[36px]"
      >
        {selected.length === 0 ? (
          <span className="text-warm-gray">{placeholder}…</span>
        ) : (
          selected.map(name => {
            const { hex, displayName } = resolveColorDisplay(name, language)
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 bg-sand-blue/40 text-gray-700 text-xs rounded-full px-2 py-0.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
                {displayName}
                <button
                  type="button"
                  aria-label={`Remove ${displayName}`}
                  onClick={e => {
                    e.stopPropagation()
                    toggle(name)
                  }}
                  className="ml-0.5 leading-none hover:text-red-400 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )
          })
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-soft-brown/30 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-soft-brown/20">
            <input
              autoFocus
              type="text"
              className="input text-sm py-1.5 w-full"
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') close()
              }}
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={placeholder}
            className="max-h-52 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-xs text-warm-gray">
                {noResults}
              </li>
            )}
            {filtered.map(name => {
              const { hex, displayName } = resolveColorDisplay(name, language)
              const checked = selected.includes(name)
              return (
                <li
                  key={name}
                  role="option"
                  aria-selected={checked}
                  tabIndex={0}
                  onClick={() => toggle(name)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(name)
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked ? 'bg-sand-blue/20 text-gray-800' : 'hover:bg-soft-brown/10 text-gray-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: hex }}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{displayName}</span>
                  {checked && (
                    <span className="text-sand-blue-deep text-xs" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-soft-brown/20 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-warm-gray hover:text-red-400 transition-colors"
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
