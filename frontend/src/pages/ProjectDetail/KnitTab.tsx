import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { useConfirmDialog } from '../../context/ConfirmDialogContext'
import { projectsApi } from '../../api'
import type { Project, ProjectCategory } from '../../types'
import { RoundCounterWidget } from './RoundCounterWidget'
import { PatternGridWidget } from './PatternGridWidget'

export function KnitTab({ project, projectId, onUpdate, category }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void; category: ProjectCategory
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [activeGridIndex, setActiveGridIndex] = useState(0)

  const hasCounter = !!project.rowCounter
  const grids = project.patternGrids ?? []
  const clampedIndex = Math.min(activeGridIndex, Math.max(0, grids.length - 1))
  const activeGrid = grids[clampedIndex]

  async function handleAddGrid() {
    const updated = await projectsApi.createPatternGrid(projectId)
    onUpdate(updated)
    setActiveGridIndex(updated.patternGrids.length - 1)
    showToast(t('grid_added_toast'))
  }

  async function handleDeleteGrid() {
    if (!activeGrid || grids.length <= 1) return
    const ok = await confirm({
      message: t('delete_grid_confirm'),
      confirmLabel: t('delete'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      const updated = await projectsApi.deletePatternGrid(projectId, activeGrid.id)
      onUpdate(updated)
      setActiveGridIndex(i => Math.min(i, Math.max(0, updated.patternGrids.length - 1)))
      showToast(t('grid_deleted_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    }
  }

  const gridHeader = (
    <div className="flex items-center gap-1 mb-2">
      <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide">{t('pattern_grid')}</h3>
      {grids.length > 1 && (
        <>
          <button
            onClick={() => setActiveGridIndex(i => Math.max(0, i - 1))}
            disabled={clampedIndex === 0}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 disabled:opacity-30 text-warm-gray text-base leading-none"
          >‹</button>
          <span className="text-xs text-warm-gray tabular-nums">{clampedIndex + 1}/{grids.length}</span>
          <button
            onClick={() => setActiveGridIndex(i => Math.min(grids.length - 1, i + 1))}
            disabled={clampedIndex === grids.length - 1}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 disabled:opacity-30 text-warm-gray text-base leading-none"
          >›</button>
        </>
      )}
      <button
        onClick={handleAddGrid}
        className="w-5 h-5 flex items-center justify-center rounded-full bg-sand-green hover:opacity-80 text-gray-700 text-xs font-bold ml-1"
        title={t('add_grid')}
      >+</button>
      {grids.length > 1 && activeGrid && (
        <button
          onClick={handleDeleteGrid}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 text-warm-gray text-sm leading-none"
          title={t('delete_grid')}
        >×</button>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {hasCounter && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{t('round_counter')}</h3>
          <RoundCounterWidget
            counter={project.rowCounter!}
            onSave={async (spr, tr, cs) =>
              onUpdate(await projectsApi.updateRowCounter(projectId, {
                stitchesPerRound: spr, totalRounds: tr, checkedStitches: JSON.stringify(cs)
              }))
            }
          />
        </div>
      )}
      <div>
        {gridHeader}
        {activeGrid && (
          <PatternGridWidget
            key={activeGrid.id}
            rows={activeGrid.rows}
            cols={activeGrid.cols}
            cellDataJson={activeGrid.cellData}
            showSymbols={category === 'KNITTING'}
            onSave={async (cells, r, c) =>
              onUpdate(await projectsApi.updatePatternGrid(projectId, activeGrid.id, {
                rows: r, cols: c, cellData: JSON.stringify(cells)
              }))
            }
          />
        )}
      </div>
    </div>
  )
}
