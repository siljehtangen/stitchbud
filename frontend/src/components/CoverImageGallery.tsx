import { useState } from 'react'
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
  /** When provided, the add tile accepts drag-and-dropped image files. */
  onFile?: (file: File) => void
}

export function CoverImageGallery({
  items,
  max,
  uploading,
  onSetMain,
  onRemove,
  onAdd,
  onFile,
}: CoverImageGalleryProps) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    if (!onFile) return
    e.preventDefault()
    setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) onFile(file)
  }

  return (
    <div className="flex gap-2.5 flex-wrap">
      {items.map(img => (
        <div key={img.key} className="relative group w-24 h-24 flex-shrink-0">
          <img
            src={img.src}
            alt={img.name ?? ''}
            className={`w-24 h-24 object-cover rounded-2xl transition-all ${
              img.isMain
                ? 'ring-2 ring-sand-green-dark ring-offset-2 ring-offset-white'
                : 'ring-1 ring-[rgb(var(--border-light))]'
            }`}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => onSetMain(img.key)}
            className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors ${
              img.isMain
                ? 'bg-sand-green-dark text-white'
                : 'bg-white/85 text-warm-gray hover:bg-sand-green-dark hover:text-white'
            }`}
            title={img.isMain ? t('main_image') : t('set_as_main')}
          >
            <StarIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(img.key)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/85 text-warm-gray hover:bg-red-500 hover:text-white shadow-sm hidden group-hover:flex items-center justify-center transition-colors"
            title={t('delete')}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
          {img.isMain && (
            <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-medium text-center text-white bg-sand-green-dark/85 rounded-md py-0.5 leading-none">
              {t('main_image')}
            </span>
          )}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={onAdd}
          disabled={uploading}
          onDragOver={
            onFile
              ? e => {
                  e.preventDefault()
                  setDragging(true)
                }
              : undefined
          }
          onDragLeave={onFile ? () => setDragging(false) : undefined}
          onDrop={handleDrop}
          className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 flex-shrink-0 transition-all duration-200 ${
            dragging
              ? 'border-sand-green-dark bg-sand-green/20 scale-[1.02]'
              : 'border-soft-brown/40 bg-[#FDFBF7] hover:border-sand-green-dark/70 hover:bg-sand-green/10'
          } ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
          title={t('upload_cover_image')}
        >
          <span className="w-9 h-9 rounded-full bg-sand-green/20 text-sand-green-dark flex items-center justify-center">
            {uploading ? <LoadingDotsIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          </span>
          <span className="text-[11px] leading-tight text-warm-gray text-center px-1">
            {uploading ? t('uploading') : t('upload_cover_image')}
          </span>
        </button>
      )}
    </div>
  )
}
