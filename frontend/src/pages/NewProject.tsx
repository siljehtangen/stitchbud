import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import { useToast } from '../context/ToastContext'
import type { ProjectCategory } from '../types'
import { CATEGORY_ICONS } from '../constants/categories'

type CoverImageEntry = { file: File; preview: string; isMain: boolean }

export default function NewProject() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const initialCategory = ((): ProjectCategory => {
    const raw = searchParams.get('category')
    if (raw === 'KNITTING' || raw === 'CROCHET' || raw === 'SEWING') return raw
    return 'KNITTING'
  })()
  const [category, setCategory] = useState<ProjectCategory>(initialCategory)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [coverImages, setCoverImages] = useState<CoverImageEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)

  const categories: { value: ProjectCategory }[] = [
    { value: 'KNITTING' },
    { value: 'CROCHET' },
    { value: 'SEWING' },
  ]

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || coverImages.length >= 3) return
    const preview = URL.createObjectURL(file)
    setCoverImages(prev => [...prev, { file, preview, isMain: prev.length === 0 }])
    if (coverRef.current) coverRef.current.value = ''
  }

  function setMainImage(index: number) {
    setCoverImages(prev => prev.map((img, i) => ({ ...img, isMain: i === index })))
  }

  function removeImage(index: number) {
    setCoverImages(prev => {
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
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2 text-warm-gray">
          ←
        </button>
        <h2 className="text-xl font-semibold text-gray-800">{t('new_project')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cover images (up to 3) */}
        <div className="flex gap-2 flex-wrap">
          {coverImages.map((img, i) => (
            <div key={i} className="relative group flex-shrink-0">
              <img
                src={img.preview}
                alt=""
                className={`w-24 h-24 object-cover rounded-xl border-2 transition-colors ${img.isMain ? 'border-sand-green' : 'border-transparent'}`}
              />
              <button
                type="button"
                onClick={() => setMainImage(i)}
                className={`absolute top-1 left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
                title={img.isMain ? t('main_image') : t('set_as_main')}
              >★</button>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
              >×</button>
            </div>
          ))}
          {coverImages.length < 3 && (
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors bg-soft-brown/10 flex flex-col items-center justify-center gap-1 text-warm-gray flex-shrink-0"
            >
              <span className="text-xl leading-none">+</span>
              <span className="text-xs text-center px-1">{t('upload_cover_image')}</span>
            </button>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleCoverChange} className="hidden" />

        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('category_label')}</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  category === cat.value
                    ? 'border-sand-green-dark bg-sand-green/20'
                    : 'border-soft-brown/30 hover:border-sand-green/50'
                }`}
              >
                <span className="text-2xl">{CATEGORY_ICONS[cat.value]}</span>
                <span className="text-sm font-medium">{t(`category_${cat.value.toLowerCase()}` as const)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('project_name_label')} <span className="text-red-400">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder={t('project_name_placeholder')}
          />
        </div>

        {/* Description */}
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

        {/* Start date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('start_date_label')}</label>
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
