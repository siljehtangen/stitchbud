import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi2'
import { GiButterfly } from 'react-icons/gi'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { ImBooks } from 'react-icons/im'
import { GrProjects } from 'react-icons/gr'
import { dashboardApi } from '../api'
import type { DashboardStats, ProjectCategory } from '../types'
import { CATEGORY_ICONS, categoryLabel } from '../constants/categories'
import { ITEM_TYPES, TYPE_ICONS } from '../components/LibraryItemForm'
import { typeLabel } from '../utils/libraryUtils'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../context/AuthContext'

const EMPTY_STATS: DashboardStats = {
  projects: { KNITTING: 0, CROCHET: 0, SEWING: 0 },
  library: { YARN: 0, FABRIC: 0, KNITTING_NEEDLE: 0, CROCHET_HOOK: 0 },
  friends: 0,
  sentRequests: 0,
  incomingRequests: 0,
}

type StatTileProps = {
  icon: ReactNode
  count: number
  label: string
  onClick?: () => void
}

function StatTile({ icon, count, label, onClick }: StatTileProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group flex flex-col items-start gap-1.5 rounded-xl border border-[rgb(var(--border-light))] bg-cream/50 px-3.5 py-3 md:px-4 md:py-3.5 text-left transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-sand-green-dark/25 hover:bg-cream' : ''
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-green/20 text-lg text-sand-green-dark transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span className="font-serif text-2xl md:text-3xl leading-none text-ink tabular-nums">{count}</span>
      <span className="text-[11px] md:text-xs text-warm-gray leading-tight">{label}</span>
    </Tag>
  )
}

export default function Dashboard() {
  const { data: stats } = useAsyncData(() => dashboardApi.getStats(), EMPTY_STATS)

  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const firstName = typeof fullName === 'string' ? fullName.split(' ')[0] : null

  const projectCounts = stats.projects
  const libraryCounts = stats.library

  const totalProjects = projectCounts.KNITTING + projectCounts.CROCHET + projectCounts.SEWING
  const totalLibrary = Object.values(libraryCounts).reduce((sum, n) => sum + n, 0)
  const totalFriends = stats.friends + stats.sentRequests

  return (
    <div className="space-y-6">
      {/* Welcome */}
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
          <div className="flex items-center gap-3">
            <h1 className="font-serif italic text-[28px] md:text-[38px] leading-[1.1] text-ink tracking-tight">
              {firstName ? `${t('welcome_back')}, ${firstName}` : t('welcome_back')}
            </h1>
            <GiButterfly className="animate-butterfly text-sand-green-dark text-3xl md:text-4xl shrink-0" aria-hidden />
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sand-green/30 bg-sand-green/10 px-3.5 py-2.5 max-w-xl">
            <HiSparkles className="mt-0.5 h-4 w-4 shrink-0 text-sand-green-dark" aria-hidden />
            <p className="flex-1 min-w-0 text-xs md:text-sm text-ink/70 leading-relaxed">{t('home_welcome_message')}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="card space-y-6 p-5 md:p-7">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GrProjects className="text-sand-green-dark text-lg" />
            <h2 className="font-serif text-lg text-ink">{t('nav_projects')}</h2>
            <span className="rounded-full bg-sand-green/25 px-2 py-0.5 text-xs font-medium text-ink/70 tabular-nums">
              {totalProjects}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 md:gap-3">
            {(['KNITTING', 'CROCHET', 'SEWING'] as ProjectCategory[]).map(cat => (
              <StatTile
                key={cat}
                icon={CATEGORY_ICONS[cat]}
                count={projectCounts[cat]}
                label={categoryLabel(cat, t)}
                onClick={() => navigate('/projects')}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-[rgb(var(--border-light))] pt-6">
          <div className="flex items-center gap-2 mb-3">
            <ImBooks className="text-sand-green-dark text-lg" />
            <h2 className="font-serif text-lg text-ink">{t('nav_library')}</h2>
            <span className="rounded-full bg-sand-green/25 px-2 py-0.5 text-xs font-medium text-ink/70 tabular-nums">
              {totalLibrary}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
            {ITEM_TYPES.map(type => (
              <StatTile
                key={type}
                icon={TYPE_ICONS[type]}
                count={libraryCounts[type]}
                label={typeLabel(type, t)}
                onClick={() => navigate('/library')}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-[rgb(var(--border-light))] pt-6">
          <div className="flex items-center gap-2 mb-3">
            <LiaUserFriendsSolid className="text-sand-green-dark text-lg" />
            <h2 className="font-serif text-lg text-ink">{t('nav_friends')}</h2>
            <span className="rounded-full bg-sand-green/25 px-2 py-0.5 text-xs font-medium text-ink/70 tabular-nums">
              {totalFriends}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 max-w-md">
            <StatTile
              icon={<LiaUserFriendsSolid />}
              count={stats.friends}
              label={t('dashboard_friends_count')}
              onClick={() => navigate('/friends')}
            />
            <StatTile
              icon={<FiPlus />}
              count={stats.sentRequests}
              label={t('dashboard_sent_requests_count')}
              onClick={() => navigate('/friends')}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
