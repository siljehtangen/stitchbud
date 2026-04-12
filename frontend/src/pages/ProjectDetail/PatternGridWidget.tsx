import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PatternCell } from '../../types'
import { useAutoSave } from '../../hooks/useAutoSave'
import { STITCH_SYMBOLS } from './constants'

const PALETTE = [
  '#C6D8B8', '#BFD8E0', '#F5F0E8', '#D4C4A8',
  '#8B7355', '#A8C49A', '#9DC4CF', '#E8D5B0',
  '#F28B82', '#FBBC04', '#34A853', '#4285F4',
  '#000000', '#FFFFFF', '#888888', '#CC6699',
]

const GRID_PRESETS = [
  { label: '5×5', rows: 5, cols: 5 },
  { label: '10×10', rows: 10, cols: 10 },
  { label: '10×20', rows: 10, cols: 20 },
  { label: '20×20', rows: 20, cols: 20 },
  { label: '20×40', rows: 20, cols: 40 },
  { label: '30×30', rows: 30, cols: 30 },
  { label: '40×50', rows: 40, cols: 50 },
]

type TFn = ReturnType<typeof useTranslation>['t']

const CELL_PX_LARGE = 28
const CELL_PX_MEDIUM = 20
const CELL_PX_SMALL = 14
const COLS_MEDIUM_THRESHOLD = 20
const COLS_SMALL_THRESHOLD = 35
const GAP = 1

const GRID_LINE_COLOR = '#E8DDD0'
const DEFAULT_CELL_COLOR = '#F5F0E8'

