import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import { useToast } from '../context/ToastContext'
import type { ProjectCategory } from '../types'
import { CATEGORY_ICONS, CATEGORIES } from '../constants/categories'
import { MAX_LIBRARY_PHOTOS, LIBRARY_PHOTO_ACCEPT } from '../components/LibraryItemForm'
import { CoverImageGallery } from '../components/CoverImageGallery'

type CoverImageEntry = { file: File; preview: string; isMain: boolean }

export default function NewProject() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const raw = searchParams.get('category')
  const [category, setCategory] = useState<ProjectCategory>(
    raw === 'KNITTING' || raw === 'CROCHET' || raw === 'SEWING' ? raw : 'KNITTING'
  )
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [coverImages, setCoverImages] = useState<CoverImageEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)

  // Revoke all blob preview URLs when the component unmounts
  useEffect(() => {
    return () => {
      coverImages.forEach(img => URL.revokeObjectURL(img.preview))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || coverImages.length >= MAX_LIBRARY_PHOTOS) return
    const preview = URL.createObjectURL(file)
    setCoverImages(prev => [...prev, { file, preview, isMain: prev.length === 0 }])
    if (coverRef.current) coverRef.current.value = ''
  }

  function setMainImage(index: number) {
    setCoverImages(prev => prev.map((img, i) => ({ ...img, isMain: i === index })))
  }

  function removeImage(index: number) {
    setCoverImages(prev => {
      URL.revokeObjectURL(prev[index].preview)
      const wasMain = prev[index].isMain
      const updated = prev.filter((_, i) => i !== index)
      if (wasMain && updated.length > 0) updated[0] = { ...updated[0], isMain: true }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t('name_required')); return }
    setSaving(true)
    try {
      const project = await projectsApi.create({
        name: name.trim(), description, category, tags: '',
        startDate: startDate ? new Date(startDate).getTime() : Date.now(),
      })
      // Upload main image first so it's marked as main, then the rest in parallel
      const mainImg = coverImages.find(img => img.isMain)
      const others = coverImages.filter(img => !img.isMain)
      if (mainImg) await projectsApi.uploadCoverImage(project.id, mainImg.file)
      if (others.length > 0) await Promise.all(others.map(img => projectsApi.uploadCoverImage(project.id, img.file)))
      showToast(t('project_created_toast'))
      navigate(`/projects/${project.id}`)
    } catch {
      setError(t('failed_create_project'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2 text-warm-gray" aria-label={t('go_back')}>
          ←
        </button>
        <h2 className="text-xl font-semibold text-gray-800">{t('new_project')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CoverImageGallery
          items={coverImages.map((img, i) => ({ key: i, src: img.preview, isMain: img.isMain }))}
          max={MAX_LIBRARY_PHOTOS}
          onSetMain={key => setMainImage(key as number)}
          onRemove={key => removeImage(key as number)}
          onAdd={() => coverRef.current?.click()}
        />
        <input ref={coverRef} type="file" accept={LIBRARY_PHOTO_ACCEPT} onChange={handleCoverChange} className="hidden" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('category_label')} <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  category === cat
                    ? 'border-sand-green-dark bg-sand-green/20'
                    : 'border-soft-brown/30 hover:border-sand-green/50'
                }`}
              >
                <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                <span className="text-sm font-medium">{t(`category_${cat.toLowerCase()}` as const)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('project_name_label')} <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder={t('project_name_placeholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('description_label')}</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('description_placeholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('start_date_label')} <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? t('creating') : t('create_project')}
        </button>
      </form>
    </div>
  )
}
