import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiX } from 'react-icons/fi'
import { projectsApi } from '../api'
import type { ProjectCategory } from '../types'
import ProjectCard from '../components/ProjectCard'
import { CATEGORY_ICONS, categoryLabel, CATEGORY_ACCENT } from '../constants/categories'
import { useAsyncData } from '../hooks/useAsyncData'
import { useProjectFilter } from '../hooks/useProjectFilter'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { data: projects, loading, error } = useAsyncData(() => projectsApi.getAll(), [])
  const { filter, setFilter, filtered, counts, newProjectPath } = useProjectFilter(projects)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const firstName = typeof fullName === 'string' ? fullName.split(' ')[0] : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif italic text-[30px] md:text-[40px] leading-tight text-ink">
          {firstName ? `${t('welcome_back')}, ${firstName}` : t('welcome_back')}
        </h1>
        <p className="text-sm text-warm-gray mt-1">
          {projects.length === 0 ? t('start_first_project') : t('you_have_projects', { count: projects.length })}
        </p>
        <p className="text-xs text-warm-gray/80 mt-1">{t('home_auto_save_hint')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-5">
        {(['KNITTING', 'CROCHET', 'SEWING'] as ProjectCategory[]).map(cat => {
          const accent = CATEGORY_ACCENT[cat]
          const active = filter === cat
          return (
            <button
              key={cat}
              onClick={() => setFilter(active ? 'ALL' : cat)}
              className={`card card-hover flex flex-col items-start gap-2 cursor-pointer text-left ${
                active ? 'ring-2' : ''
              }`}
              style={active ? ({ '--tw-ring-color': accent.base } as React.CSSProperties) : undefined}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: accent.bg, color: accent.text }}
              >
                {CATEGORY_ICONS[cat]}
              </span>
              <span className="font-serif text-3xl md:text-4xl leading-none text-ink">{counts[cat]}</span>
              <span className="text-xs md:text-sm text-warm-gray">{categoryLabel(cat, t)}</span>
            </button>
          )
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl text-ink">
            {filter === 'ALL' ? t('recent_projects') : categoryLabel(filter, t)}
          </h2>
          <div className="flex items-center gap-2">
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink"
              >
                <FiX className="text-sm" />
                {t('clear_filter')}
              </button>
            )}
            <button
              onClick={() => navigate(newProjectPath)}
              className="btn-primary text-xs whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <FiPlus className="text-sm" />
              {t('add_project')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400 text-sm">{t('load_failed')}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-warm-gray text-sm">{t('no_projects_yet')}</p>
            <button
              onClick={() => navigate(newProjectPath)}
              className="btn-primary mt-4 text-sm inline-flex items-center gap-1.5"
            >
              <FiPlus className="text-base" />
              {t('create_first_project')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/projects/${project.id}?tab=info`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
