import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiX } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi2'
import { projectsApi } from '../api'
import type { ProjectCategory } from '../types'
import ProjectCard from '../components/ProjectCard'
import { CATEGORY_ICONS, categoryLabel, CATEGORY_ACCENT } from '../constants/categories'
import { useAsyncData } from '../hooks/useAsyncData'
import { useProjectFilter } from '../hooks/useProjectFilter'
import { useAuth } from '../context/AuthContext'

const AUTOSAVE_DISMISS_KEY = 'dashboard_autosave_dismissed'

export default function Dashboard() {
  const { data: projects, loading, error } = useAsyncData(() => projectsApi.getAll(), [])
  const { filter, setFilter, filtered, counts, newProjectPath } = useProjectFilter(projects)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [autosaveDismissed, setAutosaveDismissed] = useState(() => localStorage.getItem(AUTOSAVE_DISMISS_KEY) === '1')

  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const firstName = typeof fullName === 'string' ? fullName.split(' ')[0] : null

  function dismissAutosaveTip() {
    localStorage.setItem(AUTOSAVE_DISMISS_KEY, '1')
    setAutosaveDismissed(true)
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-[rgb(var(--border-light))] bg-white shadow-warm">
        <div
          className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-sand-green/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sand-green-dark/15 blur-3xl"
          aria-hidden
        />

        <div className="relative p-5 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif italic text-[28px] md:text-[38px] leading-[1.1] text-ink tracking-tight">
                {firstName ? `${t('welcome_back')}, ${firstName}` : t('welcome_back')}
              </h1>
              <p className="mt-1.5 text-sm text-ink/55">
                {projects.length === 0 ? t('start_first_project') : t('you_have_projects', { count: projects.length })}
              </p>
            </div>

            <button
              onClick={() => navigate(newProjectPath)}
              className="btn-primary text-sm whitespace-nowrap inline-flex items-center gap-1.5 self-start shrink-0"
            >
              <FiPlus className="text-base" />
              {t('add_project')}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 md:gap-3">
            {(['KNITTING', 'CROCHET', 'SEWING'] as ProjectCategory[]).map(cat => {
              const accent = CATEGORY_ACCENT[cat]
              const active = filter === cat
              const count = counts[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(active ? 'ALL' : cat)}
                  className={`group flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 md:px-4 md:py-3.5 text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-sand-green-dark/40 bg-sand-green/20 shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.2)]'
                      : 'border-[rgb(var(--border-light))] bg-cream/50 hover:border-sand-green-dark/25 hover:bg-cream'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: accent.bg, color: accent.text }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <span className="font-serif text-2xl md:text-3xl leading-none text-ink tabular-nums">{count}</span>
                  <span className="text-[11px] md:text-xs text-warm-gray leading-tight">{categoryLabel(cat, t)}</span>
                </button>
              )
            })}
          </div>

          {!autosaveDismissed && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-sand-green/30 bg-sand-green/10 px-3.5 py-2.5">
              <HiSparkles className="mt-0.5 h-4 w-4 shrink-0 text-sand-green-dark" aria-hidden />
              <p className="flex-1 min-w-0 text-xs text-ink/70 leading-relaxed">
                <span className="font-medium text-ink/85">{t('home_auto_save_title')}</span>
                {' — '}
                {t('home_auto_save_hint')}
              </p>
              <button
                type="button"
                onClick={dismissAutosaveTip}
                aria-label={t('dismiss')}
                className="shrink-0 rounded-lg p-1 text-warm-gray/70 hover:text-ink hover:bg-soft-brown/20 transition-colors"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Projects list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl md:text-2xl text-ink">
            {filter === 'ALL' ? t('recent_projects') : categoryLabel(filter, t)}
          </h2>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink transition-colors"
            >
              <FiX className="text-sm" />
              {t('clear_filter')}
            </button>
          )}
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
      </section>
    </div>
  )
}
