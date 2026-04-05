import { useState, useRef, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import { COLORS, COLOR_MAP, COLOR_MAP_BY_HEX, getColorName } from '../colors'
import { GiChopsticks, GiPirateHook, GiRolledCloth } from 'react-icons/gi'
import { PiYarnFill } from 'react-icons/pi'

export const ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']
export const COLOR_ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC']
export const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx'

export const TYPE_ICONS: Record<LibraryItemType, React.ReactNode> = {
  YARN: <PiYarnFill className="text-sand-green-dark" />,
  FABRIC: <GiRolledCloth className="text-warm-gray" />,
  KNITTING_NEEDLE: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET_HOOK: <GiPirateHook className="text-sand-blue-deep" />,
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function ColorPicker({ selected, onChange }: {
  selected: string[]
  onChange: (colors: string[]) => void
}) {
  const { i18n } = useTranslation()

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter(c => c !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(name => {
            const colorEntry = COLOR_MAP_BY_HEX[COLOR_MAP[name]]
            const displayName = colorEntry ? getColorName(colorEntry, i18n.language) : name
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-soft-brown/20 text-gray-700"
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: COLOR_MAP[name] ?? '#ccc' }}
                />
                {displayName}
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className="ml-0.5 text-warm-gray hover:text-red-400 leading-none"
                >×</button>
              </span>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((color) => {
          const { name, hex } = color
          const isSelected = selected.includes(name)
          return (
            <button
              key={name}
              type="button"
              title={getColorName(color, i18n.language)}
              onClick={() => toggle(name)}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                isSelected
                  ? 'border-sand-blue-deep ring-2 ring-sand-blue-deep/40 scale-110'
                  : 'border-black/10 hover:border-black/25'
              }`}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </div>
    </div>
  )
}

export const MAX_LIBRARY_PHOTOS = 3
export const LIBRARY_PHOTO_ACCEPT = 'image/png,image/jpeg,image/jpg'

type LibraryPhotoEntry = { file: File; preview: string; isMain: boolean }

interface LibraryItemFormProps {
  selectedType: LibraryItemType
  onTypeChange: (t: LibraryItemType) => void
  onCreated: (item: LibraryItem) => void
  onCancel: () => void
  /** Hide image upload (e.g. in compact/inline contexts) */
  hideImageUpload?: boolean
}

export function LibraryItemForm({ selectedType, onTypeChange, onCreated, onCancel, hideImageUpload }: LibraryItemFormProps) {
  const { t } = useTranslation()
  const photoRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [libraryPhotos, setLibraryPhotos] = useState<LibraryPhotoEntry[]>([])

  const [name, setName] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [yarnMaterial, setYarnMaterial] = useState('')
  const [yarnBrand, setYarnBrand] = useState('')
  const [yarnAmountG, setYarnAmountG] = useState('')
  const [yarnAmountM, setYarnAmountM] = useState('')
  const [fabricLength, setFabricLength] = useState('')
  const [fabricWidth, setFabricWidth] = useState('')
  const [needleSize, setNeedleSize] = useState('')
  const [circularLength, setCircularLength] = useState('')
  const [hookSize, setHookSize] = useState('')

  const hasColors = COLOR_ITEM_TYPES.includes(selectedType)

  function clearLibraryPhotos() {
    setLibraryPhotos(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.preview))
      return []
    })
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || libraryPhotos.length >= MAX_LIBRARY_PHOTOS) return
    const preview = URL.createObjectURL(file)
    setLibraryPhotos(prev => [...prev, { file, preview, isMain: prev.length === 0 }])
    if (photoRef.current) photoRef.current.value = ''
  }

  function setPhotoMain(index: number) {
    setLibraryPhotos(prev => prev.map((img, i) => ({ ...img, isMain: i === index })))
  }

  function removePhoto(index: number) {
    setLibraryPhotos(prev => {
      const wasMain = prev[index].isMain
      URL.revokeObjectURL(prev[index].preview)
      const next = prev.filter((_, i) => i !== index)
      if (wasMain && next.length > 0) next[0] = { ...next[0], isMain: true }
      return next
    })
  }

  function autoName() {
    if (selectedType === 'KNITTING_NEEDLE' && needleSize) return `${needleSize} mm strikkepinne`
    if (selectedType === 'CROCHET_HOOK' && hookSize) return `${hookSize} mm heklenål`
    if (selectedType === 'YARN') return [yarnBrand, yarnMaterial].filter(Boolean).join(' ') || 'Garn'
    if (selectedType === 'FABRIC') return 'Stoff'
    return ''
  }

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const staged = [...libraryPhotos]
    setSaving(true)
    try {
      const finalName = name.trim() || autoName()
      let item = await libraryApi.create({
        itemType: selectedType,
        name: finalName,
        colors: hasColors && colors.length > 0 ? colors : undefined,
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
      if (!hideImageUpload && staged.length > 0) {
        const main = staged.find(img => img.isMain)
        const others = staged.filter(img => !img.isMain)
        let updated = item
        if (main) updated = await libraryApi.registerLibraryImage(item.id, main.file)
        for (const img of others) {
          updated = await libraryApi.registerLibraryImage(item.id, img.file)
        }
        staged.forEach(p => URL.revokeObjectURL(p.preview))
        setLibraryPhotos([])
        onCreated(updated)
      } else {
        onCreated(item)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => {
              onTypeChange(type)
              setColors([])
              clearLibraryPhotos()
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedType === type ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
            }`}
          >
            <span>{TYPE_ICONS[type]}</span>
            <span>{typeLabel(type)}</span>
          </button>
        ))}
      </div>

      {selectedType === 'YARN' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_yarn_brand')}>
            <input className="input text-sm py-1.5" value={yarnBrand} onChange={e => setYarnBrand(e.target.value)} placeholder="Sandnes Garn" />
          </Field>
          <Field label={t('lib_yarn_material')}>
            <input className="input text-sm py-1.5" value={yarnMaterial} onChange={e => setYarnMaterial(e.target.value)} placeholder="Ull..." />
          </Field>
          <Field label={t('lib_yarn_amount_g')}>
            <input type="number" className="input text-sm py-1.5" value={yarnAmountG} onChange={e => setYarnAmountG(e.target.value)} placeholder="100" />
          </Field>
          <Field label={t('lib_yarn_amount_m')}>
            <input type="number" className="input text-sm py-1.5" value={yarnAmountM} onChange={e => setYarnAmountM(e.target.value)} placeholder="200" />
          </Field>
        </div>
      )}

      {selectedType === 'FABRIC' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_fabric_length')}>
            <input type="number" className="input text-sm py-1.5" value={fabricLength} onChange={e => setFabricLength(e.target.value)} placeholder="150" />
          </Field>
          <Field label={t('lib_fabric_width')}>
            <input type="number" className="input text-sm py-1.5" value={fabricWidth} onChange={e => setFabricWidth(e.target.value)} placeholder="140" />
          </Field>
        </div>
      )}

      {selectedType === 'KNITTING_NEEDLE' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_needle_size')}>
            <input className="input text-sm py-1.5" value={needleSize} onChange={e => setNeedleSize(e.target.value)} placeholder="4.5" />
          </Field>
          <Field label={t('lib_circular_length')}>
            <input type="number" className="input text-sm py-1.5" value={circularLength} onChange={e => setCircularLength(e.target.value)} placeholder="80" />
          </Field>
        </div>
      )}

      {selectedType === 'CROCHET_HOOK' && (
        <Field label={t('lib_hook_size')}>
          <input className="input text-sm py-1.5" value={hookSize} onChange={e => setHookSize(e.target.value)} placeholder="5.0" />
        </Field>
      )}

      {hasColors && (
        <Field label={t('lib_colors')}>
          <ColorPicker selected={colors} onChange={setColors} />
        </Field>
      )}

      <Field label={`${t('lib_name')}`}>
        <input
          className="input text-sm py-1.5"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={autoName() || t('lib_name')}
        />
      </Field>

      {!hideImageUpload && (
        <div className="space-y-2">
          <p className="text-xs text-warm-gray">{t('material_photos_hint')}</p>
          <div className="flex gap-2 flex-wrap">
            {libraryPhotos.map((img, i) => (
              <div key={i} className="relative group flex-shrink-0">
                <img
                  src={img.preview}
                  alt=""
                  className={`w-24 h-24 object-cover rounded-xl border-2 transition-colors ${img.isMain ? 'border-sand-green' : 'border-transparent'}`}
                />
                <button
                  type="button"
                  onClick={() => setPhotoMain(i)}
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
                  title={img.isMain ? t('main_image') : t('set_as_main')}
                >★</button>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
                >×</button>
              </div>
            ))}
            {libraryPhotos.length < MAX_LIBRARY_PHOTOS && (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors bg-soft-brown/10 flex flex-col items-center justify-center gap-1 text-warm-gray flex-shrink-0"
              >
                <span className="text-xl leading-none">+</span>
                <span className="text-xs text-center px-1">{t('upload_cover_image')}</span>
              </button>
            )}
          </div>
          <input ref={photoRef} type="file" accept={LIBRARY_PHOTO_ACCEPT} onChange={handlePhotoChange} className="hidden" />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">
          {saving ? t('saving') : t('lib_add_item')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">{t('cancel')}</button>
      </div>
    </form>
  )
}
