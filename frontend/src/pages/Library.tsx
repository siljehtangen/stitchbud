import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import { COLOR_MAP, COLOR_MAP_BY_HEX, getColorName } from '../colors'
import { ITEM_TYPES, COLOR_ITEM_TYPES, TYPE_ICONS, Field, ColorPicker, LibraryItemForm, MAX_LIBRARY_PHOTOS, LIBRARY_PHOTO_ACCEPT } from '../components/LibraryItemForm'

function libraryDisplayImageUrl(item: { images?: { storedName: string; isMain: boolean }[] }) {
  const main = item.images?.find(i => i.isMain) ?? item.images?.[0]
  return main?.storedName
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

function fileTypeIcon(url: string) {
  if (/\.pdf$/i.test(url)) return '📄'
  if (/\.(doc|docx)$/i.test(url)) return '📝'
  return '📎'
}


function ColorMultiSelect({ availableColors, selected, onChange, language, placeholder, searchPlaceholder, noResults, clearLabel }: {
  availableColors: string[]
  selected: string[]
  onChange: (colors: string[]) => void
  language: string
  placeholder: string
  searchPlaceholder: string
  noResults: string
  clearLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback((name: string) => {
    onChange(selected.includes(name) ? selected.filter(c => c !== name) : [...selected, name])
  }, [selected, onChange])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.toLowerCase()
  const filtered = availableColors.filter(name => {
    const hex = COLOR_MAP[name] ?? '#ccc'
    const colorEntry = COLOR_MAP_BY_HEX[hex]
    const displayName = colorEntry ? getColorName(colorEntry, language) : name
    return displayName.toLowerCase().includes(q)
  })

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input text-sm py-1.5 w-full text-left flex items-center gap-1.5 flex-wrap min-h-[36px]"
      >
        {selected.length === 0 ? (
          <span className="text-warm-gray">{placeholder}…</span>
        ) : (
          selected.map(name => {
            const hex = COLOR_MAP[name] ?? '#ccc'
            const colorEntry = COLOR_MAP_BY_HEX[hex]
            const displayName = colorEntry ? getColorName(colorEntry, language) : name
            return (
              <span key={name} className="inline-flex items-center gap-1 bg-sand-blue/40 text-gray-700 text-xs rounded-full px-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: hex }} />
                {displayName}
                <span
                  role="button"
                  onClick={e => { e.stopPropagation(); toggle(name) }}
                  className="ml-0.5 leading-none hover:text-red-400 cursor-pointer"
                >×</span>
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
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-warm-gray">{noResults}</li>
            )}
            {filtered.map(name => {
              const hex = COLOR_MAP[name] ?? '#ccc'
              const colorEntry = COLOR_MAP_BY_HEX[hex]
              const displayName = colorEntry ? getColorName(colorEntry, language) : name
              const checked = selected.includes(name)
              return (
                <li
                  key={name}
                  onClick={() => toggle(name)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${checked ? 'bg-sand-blue/20 text-gray-800' : 'hover:bg-soft-brown/10 text-gray-700'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: hex }} />
                  <span className="flex-1">{displayName}</span>
                  {checked && <span className="text-sand-blue-deep text-xs">✓</span>}
                </li>
              )
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-soft-brown/20 px-3 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-warm-gray hover:text-red-400 transition-colors">
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Library() {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedType, setSelectedType] = useState<LibraryItemType>('YARN')
  const [filterType, setFilterType] = useState<LibraryItemType | null>(null)
  const [filterColors, setFilterColors] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    libraryApi.getAll().then(setItems).finally(() => setLoading(false))
  }, [])

  // Show color filter only when type filter is yarn/fabric or no type filter (but items with colors exist)
  const showColorFilter = filterType === null || COLOR_ITEM_TYPES.includes(filterType)

  // Collect colors that actually exist in filtered-by-type items
  const colorableItems = items.filter(i => COLOR_ITEM_TYPES.includes(i.itemType as LibraryItemType))
  const availableColors = Array.from(
    new Set(colorableItems.flatMap(i => i.colors ?? []))
  )

  const q = search.toLowerCase()
  const filtered = items.filter(i => {
    if (filterType && i.itemType !== filterType) return false
    if (filterColors.length > 0 && !filterColors.some(c => (i.colors ?? []).includes(c))) return false
    if (!q) return true
    return [
      i.name,
      i.yarnBrand,
      i.yarnMaterial,
      i.needleSizeMm,
      i.hookSizeMm,
      i.fabricLengthCm != null ? String(i.fabricLengthCm) : null,
      i.fabricWidthCm != null ? String(i.fabricWidthCm) : null,
    ].some(v => v?.toLowerCase().includes(q))
  })

  const grouped = ITEM_TYPES.map(type => ({
    type,
    items: filtered.filter(i => i.itemType === type),
  })).filter(g => g.items.length > 0)

  function itemSubtitle(item: LibraryItem) {
    if (item.itemType === 'YARN') {
      const parts = [item.yarnBrand, item.yarnMaterial].filter(Boolean).join(', ')
      const amounts = [
        item.yarnAmountG && `${item.yarnAmountG} g`,
        item.yarnAmountM && `${item.yarnAmountM} m`,
      ].filter(Boolean).join(' / ')
      return [parts, amounts].filter(Boolean).join(' · ')
    }
    if (item.itemType === 'FABRIC') {
      const dims = [
        item.fabricLengthCm && `${item.fabricLengthCm} cm`,
        item.fabricWidthCm && `${item.fabricWidthCm} cm`,
      ].filter(Boolean).join(' × ')
      return dims
    }
    if (item.itemType === 'KNITTING_NEEDLE') {
      return [
        item.needleSizeMm && `${item.needleSizeMm} mm`,
        item.circularLengthCm && `${item.circularLengthCm} cm`,
      ].filter(Boolean).join(', ')
    }
    if (item.itemType === 'CROCHET_HOOK') {
      return item.hookSizeMm ? `${item.hookSizeMm} mm` : ''
    }
    return ''
  }

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

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t('library_heading')}</h2>
        <button onClick={() => { if (!adding) setSelectedType(filterType ?? 'YARN'); setAdding(v => !v) }} className="btn-secondary text-sm">
          {adding ? t('cancel') : `+ ${t('library_add')}`}
        </button>
      </div>

      {/* Filter bar */}
      <div className="space-y-2">
        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === null ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
            }`}
          >
            {t('lib_all')}
          </button>
          {ITEM_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFilterType(filterType === type ? null : type)
                setFilterColors([])
              }}
              className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === type ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
              }`}
            >
              <span className="text-sm leading-none flex-shrink-0">{TYPE_ICONS[type]}</span>
              <span className="whitespace-nowrap">{typeLabel(type)}</span>
            </button>
          ))}
        </div>

        {/* Search + color filter side by side */}
        <div className="flex gap-2">
          <input
            type="search"
            className="input text-sm py-2 w-1/2 min-w-0"
            placeholder={t('lib_search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {showColorFilter && availableColors.length > 0 && (
            <div className="w-1/2 flex-shrink-0">
              <ColorMultiSelect
                availableColors={availableColors}
                selected={filterColors}
                onChange={setFilterColors}
                language={i18n.language}
                placeholder={t('lib_filter_color')}
                searchPlaceholder={t('lib_color_search_placeholder')}
                noResults={t('lib_color_no_results')}
                clearLabel={t('lib_clear_color_filter')}
              />
            </div>
          )}
        </div>
      </div>

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
                <span>{typeLabel(type)}</span>
              </h3>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    subtitle={itemSubtitle(item)}
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

// ── Library Card ───────────────────────────────────────────────
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

  // Edit fields
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

  const displayUrl = libraryDisplayImageUrl(item)

  if (editing) {
    return (
      <div className="card space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-warm-gray">{t('material_photos_hint')}</p>
          <div className="flex gap-2 flex-wrap items-start">
            {(item.images ?? []).length === 0 && displayUrl && (
              <div className="flex-shrink-0" title={t('main_image')}>
                {isImageUrl(displayUrl) ? (
                  <img src={displayUrl} alt="" className="w-14 h-14 object-cover rounded-xl border-2 border-sand-green" />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-sand-green flex items-center justify-center text-lg">{fileTypeIcon(displayUrl)}</div>
                )}
              </div>
            )}
            {(item.images ?? []).map(img => (
              <div key={img.id} className="relative group flex-shrink-0">
                {isImageUrl(img.storedName) ? (
                  <img src={img.storedName} alt={img.originalName} className={`w-14 h-14 object-cover rounded-xl border-2 ${img.isMain ? 'border-sand-green' : 'border-transparent'}`} />
                ) : (
                  <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-lg ${img.isMain ? 'border-sand-green' : 'border-soft-brown/30'}`}>{fileTypeIcon(img.storedName)}</div>
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

        {/* Color picker for yarn/fabric */}
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
        {libraryDisplayImageUrl(item) ? (
          isImageUrl(libraryDisplayImageUrl(item)!) ? (
            <img src={libraryDisplayImageUrl(item)!} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-2xl">{fileTypeIcon(libraryDisplayImageUrl(item)!)}</span>
          )
        ) : (
          <span className="flex items-center justify-center w-full h-full text-2xl text-soft-brown/40">📷</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800">{item.name}</p>
        {subtitle && <p className="text-xs text-warm-gray">{subtitle}</p>}
        {/* Color swatches display */}
        {(item.colors ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(item.colors ?? []).map(name => {
              const hex = COLOR_MAP[name] ?? '#ccc'
              const colorEntry = COLOR_MAP_BY_HEX[hex]
              const displayName = colorEntry ? getColorName(colorEntry, i18n.language) : name
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

