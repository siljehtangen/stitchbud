import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { useModalA11y } from '../../hooks/useModalA11y'
import { projectsApi, libraryApi } from '../../api'
import { libraryItemImagesForProject } from '../../projectOverviewMedia'
import { COLOR_MAP } from '../../colors'
import type { Project, LibraryItem, LibraryItemType } from '../../types'
import { TYPE_ICONS, LibraryItemForm } from '../../components/LibraryItemForm'
import { LibraryFilterBar } from '../../components/LibraryFilterBar'
import { itemSummary, libraryItemImageUrl } from '../../utils/libraryUtils'
import { useLibraryFilter } from '../../hooks/useLibraryFilter'
import { CloseIcon } from '../../components/UiIcons'
import { FiPlus, FiX } from 'react-icons/fi'

type Pane = 'library' | 'create'

export function AddMaterialDialog({
  projectId,
  onUpdate,
  onClose,
}: {
  projectId: number
  onUpdate: (p: Project) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState<Pane>('library')
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newLibType, setNewLibType] = useState<LibraryItemType>('YARN')
  const [pendingItem, setPendingItem] = useState<LibraryItem | null>(null)

  const {
    filterType,
    setFilterType,
    filterColors,
    setFilterColors,
    search,
    setSearch,
    showColorFilter,
    availableColors,
    filtered,
  } = useLibraryFilter(libraryItems)

  useEffect(() => {
    setLibraryLoading(true)
    setLibraryError(false)
    libraryApi
      .getAll()
      .then(setLibraryItems)
      .catch(() => setLibraryError(true))
      .finally(() => setLibraryLoading(false))
  }, [])

  useModalA11y(panelRef, onClose)

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
      if (item.yarnAmountG) {
        amount = String(item.yarnAmountG)
        unit = 'g'
      } else if (item.yarnAmountM) {
        amount = String(item.yarnAmountM)
        unit = 'm'
      }
    } else if (item.itemType === 'FABRIC') {
      amount = [item.fabricLengthCm && `${item.fabricLengthCm}cm`, item.fabricWidthCm && `${item.fabricWidthCm}cm`]
        .filter(Boolean)
        .join(' × ')
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
        name: item.name,
        type,
        itemType: item.itemType,
        color: colorName,
        colorHex,
        amount,
        unit,
      })
      const newMat = updated.materials.reduce((a, b) => (a.id > b.id ? a : b))
      if (libImgs.length > 0) {
        await Promise.all(
          libImgs.map(img =>
            projectsApi.registerMaterialImageByUrl(projectId, newMat.id, img.storedName, img.originalName || 'image')
          )
        )
        updated = await projectsApi.getOne(projectId)
      }
      onUpdate(updated)
      setPendingItem(null)
      showToast(t('material_added_toast'))
    } catch {
      showToast(t('upload_failed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleLibItemCreated(item: LibraryItem) {
    setLibraryItems(prev => [item, ...prev])
    setPane('library')
    showToast(t('lib_item_created_toast'))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-ink/35 backdrop-blur-[1px] p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t('close')}
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('library_add')}
        tabIndex={-1}
        className="relative z-10 flex w-full max-h-[90vh] flex-col rounded-t-3xl bg-[#FDFBF7] shadow-warm-lg outline-none sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 flex-shrink-0 rounded-full bg-soft-brown/40 sm:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
          <div className="min-w-0">
            <h3 className="font-serif text-2xl leading-tight text-ink">{t('library_add')}</h3>
            <p className="mt-0.5 text-sm text-warm-gray">{t('lib_create_sub')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-warm-gray hover:bg-soft-brown/20 hover:text-ink transition-colors"
            aria-label={t('close')}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <div className="flex gap-1 rounded-2xl bg-soft-brown/15 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={pane === 'library'}
              onClick={() => setPane('library')}
              className={`min-h-[40px] flex-1 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 ease-out ${
                pane === 'library' ? 'bg-white text-ink shadow-warm' : 'text-warm-gray hover:text-ink'
              }`}
            >
              {t('add_from_library')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pane === 'create'}
              onClick={() => setPane('create')}
              className={`min-h-[40px] flex-1 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 ease-out ${
                pane === 'create' ? 'bg-white text-ink shadow-warm' : 'text-warm-gray hover:text-ink'
              }`}
            >
              {t('lib_create_new')}
            </button>
          </div>
        </div>

        {pane === 'library' ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-3">
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
              <div className="mt-3 space-y-2.5 rounded-xl border border-sand-blue/40 bg-sand-blue/5 p-3">
                <div className="flex items-center gap-2">
                  {libraryItemImageUrl(pendingItem) ? (
                    <img
                      src={libraryItemImageUrl(pendingItem)!}
                      alt={pendingItem.name}
                      className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-sm">
                      {TYPE_ICONS[pendingItem.itemType]}
                    </div>
                  )}
                  <p className="flex-1 truncate text-sm font-medium text-ink">{pendingItem.name}</p>
                  <button
                    type="button"
                    onClick={() => setPendingItem(null)}
                    className="text-warm-gray hover:text-red-400"
                    title={t('cancel')}
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingItem(null)}
                    className="btn-ghost inline-flex items-center gap-1.5 text-sm"
                  >
                    <FiX className="text-base" />
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addFromLibrary(pendingItem, '')}
                    className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm"
                  >
                    <FiPlus className="text-base" />
                    {saving ? t('saving') : t('add_library_to_project')}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {libraryLoading ? (
                <p className="py-3 text-center text-sm text-warm-gray">{t('loading')}</p>
              ) : libraryError ? (
                <p className="py-3 text-center text-sm text-red-400">{t('load_failed')}</p>
              ) : filtered.length === 0 ? (
                <p className="py-3 text-center text-sm text-warm-gray">{t('library_empty')}</p>
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
                        <img
                          src={imgUrl}
                          alt=""
                          className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-base">
                          {TYPE_ICONS[item.itemType]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                        {summary && <p className="truncate text-xs text-warm-gray">{summary}</p>}
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleLibraryClick(item)}
                        className="btn-secondary inline-flex min-h-[44px] flex-shrink-0 items-center gap-1 whitespace-nowrap px-3 py-2 text-xs"
                      >
                        <FiPlus className="text-sm" />
                        {t('add_library_to_project')}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 border-t border-soft-brown/20 pt-3 text-center">
              <span className="text-xs text-warm-gray">{t('lib_not_found_hint')}</span>
              <button
                type="button"
                onClick={() => {
                  setNewLibType(filterType ?? 'YARN')
                  setPane('create')
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-sand-green-dark hover:text-ink transition-colors"
              >
                <FiPlus className="text-sm" />
                {t('lib_create_new')}
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
            <LibraryItemForm
              selectedType={newLibType}
              onTypeChange={setNewLibType}
              onCreated={handleLibItemCreated}
              onCancel={() => setPane('library')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
