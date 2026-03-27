import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'

const ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']

const TYPE_ICONS: Record<LibraryItemType, string> = {
  YARN: '🧶',
  FABRIC: '🧵',
  KNITTING_NEEDLE: '🪡',
  CROCHET_HOOK: '🪝',
}

export default function Library() {
  const { t } = useTranslation()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedType, setSelectedType] = useState<LibraryItemType>('YARN')

  useEffect(() => {
    libraryApi.getAll().then(setItems).finally(() => setLoading(false))
  }, [])

  const grouped = ITEM_TYPES.map(type => ({
    type,
    items: items.filter(i => i.itemType === type),
  })).filter(g => g.items.length > 0)

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

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
    if (!confirm(t('lib_delete_confirm'))) return
    await libraryApi.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleCreated(item: LibraryItem) {
    setItems(prev => [item, ...prev])
    setAdding(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t('library_heading')}</h2>
        <button onClick={() => setAdding(v => !v)} className="btn-secondary text-sm">
          {adding ? t('cancel') : `+ ${t('library_add')}`}
        </button>
      </div>

      {adding && (
        <AddItemForm
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
      ) : items.length === 0 && !adding ? (
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
function LibraryCard({ item, subtitle, onDelete, onImageUploaded }: {
  item: LibraryItem
  subtitle: string
  onDelete: () => void
  onImageUploaded: (updated: LibraryItem) => void
}) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await libraryApi.uploadImage(item.id, file)
      onImageUploaded(updated)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="card flex items-center gap-3">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors relative"
        title={t('lib_upload_image')}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-2xl text-soft-brown/40">
            {uploading ? '⏳' : '📷'}
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800">{item.name}</p>
        {subtitle && <p className="text-xs text-warm-gray">{subtitle}</p>}
      </div>
      <button
        onClick={onDelete}
        className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
      >×</button>
    </div>
  )
}

// ── Add Item Form ──────────────────────────────────────────────
function AddItemForm({ selectedType, onTypeChange, onCreated, onCancel }: {
  selectedType: LibraryItemType
  onTypeChange: (t: LibraryItemType) => void
  onCreated: (item: LibraryItem) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  // Shared
  const [name, setName] = useState('')
  // Yarn
  const [yarnMaterial, setYarnMaterial] = useState('')
  const [yarnBrand, setYarnBrand] = useState('')
  const [yarnAmountG, setYarnAmountG] = useState('')
  const [yarnAmountM, setYarnAmountM] = useState('')
  // Fabric
  const [fabricLength, setFabricLength] = useState('')
  const [fabricWidth, setFabricWidth] = useState('')
  // Needle
  const [needleSize, setNeedleSize] = useState('')
  const [circularLength, setCircularLength] = useState('')
  // Hook
  const [hookSize, setHookSize] = useState('')

  function autoName() {
    if (selectedType === 'KNITTING_NEEDLE' && needleSize) return `${needleSize} mm strikkepinne`
    if (selectedType === 'CROCHET_HOOK' && hookSize) return `${hookSize} mm heklenål`
    if (selectedType === 'YARN') return [yarnBrand, yarnMaterial].filter(Boolean).join(' ') || 'Garn'
    if (selectedType === 'FABRIC') return 'Stoff'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const finalName = name.trim() || autoName()
      const item = await libraryApi.create({
        itemType: selectedType,
        name: finalName,
        yarnMaterial: selectedType === 'YARN' ? yarnMaterial || undefined : undefined,
        yarnBrand: selectedType === 'YARN' ? yarnBrand || undefined : undefined,
        yarnAmountG: selectedType === 'YARN' && yarnAmountG ? parseInt(yarnAmountG) : undefined,
        yarnAmountM: selectedType === 'YARN' && yarnAmountM ? parseInt(yarnAmountM) : undefined,
        fabricLengthCm: selectedType === 'FABRIC' && fabricLength ? parseInt(fabricLength) : undefined,
        fabricWidthCm: selectedType === 'FABRIC' && fabricWidth ? parseInt(fabricWidth) : undefined,
        needleSizeMm: selectedType === 'KNITTING_NEEDLE' ? needleSize || undefined : undefined,
        circularLengthCm: selectedType === 'KNITTING_NEEDLE' && circularLength ? parseInt(circularLength) : undefined,
        hookSizeMm: selectedType === 'CROCHET_HOOK' ? hookSize || undefined : undefined,
      })
      onCreated(item)
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedType === type ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
            }`}
          >
            <span>{TYPE_ICONS[type]}</span>
            <span>{typeLabel(type)}</span>
          </button>
        ))}
      </div>

      {/* YARN fields */}
      {selectedType === 'YARN' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('lib_yarn_brand')}>
            <input className="input text-sm py-2" value={yarnBrand} onChange={e => setYarnBrand(e.target.value)} placeholder="Sandnes Garn" />
          </Field>
          <Field label={t('lib_yarn_material')}>
            <input className="input text-sm py-2" value={yarnMaterial} onChange={e => setYarnMaterial(e.target.value)} placeholder="Ull, bomull..." />
          </Field>
          <Field label={t('lib_yarn_amount_g')}>
            <input type="number" className="input text-sm py-2" value={yarnAmountG} onChange={e => setYarnAmountG(e.target.value)} placeholder="100" />
          </Field>
          <Field label={t('lib_yarn_amount_m')}>
            <input type="number" className="input text-sm py-2" value={yarnAmountM} onChange={e => setYarnAmountM(e.target.value)} placeholder="200" />
          </Field>
        </div>
      )}

      {/* FABRIC fields */}
      {selectedType === 'FABRIC' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('lib_fabric_length')}>
            <input type="number" className="input text-sm py-2" value={fabricLength} onChange={e => setFabricLength(e.target.value)} placeholder="150" />
          </Field>
          <Field label={t('lib_fabric_width')}>
            <input type="number" className="input text-sm py-2" value={fabricWidth} onChange={e => setFabricWidth(e.target.value)} placeholder="140" />
          </Field>
        </div>
      )}

      {/* KNITTING NEEDLE fields */}
      {selectedType === 'KNITTING_NEEDLE' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('lib_needle_size')}>
            <input className="input text-sm py-2" value={needleSize} onChange={e => setNeedleSize(e.target.value)} placeholder="4.5" />
          </Field>
          <Field label={t('lib_circular_length')}>
            <input type="number" className="input text-sm py-2" value={circularLength} onChange={e => setCircularLength(e.target.value)} placeholder="80" />
          </Field>
        </div>
      )}

      {/* CROCHET HOOK fields */}
      {selectedType === 'CROCHET_HOOK' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('lib_hook_size')}>
            <input className="input text-sm py-2" value={hookSize} onChange={e => setHookSize(e.target.value)} placeholder="5.0" />
          </Field>
        </div>
      )}

      {/* Optional custom name */}
      <Field label={`${t('lib_name')} (valgfritt)`}>
        <input
          className="input text-sm py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={autoName() || t('lib_name')}
        />
      </Field>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">
          {saving ? t('saving') : t('lib_add_item')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">{t('cancel')}</button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
