import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../../api'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import type { Project, LibraryItemType } from '../../types'
import { TYPE_ICONS } from '../../components/LibraryItemForm'
import { CloseIcon } from '../../components/UiIcons'
import { FiPlus } from 'react-icons/fi'
import { AddMaterialDialog } from './AddMaterialDialog'

export function MaterialsTab({
  project,
  projectId,
  onUpdate,
}: {
  project: Project
  projectId: number
  onUpdate: (p: Project) => void
}) {
  const { t } = useTranslation()
  const confirmDelete = useConfirmDelete()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg leading-none text-ink">
          {t('section_materials')}
          {project.materials.length > 0 && (
            <span className="ml-2 align-middle text-sm font-sans text-warm-gray">{project.materials.length}</span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="btn-primary inline-flex min-h-[44px] items-center gap-1.5 text-sm"
        >
          <FiPlus className="text-base" />
          {t('library_add')}
        </button>
      </div>

      {project.materials.length === 0 ? (
        <p className="py-8 text-center text-sm text-warm-gray">{t('no_materials_yet')}</p>
      ) : (
        project.materials.map(m => {
          const mainImg = m.images?.find(img => img.isMain) ?? m.images?.[0]
          const thumbSrc = mainImg?.storedName
          return (
            <div key={m.id} className="card">
              <div className="flex items-center gap-2">
                <div className="flex min-h-[3rem] flex-1 items-center gap-2 min-w-0">
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={mainImg?.originalName ?? m.name}
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover pointer-events-none select-none"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-base text-warm-gray pointer-events-none select-none"
                      aria-hidden
                    >
                      {m.itemType ? TYPE_ICONS[m.itemType as LibraryItemType] : '·'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{m.type}</p>
                    <div className="flex items-center gap-2">
                      {m.colorHex && (
                        <span
                          className="h-3 w-3 flex-shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: m.colorHex }}
                          aria-hidden
                        />
                      )}
                      {(m.amount || m.unit) && (
                        <p className="text-xs text-warm-gray">
                          {m.amount}
                          {m.amount && m.unit ? ` ${m.unit}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    confirmDelete(
                      t('delete_material_confirm', { name: m.type }),
                      async () => {
                        onUpdate(await projectsApi.deleteMaterial(projectId, m.id))
                      },
                      'material_removed_toast'
                    )
                  }
                  className="flex-shrink-0 px-1 text-warm-gray hover:text-red-400"
                  title={t('delete')}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )
        })
      )}

      {dialogOpen && (
        <AddMaterialDialog projectId={projectId} onUpdate={onUpdate} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  )
}
