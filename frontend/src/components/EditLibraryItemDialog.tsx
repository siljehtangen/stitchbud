import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import {
  Field,
  ColorPicker,
  TYPE_ICONS,
  COLOR_ITEM_TYPES,
  MAX_LIBRARY_PHOTOS,
  LIBRARY_PHOTO_ACCEPT,
} from './LibraryItemForm'
import { LibraryItemTypeFields } from './LibraryItemTypeFields'
import { itemSummary, libraryItemImageUrl, isImageUrl } from '../utils/libraryUtils'
import { FileTypeIcon } from './FileTypeIcon'
import { StarIcon, CloseIcon, PlusIcon, LoadingDotsIcon } from './UiIcons'
import { resolveColorDisplay } from '../colors'
import { FiCheck, FiTrash2 } from 'react-icons/fi'

function itemToFields(item: LibraryItem) {
  return {
    name: item.name,
    colors: (item.colors ?? []) as string[],
    yarnBrand: item.yarnBrand ?? '',
    yarnMaterial: item.yarnMaterial ?? '',
    yarnAmountG: item.yarnAmountG?.toString() ?? '',
    yarnAmountM: item.yarnAmountM?.toString() ?? '',
    fabricLength: item.fabricLengthCm?.toString() ?? '',
    fabricWidth: item.fabricWidthCm?.toString() ?? '',
    needleSize: item.needleSizeMm ?? '',
    circularLength: item.circularLengthCm?.toString() ?? '',
    hookSize: item.hookSizeMm ?? '',
  }
}

