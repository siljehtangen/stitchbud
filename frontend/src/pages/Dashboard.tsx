import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { Project, ProjectCategory } from '../types'
import { GiButterfly } from 'react-icons/gi'
import ProjectCard from '../components/ProjectCard'
import { CATEGORY_ICONS } from '../constants/categories'


export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<ProjectCategory | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    projectsApi.getAll().then(setProjects).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? projects : projects.filter(p => p.category === filter)
  const newProjectPath = filter === 'ALL' ? '/projects/new' : `/projects/new?category=${filter}`
  const counts = {
    ALL: projects.length,
    KNITTING: projects.filter(p => p.category === 'KNITTING').length,
    CROCHET: projects.filter(p => p.category === 'CROCHET').length,
    SEWING: projects.filter(p => p.category === 'SEWING').length,
  }

  const categoryLabel = (cat: ProjectCategory) => t(`category_${cat.toLowerCase()}` as const)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-sand-green/40 to-sand-blue/40 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {t('welcome_back')} <GiButterfly className="text-sand-green-dark text-xl" />
        </h2>
        <p className="text-sm text-warm-gray mt-1">
          {projects.length === 0
            ? t('start_first_project')
            : t('you_have_projects_other', { count: projects.length })}
        </p>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['KNITTING', 'CROCHET', 'SEWING'] as ProjectCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? 'ALL' : cat)}
            className={`card flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:shadow-md ${
              filter === cat ? 'ring-2 ring-sand-green-dark' : ''
            }`}
          >
            <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
            <span className="text-xl font-semibold text-gray-800">{counts[cat]}</span>
            <span className="text-xs text-warm-gray">{categoryLabel(cat)}</span>
          </button>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            {filter === 'ALL' ? t('recent_projects') : categoryLabel(filter)}
          </h3>
          <div className="flex items-center gap-2">
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="text-xs text-warm-gray hover:text-gray-700"
              >
                {t('clear_filter')}
              </button>
            )}
            <button onClick={() => navigate(newProjectPath)} className="btn-primary text-xs whitespace-nowrap">
              {t('add_project')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-warm-gray text-sm">{t('no_projects_yet')}</p>
            <button
              onClick={() => navigate(newProjectPath)}
              className="btn-primary mt-4 text-sm"
            >
              {t('create_first_project')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(project => (
              <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
