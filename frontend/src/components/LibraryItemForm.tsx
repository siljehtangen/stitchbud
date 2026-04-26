import { useState, useRef, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { libraryApi } from '../api'
import type { LibraryItem, LibraryItemType } from '../types'
import { typeLabel } from '../utils/libraryUtils'
import { GiChopsticks, GiPirateHook, GiRolledCloth } from 'react-icons/gi'
import { PiYarnFill } from 'react-icons/pi'
import { LibraryItemTypeFields } from './LibraryItemTypeFields'
import { Field } from './Field'
import { ColorPicker } from './ColorPicker'

export { Field } from './Field'
export { ColorPicker } from './ColorPicker'

export const ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']
export const COLOR_ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC']
export const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx'

export const TYPE_ICONS: Record<LibraryItemType, React.ReactNode> = {
  YARN: <PiYarnFill className="text-sand-green-dark" />,
  FABRIC: <GiRolledCloth className="text-warm-gray" />,
  KNITTING_NEEDLE: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET_HOOK: <GiPirateHook className="text-sand-blue-deep" />,
}

export const MAX_LIBRARY_PHOTOS = 3
export const LIBRARY_PHOTO_ACCEPT = 'image/png,image/jpeg,image/jpg'

type LibraryPhotoEntry = { file: File; preview: string; isMain: boolean }

interface LibraryItemFormProps {
  selectedType: LibraryItemType
  onTypeChange: (t: LibraryItemType) => void
  onCreated: (item: LibraryItem) => void
  onCancel: () => void
  hideImageUpload?: boolean
}

export function LibraryItemForm({
  selectedType,
  onTypeChange,
  onCreated,
  onCancel,
  hideImageUpload,
}: LibraryItemFormProps) {
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
    if (selectedType === 'KNITTING_NEEDLE' && needleSize) return `${needleSize} mm ${t('lib_knitting_needle')}`
    if (selectedType === 'CROCHET_HOOK' && hookSize) return `${hookSize} mm ${t('lib_crochet_hook')}`
    if (selectedType === 'YARN') return [yarnBrand, yarnMaterial].filter(Boolean).join(' ') || t('lib_yarn')
    if (selectedType === 'FABRIC') return t('lib_fabric')
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const staged = [...libraryPhotos]
    setSaving(true)
    try {
      const finalName = name.trim() || autoName()
      const item = await libraryApi.create({
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('lib_item_type')}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
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
                selectedType === type
                  ? 'bg-sand-green text-gray-800'
                  : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
              }`}
            >
              <span>{TYPE_ICONS[type]}</span>
              <span>{typeLabel(type, t)}</span>
            </button>
          ))}
        </div>
      </div>

      <LibraryItemTypeFields
        itemType={selectedType}
        yarnBrand={yarnBrand}
        setYarnBrand={setYarnBrand}
        yarnMaterial={yarnMaterial}
        setYarnMaterial={setYarnMaterial}
        yarnAmountG={yarnAmountG}
        setYarnAmountG={setYarnAmountG}
        yarnAmountM={yarnAmountM}
        setYarnAmountM={setYarnAmountM}
        fabricLength={fabricLength}
        setFabricLength={setFabricLength}
        fabricWidth={fabricWidth}
        setFabricWidth={setFabricWidth}
        needleSize={needleSize}
        setNeedleSize={setNeedleSize}
        circularLength={circularLength}
        setCircularLength={setCircularLength}
        hookSize={hookSize}
        setHookSize={setHookSize}
      />

      {hasColors && (
        <Field label={t('lib_colors')}>
          <ColorPicker selected={colors} onChange={setColors} />
        </Field>
      )}

      <Field label={`${t('lib_name')}`} required>
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
                >
                  ★
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
                >
                  ×
                </button>
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
          <input
            ref={photoRef}
            type="file"
            accept={LIBRARY_PHOTO_ACCEPT}
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">
          {saving ? t('saving') : t('lib_add_item')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
