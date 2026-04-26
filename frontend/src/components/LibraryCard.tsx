import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import { Field, ColorPicker, MAX_LIBRARY_PHOTOS, LIBRARY_PHOTO_ACCEPT, COLOR_ITEM_TYPES } from './LibraryItemForm'
import { LibraryItemTypeFields } from './LibraryItemTypeFields'
import { libraryItemImageUrl, isImageUrl, fileTypeIconFromUrl } from '../utils/libraryUtils'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { resolveColorDisplay } from '../colors'

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

export const LibraryCard = memo(function LibraryCard({
  item,
  subtitle,
  onDelete,
  onImageUploaded,
  onUpdated,
}: {
  item: LibraryItem
  subtitle: string
  onDelete: (id: number) => void
  onImageUploaded: (updated: LibraryItem) => void
  onUpdated: (updated: LibraryItem) => void
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasColors = COLOR_ITEM_TYPES.includes(item.itemType as LibraryItemType)

  const [fields, setFields] = useState(() => itemToFields(item))
  function setField<K extends keyof ReturnType<typeof itemToFields>>(key: K, val: ReturnType<typeof itemToFields>[K]) {
    setFields(f => ({ ...f, [key]: val }))
  }

  useEffect(() => {
    if (editing) return
    setFields(itemToFields(item))
  }, [item, editing])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || (item.images?.length ?? 0) >= MAX_LIBRARY_PHOTOS) return
    setUploading(true)
    try {
      const updated = await libraryApi.registerLibraryImage(item.id, file)
      onImageUploaded(updated)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const {
        name,
        colors,
        yarnBrand,
        yarnMaterial,
        yarnAmountG,
        yarnAmountM,
        fabricLength,
        fabricWidth,
        needleSize,
        circularLength,
        hookSize,
      } = fields
      const updated = await libraryApi.update(item.id, {
        name: name.trim() || item.name,
        colors: hasColors ? colors : undefined,
        yarnBrand: item.itemType === 'YARN' ? yarnBrand || undefined : undefined,
        yarnMaterial: item.itemType === 'YARN' ? yarnMaterial || undefined : undefined,
        yarnAmountG: item.itemType === 'YARN' && yarnAmountG ? parseInt(yarnAmountG) : undefined,
        yarnAmountM: item.itemType === 'YARN' && yarnAmountM ? parseInt(yarnAmountM) : undefined,
        fabricLengthCm: item.itemType === 'FABRIC' && fabricLength ? parseInt(fabricLength) : undefined,
        fabricWidthCm: item.itemType === 'FABRIC' && fabricWidth ? parseInt(fabricWidth) : undefined,
        needleSizeMm: item.itemType === 'KNITTING_NEEDLE' ? needleSize || undefined : undefined,
        circularLengthCm: item.itemType === 'KNITTING_NEEDLE' && circularLength ? parseInt(circularLength) : undefined,
        hookSizeMm: item.itemType === 'CROCHET_HOOK' ? hookSize || undefined : undefined,
      })
      onUpdated(updated)
      setEditing(false)
      showToast(t('lib_item_updated_toast'))
    } finally {
      setSaving(false)
    }
  }

  const displayUrl = libraryItemImageUrl(item)

  if (editing) {
    return (
      <div className="card space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-warm-gray">{t('material_photos_hint')}</p>
          <div className="flex gap-2 flex-wrap items-start">
            {(item.images ?? []).length === 0 && displayUrl && (
              <div className="flex-shrink-0" title={t('main_image')}>
                {isImageUrl(displayUrl) ? (
                  <img
                    src={displayUrl}
                    alt=""
                    className="w-14 h-14 object-cover rounded-xl border-2 border-sand-green"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-sand-green flex items-center justify-center text-lg">
                    {fileTypeIconFromUrl(displayUrl)}
                  </div>
                )}
              </div>
            )}
            {(item.images ?? []).map(img => (
              <div key={img.id} className="relative group flex-shrink-0">
                {isImageUrl(img.storedName) ? (
                  <img
                    src={img.storedName}
                    alt={img.originalName}
                    className={`w-14 h-14 object-cover rounded-xl border-2 ${img.isMain ? 'border-sand-green' : 'border-transparent'}`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-lg ${img.isMain ? 'border-sand-green' : 'border-soft-brown/30'}`}
                  >
                    {fileTypeIconFromUrl(img.storedName)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => onUpdated(await libraryApi.setLibraryImageMain(item.id, img.id))}
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
                  title={img.isMain ? t('main_image') : t('set_as_main')}
                >
                  ★
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
                  className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            {(item.images ?? []).length < MAX_LIBRARY_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-14 h-14 rounded-xl border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors bg-soft-brown/10 flex flex-col items-center justify-center gap-0.5 text-warm-gray flex-shrink-0"
                title={t('lib_upload_image')}
              >
                <span className="text-lg leading-none">{uploading ? '…' : '+'}</span>
                <span className="text-[10px] text-center px-0.5 leading-tight">{t('upload_cover_image')}</span>
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
        <Field label={t('lib_name')}>
          <input
            className="input text-sm py-1.5 w-full"
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
          itemType={item.itemType as LibraryItemType}
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
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex-1">
            {saving ? t('saving') : t('save')}
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost text-sm">
            {t('cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border-2 border-soft-brown/20">
        {displayUrl ? (
          isImageUrl(displayUrl) ? (
            <img src={displayUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-2xl">
              {fileTypeIconFromUrl(displayUrl)}
            </span>
          )
        ) : (
          <span className="flex items-center justify-center w-full h-full text-2xl text-soft-brown/40">📷</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800">{item.name}</p>
        {subtitle && <p className="text-xs text-warm-gray">{subtitle}</p>}
        {(item.colors ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(item.colors ?? []).map(name => {
              const { hex, displayName } = resolveColorDisplay(name, i18n.language)
              return (
                <span key={name} title={displayName} className="inline-flex items-center gap-1 text-xs text-warm-gray">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  {displayName}
                </span>
              )
            })}
          </div>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-warm-gray hover:text-sand-blue-deep text-sm px-1 flex-shrink-0"
        title={t('edit')}
      >
        ✎
      </button>
      <button
        onClick={() => onDelete(item.id)}
        className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
})
