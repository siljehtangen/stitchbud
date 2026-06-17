import { useTranslation } from 'react-i18next'
import { StarIcon, CloseIcon, PlusIcon, LoadingDotsIcon } from './UiIcons'

export type CoverGalleryItem = {
  key: string | number
  src: string
  name?: string
  isMain: boolean
}

interface CoverImageGalleryProps {
  items: CoverGalleryItem[]
  max: number
  uploading?: boolean
  onSetMain: (key: string | number) => void
  onRemove: (key: string | number) => void
  onAdd: () => void
}

export function CoverImageGallery({ items, max, uploading, onSetMain, onRemove, onAdd }: CoverImageGalleryProps) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(img => (
        <div key={img.key} className="relative group flex-shrink-0">
          <img
            src={img.src}
            alt={img.name ?? ''}
            className={`w-24 h-24 object-cover rounded-xl border-2 transition-colors ${img.isMain ? 'border-sand-green' : 'border-transparent'}`}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => onSetMain(img.key)}
            className={`absolute top-1 left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
            title={img.isMain ? t('main_image') : t('set_as_main')}
          >
            <StarIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(img.key)}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white hidden group-hover:flex items-center justify-center transition-colors"
            title={t('delete')}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={onAdd}
          disabled={uploading}
          className="w-24 h-24 rounded-xl border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors bg-soft-brown/10 flex flex-col items-center justify-center gap-1 text-warm-gray flex-shrink-0"
          title={t('upload_cover_image')}
        >
          {uploading ? <LoadingDotsIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
          <span className="text-xs text-center px-1">{uploading ? t('uploading') : t('upload_cover_image')}</span>
        </button>
      )}
    </div>
  )
}
