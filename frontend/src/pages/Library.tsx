import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import { ITEM_TYPES, TYPE_ICONS, Field, ColorPicker, LibraryItemForm, MAX_LIBRARY_PHOTOS, LIBRARY_PHOTO_ACCEPT, COLOR_ITEM_TYPES } from '../components/LibraryItemForm'
import { LibraryFilterBar } from '../components/LibraryFilterBar'
import { itemSummary, typeLabel, libraryItemImageUrl, isImageUrl, fileTypeIconFromUrl } from '../utils/libraryUtils'
import { useLibraryFilter } from '../hooks/useLibraryFilter'
import { resolveColorDisplay } from '../colors'
import { useAsyncData } from '../hooks/useAsyncData'

export default function Library() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const { data: items, setData: setItems, loading, error } = useAsyncData(() => libraryApi.getAll(), [] as LibraryItem[])
  const [adding, setAdding] = useState(false)
  const [selectedType, setSelectedType] = useState<LibraryItemType>('YARN')

  const { filterType, setFilterType, filterColors, setFilterColors, search, setSearch, showColorFilter, availableColors, filtered } = useLibraryFilter(items)

  const grouped = ITEM_TYPES.map(type => ({
    type,
    items: filtered.filter(i => i.itemType === type),
  })).filter(g => g.items.length > 0)


  async function handleDelete(id: number) {
    const ok = await confirm({
      message: t('lib_delete_confirm'),
      confirmLabel: t('delete'),
      tone: 'danger',
    })
    if (!ok) return
    await libraryApi.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
    showToast(t('lib_item_deleted_toast'))
  }

  function handleCreated(item: LibraryItem) {
    setItems(prev => [item, ...prev])
    setAdding(false)
    showToast(t('lib_item_created_toast'))
  }

  function handleUpdated(item: LibraryItem) {
    setItems(prev => prev.map(i => i.id === item.id ? item : i))
  }


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t('library_heading')}</h2>
        <button onClick={() => { if (!adding) setSelectedType(filterType ?? 'YARN'); setAdding(v => !v) }} className="btn-secondary text-sm">
          {adding ? t('cancel') : `+ ${t('library_add')}`}
        </button>
      </div>

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

      {adding && (
        <LibraryItemForm
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400 text-sm">{t('load_failed')}</div>
      ) : filtered.length === 0 && !adding ? (
        <div className="card text-center py-10">
          <p className="text-warm-gray text-sm">{t('library_empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ type, items: groupItems }) => (
            <div key={type}>
              <h3 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>{TYPE_ICONS[type]}</span>
                <span>{typeLabel(type, t)}</span>
              </h3>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    subtitle={itemSummary(item)}
                    onDelete={() => handleDelete(item.id)}
                    onImageUploaded={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
                    onUpdated={handleUpdated}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryCard({ item, subtitle, onDelete, onImageUploaded, onUpdated }: {
  item: LibraryItem
  subtitle: string
  onDelete: () => void
  onImageUploaded: (updated: LibraryItem) => void
  onUpdated: (updated: LibraryItem) => void
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasColors = COLOR_ITEM_TYPES.includes(item.itemType as LibraryItemType)

  const [name, setName] = useState(item.name)
  const [colors, setColors] = useState<string[]>(item.colors ?? [])
  const [yarnBrand, setYarnBrand] = useState(item.yarnBrand ?? '')
  const [yarnMaterial, setYarnMaterial] = useState(item.yarnMaterial ?? '')
  const [yarnAmountG, setYarnAmountG] = useState(item.yarnAmountG?.toString() ?? '')
  const [yarnAmountM, setYarnAmountM] = useState(item.yarnAmountM?.toString() ?? '')
  const [fabricLength, setFabricLength] = useState(item.fabricLengthCm?.toString() ?? '')
  const [fabricWidth, setFabricWidth] = useState(item.fabricWidthCm?.toString() ?? '')
  const [needleSize, setNeedleSize] = useState(item.needleSizeMm ?? '')
  const [circularLength, setCircularLength] = useState(item.circularLengthCm?.toString() ?? '')
  const [hookSize, setHookSize] = useState(item.hookSizeMm ?? '')

  // Sync edit fields when the parent updates the item (e.g. after image upload),
  // but only when the user is not actively editing to avoid overwriting their changes.
  useEffect(() => {
    if (editing) return
    setName(item.name)
    setColors(item.colors ?? [])
    setYarnBrand(item.yarnBrand ?? '')
    setYarnMaterial(item.yarnMaterial ?? '')
    setYarnAmountG(item.yarnAmountG?.toString() ?? '')
    setYarnAmountM(item.yarnAmountM?.toString() ?? '')
    setFabricLength(item.fabricLengthCm?.toString() ?? '')
    setFabricWidth(item.fabricWidthCm?.toString() ?? '')
    setNeedleSize(item.needleSizeMm ?? '')
    setCircularLength(item.circularLengthCm?.toString() ?? '')
    setHookSize(item.hookSizeMm ?? '')
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
                  <img src={displayUrl} alt="" className="w-14 h-14 object-cover rounded-xl border-2 border-sand-green" loading="lazy" />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-sand-green flex items-center justify-center text-lg">{fileTypeIconFromUrl(displayUrl)}</div>
                )}
              </div>
            )}
            {(item.images ?? []).map(img => (
              <div key={img.id} className="relative group flex-shrink-0">
                {isImageUrl(img.storedName) ? (
                  <img src={img.storedName} alt={img.originalName} className={`w-14 h-14 object-cover rounded-xl border-2 ${img.isMain ? 'border-sand-green' : 'border-transparent'}`} loading="lazy" />
                ) : (
                  <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-lg ${img.isMain ? 'border-sand-green' : 'border-soft-brown/30'}`}>{fileTypeIconFromUrl(img.storedName)}</div>
                )}
                <button
                  type="button"
                  onClick={async () => onUpdated(await libraryApi.setLibraryImageMain(item.id, img.id))}
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
                  title={img.isMain ? t('main_image') : t('set_as_main')}
                >★</button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      message: t('delete_library_photo_confirm'),
                      confirmLabel: t('dialog_btn_remove'),
                      tone: 'danger',
                    })
                    if (!ok) return
                    try {
                      onUpdated(await libraryApi.deleteLibraryImage(item.id, img.id))
                      showToast(t('library_photo_removed_toast'))
                    } catch {
                      showToast(t('upload_failed'), 'info')
                    }
                  }}
                  className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
                >×</button>
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
          <input ref={fileRef} type="file" accept={LIBRARY_PHOTO_ACCEPT} onChange={handleImageUpload} className="hidden" />
        </div>
        <Field label={t('lib_name')}>
          <input
            className="input text-sm py-1.5 w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('lib_name')}
          />
        </Field>

        {hasColors && (
          <Field label={t('lib_colors')}>
            <ColorPicker selected={colors} onChange={setColors} />
          </Field>
        )}

        {item.itemType === 'YARN' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('lib_yarn_brand')}>
              <input className="input text-sm py-1.5 w-full" value={yarnBrand} onChange={e => setYarnBrand(e.target.value)} placeholder={t('lib_yarn_brand')} />
            </Field>
            <Field label={t('lib_yarn_material')}>
              <input className="input text-sm py-1.5 w-full" value={yarnMaterial} onChange={e => setYarnMaterial(e.target.value)} placeholder={t('lib_yarn_material')} />
            </Field>
            <Field label={t('lib_yarn_amount_g')}>
              <input type="number" className="input text-sm py-1.5 w-full" value={yarnAmountG} onChange={e => setYarnAmountG(e.target.value)} placeholder={t('lib_yarn_amount_g')} />
            </Field>
            <Field label={t('lib_yarn_amount_m')}>
              <input type="number" className="input text-sm py-1.5 w-full" value={yarnAmountM} onChange={e => setYarnAmountM(e.target.value)} placeholder={t('lib_yarn_amount_m')} />
            </Field>
          </div>
        )}
        {item.itemType === 'FABRIC' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('lib_fabric_length')}>
              <input type="number" className="input text-sm py-1.5 w-full" value={fabricLength} onChange={e => setFabricLength(e.target.value)} placeholder={t('lib_fabric_length')} />
            </Field>
            <Field label={t('lib_fabric_width')}>
              <input type="number" className="input text-sm py-1.5 w-full" value={fabricWidth} onChange={e => setFabricWidth(e.target.value)} placeholder={t('lib_fabric_width')} />
            </Field>
          </div>
        )}
        {item.itemType === 'KNITTING_NEEDLE' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('lib_needle_size')}>
              <input className="input text-sm py-1.5 w-full" value={needleSize} onChange={e => setNeedleSize(e.target.value)} placeholder={t('lib_needle_size')} />
            </Field>
            <Field label={t('lib_circular_length')}>
              <input type="number" className="input text-sm py-1.5 w-full" value={circularLength} onChange={e => setCircularLength(e.target.value)} placeholder={t('lib_circular_length')} />
            </Field>
          </div>
        )}
        {item.itemType === 'CROCHET_HOOK' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('lib_hook_size')}>
              <input className="input text-sm py-1.5 w-full" value={hookSize} onChange={e => setHookSize(e.target.value)} placeholder={t('lib_hook_size')} />
            </Field>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex-1">
            {saving ? t('saving') : t('save')}
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost text-sm">{t('cancel')}</button>
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
            <span className="flex items-center justify-center w-full h-full text-2xl">{fileTypeIconFromUrl(displayUrl)}</span>
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
                <span
                  key={name}
                  title={displayName}
                  className="inline-flex items-center gap-1 text-xs text-warm-gray"
                >
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
      >✎</button>
      <button
        onClick={onDelete}
        className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
      >×</button>
    </div>
  )
}

