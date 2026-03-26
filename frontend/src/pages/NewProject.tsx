import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi } from '../api'
import type { ProjectCategory } from '../types'

const CATEGORIES: { value: ProjectCategory; label: string; icon: string }[] = [
  { value: 'KNITTING', label: 'Knitting', icon: '🧶' },
  { value: 'CROCHET', label: 'Crochet', icon: '🪡' },
  { value: 'SEWING', label: 'Sewing', icon: '🧵' },
]

export default function NewProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('KNITTING')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const project = await projectsApi.create({ name: name.trim(), description, category, tags })
      navigate(`/projects/${project.id}`)
    } catch {
      setError('Failed to create project. Is the backend running?')
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
        <h2 className="text-xl font-semibold text-gray-800">New Project</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
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
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Project Name <span className="text-red-400">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="e.g. Winter Sweater"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What are you making?"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
          <input
            className="input"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="winter, gift, wool (comma-separated)"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  )
}
