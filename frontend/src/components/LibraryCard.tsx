import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LibraryItem } from '../types'
import { libraryItemImageUrl, isImageUrl } from '../utils/libraryUtils'
import { FileTypeIcon, ImagePlaceholderIcon } from './FileTypeIcon'
import { CloseIcon, EditIcon } from './UiIcons'
import { resolveColorDisplay } from '../colors'
import { EditLibraryItemDialog } from './EditLibraryItemDialog'

export const LibraryCard = memo(function LibraryCard({
  item,
  subtitle,
  onDelete,
  onUpdated,
}: {
  item: LibraryItem
  subtitle: string
  onDelete: (id: number) => void
  onUpdated: (updated: LibraryItem) => void
}) {
  const { t, i18n } = useTranslation()
  const [editing, setEditing] = useState(false)

  const displayUrl = libraryItemImageUrl(item)

  return (
    <>
      <div className="card flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border-2 border-soft-brown/20">
          {displayUrl ? (
            isImageUrl(displayUrl) ? (
              <img src={displayUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-warm-gray">
                <FileTypeIcon url={displayUrl} className="w-7 h-7" />
              </span>
            )
          ) : (
            <span className="flex items-center justify-center w-full h-full text-soft-brown/40">
              <ImagePlaceholderIcon className="w-7 h-7" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-ink">{item.name}</p>
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
        >
          <EditIcon />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-warm-gray hover:text-[#b06a4f] px-1 flex-shrink-0"
          title={t('delete')}
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {editing && (
        <EditLibraryItemDialog
          item={item}
          onClose={() => setEditing(false)}
          onUpdated={onUpdated}
          onDelete={onDelete}
        />
      )}
    </>
  )
})
