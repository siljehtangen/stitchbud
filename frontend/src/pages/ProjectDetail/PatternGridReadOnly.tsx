import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PatternCell } from '../../types'
import { STITCH_SYMBOLS } from './constants'

export function PatternGridReadOnly({ rows, cols, cellDataJson, showSymbols = true }: {
  rows: number; cols: number; cellDataJson: string; showSymbols?: boolean
}) {
  const { t } = useTranslation()
  const cells = useMemo<PatternCell[]>(() => {
    try { return JSON.parse(cellDataJson) } catch { return [] }
  }, [cellDataJson])
  const cellMap = useMemo(() => new Map(cells.map(c => [`${c.row},${c.col}`, c])), [cells])
  const usedSymbols = useMemo(() => new Set(cells.map(c => c.symbol).filter(Boolean)), [cells])
  const legendSymbols = useMemo(() => STITCH_SYMBOLS.filter(s => usedSymbols.has(s.symbol)), [usedSymbols])

  return (
    <div className="flex gap-4 items-start">
      <div className="overflow-auto">
        <div
          className="inline-grid gap-px bg-soft-brown/20 border border-sand-blue/20 rounded-lg p-px"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const cell = cellMap.get(`${r},${c}`)
              return (
                <div key={`${r}-${c}`} className="w-7 h-7 flex items-center justify-center"
                  style={{ backgroundColor: cell?.color ?? '#F5F0E8' }}
                >
                  {showSymbols && cell?.symbol && <span className="text-[9px] font-bold leading-none select-none">{cell.symbol}</span>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {showSymbols && legendSymbols.length > 0 && (
        <div className="flex-shrink-0 space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-warm-gray uppercase tracking-wide">{t('grid_legend')}</p>
          {legendSymbols.map(s => (
            <div key={s.symbol} className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center rounded border border-gray-400 bg-soft-brown/20 text-xs font-bold flex-shrink-0 text-gray-800">
                {s.symbol}
              </span>
              <span className="text-xs text-gray-700">{t(s.labelKey as Parameters<typeof t>[0])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
