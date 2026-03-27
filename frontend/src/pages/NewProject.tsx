import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { ProjectCategory } from '../types'

const CATEGORY_ICONS: Record<ProjectCategory, string> = {
  KNITTING: '🧶',
  CROCHET: '🪡',
  SEWING: '🧵',
}

export default function NewProject() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('KNITTING')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories: { value: ProjectCategory }[] = [
    { value: 'KNITTING' },
    { value: 'CROCHET' },
    { value: 'SEWING' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t('name_required')); return }
    setSaving(true)
    try {
      const project = await projectsApi.create({ name: name.trim(), description, category, tags: '' })
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
