import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useFileUpload } from '../../hooks/useFileUpload'
import { projectsApi } from '../../api'
import { FileTypeIcon } from '../../components/FileTypeIcon'
import { CloseIcon } from '../../components/UiIcons'
import { FiPlus, FiRotateCw } from 'react-icons/fi'
import type { Project, ProjectFile } from '../../types'
import { Field } from '../../components/LibraryItemForm'
import { FileDropzone } from '../../components/FileDropzone'
import { FilePreviewModal } from './FilePreviewModal'
import { safeHttpUrl } from '../../utils/url'

export function PinterestBoardEmbed({ url }: { url: string }) {
  const { t } = useTranslation()
  const embedRef = useRef<HTMLDivElement>(null)
  const safeUrl = safeHttpUrl(url)

  useEffect(() => {
    if (!safeUrl) return
    if (!document.getElementById('pinterest-pinit-js')) {
      const script = document.createElement('script')
      script.id = 'pinterest-pinit-js'
      script.src = '//assets.pinterest.com/js/pinit.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
    const timer = setTimeout(() => {
      ;(window as { PinUtils?: { build: () => void } }).PinUtils?.build()
    }, 300)
    return () => clearTimeout(timer)
  }, [safeUrl])

  if (!safeUrl) return null

  return (
    <div ref={embedRef} key={safeUrl} className="overflow-hidden rounded-xl">
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="400"
        data-pin-scale-height="240"
        data-pin-scale-width="80"
        href={safeUrl}
      >
        <span className="sr-only">{t('pinterest_board_aria')}</span>
      </a>
    </div>
  )
}

const MAX_PINTEREST_BOARDS = 3

export function RecipeTab({
  recipeText,
  pinterestBoardUrls,
  files,
  projectId,
  onUpdate,
  onRecipeChange,
  onPinterestChange,
}: {
  recipeText: string
  pinterestBoardUrls: string[]
  files: ProjectFile[]
  projectId: number
  onUpdate: (p: Project) => void
  onRecipeChange: (v: string) => void
  onPinterestChange: (urls: string[]) => void
}) {
  const { t } = useTranslation()
  const confirmDelete = useConfirmDelete()
  const [replacingId, setReplacingId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const { uploading, ref: fileRef, execute } = useFileUpload()
  const replaceRef = useRef<HTMLInputElement>(null)

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || replacingId === null) return
    await execute(
      () => projectsApi.replaceFile(projectId, replacingId, file),
      onUpdate,
      replaceRef,
      () => setReplacingId(null)
    )
  }

  function startReplace(fileId: number) {
    setReplacingId(fileId)
    replaceRef.current?.click()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label={t('recipe_label')}>
        <textarea
          className="textarea"
          rows={10}
          value={recipeText}
          onChange={e => onRecipeChange(e.target.value)}
          placeholder={t('recipe_placeholder')}
        />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink/80">{t('pinterest_label')}</span>
          {pinterestBoardUrls.length > 0 && pinterestBoardUrls.length < MAX_PINTEREST_BOARDS && (
            <button
              onClick={() => onPinterestChange([...pinterestBoardUrls, ''])}
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <FiPlus className="text-sm" aria-hidden />
              {t('pinterest_add')}
            </button>
          )}
        </div>

        {pinterestBoardUrls.length === 0 ? (
          <button
            type="button"
            onClick={() => onPinterestChange([''])}
            className="w-full text-center py-6 border-2 border-dashed border-soft-brown/30 rounded-xl hover:border-sand-green-dark/70 hover:bg-sand-green/10 transition-colors"
          >
            <span className="text-sm text-warm-gray inline-flex items-center gap-1.5">
              <FiPlus className="text-sm" aria-hidden />
              {t('pinterest_add')}
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            {pinterestBoardUrls.map((url, i) => (
              <div key={i} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    className="input input-wide flex-1 min-w-0"
                    type="url"
                    value={url}
                    onChange={e => {
                      const next = [...pinterestBoardUrls]
                      next[i] = e.target.value
                      onPinterestChange(next)
                    }}
                    placeholder={t('pinterest_placeholder')}
                  />
                  <button
                    onClick={() => onPinterestChange(pinterestBoardUrls.filter((_, j) => j !== i))}
                    className="text-warm-gray hover:text-red-400 px-1 flex-shrink-0"
                    title={t('delete')}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
                {url && (
                  <div>
                    <PinterestBoardEmbed url={url} />
                    <p className="text-xs text-warm-gray mt-1">{t('pinterest_hint')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="text-sm font-medium text-ink/80 block mb-2">{t('attachments_label')}</span>

        <FileDropzone
          accept="image/*,.pdf,.doc,.docx"
          uploading={uploading}
          uploadingLabel={t('uploading')}
          title={t('file_dropzone_title')}
          hint={t('file_dropzone_hint')}
          onFile={file => execute(() => projectsApi.uploadProjectFile(projectId, file), onUpdate, fileRef)}
        />

        <input
          ref={replaceRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleReplace}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="space-y-2 mt-3">
            {files.map(f => {
              const url = f.storedName
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="flex-shrink-0 focus:outline-none"
                    title={t('preview_file')}
                  >
                    {f.fileType === 'image' ? (
                      <img
                        src={url}
                        alt={f.originalName}
                        className="w-12 h-12 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-12 h-12 flex items-center justify-center text-warm-gray hover:opacity-70 transition-opacity">
                        <FileTypeIcon fileType={f.fileType} className="w-7 h-7" />
                      </span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setPreviewFile(f)}
                      className="text-sm font-medium text-ink hover:text-sand-green-dark truncate block text-left w-full"
                    >
                      {f.originalName}
                    </button>
                    <p className="text-xs text-warm-gray capitalize">{f.fileType}</p>
                  </div>
                  <button
                    onClick={() => startReplace(f.id)}
                    disabled={uploading}
                    className="text-warm-gray hover:text-sand-blue-deep text-sm px-1 flex-shrink-0"
                    title={t('replace_file')}
                    aria-label={t('replace_file')}
                  >
                    <FiRotateCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      confirmDelete(
                        t('delete_attachment_confirm', { name: f.originalName }),
                        async () => {
                          onUpdate(await projectsApi.deleteFile(projectId, f.id))
                        },
                        'attachment_removed_toast'
                      )
                    }
                    className="text-warm-gray hover:text-red-400 px-1 flex-shrink-0"
                    title={t('delete')}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}
