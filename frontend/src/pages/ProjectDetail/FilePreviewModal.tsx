import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '../../api'
import type { ProjectFile } from '../../types'
import { fileTypeIcon } from '../../utils/libraryUtils'

export function FilePreviewModal({ file, projectId, onClose }: {
  file: ProjectFile; projectId: number; onClose: () => void
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(1)
  const url = fileUrl(projectId, file.storedName)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-3 w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-white text-sm font-medium truncate max-w-xs">{file.originalName}</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none ml-4 flex-shrink-0"
            title={t('close')}
          >×</button>
        </div>

        {file.fileType === 'image' ? (
          <>
            <div className="overflow-auto rounded-lg w-full flex items-center justify-center" style={{ maxHeight: '75vh' }}>
              <img
                src={url}
                alt={file.originalName}
                style={{
                  display: 'block',
                  maxWidth: zoom === 1 ? '100%' : `${zoom * 100}%`,
                  maxHeight: zoom === 1 ? '72vh' : undefined,
                  width: zoom === 1 ? 'auto' : `${zoom * 100}%`,
                  height: zoom === 1 ? 'auto' : undefined,
                }}
                className="rounded-lg"
              />
            </div>
            <div className="flex items-center gap-1 bg-black/60 rounded-full px-3 py-1.5">
              <button
                onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
                className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
                title={t('zoom_out')}
              >−</button>
              <button
                onClick={() => setZoom(1)}
                className="text-white text-xs px-2 hover:bg-white/10 rounded-full h-8 min-w-[3rem]"
                title={t('zoom_reset')}
              >{Math.round(zoom * 100)}%</button>
              <button
                onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.25).toFixed(2))))}
                className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
                title={t('zoom_in')}
              >+</button>
            </div>
          </>
        ) : file.fileType === 'pdf' ? (
          <iframe
            src={url}
            title={file.originalName}
            className="w-full rounded-lg bg-white"
            style={{ height: '78vh' }}
          />
        ) : (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">{fileTypeIcon(file.fileType)}</div>
            <p className="text-gray-800 font-medium mb-6">{file.originalName}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              {t('open_file')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
