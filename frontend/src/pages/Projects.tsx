import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { Project, ProjectCategory } from '../types'
import { GiChopsticks, GiPirateHook, GiSewingMachine, GiRolledCloth } from 'react-icons/gi'
import { PiYarnFill } from 'react-icons/pi'

const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  KNITTING: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET: <GiPirateHook className="text-sand-blue-deep" />,
  SEWING: <GiSewingMachine className="text-warm-gray" />,
}

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  YARN: <PiYarnFill className="text-sand-green-dark" />,
  FABRIC: <GiRolledCloth className="text-warm-gray" />,
  KNITTING_NEEDLE: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET_HOOK: <GiPirateHook className="text-sand-blue-deep" />,
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
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <span className="text-3xl flex-shrink-0">{CATEGORY_ICONS[project.category]}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-warm-gray truncate">{project.description}</p>
                  )}
                  {project.materials.length > 0 && (
                    <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                      {project.materials.map(m => (
                        m.imageUrl ? (
                          <img key={m.id} src={m.imageUrl} alt={m.type} title={m.type} className="w-6 h-6 rounded object-cover border border-soft-brown/20" />
                        ) : (
                          <span key={m.id} className="text-xl leading-none" title={m.type}>
                            {(m.itemType && ITEM_TYPE_ICONS[m.itemType]) ?? CATEGORY_ICONS[project.category]}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
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
