import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { Project, ProjectCategory } from '../types'
import { projectCoverImageUrls } from '../projectOverviewMedia'
import { CATEGORY_ICONS } from '../constants/categories'

function categoryBadgeClass(cat: ProjectCategory) {
  if (cat === 'KNITTING') return 'badge-knitting'
  if (cat === 'CROCHET') return 'badge-crochet'
  return 'badge-sewing'
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

  const newProjectPath = filter === 'ALL' ? '/projects/new' : `/projects/new?category=${filter}`

  const q = search.toLowerCase()
  const filtered = projects.filter(p => {
    if (filter !== 'ALL' && p.category !== filter) return false
    if (!q) return true
    return [p.name, p.description, p.tags].some(v => v?.toLowerCase().includes(q))
  })

  const categoryLabel = (cat: ProjectCategory) => t(`category_${cat.toLowerCase()}` as const)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-800">{t('projects_heading')}</h2>
      </div>

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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-sand-green text-gray-800 shadow-sm'
                : 'bg-soft-brown/20 text-warm-gray hover:bg-soft-brown/40'
            }`}
          >
            {cat === 'ALL' ? t('filter_all') : <><span className="leading-none flex-shrink-0">{CATEGORY_ICONS[cat]}</span><span>{categoryLabel(cat)}</span></>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-warm-gray text-sm">{t('no_projects_found')}</p>
          <button onClick={() => navigate(newProjectPath)} className="btn-primary mt-4 text-sm">
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{project.name}</span>
                    <span className={categoryBadgeClass(project.category)}>
                      {t(`category_${project.category.toLowerCase()}` as const)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-warm-gray mt-1 truncate">{project.description}</p>
                  )}
                  {project.materials.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {project.materials.slice(0, 3).map(m => (
                        <span key={m.id} className="px-2 py-0.5 rounded-full bg-soft-brown/20 text-warm-gray text-xs truncate max-w-[120px]">
                          {m.type}
                        </span>
                      ))}
                      {project.materials.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-soft-brown/20 text-warm-gray text-xs">+{project.materials.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                {projectCoverImageUrls(project)[0] ? (
                  <img src={projectCoverImageUrls(project)[0]} alt={project.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <span className="text-2xl flex-shrink-0">{CATEGORY_ICONS[project.category]}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
