import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { projectsApi } from '../../api'
import type { Project } from '../../types'
import { Field } from '../../components/Field'
import { DateField } from '../../components/DateField'
import { CoverImageGallery } from '../../components/CoverImageGallery'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { MAX_LIBRARY_PHOTOS } from '../../components/LibraryItemForm'

export function InfoTab({
  project,
  projectId,
  textFields,
  startDate,
  endDate,
  onInfoChange,
  onUpdate,
}: {
  project: Project
  projectId: number
  textFields: { name: string; description: string }
  startDate: string
  endDate: string
  onInfoChange: (field: string, value: string) => void
  onUpdate: (project: Project) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const coverImageRef = useRef<HTMLInputElement>(null)
  const [coverState, setCoverState] = useState({ uploading: false, error: '' })

  async function uploadCoverFile(file: File) {
    setCoverState({ uploading: true, error: '' })
    try {
      const updated = await projectsApi.uploadCoverImage(projectId, file)
      onUpdate(updated)
      showToast(t('cover_added_toast'))
    } catch {
      setCoverState(s => ({ ...s, error: t('upload_failed') }))
    } finally {
      setCoverState(s => ({ ...s, uploading: false }))
      if (coverImageRef.current) coverImageRef.current.value = ''
    }
  }

  function handleCoverImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadCoverFile(file)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <CoverImageGallery
          items={(project.coverImages ?? []).map(img => ({
            key: img.id,
            src: img.storedName,
            name: img.originalName,
            isMain: img.isMain,
          }))}
          max={MAX_LIBRARY_PHOTOS}
          uploading={coverState.uploading}
          onSetMain={async key => {
            onUpdate(await projectsApi.setCoverImageMain(projectId, key as number))
            showToast(t('changes_saved_toast'))
          }}
          onRemove={key =>
            confirmDelete(t('delete_cover_image_confirm'), async () => {
              onUpdate(await projectsApi.deleteCoverImage(projectId, key as number))
              showToast(t('cover_image_removed_toast'))
            })
          }
          onAdd={() => coverImageRef.current?.click()}
          onFile={uploadCoverFile}
        />
        {coverState.error && <p className="text-xs text-red-500">{coverState.error}</p>}
        <input
          ref={coverImageRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleCoverImageUpload}
          className="hidden"
        />
      </div>

      <Field label={t('field_name')}>
        <input className="input" value={textFields.name} onChange={e => onInfoChange('name', e.target.value)} />
      </Field>
      <Field label={t('field_description')}>
        <textarea
          className="textarea"
          rows={4}
          value={textFields.description}
          onChange={e => onInfoChange('description', e.target.value)}
          placeholder={t('describe_project')}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field label={t('start_date_label')}>
          <DateField value={startDate} onChange={v => onInfoChange('startDate', v)} />
        </Field>
        <Field label={t('end_date_label')}>
          <DateField value={endDate} onChange={v => onInfoChange('endDate', v)} />
        </Field>
      </div>
    </div>
  )
}
