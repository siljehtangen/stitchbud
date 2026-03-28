import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { Project, ProjectCategory } from '../types'
import { GiChopsticks, GiPirateHook, GiSewingMachine } from 'react-icons/gi'

const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  KNITTING: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET: <GiPirateHook className="text-sand-blue-deep" />,
  SEWING: <GiSewingMachine className="text-warm-gray" />,
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<ProjectCategory | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    projectsApi.getAll().then(setProjects).finally(() => setLoading(false))
  }, [])

  const q = search.toLowerCase()
  const filtered = projects.filter(p => {
    if (filter !== 'ALL' && p.category !== filter) return false
    if (!q) return true
    return [p.name, p.description, p.tags].some(v => v?.toLowerCase().includes(q))
  })

  const categoryLabel = (cat: ProjectCategory) => t(`category_${cat.toLowerCase()}` as const)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">{t('projects_heading')}</h2>

      <input
        type="search"
        className="input text-sm py-2 w-full"
        placeholder={t('projects_search_placeholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'KNITTING', 'CROCHET', 'SEWING'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-sand-green text-gray-800 shadow-sm'
                : 'bg-soft-brown/20 text-warm-gray hover:bg-soft-brown/40'
            }`}
          >
            {cat === 'ALL' ? t('filter_all') : <>{CATEGORY_ICONS[cat]} {categoryLabel(cat)}</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-warm-gray text-sm">{t('no_projects_found')}</p>
          <button onClick={() => navigate('/projects/new')} className="btn-primary mt-4 text-sm">
            {t('add_project')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="card w-full text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{CATEGORY_ICONS[project.category]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-warm-gray truncate">{project.description}</p>
                  )}
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {project.tags.split(',').filter(Boolean).map(tag => (
                      <span key={tag} className="text-xs bg-soft-brown/20 text-warm-gray px-2 py-0.5 rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
