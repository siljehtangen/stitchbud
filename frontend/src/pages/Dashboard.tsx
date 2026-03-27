import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi } from '../api'
import type { Project, ProjectCategory } from '../types'

const CATEGORY_ICONS: Record<ProjectCategory, string> = {
  KNITTING: '🧶',
  CROCHET: '🪡',
  SEWING: '🧵',
}

function categoryBadgeClass(cat: ProjectCategory) {
  if (cat === 'KNITTING') return 'badge-knitting'
  if (cat === 'CROCHET') return 'badge-crochet'
  return 'badge-sewing'
}

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
        <h2 className="text-lg font-semibold text-gray-800">{t('welcome_back')}</h2>
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
          {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')} className="text-xs text-warm-gray hover:text-gray-700">
              {t('clear_filter')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-warm-gray text-sm">{t('no_projects_yet')}</p>
            <button
              onClick={() => navigate('/projects/new')}
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

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { t } = useTranslation()
  const progress = project.rowCounter && project.rowCounter.totalRounds > 0
    ? Math.round((project.rowCounter.checkedStitches ? JSON.parse(project.rowCounter.checkedStitches).length : 0) / (project.rowCounter.stitchesPerRound * project.rowCounter.totalRounds) * 100)
    : null

  const categoryLabel = (cat: ProjectCategory) => t(`category_${cat.toLowerCase()}` as const)

  return (
    <button onClick={onClick} className="card w-full text-left hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 truncate">{project.name}</span>
            <span className={categoryBadgeClass(project.category)}>
              {categoryLabel(project.category)}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-warm-gray mt-1 truncate">{project.description}</p>
          )}
          {project.materials.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {project.materials.slice(0, 4).map(m => (
                <div
                  key={m.id}
                  className="w-4 h-4 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: m.colorHex }}
                  title={`${m.color} ${m.type}`}
                />
              ))}
              {project.materials.length > 4 && (
                <span className="text-xs text-warm-gray self-center">+{project.materials.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <span className="text-2xl flex-shrink-0">
          {CATEGORY_ICONS[project.category]}
        </span>
      </div>
      {progress !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-warm-gray mb-1">
            <span>{t('row_counter', { current: JSON.parse(project.rowCounter!.checkedStitches || '[]').length, total: project.rowCounter!.stitchesPerRound * project.rowCounter!.totalRounds })}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-soft-brown/30 rounded-full h-1.5">
            <div
              className="bg-sand-green-dark h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
