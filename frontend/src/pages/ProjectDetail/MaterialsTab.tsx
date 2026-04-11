import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { useConfirmDialog } from '../../context/ConfirmDialogContext'
import { projectsApi, libraryApi } from '../../api'
import { libraryItemImagesForProject } from '../../projectOverviewMedia'
import { COLOR_MAP } from '../../colors'
import type { Project, LibraryItem, LibraryItemType } from '../../types'
import { TYPE_ICONS, LibraryItemForm } from '../../components/LibraryItemForm'
import { LibraryFilterBar } from '../../components/LibraryFilterBar'
import { itemSummary, libraryItemImageUrl } from '../../utils/libraryUtils'
import { useLibraryFilter } from '../../hooks/useLibraryFilter'

export function MaterialsTab({ project, projectId, onUpdate }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [saving, setSaving] = useState(false)
  const [creatingInLib, setCreatingInLib] = useState(false)
  const [newLibType, setNewLibType] = useState<LibraryItemType>('YARN')
  const [pendingItem, setPendingItem] = useState<LibraryItem | null>(null)

  const { filterType, setFilterType, filterColors, setFilterColors, search, setSearch, showColorFilter, availableColors, filtered } = useLibraryFilter(libraryItems)

  useEffect(() => {
    libraryApi.getAll().then(setLibraryItems)
  }, [])

  function handleLibraryClick(item: LibraryItem) {
    if (item.itemType === 'YARN' || item.itemType === 'FABRIC') {
      setPendingItem(item)
    } else {
      addFromLibrary(item, '')
    }
  }

  async function addFromLibrary(item: LibraryItem, colorName: string) {
    let type = item.name
    let amount = ''
    let unit = ''
    if (item.itemType === 'YARN') {
      type = [item.yarnBrand, item.yarnMaterial].filter(Boolean).join(' ') || item.name
      if (item.yarnAmountG) { amount = String(item.yarnAmountG); unit = 'g' }
      else if (item.yarnAmountM) { amount = String(item.yarnAmountM); unit = 'm' }
    } else if (item.itemType === 'FABRIC') {
      amount = [item.fabricLengthCm && `${item.fabricLengthCm}cm`, item.fabricWidthCm && `${item.fabricWidthCm}cm`].filter(Boolean).join(' × ')
    } else if (item.itemType === 'KNITTING_NEEDLE') {
      type = item.needleSizeMm ? `${item.needleSizeMm} mm ${t('lib_knitting_needle')}` : item.name
      if (item.circularLengthCm) amount = `${item.circularLengthCm} cm`
    } else if (item.itemType === 'CROCHET_HOOK') {
      type = item.hookSizeMm ? `${item.hookSizeMm} mm ${t('lib_crochet_hook')}` : item.name
    }
    const colorHex = colorName ? (COLOR_MAP[colorName] ?? '') : ''
    const libImgsRaw = libraryItemImagesForProject(item)
    const seen = new Set<string>()
    const libImgs = libImgsRaw.filter(x => {
      if (!x.storedName || seen.has(x.storedName)) return false
      seen.add(x.storedName)
      return true
    })
    setSaving(true)
    try {
      let updated = await projectsApi.addMaterial(projectId, {
        name: item.name, type, itemType: item.itemType, color: colorName, colorHex, amount, unit,
      })
      const newMat = updated.materials.reduce((a, b) => (a.id > b.id ? a : b))
      if (libImgs.length > 0) {
        updated = await projectsApi.registerMaterialImageByUrl(
          projectId,
          newMat.id,
          libImgs[0].storedName,
          libImgs[0].originalName || 'image',
        )
        if (libImgs.length > 1) {
          await Promise.all(libImgs.slice(1).map(img =>
            projectsApi.registerMaterialImageByUrl(projectId, newMat.id, img.storedName, img.originalName || 'image')
          ))
          updated = await projectsApi.getOne(projectId)
        }
      }
      onUpdate(updated)
      setPendingItem(null)
      showToast(t('material_added_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    } finally { setSaving(false) }
  }

  function handleLibItemCreated(item: LibraryItem) {
    setLibraryItems(prev => [item, ...prev])
    setCreatingInLib(false)
    showToast(t('lib_item_created_toast'))
  }

  return (
    <div className="space-y-3">
      {project.materials.length === 0 && (
        <p className="text-sm text-warm-gray text-center py-2">{t('no_materials_yet')}</p>
      )}
      {project.materials.map(m => {
        const mainImg = m.images?.find(img => img.isMain) ?? m.images?.[0]
        const thumbSrc = mainImg?.storedName
        return (
          <div key={m.id} className="card">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 min-h-[3rem]">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={mainImg?.originalName ?? m.name}
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0 pointer-events-none select-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-soft-brown/20 flex items-center justify-center text-warm-gray flex-shrink-0 text-base pointer-events-none select-none" aria-hidden>
                    {m.itemType ? TYPE_ICONS[m.itemType as LibraryItemType] : '·'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{m.type}</p>
                  {(m.amount || m.unit) && (
                    <p className="text-xs text-warm-gray">{m.amount}{m.amount && m.unit ? ` ${m.unit}` : ''}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    message: t('delete_material_confirm', { name: m.type }),
                    confirmLabel: t('dialog_btn_remove'),
                    tone: 'danger',
                  })
                  if (!ok) return
                  try {
                    onUpdate(await projectsApi.deleteMaterial(projectId, m.id))
                    showToast(t('material_removed_toast'))
                  } catch {
                    showToast(t('upload_failed'), 'info')
                  }
                }}
                className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
                title={t('delete')}
              >×</button>
            </div>
          </div>
        )
      })}

      <div className="card space-y-2.5">
        <h4 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{t('add_from_library')}</h4>
        <LibraryFilterBar
          filterType={filterType}
          setFilterType={setFilterType}
          filterColors={filterColors}
          setFilterColors={setFilterColors}
          search={search}
          setSearch={setSearch}
          showColorFilter={showColorFilter}
          availableColors={availableColors}
        />
        {pendingItem && (
          <div className="border border-sand-blue/40 rounded-lg p-3 space-y-2.5 bg-sand-blue/5">
            <div className="flex items-center gap-2">
              {libraryItemImageUrl(pendingItem) ? (
                <img src={libraryItemImageUrl(pendingItem)!} alt={pendingItem.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" loading="lazy" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-soft-brown/20 flex items-center justify-center flex-shrink-0 text-sm">
                  {TYPE_ICONS[pendingItem.itemType]}
                </div>
              )}
              <p className="text-sm font-medium text-gray-800 flex-1 truncate">{pendingItem.name}</p>
              <button
                type="button"
                onClick={() => setPendingItem(null)}
                className="text-warm-gray hover:text-red-400 text-lg leading-none"
              >×</button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void addFromLibrary(pendingItem, '')}
                className="btn-primary text-sm flex-1"
              >{saving ? t('saving') : t('add_library_to_project')}</button>
              <button type="button" onClick={() => setPendingItem(null)} className="btn-ghost text-sm">{t('cancel')}</button>
            </div>
          </div>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-warm-gray text-center py-3">{t('library_empty')}</p>
          ) : (
            filtered.map(item => {
              const imgUrl = libraryItemImageUrl(item)
              const summary = itemSummary(item)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-sand-blue/15 bg-white/60 p-2.5 transition-colors hover:border-sand-green/35 hover:bg-sand-green/10"
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-base">
                      {TYPE_ICONS[item.itemType]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                    {summary && <p className="truncate text-xs text-warm-gray">{summary}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleLibraryClick(item)}
                    className="btn-primary flex-shrink-0 whitespace-nowrap py-2 px-3 text-xs"
                  >
                    {t('add_library_to_project')}
                  </button>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-soft-brown/20 pt-2.5">
          {creatingInLib ? (
            <LibraryItemForm
              selectedType={newLibType}
              onTypeChange={setNewLibType}
              onCreated={handleLibItemCreated}
              onCancel={() => setCreatingInLib(false)}
            />
          ) : (
            <p className="text-xs text-warm-gray text-center">
              {t('lib_not_found_hint')}{' '}
              <button
                type="button"
                onClick={() => { setNewLibType(filterType ?? 'YARN'); setCreatingInLib(true) }}
                className="text-sand-blue-deep underline hover:no-underline font-medium"
              >{t('lib_create_new')}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

