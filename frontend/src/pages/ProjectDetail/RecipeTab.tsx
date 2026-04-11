import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { projectsApi, fileUrl } from '../../api'
import { fileTypeIcon } from '../../utils/libraryUtils'
import type { Project, ProjectFile } from '../../types'
import { Field } from '../../components/LibraryItemForm'
import { FilePreviewModal } from './FilePreviewModal'

export function RecipeTab({ recipeText, files, projectId, onUpdate, onRecipeChange }: {
  recipeText: string; files: ProjectFile[]; projectId: number
  onUpdate: (p: Project) => void; onRecipeChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const [uploading, setUploading] = useState(false)
  const [replacingId, setReplacingId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await projectsApi.uploadProjectFile(projectId, file)
      onUpdate(updated)
      showToast(t('attachment_added_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || replacingId === null) return
    setUploading(true)
    try {
      const updated = await projectsApi.replaceFile(projectId, replacingId, file)
      onUpdate(updated)
      showToast(t('attachment_added_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    } finally {
      setUploading(false)
      setReplacingId(null)
      if (replaceRef.current) replaceRef.current.value = ''
    }
  }

  function startReplace(fileId: number) {
    setReplacingId(fileId)
    replaceRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Field label={t('recipe_label')}>
        <textarea
          className="textarea"
          rows={10}
          value={recipeText}
          onChange={e => onRecipeChange(e.target.value)}
          placeholder={t('recipe_placeholder')}
        />
      </Field>
      <p className="text-xs text-warm-gray text-right -mt-2">{t('auto_saving')}</p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('attachments_label')}</span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {uploading ? t('uploading') : t('upload_file')}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          <input ref={replaceRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleReplace} className="hidden" />
        </div>

        {files.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-soft-brown/30 rounded-xl">
            <p className="text-sm text-warm-gray">{t('no_files_yet')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => {
              const url = fileUrl(projectId, f.storedName)
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="flex-shrink-0 focus:outline-none"
                    title={t('preview_file')}
                  >
                    {f.fileType === 'image' ? (
                      <img src={url} alt={f.originalName} className="w-12 h-12 object-cover rounded-lg hover:opacity-80 transition-opacity" loading="lazy" />
                    ) : (
                      <span className="w-12 h-12 flex items-center justify-center text-2xl hover:opacity-70 transition-opacity">{fileTypeIcon(f.fileType)}</span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setPreviewFile(f)}
                      className="text-sm font-medium text-gray-800 hover:text-sand-green-dark truncate block text-left w-full"
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
                  >↺</button>
                  <button
                    onClick={() => confirmDelete(
                      t('delete_attachment_confirm', { name: f.originalName }),
                      async () => {
                        onUpdate(await projectsApi.deleteFile(projectId, f.id))
                      },
                      'attachment_removed_toast',
                    )}
                    className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
                    title={t('delete')}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          projectId={projectId}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