function GridCanvas({ rows, cols, cellMap, editing, onCell, showSymbols, usedSymbols, t }: {
  rows: number; cols: number; cellMap: Map<string, PatternCell>
  editing: boolean; onCell: (r: number, c: number) => void
  showSymbols: boolean; usedSymbols: Set<string>
  t: TFn
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastCellRef = useRef<string | null>(null)

  const cellPx = cols <= COLS_MEDIUM_THRESHOLD ? CELL_PX_LARGE : cols <= COLS_SMALL_THRESHOLD ? CELL_PX_MEDIUM : CELL_PX_SMALL
  const canvasW = cols * (cellPx + GAP) - GAP + 2
  const canvasH = rows * (cellPx + GAP) - GAP + 2

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = `${canvasW}px`
    canvas.style.height = `${canvasH}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Grid line background
    ctx.fillStyle = GRID_LINE_COLOR
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Draw each cell
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cellMap.get(`${r},${c}`)
        const x = 1 + c * (cellPx + GAP)
        const y = 1 + r * (cellPx + GAP)
        ctx.fillStyle = cell?.color ?? DEFAULT_CELL_COLOR
        ctx.fillRect(x, y, cellPx, cellPx)
        if (cell?.symbol && cellPx >= 20) {
          ctx.fillStyle = 'rgba(30, 20, 10, 0.75)'
          ctx.font = `bold 9px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(cell.symbol, x + cellPx / 2, y + cellPx / 2)
        }
      }
    }
  }, [rows, cols, cellMap, cellPx, canvasW, canvasH])

  function hitCell(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 1
    const y = e.clientY - rect.top - 1
    const c = Math.floor(x / (cellPx + GAP))
    const r = Math.floor(y / (cellPx + GAP))
    if (r >= 0 && r < rows && c >= 0 && c < cols) return { r, c }
    return null
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true
    lastCellRef.current = null
    const hit = hitCell(e)
    if (hit) {
      lastCellRef.current = `${hit.r},${hit.c}`
      onCell(hit.r, hit.c)
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const hit = hitCell(e)
    if (hit) {
      const key = `${hit.r},${hit.c}`
      if (key !== lastCellRef.current) {
        lastCellRef.current = key
        onCell(hit.r, hit.c)
      }
    }
  }

  function stopDrawing() { isDrawingRef.current = false }

  return (
    <div className="flex gap-4 items-start">
      <div className="overflow-auto">
        <canvas
          ref={canvasRef}
          className={`rounded-lg block${editing ? ' cursor-crosshair' : ''}`}
          onMouseDown={editing ? handleMouseDown : undefined}
          onMouseMove={editing ? handleMouseMove : undefined}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {showSymbols && (editing || usedSymbols.size > 0) && (
        <div className="flex-shrink-0 space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-warm-gray uppercase tracking-wide">{t('grid_legend')}</p>
          {(editing ? STITCH_SYMBOLS : STITCH_SYMBOLS.filter(s => usedSymbols.has(s.symbol))).map(s => (
            <div key={s.symbol} className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center rounded border text-xs font-bold flex-shrink-0 border-gray-400 bg-soft-brown/20 text-gray-800"
              >{s.symbol}</span>
              <span className="text-xs text-gray-700">
                {t(s.labelKey as Parameters<TFn>[0])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PatternGridWidget({ rows: initRows, cols: initCols, cellDataJson, showSymbols = true, onSave }: {
  rows: number; cols: number; cellDataJson: string; showSymbols?: boolean
  onSave: (cells: PatternCell[], rows: number, cols: number) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState(initRows)
  const [cols, setCols] = useState(initCols)
  const [cells, setCells] = useState<PatternCell[]>(() => {
    try { return JSON.parse(cellDataJson) } catch { return [] }
  })
  const [selectedColor, setSelectedColor] = useState('#C6D8B8')
  const [selectedSymbol, setSelectedSymbol] = useState('O')
  const [mode, setMode] = useState<'color' | 'symbol' | 'erase'>('color')

  const [autoSave, flushSave] = useAutoSave((newCells: PatternCell[], r: number, c: number) => {
    onSave(newCells, r, c)
  }, 600)

  const cellMap = useMemo(() => new Map(cells.map(c => [`${c.row},${c.col}`, c])), [cells])

  function handleCell(row: number, col: number) {
    if (!editing) return
    const existing = cellMap.get(`${row},${col}`)
    let next: PatternCell[]
    if (mode === 'erase') {
      next = cells.filter(c => !(c.row === row && c.col === col))
    } else if (mode === 'symbol') {
      next = cells.filter(c => !(c.row === row && c.col === col))
      next.push({ row, col, color: existing?.color ?? DEFAULT_CELL_COLOR, symbol: selectedSymbol })
    } else {
      next = cells.filter(c => !(c.row === row && c.col === col))
      next.push({ row, col, color: selectedColor, symbol: existing?.symbol ?? '' })
    }
    setCells(next)
    autoSave(next, rows, cols)
  }

  function flushAndStopEditing() {
    flushSave()
    setEditing(false)
  }

  function applyResize(newRows: number, newCols: number) {
    const trimmed = cells.filter(c => c.row < newRows && c.col < newCols)
    setRows(newRows)
    setCols(newCols)
    setCells(trimmed)
    onSave(trimmed, newRows, newCols)
  }

  const usedSymbols = useMemo(() => new Set(cells.map(c => c.symbol).filter(Boolean)), [cells])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => editing ? flushAndStopEditing() : setEditing(true)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${editing ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray'}`}
        >{editing ? t('done_editing_grid') : t('edit_grid')}</button>
        <p className="text-xs text-warm-gray">{t('auto_saving_grid')}</p>
      </div>

      {editing && (
        <>
          <div className="flex gap-1.5 items-center flex-wrap">
            <button
              onClick={() => setMode('color')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'color' ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray'}`}
            >{t('paint')}</button>
            <button
              onClick={() => setMode('erase')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'erase' ? 'bg-soft-brown text-white' : 'bg-soft-brown/20 text-warm-gray'}`}
            >{t('erase')}</button>
            <div className="flex gap-1 flex-wrap ml-1">
              {PALETTE.map(c => (
                <button key={c} onClick={() => { setSelectedColor(c); setMode('color') }}
                  className={`w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform ${selectedColor === c && mode === 'color' ? 'border-gray-700 scale-110' : 'border-white shadow-sm'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={selectedColor} onChange={e => { setSelectedColor(e.target.value); setMode('color') }}
                className="w-5 h-5 rounded-full cursor-pointer border-0" />
            </div>
          </div>

          {showSymbols && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-xs text-warm-gray mr-1">{t('stitch_symbols')}:</span>
              {STITCH_SYMBOLS.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => { setSelectedSymbol(s.symbol); setMode('symbol') }}
                  title={t(s.labelKey as Parameters<typeof t>[0])}
                  className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-bold transition-colors
                    ${mode === 'symbol' && selectedSymbol === s.symbol
                      ? 'border-gray-700 bg-sand-green text-gray-800'
                      : 'border-soft-brown/30 bg-soft-brown/10 text-gray-700 hover:bg-sand-blue/20'}`}
                >{s.symbol}</button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center text-xs flex-wrap">
            <span className="text-warm-gray">{t('rows_label')}</span>
            <input type="number" value={rows} min={1} max={100} onChange={e => setRows(parseInt(e.target.value) || 1)}
              className="input py-1 px-2 text-xs w-14" />
            <span className="text-warm-gray">{t('cols_label')}</span>
            <input type="number" value={cols} min={1} max={100} onChange={e => setCols(parseInt(e.target.value) || 1)}
              className="input py-1 px-2 text-xs w-14" />
            <button onClick={() => applyResize(rows, cols)} className="btn-ghost text-xs py-1 px-2 border border-soft-brown/30 rounded-lg">{t('apply')}</button>
          </div>

          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-xs text-warm-gray">{t('preset_label')}:</span>
            {GRID_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyResize(p.rows, p.cols)}
                className="px-2 py-0.5 rounded text-xs bg-soft-brown/20 hover:bg-sand-blue/30 text-warm-gray transition-colors"
              >{p.label}</button>
            ))}
          </div>
        </>
      )}

      <GridCanvas
        rows={rows} cols={cols} cellMap={cellMap}
        editing={editing} onCell={handleCell}
        showSymbols={showSymbols} usedSymbols={usedSymbols}
        t={t}
      />
    </div>
  )
}