export function EditLibraryItemDialog({
  item,
  onClose,
  onUpdated,
  onDelete,
}: {
  item: LibraryItem
  onClose: () => void
  onUpdated: (updated: LibraryItem) => void
  onDelete: (id: number) => void
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [fields, setFields] = useState(() => itemToFields(item))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const itemType = item.itemType as LibraryItemType
  const hasColors = COLOR_ITEM_TYPES.includes(itemType)

  function setField<K extends keyof ReturnType<typeof itemToFields>>(key: K, val: ReturnType<typeof itemToFields>[K]) {
    setFields(f => ({ ...f, [key]: val }))
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Live preview re-renders from the current form state so every edit is visible.
  const previewItem: LibraryItem = useMemo(
    () => ({
      ...item,
      name: fields.name || item.name,
      colors: fields.colors,
      yarnBrand: fields.yarnBrand || undefined,
      yarnMaterial: fields.yarnMaterial || undefined,
      yarnAmountG: fields.yarnAmountG ? parseInt(fields.yarnAmountG) : undefined,
      yarnAmountM: fields.yarnAmountM ? parseInt(fields.yarnAmountM) : undefined,
      fabricLengthCm: fields.fabricLength ? parseInt(fields.fabricLength) : undefined,
      fabricWidthCm: fields.fabricWidth ? parseInt(fields.fabricWidth) : undefined,
      needleSizeMm: fields.needleSize || undefined,
      circularLengthCm: fields.circularLength ? parseInt(fields.circularLength) : undefined,
      hookSizeMm: fields.hookSize || undefined,
    }),
    [item, fields]
  )
  const previewSummary = itemSummary(previewItem)
  const displayUrl = libraryItemImageUrl(item)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || (item.images?.length ?? 0) >= MAX_LIBRARY_PHOTOS) return
    setUploading(true)
    try {
      const updated = await libraryApi.registerLibraryImage(item.id, file)
      onUpdated(updated)
      showToast(t('library_photo_added_toast'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await libraryApi.update(item.id, {
        name: fields.name.trim() || item.name,
        colors: hasColors ? fields.colors : undefined,
        yarnBrand: itemType === 'YARN' ? fields.yarnBrand || undefined : undefined,
        yarnMaterial: itemType === 'YARN' ? fields.yarnMaterial || undefined : undefined,
        yarnAmountG: itemType === 'YARN' && fields.yarnAmountG ? parseInt(fields.yarnAmountG) : undefined,
        yarnAmountM: itemType === 'YARN' && fields.yarnAmountM ? parseInt(fields.yarnAmountM) : undefined,
        fabricLengthCm: itemType === 'FABRIC' && fields.fabricLength ? parseInt(fields.fabricLength) : undefined,
        fabricWidthCm: itemType === 'FABRIC' && fields.fabricWidth ? parseInt(fields.fabricWidth) : undefined,
        needleSizeMm: itemType === 'KNITTING_NEEDLE' ? fields.needleSize || undefined : undefined,
        circularLengthCm:
          itemType === 'KNITTING_NEEDLE' && fields.circularLength ? parseInt(fields.circularLength) : undefined,
        hookSizeMm: itemType === 'CROCHET_HOOK' ? fields.hookSize || undefined : undefined,
      })
      onUpdated(updated)
      showToast({ title: t('lib_item_updated_toast'), detail: updated.name }, 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[1px] p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t('close')}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('material_editing')}
        tabIndex={-1}
        className="animate-dialog-in relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-[#FDFBF7] shadow-warm-lg outline-none sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 flex-shrink-0 rounded-full bg-soft-brown/40 sm:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
          <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-sand-green-dark">
            {t('material_editing')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-warm-gray transition-colors hover:bg-soft-brown/20 hover:text-ink"
            aria-label={t('close')}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <div className="flex items-center gap-3 rounded-2xl border border-soft-brown/20 bg-soft-brown/10 p-3">
            {displayUrl ? (
              isImageUrl(displayUrl) ? (
                <img
                  src={displayUrl}
                  alt={previewItem.name}
                  className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-warm-gray">
                  <FileTypeIcon url={displayUrl} className="h-6 w-6" />
                </div>
              )
            ) : (
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-base text-warm-gray"
                aria-hidden
              >
                {TYPE_ICONS[itemType]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{previewItem.name}</p>
              {previewSummary && <p className="truncate text-xs text-warm-gray">{previewSummary}</p>}
              {fields.colors.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {fields.colors.map(name => {
                    const { hex, displayName } = resolveColorDisplay(name, i18n.language)
                    return (
                      <span
                        key={name}
                        title={displayName}
                        className="h-3 w-3 rounded-full border border-black/10"
                        style={{ backgroundColor: hex }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-4">
          <Field label={t('lib_name')} required>
            <input
              className="input max-w-none text-sm"
              value={fields.name}
              onChange={e => setField('name', e.target.value)}
              placeholder={t('lib_name')}
            />
          </Field>

          {hasColors && (
            <Field label={t('lib_colors')}>
              <ColorPicker selected={fields.colors} onChange={v => setField('colors', v)} />
            </Field>
          )}

          <LibraryItemTypeFields
            itemType={itemType}
            yarnBrand={fields.yarnBrand}
            setYarnBrand={v => setField('yarnBrand', v)}
            yarnMaterial={fields.yarnMaterial}
            setYarnMaterial={v => setField('yarnMaterial', v)}
            yarnAmountG={fields.yarnAmountG}
            setYarnAmountG={v => setField('yarnAmountG', v)}
            yarnAmountM={fields.yarnAmountM}
            setYarnAmountM={v => setField('yarnAmountM', v)}
            fabricLength={fields.fabricLength}
            setFabricLength={v => setField('fabricLength', v)}
            fabricWidth={fields.fabricWidth}
            setFabricWidth={v => setField('fabricWidth', v)}
            needleSize={fields.needleSize}
            setNeedleSize={v => setField('needleSize', v)}
            circularLength={fields.circularLength}
            setCircularLength={v => setField('circularLength', v)}
            hookSize={fields.hookSize}
            setHookSize={v => setField('hookSize', v)}
          />

          <div className="space-y-2 border-t border-soft-brown/20 pt-3.5">
            <p className="text-sm font-medium text-ink/80">{t('cover_photos_label')}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {(item.images ?? []).map(img => (
                <div key={img.id} className="group relative flex-shrink-0">
                  {isImageUrl(img.storedName) ? (
                    <img
                      src={img.storedName}
                      alt={img.originalName}
                      className={`h-16 w-16 rounded-xl border-2 object-cover ${img.isMain ? 'border-sand-green-dark' : 'border-soft-brown/20'}`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-warm-gray ${img.isMain ? 'border-sand-green-dark' : 'border-soft-brown/20'}`}
                    >
                      <FileTypeIcon url={img.storedName} className="h-6 w-6" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      onUpdated(await libraryApi.setLibraryImageMain(item.id, img.id))
                      showToast(t('changes_saved_toast'))
                    }}
                    className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${img.isMain ? 'bg-sand-green-dark text-white' : 'bg-black/40 text-white hover:bg-sand-green-dark'}`}
                    title={img.isMain ? t('main_image') : t('set_as_main')}
                  >
                    <StarIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(
                        t('delete_library_photo_confirm'),
                        async () => {
                          onUpdated(await libraryApi.deleteLibraryImage(item.id, img.id))
                        },
                        'library_photo_removed_toast'
                      )
                    }
                    className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 group-hover:flex"
                    title={t('delete')}
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(item.images ?? []).length < MAX_LIBRARY_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={t('lib_upload_image')}
                  title={t('lib_upload_image')}
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-soft-brown/40 bg-soft-brown/10 text-warm-gray transition-colors hover:border-sand-green-dark hover:bg-sand-green/10 hover:text-sand-green-dark"
                >
                  {uploading ? <LoadingDotsIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={LIBRARY_PHOTO_ACCEPT}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-soft-brown/20 px-5 py-4">
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[14px] px-2 text-sm font-medium text-[#b06a4f] transition-colors hover:bg-[#f7e8dd]"
          >
            <FiTrash2 className="text-base" />
            {t('delete')}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm"
            >
              <FiCheck className="text-base" />
              {saving ? t('saving') : t('material_save_changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
